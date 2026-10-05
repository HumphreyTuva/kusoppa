import csv
import io
import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import ProtectedError, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import ParseError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .excel import (FIELDS, apply_plan, auto_mapping, build_workbook, detect_header, plan, read_sheet, row_json, summarise, text)
from .models import (AuditLog, BoardMember, ClubLink, ContactMessage, Event, ImportBatch, Membership, PolicyBrief, Profile,
                     Semester, SiteSettings, log)
from .permissions import STAFF, role_of, roles
from .serializers import (ClubLinkSerializer, ManageBoardSerializer, ManageBriefSerializer, ManageEventSerializer,
                          ManageMessageSerializer, MemberSerializer, MembershipSerializer, SemesterSerializer,
                          SettingsSerializer)


class Guarded:
    allowed = ("admin",)

    def get_permissions(self):
        return [roles(*self.allowed)()]


class ManageEventViewSet(Guarded, viewsets.ModelViewSet):
    allowed = ("admin", "secretary")
    queryset = Event.objects.all()
    serializer_class = ManageEventSerializer


class ManageBriefViewSet(Guarded, viewsets.ModelViewSet):
    allowed = ("admin", "secretary")
    queryset = PolicyBrief.objects.all()
    serializer_class = ManageBriefSerializer


class ManageBoardViewSet(Guarded, viewsets.ModelViewSet):
    allowed = ("admin", "secretary")
    queryset = BoardMember.objects.all()
    serializer_class = ManageBoardSerializer


class ManageMessageViewSet(Guarded, viewsets.ModelViewSet):
    allowed = ("admin", "secretary")
    queryset = ContactMessage.objects.all()
    serializer_class = ManageMessageSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]


class ManageLinkViewSet(Guarded, viewsets.ModelViewSet):
    allowed = ("admin", "secretary")
    queryset = ClubLink.objects.all()
    serializer_class = ClubLinkSerializer


class SemesterViewSet(Guarded, viewsets.ModelViewSet):
    allowed = ("admin", "treasurer")
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer

    def destroy(self, request, *a, **k):
        try:
            return super().destroy(request, *a, **k)
        except ProtectedError:
            return Response({"detail": ["This semester has payments recorded, so it cannot be deleted."]}, status=400)


class PaymentViewSet(Guarded, viewsets.ReadOnlyModelViewSet):
    allowed = ("admin", "treasurer")
    serializer_class = MembershipSerializer

    def get_queryset(self):
        qs = Membership.objects.select_related("member", "semester")
        p = self.request.query_params
        if p.get("status") in ("pending", "approved", "rejected"):
            qs = qs.filter(status=p["status"])
        if p.get("semester"):
            qs = qs.filter(semester_id=p["semester"])
        q = p.get("q", "").strip()
        if q:
            qs = qs.filter(Q(member__full_name__icontains=q) | Q(member__reg_no__icontains=q) | Q(mpesa_code__icontains=q))
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        m = self.get_object()
        if m.status != "pending":
            return Response({"detail": ["This payment was already reviewed."]}, status=400)
        m.status, m.reviewed_by, m.reviewed_at, m.reject_reason = "approved", request.user, timezone.now(), ""
        m.save()
        log(request.user, "payment_approved", f"{m.member.full_name} ({m.member.reg_no}) Ksh {m.amount} code {m.mpesa_code}")
        if m.member.email:
            send_mail("Your KUSOPPA membership is active",
                      f"Hi {m.member.full_name},\n\nYour payment of Ksh {m.amount} was confirmed. You are an active KUSOPPA member for {m.semester.name}.\n\nShaping Policies, Empowering Communities.",
                      settings.DEFAULT_FROM_EMAIL, [m.member.email], fail_silently=True)
        return Response(MembershipSerializer(m).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        m = self.get_object()
        reason = str(request.data.get("reason", "")).strip()[:200]
        if m.status != "pending":
            return Response({"detail": ["This payment was already reviewed."]}, status=400)
        if not reason:
            return Response({"reason": ["Give the member a short reason."]}, status=400)
        m.status, m.reviewed_by, m.reviewed_at, m.reject_reason = "rejected", request.user, timezone.now(), reason
        m.save()
        log(request.user, "payment_rejected", f"{m.member.full_name} code {m.mpesa_code}: {reason}")
        if m.member.email:
            send_mail("Your KUSOPPA payment needs attention",
                      f"Hi {m.member.full_name},\n\nWe could not confirm your payment (code {m.mpesa_code}).\nReason: {reason}\n\nPlease log in and submit the correct code, or contact the treasurer.",
                      settings.DEFAULT_FROM_EMAIL, [m.member.email], fail_silently=True)
        return Response(MembershipSerializer(m).data)


class MemberViewSet(viewsets.ModelViewSet):
    serializer_class = MemberSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_permissions(self):
        return [roles("admin", "secretary")() if self.action == "partial_update" else roles(*STAFF)()]

    def get_queryset(self):
        qs = Profile.objects.filter(role="member").select_related("user").prefetch_related("memberships__semester")
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(full_name__icontains=q) | Q(reg_no__icontains=q) | Q(user__email__icontains=q) | Q(phone__icontains=q))
        return qs

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "semester": Semester.current()}

    def list(self, request, *a, **k):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    def partial_update(self, request, *a, **k):
        r = super().partial_update(request, *a, **k)
        log(request.user, "member_edited", r.data.get("full_name", ""))
        return r

    @action(detail=False, methods=["get"])
    def export(self, request):
        rows = self.get_serializer(self.get_queryset(), many=True).data
        out = HttpResponse(content_type="text/csv")
        out["Content-Disposition"] = 'attachment; filename="kusoppa-members.csv"'
        w = csv.writer(out)
        w.writerow(["Name", "Reg no", "Email", "Phone", "Year", "Course", "Leadership interest", "Status", "Joined"])
        for r in rows:
            w.writerow([r["full_name"], r["reg_no"] or "", r["email"], r["phone"], r["year_of_study"], r["course"],
                        r["leadership_interest"], r["status"], str(r["created_at"])[:10]])
        return out


class SettingsView(APIView):
    permission_classes = [roles("admin", "treasurer")]

    def get(self, request):
        return Response(SettingsSerializer(SiteSettings.get()).data)

    def patch(self, request):
        st = SiteSettings.get()
        old = SettingsSerializer(st).data
        s = SettingsSerializer(st, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        new = s.data
        changed = [k for k in new if new[k] != old[k]]
        if changed:
            log(request.user, "settings_changed", "; ".join(f"{k}: {old[k]!r} to {new[k]!r}" for k in changed))
        if {"pochi_number", "pochi_name"} & set(changed):
            # a changed payment number is sensitive: tell every admin
            to = set(User.objects.filter(Q(is_superuser=True) | Q(profile__role="admin"), is_active=True).values_list("email", flat=True))
            to.add(settings.CONTACT_EMAIL)
            send_mail("KUSOPPA payment details were changed",
                      f"{(request.user.profile.full_name if getattr(request.user, 'profile', None) else request.user.email)} changed the payment details.\nNumber: {new['pochi_number']}\nName: {new['pochi_name']}\n\nIf this was not expected, review the audit log and reset passwords.",
                      settings.DEFAULT_FROM_EMAIL, [e for e in to if e], fail_silently=True)
        return Response(new)


class OverviewView(APIView):
    permission_classes = [roles(*STAFF)]

    def get(self, request):
        sem, st = Semester.current(), SiteSettings.get()
        done = Membership.objects.filter(semester=sem, status="approved") if sem else Membership.objects.none()
        role = role_of(request.user)
        today, months = timezone.localdate(), []
        for i in range(5, -1, -1):
            y, m = today.year, today.month - i
            while m < 1:
                m, y = m + 12, y - 1
            months.append((y, m))
        counts = {k: 0 for k in months}
        for d in Profile.objects.filter(role="member", created_at__date__gte=today.replace(day=1) - timedelta(days=186)).values_list("created_at", flat=True):
            if (d.year, d.month) in counts:
                counts[(d.year, d.month)] += 1
        recent = [{"actor": a.actor_name, "action": a.action, "detail": a.detail, "at": a.created_at}
                  for a in AuditLog.objects.all()[:8]] if role in ("admin", "treasurer") else []
        return Response({
            "semester": sem.name if sem else None,
            "active_members": done.count(), "new_this_semester": done.filter(kind="new").count(),
            "renewals": done.filter(kind="renewal").count(),
            "pending_payments": Membership.objects.filter(status="pending").count() if role != "secretary" else 0,
            "total_members": Profile.objects.filter(role="member").count(),
            "leadership_interested": Profile.objects.filter(role="member", leadership_interest__in=["yes", "maybe"]).count(),
            "unread_messages": ContactMessage.objects.filter(is_read=False).count(),
            "revenue": (done.aggregate(s=Sum("amount"))["s"] or 0) if role != "secretary" else None,
            "signups": [{"label": f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]}", "count": counts[(y, m)]} for y, m in months],
            "recent": recent,
            "setup": [{"key": "semester", "label": "Add the current semester", "done": sem is not None},
                      {"key": "pochi", "label": "Add the Pochi la Biashara number", "done": bool(st.pochi_number)}],
        })


class AuditView(APIView):
    permission_classes = [roles("admin", "treasurer")]

    def get(self, request):
        return Response([{"id": a.id, "actor": a.actor_name, "action": a.action, "detail": a.detail, "at": a.created_at}
                         for a in AuditLog.objects.all()[:200]])


class StaffInput(serializers.Serializer):
    full_name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=["admin", "treasurer", "secretary"])
    password = serializers.CharField(min_length=8, required=False)


class UserViewSet(Guarded, viewsets.ViewSet):
    allowed = ("admin",)

    @staticmethod
    def rep(p):
        return {"id": p.id, "full_name": p.full_name, "email": p.user.email, "role": p.role, "is_active": p.user.is_active}

    def list(self, request):
        qs = Profile.objects.filter(user__isnull=False).exclude(role="member").select_related("user")
        return Response([self.rep(p) for p in qs])

    def create(self, request):
        s = StaffInput(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        email = d["email"].lower()
        if User.objects.filter(username=email).exists():
            return Response({"email": ["That email already has an account."]}, status=400)
        if "password" not in d:
            return Response({"password": ["Set a temporary password of at least 8 characters."]}, status=400)
        with transaction.atomic():
            u = User.objects.create_user(username=email, email=email, password=d["password"])
            p = Profile.objects.create(user=u, full_name=d["full_name"], role=d["role"])
        log(request.user, "staff_added", f"{p.full_name} as {p.role}")
        return Response(self.rep(p), status=201)

    def partial_update(self, request, pk=None):
        p = get_object_or_404(Profile.objects.select_related("user"), pk=pk, user__isnull=False)
        if p.role == "member":
            return Response({"detail": ["Not a staff account."]}, status=404)
        d = request.data
        if p.user_id == request.user.id and (d.get("is_active") is False or d.get("role", "admin") != "admin"):
            return Response({"detail": ["You cannot remove your own admin access."]}, status=400)
        if "role" in d:
            if d["role"] not in ("admin", "treasurer", "secretary"):
                return Response({"role": ["Choose admin, treasurer or secretary."]}, status=400)
            p.role = d["role"]
        if d.get("full_name"):
            p.full_name = str(d["full_name"])[:120]
        p.save()
        u = p.user
        if "is_active" in d:
            u.is_active = bool(d["is_active"])
            if not u.is_active:
                Token.objects.filter(user=u).delete()
        if d.get("password"):
            if len(str(d["password"])) < 8:
                return Response({"password": ["Use at least 8 characters."]}, status=400)
            u.set_password(str(d["password"]))
            Token.objects.filter(user=u).delete()
        u.save()
        log(request.user, "staff_changed", f"{p.full_name}: role {p.role}, active {u.is_active}")
        return Response(self.rep(p))


def truthy(v):
    return str(v).lower() in ("1", "true", "yes", "on")


class ImportBase(APIView):
    """Reads the uploaded sheet and works out the plan. Shared by preview and apply."""
    permission_classes = [roles("admin", "treasurer")]
    parser_classes = [MultiPartParser]

    def prepare(self, request):
        f = request.FILES.get("file")
        if not f:
            raise ParseError("Choose an Excel (.xlsx) or CSV file.")
        try:
            sheets, sheet, rows = read_sheet(f, request.data.get("sheet") or None)
        except ValueError as e:
            raise ParseError(str(e))
        hr = request.data.get("header_row")
        header_idx = int(hr) if str(hr).isdigit() and int(hr) < max(len(rows), 1) else detect_header(rows)
        if header_idx >= 0 and rows:
            headers = rows[header_idx]
        else:
            width = max([len(r) for r in rows[:60]] or [0])
            headers = [f"Column {i + 1}" for i in range(width)]
        raw = request.data.get("mapping")
        if raw:
            try:
                valid = {k for k, _ in FIELDS}
                mapping = {k: int(v) for k, v in json.loads(raw).items() if k in valid and v is not None and 0 <= int(v) < len(headers)}
            except (ValueError, TypeError):
                raise ParseError("The column choices could not be read.")
        else:
            mapping = auto_mapping(headers)
        opts = {"semester": request.data.get("semester"), "overwrite": truthy(request.data.get("overwrite")),
                "all_paid": truthy(request.data.get("all_paid")), "source_name": f.name, "source_sheet": sheet}
        useful = {"full_name", "reg_no", "phone", "member_id", "mpesa_code", "amount"}
        blocking = "" if useful & set(mapping) else "Match at least one useful column, such as Name, Registration number, Phone, or Amount."
        items = [] if blocking else plan(rows, header_idx, mapping, opts)
        return f, sheets, sheet, rows, header_idx, headers, mapping, items, blocking


class ImportPreviewView(ImportBase):
    def post(self, request):
        f, sheets, sheet, rows, header_idx, headers, mapping, items, blocking = self.prepare(request)
        body = rows[header_idx + 1:]
        columns = [{"i": i, "name": text(h) or f"Column {i + 1}",
                    "sample": [text(r[i]) for r in body[:60] if i < len(r) and text(r[i])][:3]}
                   for i, h in enumerate(headers[:60])]
        default = Semester.objects.filter(pk=int(request.data["semester"])).first() if str(request.data.get("semester", "")).isdigit() else Semester.current()
        return Response({
            "filename": f.name, "sheets": sheets, "sheet": sheet, "header_row": header_idx, "columns": columns,
            "mapping": mapping, "fields": [{"key": k, "label": l, "required": False} for k, l in FIELDS],
            "semesters": [{"id": s.id, "name": s.name} for s in Semester.objects.all()],
            "semester": default.id if default else None, "blocking": blocking,
            "summary": summarise(items), "rows": [row_json(i) for i in items[:300]],
        })


class ImportApplyView(ImportBase):
    def post(self, request):
        f, sheets, sheet, rows, header_idx, headers, mapping, items, blocking = self.prepare(request)
        if blocking:
            raise ParseError(blocking)
        summary = summarise(items)
        if not (summary["new_members"] or summary["updated_members"] or summary["payments"]):
            raise ParseError("There is nothing to import. Check the preview for problems.")
        with transaction.atomic():
            batch = ImportBatch.objects.create(filename=f.name[:200], created_by=request.user)
            result = apply_plan(items, request.user, batch)
            batch.summary = {**summary, **result}
            batch.save()
        log(request.user, "members_imported", f"{f.name}: {result['members_created']} new, {result['members_updated']} updated, {result['payments_created']} payments")
        return Response({"batch": batch.id, "summary": batch.summary})


class BatchListView(APIView):
    permission_classes = [roles("admin", "treasurer")]

    def get(self, request):
        return Response([{"id": b.id, "filename": b.filename, "created_at": b.created_at, "undone": b.undone, "summary": b.summary,
                          "by": (getattr(b.created_by, "profile", None).full_name if b.created_by and getattr(b.created_by, "profile", None) else "")}
                         for b in ImportBatch.objects.select_related("created_by")[:10]])


class BatchUndoView(APIView):
    permission_classes = [roles("admin", "treasurer")]

    def post(self, request, pk):
        b = get_object_or_404(ImportBatch, pk=pk)
        if b.undone:
            return Response({"detail": ["This import was already undone."]}, status=400)
        with transaction.atomic():
            removed = b.memberships.count()
            b.memberships.all().delete()
            for p in b.profiles.filter(user__isnull=True):
                if not p.memberships.exists():
                    p.delete()
            b.undone = True
            b.save()
        log(request.user, "import_undone", f"{b.filename}: {removed} payments removed")
        return Response({"ok": True, "payments_removed": removed})


class ExportView(APIView):
    permission_classes = [roles(*STAFF)]

    def get(self, request):
        buf = io.BytesIO()
        build_workbook(role_of(request.user)).save(buf)
        r = HttpResponse(buf.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        r["Content-Disposition"] = f'attachment; filename="kusoppa-members-{timezone.localdate()}.xlsx"'
        log(request.user, "members_exported", "")
        return r

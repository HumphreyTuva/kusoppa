import json
import urllib.error
import urllib.parse
import urllib.request
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password as run_password_validators
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db.models import Q
from django.db import IntegrityError, transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import mixins, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import (BoardMember, ClubLink, Event, Membership, PolicyBrief, Profile, Semester, SiteSettings, log,
                     membership_status, wa_link)
from .permissions import role_of
from .serializers import (BoardSerializer, BriefSerializer, ClubLinkSerializer, ContactSerializer, EventSerializer,
                          MembershipSerializer, PaySerializer, RegisterSerializer, clean_phone)


def fail(msg, code=400):
    return Response({"detail": [msg]}, status=code)


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Event.objects.filter(is_published=True)
    serializer_class = EventSerializer


class BriefViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PolicyBrief.objects.filter(is_published=True)
    serializer_class = BriefSerializer


class BoardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BoardMember.objects.all()
    serializer_class = BoardSerializer


class ContactViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ContactSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "forms"

    def perform_create(self, serializer):
        c = serializer.save()
        send_mail(f"[Website] {c.subject}", f"From: {c.name} <{c.email}>\n\n{c.message}",
                  settings.DEFAULT_FROM_EMAIL, [settings.CONTACT_EMAIL], fail_silently=True)


class Throttled:
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


def me_payload(user):
    p = getattr(user, "profile", None)
    sem = Semester.current()
    status = membership_status(p, sem) if p else "none"
    reason = ""
    if p and sem and status == "rejected":
        last = p.memberships.filter(semester=sem).order_by("-submitted_at").first()
        reason = last.reject_reason if last else ""
    links = ClubLink.objects.filter(is_active=True)
    if not (status == "active" or role_of(user) in ("admin", "treasurer", "secretary")):
        links = links.filter(members_only=False)
    history = MembershipSerializer(p.memberships.select_related("semester", "member"), many=True).data if p else []
    return {
        "email": user.email, "role": role_of(user),
        "full_name": (p.full_name if p else "") or user.email,
        "reg_no": p.reg_no if p else None, "phone": p.phone if p else "",
        "year_of_study": p.year_of_study if p else "", "course": p.course if p else "",
        "leadership_interest": p.leadership_interest if p else "",
        "links": ClubLinkSerializer(links, many=True).data,
        "membership": {"status": status, "semester": sem.name if sem else None,
                       "semester_ends": sem.ends_on if sem else None, "reject_reason": reason, "history": history},
    }


class RegisterView(Throttled, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not SiteSettings.get().registration_open:
            return fail("Registration is currently closed.", 403)
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        with transaction.atomic():
            user = User.objects.create_user(username=d["email"], email=d["email"], password=d["password"])
            fields = dict(full_name=d["full_name"], phone=d.get("phone", ""), year_of_study=d.get("year_of_study", ""),
                          course=d.get("course", ""), leadership_interest=d["leadership_interest"])
            claimed = Profile.objects.filter(reg_no=d["reg_no"], user__isnull=True).first()
            if not claimed and d.get("phone"):
                phone_matches = list(Profile.objects.filter(phone=d["phone"], user__isnull=True, role="member")
                                     .filter(Q(reg_no__isnull=True) | Q(reg_no="") | Q(reg_no=d["reg_no"]))[:2])
                if len(phone_matches) == 1:
                    claimed = phone_matches[0]
            if claimed:  # imported earlier: attach the new account to the existing record and payments
                for k, v in fields.items():
                    setattr(claimed, k, v)
                if not claimed.reg_no:
                    claimed.reg_no = d["reg_no"]
                claimed.user = user
                claimed.save()
            else:
                Profile.objects.create(user=user, reg_no=d["reg_no"], **fields)
        return Response({"token": Token.objects.get_or_create(user=user)[0].key}, status=201)


class LoginView(Throttled, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        u = authenticate(username=str(request.data.get("email", "")).lower().strip(),
                         password=str(request.data.get("password", "")))
        if not u:
            return fail("Incorrect email or password.")
        return Response({"token": Token.objects.get_or_create(user=u)[0].key})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.auth:
            request.auth.delete()
        return Response(status=204)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(me_payload(request.user))

    def patch(self, request):
        p = getattr(request.user, "profile", None)
        if not p:
            return fail("Profile not found.")
        d = request.data
        if "full_name" in d:
            name = str(d["full_name"]).strip()
            if not name:
                return fail("Full name cannot be empty.")
            p.full_name = name[:120]
        if "phone" in d:
            try:
                p.phone = clean_phone(d["phone"])
            except Exception as e:
                return fail(str(e))
        if "year_of_study" in d:
            p.year_of_study = str(d["year_of_study"]).strip()[:20]
        if "course" in d:
            p.course = str(d["course"]).strip()[:120]
        if "leadership_interest" in d and d["leadership_interest"] in ["yes", "maybe", "no", ""]:
            p.leadership_interest = d["leadership_interest"]
        if "reg_no" in d:
            reg = str(d["reg_no"]).upper().strip()
            if reg and Profile.objects.filter(reg_no=reg).exclude(pk=p.pk).exists():
                return fail("That registration number is already registered to another account.")
            p.reg_no = reg or None
        p.save()

        # Update password if requested
        if "new_password" in d and d["new_password"]:
            try:
                run_password_validators(d["new_password"], user=request.user)
            except DjangoValidationError as ve:
                return fail(" ".join(ve.messages))
            request.user.set_password(d["new_password"])
            request.user.save()
            log(request.user, "password_changed", "Password updated from account portal")

        log(request.user, "profile_updated", f"{p.full_name} updated their details")
        return Response(me_payload(request.user))


class GoogleAuthView(Throttled, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("credential") or request.data.get("token")
        if not token:
            return fail("Google credential is required.")
        if not settings.GOOGLE_CLIENT_ID:
            return fail("Google sign-in is not configured on the server.", 503)
        if not isinstance(token, str) or len(token) > 10000:
            return fail("Google credential is not valid.")

        try:
            query = urllib.parse.urlencode({"id_token": token})
            req = urllib.request.Request(
                f"https://oauth2.googleapis.com/tokeninfo?{query}",
                headers={"User-Agent": "KUSOPPA-Auth/1.0"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                info = json.loads(resp.read().decode())
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError):
            return fail("Google token could not be verified.")

        if not isinstance(info, dict):
            return fail("Google token could not be verified.")
        if info.get("aud") != settings.GOOGLE_CLIENT_ID:
            return fail("Google sign-in credential was issued for a different application.")
        if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            return fail("Google sign-in credential has an invalid issuer.")
        if str(info.get("email_verified", "")).lower() != "true":
            return fail("Google account must have a verified email address.")

        email = (info.get("email") or "").lower().strip()
        if not email:
            return fail("Google account has no verified email address.")

        with transaction.atomic():
            user, created = User.objects.get_or_create(username=email, defaults={"email": email})
            if not user.is_active:
                return fail("This account is disabled. Contact a KUSOPPA administrator.", 403)
            if created:
                user.email = email
                user.save(update_fields=["email"])
            if not Profile.objects.filter(user=user).exists():
                name = info.get("name") or user.get_full_name() or email.split("@")[0]
                Profile.objects.create(user=user, full_name=name, role="member")

        tok, _ = Token.objects.get_or_create(user=user)
        log(user, "google_login", f"{user.email} signed in with Google")
        return Response({"token": tok.key, "me": me_payload(user)})


class ResetRequestView(Throttled, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).lower().strip()
        u = User.objects.filter(username=email, is_active=True).first()
        if u:
            link = (f"{settings.FRONTEND_URL}/reset-password?uid={urlsafe_base64_encode(force_bytes(u.pk))}"
                    f"&token={default_token_generator.make_token(u)}")
            send_mail("Reset your KUSOPPA password",
                      f"Hello,\n\nUse this link to choose a new password:\n{link}\n\nIf you did not ask for this, ignore this email.",
                      settings.DEFAULT_FROM_EMAIL, [u.email], fail_silently=True)
        return Response({"ok": True})  # same answer either way, so emails cannot be probed


class ResetConfirmView(Throttled, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            u = User.objects.get(pk=force_str(urlsafe_base64_decode(str(request.data.get("uid", "")))))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return fail("This reset link is not valid.")
        if not default_token_generator.check_token(u, str(request.data.get("token", ""))):
            return fail("This reset link has expired. Please request a new one.")
        pw = str(request.data.get("password", ""))
        try:
            run_password_validators(pw, u)
        except DjangoValidationError as e:
            return Response({"detail": list(e.messages)}, status=400)
        u.set_password(pw)
        u.save()
        Token.objects.filter(user=u).delete()
        return Response({"ok": True})


class InfoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        st, sem = SiteSettings.get(), Semester.current()
        return Response({"pochi_number": st.pochi_number, "pochi_name": st.pochi_name, "fee_new": st.fee_new,
                         "fee_renewal": st.fee_renewal, "registration_open": st.registration_open,
                         "payment_note": st.payment_note, "semester": sem.name if sem else None,
                         "whatsapp_number": st.whatsapp_number, "whatsapp_link": wa_link(st.whatsapp_number, st.whatsapp_message),
                         "links": ClubLinkSerializer(ClubLink.objects.filter(is_active=True, members_only=False), many=True).data,
                         "semester_ends": sem.ends_on if sem else None})


class PayView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "forms"

    def post(self, request):
        p = getattr(request.user, "profile", None)
        if not p:
            return fail("This account has no member profile.")
        sem = Semester.current()
        if not sem:
            return fail("No semester is open yet. Please check back soon.")
        s = PaySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if p.memberships.filter(semester=sem, status__in=["pending", "approved"]).exists():
            return fail(f"You already have a pending or approved membership for {sem.name}.")
        st = SiteSettings.get()
        renewal = p.memberships.filter(status="approved").exists()
        try:
            m = Membership.objects.create(member=p, semester=sem, kind="renewal" if renewal else "new",
                                          amount=st.fee_renewal if renewal else st.fee_new,
                                          mpesa_code=s.validated_data["mpesa_code"])
        except IntegrityError:
            return fail("That payment could not be saved. Check the code and try again.")
        log(request.user, "payment_submitted", f"{p.full_name} Ksh {m.amount} code {m.mpesa_code}")
        return Response(MembershipSerializer(m).data, status=201)

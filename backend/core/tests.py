import io
import json
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import AuditLog, Profile, Semester, SiteSettings


class MembershipFlow(APITestCase):
    def setUp(self):
        cache.clear()
        t = timezone.localdate()
        self.sem = Semester.objects.create(name="Test semester", starts_on=t - timedelta(days=10), ends_on=t + timedelta(days=80))
        st = SiteSettings.get()
        st.pochi_number, st.pochi_name = "0712345678", "Treasurer"
        st.save()
        self.admin = User.objects.create_superuser("admin@x.com", "admin@x.com", "adminpass123")
        self.treasurer = self.staff("treasurer@x.com", "treasurer")
        self.secretary = self.staff("secretary@x.com", "secretary")

    def staff(self, email, role):
        u = User.objects.create_user(email, email, "staffpass123")
        Profile.objects.create(user=u, full_name=role.title(), role=role)
        return u

    def register(self, email="m@x.com", reg="p101/0001/2024"):
        r = self.client.post("/api/auth/register/", {"full_name": "Amina Member", "reg_no": reg, "email": email,
                                                     "password": "memberpass123", "year_of_study": "Year 2",
                                                     "phone": "0712 345 678", "leadership_interest": "maybe"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["token"]

    def as_member(self, token):
        self.client.force_authenticate(None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    def as_staff(self, user):
        self.client.credentials()
        self.client.force_authenticate(user)

    def me(self):
        return self.client.get("/api/auth/me/").data

    def test_register_pay_approve(self):
        tok = self.register()
        self.as_member(tok)
        self.assertEqual(self.me()["membership"]["status"], "unpaid")
        self.assertEqual(self.client.post("/api/membership/pay/", {"mpesa_code": "abc"}, format="json").status_code, 400)
        r = self.client.post("/api/membership/pay/", {"mpesa_code": "sgh7k2l9qx"}, format="json")
        self.assertEqual((r.status_code, r.data["amount"], r.data["kind"]), (201, 150, "new"))
        self.assertEqual(self.me()["membership"]["status"], "pending")
        self.assertEqual(self.client.post("/api/membership/pay/", {"mpesa_code": "SGH7K2L9QY"}, format="json").status_code, 400)
        self.as_member(self.register("b@x.com", "P101/0002/2024"))
        self.assertEqual(self.client.post("/api/membership/pay/", {"mpesa_code": "SGH7K2L9QX"}, format="json").status_code, 400)
        self.as_staff(self.treasurer)
        pid = self.client.get("/api/manage/payments/?status=pending").data[0]["id"]
        self.assertEqual(self.client.post(f"/api/manage/payments/{pid}/approve/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/manage/payments/{pid}/approve/").status_code, 400)
        self.assertTrue(any("active" in m.subject for m in mail.outbox))
        self.as_member(tok)
        self.assertEqual(self.me()["membership"]["status"], "active")

    def test_renewal_amount(self):
        tok = self.register()
        self.as_member(tok)
        self.client.post("/api/membership/pay/", {"mpesa_code": "AAAAAAAAA1"}, format="json")
        self.as_staff(self.treasurer)
        self.client.post(f"/api/manage/payments/{self.client.get('/api/manage/payments/').data[0]['id']}/approve/")
        t = timezone.localdate()
        self.sem.starts_on, self.sem.ends_on = t - timedelta(days=100), t - timedelta(days=1)
        self.sem.save()
        Semester.objects.create(name="Next", starts_on=t, ends_on=t + timedelta(days=90))
        self.as_member(tok)
        self.assertEqual(self.me()["membership"]["status"], "expired")
        r = self.client.post("/api/membership/pay/", {"mpesa_code": "BBBBBBBBB2"}, format="json")
        self.assertEqual((r.data["kind"], r.data["amount"]), ("renewal", 50))

    def test_reject_needs_reason(self):
        self.as_member(self.register())
        self.client.post("/api/membership/pay/", {"mpesa_code": "CCCCCCCCC3"}, format="json")
        self.as_staff(self.treasurer)
        pid = self.client.get("/api/manage/payments/").data[0]["id"]
        self.assertEqual(self.client.post(f"/api/manage/payments/{pid}/reject/", {}, format="json").status_code, 400)
        self.assertEqual(self.client.post(f"/api/manage/payments/{pid}/reject/", {"reason": "Code not found"}, format="json").status_code, 200)

    def test_permissions(self):
        tok = self.register()
        self.as_member(tok)
        self.assertEqual(self.client.get("/api/manage/payments/").status_code, 403)
        self.assertEqual(self.client.get("/api/manage/overview/").status_code, 403)
        self.as_staff(self.secretary)
        self.assertEqual(self.client.get("/api/manage/payments/").status_code, 403)
        self.assertEqual(self.client.get("/api/manage/members/").status_code, 200)
        self.as_staff(self.treasurer)
        self.assertEqual(self.client.get("/api/manage/users/").status_code, 403)
        self.assertEqual(self.client.post("/api/manage/events/", {}, format="json").status_code, 403)
        self.as_staff(self.admin)
        self.assertEqual(self.client.get("/api/manage/users/").status_code, 200)
        self.assertEqual(self.client.get("/api/manage/overview/").data["total_members"], 1)

    def test_settings_change_is_audited_and_notified(self):
        self.as_staff(self.treasurer)
        r = self.client.patch("/api/manage/settings/", {"pochi_number": "0799 111 222"}, format="json")
        self.assertEqual((r.status_code, r.data["pochi_number"]), (200, "0799111222"))
        self.assertTrue(AuditLog.objects.filter(action="settings_changed").exists())
        self.assertTrue(any("payment details" in m.subject for m in mail.outbox))
        self.assertEqual(self.client.patch("/api/manage/settings/", {"pochi_number": "abc"}, format="json").status_code, 400)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/membership/info/").data["pochi_number"], "0799111222")

    def test_import_then_claim(self):
        self.as_staff(self.treasurer)
        csv_bytes = b"Timestamp,Name,Year,Reg No.,M-Pesa code\n1/1,Old Member,Year 3,P101/0009/2022,QWERTY1234\n1/1,,Year 3,,\n"
        up = lambda: {"file": SimpleUploadedFile("f.csv", csv_bytes)}
        r = self.client.post("/api/manage/import/apply/", up(), format="multipart")
        self.assertEqual((r.data["summary"]["new_members"], r.data["summary"]["problems"], r.data["summary"]["payments"]), (1, 1, 1))
        self.assertEqual(self.client.post("/api/manage/import/apply/", up(), format="multipart").status_code, 400)
        self.as_member(self.register("old@x.com", "p101/0009/2022"))
        self.assertEqual(self.me()["membership"]["status"], "active")
        self.assertEqual(Profile.objects.filter(reg_no="P101/0009/2022").count(), 1)

    def test_import_then_claim_by_phone(self):
        self.as_staff(self.treasurer)
        csv_bytes = b"Name,Phone,Amount\nPhone Only,0712345678,150\n"
        r = self.client.post("/api/manage/import/apply/", {"file": SimpleUploadedFile("f.csv", csv_bytes), "all_paid": "true"}, format="multipart")
        self.assertEqual((r.status_code, r.data["summary"]["new_members"], r.data["summary"]["payments"]), (200, 1, 1))
        self.as_member(self.register("phone@x.com", "P101/0099/2026"))
        self.assertEqual(self.me()["membership"]["status"], "active")
        self.assertEqual(Profile.objects.filter(phone="0712345678").count(), 1)
        self.assertEqual(Profile.objects.get(phone="0712345678").reg_no, "P101/0099/2026")

    @patch("core.views.urllib.request.urlopen")
    def test_google_sign_in_verifies_audience_and_creates_member_account(self, urlopen):
        info = {
            "aud": "kusoppa-client-id",
            "iss": "https://accounts.google.com",
            "email_verified": "true",
            "email": "Google.User@example.com",
            "name": "Google User",
        }
        response = urlopen.return_value.__enter__.return_value
        response.read.return_value = json.dumps(info).encode()
        with self.settings(GOOGLE_CLIENT_ID="kusoppa-client-id"):
            result = self.client.post("/api/auth/google/", {"credential": "signed-id-token"}, format="json")

        self.assertEqual(result.status_code, 200, result.data)
        user = User.objects.get(username="google.user@example.com")
        self.assertEqual(user.email, "google.user@example.com")
        self.assertEqual(user.profile.full_name, "Google User")
        self.assertEqual(user.profile.role, "member")
        self.assertTrue(result.data["token"])

    @patch("core.views.urllib.request.urlopen")
    def test_google_sign_in_rejects_wrong_audience_or_unverified_email(self, urlopen):
        response = urlopen.return_value.__enter__.return_value
        with self.settings(GOOGLE_CLIENT_ID="kusoppa-client-id"):
            response.read.return_value = json.dumps({
                "aud": "another-client",
                "iss": "https://accounts.google.com",
                "email_verified": "true",
                "email": "wrong.audience@example.com",
            }).encode()
            wrong_audience = self.client.post("/api/auth/google/", {"credential": "bad-token"}, format="json")
            self.assertEqual(wrong_audience.status_code, 400)
            self.assertFalse(User.objects.filter(username="wrong.audience@example.com").exists())

            response.read.return_value = json.dumps({
                "aud": "kusoppa-client-id",
                "iss": "https://accounts.google.com",
                "email_verified": "false",
                "email": "unverified@example.com",
            }).encode()
            unverified = self.client.post("/api/auth/google/", {"credential": "unverified-token"}, format="json")
            self.assertEqual(unverified.status_code, 400)
            self.assertFalse(User.objects.filter(username="unverified@example.com").exists())

    @patch("core.views.urllib.request.urlopen")
    def test_google_sign_in_reports_missing_server_configuration(self, urlopen):
        with self.settings(GOOGLE_CLIENT_ID=""):
            result = self.client.post("/api/auth/google/", {"credential": "signed-id-token"}, format="json")
        self.assertEqual(result.status_code, 503)
        urlopen.assert_not_called()

    def test_registration_rules(self):
        self.register()
        r = self.client.post("/api/auth/register/", {"full_name": "X", "reg_no": "P101/0001/2024", "email": "z@x.com", "password": "memberpass123", "phone": "0700000000", "leadership_interest": "no"}, format="json")
        self.assertEqual(r.status_code, 400)
        st = SiteSettings.get(); st.registration_open = False; st.save()
        r = self.client.post("/api/auth/register/", {"full_name": "X", "reg_no": "P1", "email": "q@x.com", "password": "memberpass123", "phone": "0700000000", "leadership_interest": "no"}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "M@X.com", "password": "memberpass123"}, format="json").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "m@x.com", "password": "wrong"}, format="json").status_code, 400)

    def test_phone_and_leadership_required(self):
        base = {"full_name": "A", "reg_no": "P9", "email": "n@x.com", "password": "memberpass123"}
        for extra, field in [({"leadership_interest": "yes"}, "phone"), ({"phone": "0712345678"}, "leadership_interest"),
                             ({"phone": "12", "leadership_interest": "yes"}, "phone")]:
            r = self.client.post("/api/auth/register/", {**base, **extra}, format="json")
            self.assertEqual(r.status_code, 400)
            self.assertIn(field, r.data)
        tok = self.register()
        self.as_member(tok)
        self.assertEqual(self.me()["leadership_interest"], "maybe")
        self.as_staff(self.secretary)
        self.assertEqual(self.client.get("/api/manage/overview/").data["leadership_interested"], 1)
        row = self.client.get("/api/manage/members/").data[0]
        self.assertEqual((row["leadership_interest"], row["phone"]), ("maybe", "0712345678"))

    def test_whatsapp_and_links(self):
        self.as_staff(self.secretary)
        self.assertEqual(self.client.post("/api/manage/links/", {"label": "WhatsApp group", "url": "https://chat.whatsapp.com/abc", "members_only": True}, format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/manage/links/", {"label": "Instagram", "url": "https://instagram.com/kusoppa", "members_only": False}, format="json").status_code, 201)
        self.assertEqual(self.client.patch("/api/manage/settings/", {"whatsapp_number": "0712345678"}, format="json").status_code, 403)
        self.as_staff(self.admin)
        self.client.patch("/api/manage/settings/", {"whatsapp_number": "0712 345 678", "whatsapp_message": "Hi KUSOPPA"}, format="json")
        self.client.force_authenticate(None)
        info = self.client.get("/api/membership/info/").data
        self.assertTrue(info["whatsapp_link"].startswith("https://wa.me/254712345678?text=Hi"))
        self.assertEqual([l["label"] for l in info["links"]], ["Instagram"])
        tok = self.register()
        self.as_member(tok)
        self.assertEqual(len(self.me()["links"]), 1)
        self.as_staff(self.treasurer)
        pid = None
        self.as_member(tok)
        self.client.post("/api/membership/pay/", {"mpesa_code": "DDDDDDDDD4"}, format="json")
        self.as_staff(self.treasurer)
        pid = self.client.get("/api/manage/payments/").data[0]["id"]
        self.client.post(f"/api/manage/payments/{pid}/approve/")
        self.as_member(tok)
        self.assertEqual(sorted(l["label"] for l in self.me()["links"]), ["Instagram", "WhatsApp group"])

    def test_local_frontend_origins_are_allowed_only_in_debug_mode(self):
        response = self.client.get("/api/membership/info/", HTTP_ORIGIN="http://127.0.0.1:5174")
        self.assertEqual(response["Access-Control-Allow-Origin"], "http://127.0.0.1:5174")
        with self.settings(CORS_ALLOWED_ORIGIN_REGEXES=[]):
            production_response = self.client.get("/api/membership/info/", HTTP_ORIGIN="http://127.0.0.1:5174")
        self.assertNotIn("Access-Control-Allow-Origin", production_response)

import re
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password as run_password_validators
from rest_framework import serializers
from .models import (BoardMember, ClubLink, ContactMessage, Event, Membership, PolicyBrief, Profile, Semester,
                     SiteSettings, membership_status)

def clean_phone(v):
    v = re.sub(r"[\s-]", "", v or "")
    if v and not re.fullmatch(r"\+?\d{9,15}", v):
        raise serializers.ValidationError("Enter a valid phone number, for example 0712345678.")
    return v


# ---------- public ----------
class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        exclude = ["is_published"]


class BriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyBrief
        exclude = ["is_published"]


class BoardSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardMember
        fields = ["id", "name", "role", "photo", "bio", "term", "is_current"]


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["name", "email", "subject", "message"]


# ---------- accounts and payments ----------
class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120)
    reg_no = serializers.CharField(max_length=40)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30)
    year_of_study = serializers.CharField(max_length=20, required=False, allow_blank=True)
    course = serializers.CharField(max_length=120, required=False, allow_blank=True)
    leadership_interest = serializers.ChoiceField(choices=["yes", "maybe", "no"],
                                                  error_messages={"invalid_choice": "Please choose an answer.", "required": "Please choose an answer."})
    password = serializers.CharField(write_only=True)

    def validate_phone(self, v):
        v = clean_phone(v)
        if not v:
            raise serializers.ValidationError("A phone number is required.")
        return v

    def validate_email(self, v):
        v = v.lower().strip()
        if User.objects.filter(username=v).exists():
            raise serializers.ValidationError("An account with this email already exists. Try logging in.")
        return v

    def validate_reg_no(self, v):
        v = v.upper().strip()
        if Profile.objects.filter(reg_no=v, user__isnull=False).exists():
            raise serializers.ValidationError("This registration number already has an account. Log in or reset your password.")
        return v

    def validate_password(self, v):
        run_password_validators(v)
        return v


class PaySerializer(serializers.Serializer):
    mpesa_code = serializers.CharField()

    def validate_mpesa_code(self, v):
        v = re.sub(r"\s+", "", v).upper()
        if not re.fullmatch(r"[A-Z0-9]{10}", v):
            raise serializers.ValidationError("An M-Pesa code is 10 letters and numbers, for example SGH7K2L9QX.")
        if Membership.objects.filter(mpesa_code=v).exists():
            raise serializers.ValidationError("That M-Pesa code has already been submitted.")
        return v


class MembershipSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    reg_no = serializers.CharField(source="member.reg_no", read_only=True)
    semester_name = serializers.CharField(source="semester.name", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "member", "member_name", "reg_no", "semester", "semester_name", "kind", "amount",
                  "status", "mpesa_code", "submitted_at", "reviewed_at", "reject_reason"]


# ---------- staff ----------
class ManageEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = "__all__"


class ManageBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyBrief
        fields = "__all__"


class ManageBoardSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardMember
        fields = "__all__"


class ManageMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = "__all__"
        read_only_fields = ["name", "email", "subject", "message", "created_at"]


class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = ["id", "name", "starts_on", "ends_on"]

    def validate(self, d):
        s, e = d.get("starts_on", getattr(self.instance, "starts_on", None)), d.get("ends_on", getattr(self.instance, "ends_on", None))
        if s and e and e <= s:
            raise serializers.ValidationError({"ends_on": ["The end date must be after the start date."]})
        return d


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ["pochi_number", "pochi_name", "fee_new", "fee_renewal", "registration_open", "payment_note",
                  "whatsapp_number", "whatsapp_message"]

    def validate_pochi_number(self, v):
        return clean_phone(v)

    def validate_whatsapp_number(self, v):
        return clean_phone(v)


class ClubLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubLink
        fields = ["id", "label", "url", "members_only", "is_active", "order"]


class MemberSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    history = MembershipSerializer(source="memberships", many=True, read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "full_name", "email", "reg_no", "phone", "year_of_study", "course", "leadership_interest", "role", "status",
                  "created_at", "history"]
        read_only_fields = ["role", "created_at"]

    def get_email(self, o):
        return o.email

    def get_status(self, o):
        return membership_status(o, self.context.get("semester"))

    def validate_reg_no(self, v):
        return (v or "").upper().strip() or None

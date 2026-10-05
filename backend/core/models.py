from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class Event(models.Model):
    CATEGORIES = [("campus", "Campus"), ("international", "International"),
                  ("academic", "Academic"), ("webinar", "Webinar")]
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORIES, default="campus")
    registration_url = models.URLField(blank=True, help_text="Leave empty if no sign-up is needed")
    image = models.ImageField(upload_to="events/", blank=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["starts_at"]

    def __str__(self):
        return self.title


class PolicyBrief(models.Model):
    TOPICS = [("governance", "Governance"), ("devolution", "Devolution"), ("education", "Education"),
              ("economy", "Economy"), ("youth", "Youth"), ("technology", "Technology")]
    title = models.CharField(max_length=200)
    summary = models.TextField()
    topic = models.CharField(max_length=20, choices=TOPICS)
    author = models.CharField(max_length=120)
    reading_minutes = models.PositiveSmallIntegerField(default=5)
    pdf = models.FileField(upload_to="briefs/", blank=True)
    published_on = models.DateField()
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-published_on"]

    def __str__(self):
        return self.title


class BoardMember(models.Model):
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=120)
    photo = models.ImageField(upload_to="board/", blank=True)
    bio = models.TextField(blank=True)
    term = models.CharField(max_length=20, blank=True, help_text="e.g. 2025/26")
    order = models.PositiveSmallIntegerField(default=0)
    is_current = models.BooleanField(default=True, help_text="Untick to move to the past executives archive")

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return f"{self.name} ({self.role})"


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    subject = models.CharField(max_length=160)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.subject


class ImportBatch(models.Model):
    """One Excel/CSV import, so it can be reviewed and undone as a whole."""
    filename = models.CharField(max_length=200)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    summary = models.JSONField(default=dict)
    undone = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]


class Profile(models.Model):
    """Members and staff. `user` is empty for members imported before they create an account."""
    ROLES = [("member", "Member"), ("secretary", "Secretary"), ("treasurer", "Treasurer"), ("admin", "Admin")]
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="profile")
    full_name = models.CharField(max_length=120)
    reg_no = models.CharField(max_length=40, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    import_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    year_of_study = models.CharField(max_length=20, blank=True)
    course = models.CharField(max_length=120, blank=True)
    LEADERSHIP = [("yes", "Yes"), ("maybe", "Maybe later"), ("no", "Not now")]
    leadership_interest = models.CharField(max_length=5, choices=LEADERSHIP, blank=True)
    role = models.CharField(max_length=12, choices=ROLES, default="member")
    import_batch = models.ForeignKey(ImportBatch, null=True, blank=True, on_delete=models.SET_NULL, related_name="profiles")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def email(self):
        return self.user.email if self.user else ""

    def __str__(self):
        return self.full_name


class Semester(models.Model):
    name = models.CharField(max_length=80)
    starts_on = models.DateField()
    ends_on = models.DateField()

    class Meta:
        ordering = ["-starts_on"]

    def __str__(self):
        return self.name

    @classmethod
    def current(cls):
        """The semester containing today, else the next upcoming one, else the latest."""
        t = timezone.localdate()
        return (cls.objects.filter(starts_on__lte=t, ends_on__gte=t).first()
                or cls.objects.filter(starts_on__gt=t).order_by("starts_on").first()
                or cls.objects.order_by("-starts_on").first())


class SiteSettings(models.Model):
    pochi_number = models.CharField(max_length=20, blank=True)
    pochi_name = models.CharField(max_length=120, blank=True)
    fee_new = models.PositiveIntegerField(default=150)
    fee_renewal = models.PositiveIntegerField(default=50)
    registration_open = models.BooleanField(default=True)
    payment_note = models.TextField(blank=True)
    whatsapp_number = models.CharField(max_length=20, blank=True)
    whatsapp_message = models.CharField(max_length=200, blank=True, default="Hello KUSOPPA, I would like to know more.")

    class Meta:
        verbose_name_plural = "Site settings"

    @classmethod
    def get(cls):
        return cls.objects.get_or_create(pk=1)[0]


class ClubLink(models.Model):
    """Admin-managed links such as the WhatsApp group invite."""
    label = models.CharField(max_length=80)
    url = models.URLField()
    members_only = models.BooleanField(default=True, help_text="Only active members see this link")
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.label


def wa_link(number, message=""):
    """Turn 0712345678 / +254712345678 into a wa.me chat link."""
    d = "".join(c for c in (number or "") if c.isdigit())
    if d.startswith("0"):
        d = "254" + d[1:]
    elif len(d) == 9 and d[0] in "17":
        d = "254" + d
    if not d:
        return ""
    from urllib.parse import quote
    return f"https://wa.me/{d}" + (f"?text={quote(message)}" if message else "")


class Membership(models.Model):
    STATUS = [("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]
    KIND = [("new", "New registration"), ("renewal", "Renewal")]
    member = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="memberships")
    semester = models.ForeignKey(Semester, on_delete=models.PROTECT, related_name="memberships")
    kind = models.CharField(max_length=10, choices=KIND)
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=STATUS, default="pending")
    mpesa_code = models.CharField(max_length=20, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.CharField(max_length=200, blank=True)
    import_batch = models.ForeignKey(ImportBatch, null=True, blank=True, on_delete=models.SET_NULL, related_name="memberships")

    class Meta:
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(fields=["member", "semester"], name="one_live_membership_per_semester",
                                    condition=Q(status__in=["pending", "approved"])),
            models.UniqueConstraint(fields=["mpesa_code"], name="unique_mpesa_code", condition=~Q(mpesa_code="")),
        ]

    def __str__(self):
        return f"{self.member} {self.semester} {self.status}"


class AuditLog(models.Model):
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    actor_name = models.CharField(max_length=120, blank=True)
    action = models.CharField(max_length=60)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


def log(user, action, detail=""):
    ok = bool(user and user.is_authenticated)
    name = ""
    if ok:
        p = getattr(user, "profile", None)
        name = (p.full_name if p else "") or user.email or user.username
    AuditLog.objects.create(actor=user if ok else None, actor_name=name, action=action, detail=detail[:1000])


def membership_status(profile, semester):
    """active / pending / rejected for the current semester, else expired / unpaid."""
    ms = list(profile.memberships.all())
    if semester:
        cur = sorted([m for m in ms if m.semester_id == semester.id], key=lambda m: m.submitted_at, reverse=True)
        if cur:
            return "active" if cur[0].status == "approved" else cur[0].status
    return "expired" if any(m.status == "approved" for m in ms) else "unpaid"


@receiver(post_save, sender=User)
def ensure_admin_profile(sender, instance, created, **kwargs):
    if instance.is_superuser and not hasattr(instance, "profile"):
        Profile.objects.create(user=instance, full_name=instance.get_full_name() or instance.username, role="admin")

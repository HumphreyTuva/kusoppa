from django.contrib import admin
from .models import (AuditLog, BoardMember, ClubLink, ContactMessage, Event, Membership, PolicyBrief, Profile, Semester,
                     SiteSettings)

admin.site.site_header = "KUSOPPA developer admin"
from .models import ImportBatch
for m in (ImportBatch, ClubLink, Event, PolicyBrief, BoardMember, ContactMessage, Profile, Semester, SiteSettings, Membership, AuditLog):
    admin.site.register(m)

from django.contrib import admin
from .models import Application, Job, Profile

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "location", "type", "is_active", "employer", "created")
    list_filter = ("type", "is_active", "location")
    search_fields = ("title", "company")
    list_editable = ("is_active",)

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("applicant", "job", "status", "created")
    list_filter = ("status",)

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "company")
    list_filter = ("role",)

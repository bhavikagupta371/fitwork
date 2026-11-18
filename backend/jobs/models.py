from django.conf import settings
from django.db import models

class Profile(models.Model):
    ROLES = [("applicant", "Applicant"), ("employer", "Employer")]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=10, choices=ROLES, default="applicant")
    company = models.CharField(max_length=120, blank=True)
    def __str__(self): return f"{self.user.username} ({self.role})"

class Job(models.Model):
    TYPES = [(t, t) for t in ["Full-time", "Part-time", "Contract", "Internship"]]
    employer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=150)
    company = models.CharField(max_length=120)
    location = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPES, default="Full-time")
    salary = models.CharField(max_length=60, blank=True)
    skills = models.CharField(max_length=300, blank=True, help_text="Comma separated, e.g. Python, Django, SQL")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    class Meta: ordering = ["-created"]
    def __str__(self): return f"{self.title} at {self.company}"

class Application(models.Model):
    STATUS = [("applied", "Applied"), ("shortlisted", "Shortlisted"), ("rejected", "Rejected")]
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    note = models.TextField(blank=True)
    skills = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=12, choices=STATUS, default="applied")
    created = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ("job", "applicant")
        ordering = ["-created"]
    def __str__(self): return f"{self.applicant.username} -> {self.job}"

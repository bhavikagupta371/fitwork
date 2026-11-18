from django.urls import path
from . import views as v
urlpatterns = [
    path("register/", v.register), path("login/", v.login), path("me/", v.profile),
    path("jobs/", v.jobs), path("jobs/<int:pk>/apply/", v.apply), path("jobs/<int:pk>/applicants/", v.applicants),
    path("my-jobs/", v.my_jobs), path("my-applications/", v.my_applications), path("applications/<int:pk>/", v.set_status),
]

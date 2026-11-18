from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Application, Job, Profile

def role(u):
    p = getattr(u, "profile", None)
    return p.role if p else "admin"

def me(u):
    t, _ = Token.objects.get_or_create(user=u)
    p = getattr(u, "profile", None)
    return {"token": t.key, "username": u.username, "email": u.email, "role": role(u), "company": p.company if p else ""}

def err(m, s=400): return Response({"error": m}, status=s)
def need(request, r):
    if not request.user.is_authenticated: return err("Please log in.", 401)
    if role(request.user) != r: return err(f"Only {r}s can do this.", 403)

def split(s): return [x.strip() for x in s.split(",") if x.strip()]

def jobj(j, count=False):
    d = {"id": j.id, "title": j.title, "company": j.company, "location": j.location, "type": j.type,
         "salary": j.salary, "description": j.description, "skills": split(j.skills), "active": j.is_active}
    if count: d["applicants"] = j.applications.count()
    return d

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    d = request.data
    u, pw, r = (d.get("username") or "").strip(), d.get("password") or "", d.get("role")
    if r not in ("applicant", "employer"): return err("Choose applicant or employer.")
    if not u or len(pw) < 6: return err("Username is required and the password needs 6 or more characters.")
    if User.objects.filter(username__iexact=u).exists(): return err("That username is taken.")
    user = User.objects.create_user(u, d.get("email", ""), pw)
    Profile.objects.create(user=user, role=r, company=(d.get("company") or "") if r == "employer" else "")
    return Response(me(user), status=201)

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    user = authenticate(username=request.data.get("username"), password=request.data.get("password"))
    return Response(me(user)) if user else err("Wrong username or password.", 401)

@api_view(["GET"])
def profile(request): return Response(me(request.user))

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def jobs(request):
    if request.method == "GET":
        return Response([jobj(j) for j in Job.objects.filter(is_active=True)])
    if (e := need(request, "employer")): return e
    d = request.data
    if not (d.get("title") and d.get("company") and d.get("location")): return err("Title, company and location are required.")
    j = Job.objects.create(employer=request.user, title=d["title"], company=d["company"], location=d["location"],
        type=d.get("type", "Full-time"), salary=d.get("salary", ""), skills=d.get("skills", ""), description=d.get("description", ""))
    return Response(jobj(j, True), status=201)

@api_view(["GET"])
def my_jobs(request):
    if (e := need(request, "employer")): return e
    return Response([jobj(j, True) for j in request.user.jobs.all()])

@api_view(["GET"])
def applicants(request, pk):
    if (e := need(request, "employer")): return e
    j = request.user.jobs.filter(pk=pk).first()
    if not j: return err("Job not found.", 404)
    return Response([{"id": a.id, "name": a.applicant.username, "email": a.applicant.email, "note": a.note,
        "skills": split(a.skills), "status": a.status, "date": a.created.date().isoformat()} for a in j.applications.all()])

@api_view(["PATCH"])
def set_status(request, pk):
    if (e := need(request, "employer")): return e
    a = Application.objects.filter(pk=pk, job__employer=request.user).first()
    if not a: return err("Application not found.", 404)
    if request.data.get("status") not in dict(Application.STATUS): return err("Invalid status.")
    a.status = request.data["status"]; a.save()
    return Response({"id": a.id, "status": a.status})

@api_view(["POST"])
def apply(request, pk):
    if (e := need(request, "applicant")): return e
    j = Job.objects.filter(pk=pk, is_active=True).first()
    if not j: return err("This job is no longer open.", 404)
    if Application.objects.filter(job=j, applicant=request.user).exists(): return err("You already applied to this job.")
    sk = request.data.get("skills") or []
    Application.objects.create(job=j, applicant=request.user, note=request.data.get("note", ""), skills=", ".join(sk))
    return Response({"ok": True}, status=201)

@api_view(["GET"])
def my_applications(request):
    if (e := need(request, "applicant")): return e
    return Response([{"id": a.id, "job_id": a.job_id, "title": a.job.title, "company": a.job.company,
        "status": a.status, "date": a.created.date().isoformat()} for a in request.user.applications.select_related("job")])

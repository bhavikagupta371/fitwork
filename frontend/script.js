const API=window.API_URL;
const $=s=>document.querySelector(s);
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm=s=>s.trim().toLowerCase();
let auth=store.get("fw_auth",null),skills=store.get("fw_skills",[]),JOBS=[],myApps=[],current=null,mode="login";

async function api(p,o={}){
  const h={"Content-Type":"application/json"};if(auth)h.Authorization="Token "+auth.token;
  let r;try{r=await fetch(API+p,{method:o.method||"GET",headers:h,body:o.body?JSON.stringify(o.body):undefined})}
  catch{throw new Error("Can’t reach the server. Check that the backend is running.")}
  const d=await r.json().catch(()=>({}));
  if(r.status===401&&auth&&!p.includes("login")){logout(true)}
  if(!r.ok)throw new Error(d.error||d.detail||"Something went wrong.");return d}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function view(v){["Jobs","Apps","Dash"].forEach(n=>$("#view"+n).hidden=n!==v);
  if(v==="Jobs")loadJobs();if(v==="Apps")loadApps();if(v==="Dash")loadDash()}
function home(){view(auth?.role==="employer"?"Dash":"Jobs")}

function nav(){const r=auth?.role;
  $("#navJobs").hidden=r==="employer";$("#navApps").hidden=r!=="applicant";$("#navDash").hidden=r!=="employer";
  $("#navAdmin").hidden=r!=="admin";$("#navAdmin").href=API.replace(/\/api\/?$/,"/admin/");
  $("#authBtn").textContent=auth?"Log out":"Log in";
  $("#who").textContent=auth?`${auth.username} · ${r==="employer"?"Employer":r==="admin"?"Admin":"Applicant"}`:""}
function logout(silent){auth=null;store.set("fw_auth",null);myApps=[];nav();if(!silent)toast("Logged out");view("Jobs")}

/* ---------- auth ---------- */
function authMode(m){mode=m;const reg=m==="register";
  $("#roleBox").hidden=!reg;$("#emailBox").hidden=!reg;
  $("#coBox").hidden=!(reg&&document.querySelector("[name=role]:checked").value==="employer");
  $("#tabLogin").setAttribute("aria-pressed",!reg);$("#tabReg").setAttribute("aria-pressed",reg);
  $("#authGo").textContent=reg?"Create account":"Log in";$("#authErr").textContent=""}
function openAuth(m="login",msg=""){authMode(m);if(msg)$("#authErr").textContent=msg;$("#authDlg").showModal()}
$("#authBtn").onclick=()=>auth?logout():openAuth();
$("#tabLogin").onclick=()=>authMode("login");$("#tabReg").onclick=()=>authMode("register");
document.querySelectorAll("[name=role]").forEach(r=>r.onchange=()=>authMode("register"));
$("#authCancel").onclick=()=>$("#authDlg").close();
$("#authForm").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
  try{auth=await api(mode==="register"?"/register/":"/login/",{method:"POST",body:d});store.set("fw_auth",auth);
    $("#authDlg").close();e.target.reset();nav();toast(`Welcome, ${auth.username}`);home()}
  catch(x){$("#authErr").textContent=x.message}};

/* ---------- applicant: job board ---------- */
const allSkills=()=>[...new Set(JOBS.flatMap(j=>j.skills))].sort();
function addSkill(v){v=v.trim();if(!v||skills.some(s=>norm(s)===norm(v)))return;
  skills.push(allSkills().find(s=>norm(s)===norm(v))||v);store.set("fw_skills",skills);renderJobs()}
async function loadJobs(){
  try{JOBS=await api("/jobs/");if(auth?.role==="applicant")myApps=await api("/my-applications/")}
  catch(x){$("#count").textContent=x.message;return}
  $("#skillList").innerHTML=allSkills().map(s=>`<option value="${esc(s)}">`).join("");
  const cur=$("#loc").value;$("#loc").innerHTML='<option value="">All locations</option>'+[...new Set(JOBS.map(j=>j.location))].sort().map(l=>`<option>${esc(l)}</option>`).join("");$("#loc").value=cur;
  renderJobs()}
function score(j){const mine=new Set(skills.map(norm));const hit=j.skills.filter(s=>mine.has(norm(s)));return{hit,pct:j.skills.length?Math.round(hit.length/j.skills.length*100):0}}
function renderJobs(){
  $("#chips").innerHTML=skills.map((s,i)=>`<button class="chip" data-i="${i}" aria-label="Remove ${esc(s)}">${esc(s)}</button>`).join("");
  const q=norm($("#q").value),t=$("#type").value,l=$("#loc").value,done=new Set(myApps.map(a=>a.job_id));
  const list=JOBS.filter(j=>(!q||norm(j.title+" "+j.company).includes(q))&&(!t||j.type===t)&&(!l||j.location===l)).map(j=>({j,...score(j)}));
  if(skills.length)list.sort((a,b)=>b.pct-a.pct);
  $("#count").textContent=`${list.length} open job${list.length===1?"":"s"}`+(skills.length?", best match first":"");
  $("#jobs").innerHTML=list.length?list.map(({j,hit,pct})=>`<li class="job"><div><h2>${esc(j.title)}</h2>
    <p class="meta">${esc(j.company)} · ${esc(j.location)} · ${j.type}</p>
    <div class="tags">${j.skills.map(s=>`<span class="tag ${hit.includes(s)?"has":""}">${esc(s)}</span>`).join("")}</div></div>
    <div class="match">${skills.length?`<div class="pct">${pct}%</div><div class="bar"><i style="width:${pct}%"></i></div><div class="small">${hit.length} of ${j.skills.length} skills</div>`:`<div class="small">Add skills to see your match</div>`}</div>
    <div class="acts"><span class="sal">${esc(j.salary)}</span><button class="primary" data-apply="${j.id}" ${done.has(j.id)?"disabled":""}>${done.has(j.id)?"Applied":"Apply"}</button></div></li>`).join("")
    :`<li class="empty">No open jobs match. Try clearing a filter.</li>`}
$("#skillInput").onkeydown=e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addSkill(e.target.value);e.target.value=""}
  else if(e.key==="Backspace"&&!e.target.value&&skills.length){skills.pop();store.set("fw_skills",skills);renderJobs()}};
$("#chips").onclick=e=>{const b=e.target.closest(".chip");if(b){skills.splice(+b.dataset.i,1);store.set("fw_skills",skills);renderJobs()}};
["#q","#type","#loc"].forEach(s=>$(s).oninput=renderJobs);
$("#jobs").onclick=e=>{const a=e.target.closest("[data-apply]");if(!a)return;
  if(!auth)return openAuth("register","Create an applicant account to apply.");
  if(auth.role!=="applicant")return toast("Only applicant accounts can apply.");
  current=JOBS.find(j=>j.id===+a.dataset.apply);$("#applyTitle").textContent=`Apply to ${current.title}, ${current.company}`;$("#applyErr").textContent="";$("#applyDlg").showModal()};
$("#applyCancel").onclick=()=>$("#applyDlg").close();
$("#applyForm").onsubmit=async e=>{e.preventDefault();
  try{await api(`/jobs/${current.id}/apply/`,{method:"POST",body:{note:new FormData(e.target).get("note"),skills}});
    $("#applyDlg").close();e.target.reset();toast("Application sent");loadJobs()}catch(x){$("#applyErr").textContent=x.message}};

/* ---------- applicant: my applications ---------- */
async function loadApps(){try{myApps=await api("/my-applications/")}catch(x){$("#appList").textContent=x.message;return}
  $("#appList").innerHTML=myApps.length?myApps.map(a=>`<div class="app"><div><strong>${esc(a.title)}</strong><div class="meta">${esc(a.company)} · applied ${a.date}</div></div><span class="badge ${a.status}">${a.status}</span></div>`).join("")
    :'<p class="empty">You haven’t applied to any jobs yet.</p>'}
$("#navApps").onclick=()=>view("Apps");$("#navJobs").onclick=()=>view("Jobs");$("#navDash").onclick=()=>view("Dash");

/* ---------- employer dashboard ---------- */
async function loadDash(){
  const f=$("#jobForm");if(auth&&!f.company.value)f.company.value=auth.company||"";
  try{const js=await api("/my-jobs/");
    $("#myJobs").innerHTML=js.length?js.map(j=>`<li class="job"><div><h2>${esc(j.title)}</h2><p class="meta">${esc(j.company)} · ${esc(j.location)} · ${j.type}</p>
      <div class="tags">${j.skills.map(s=>`<span class="tag">${esc(s)}</span>`).join("")}</div></div>
      <div class="match emp"><div class="pct">${j.applicants}</div><div class="small">applicant${j.applicants===1?"":"s"}</div></div>
      <div class="acts"><span class="sal">${esc(j.salary)}</span><button class="ghost" data-cands="${j.id}">View applicants</button></div>
      <div class="cands" id="c${j.id}" hidden></div></li>`).join(""):'<li class="empty">You haven’t posted a job yet. Use the form above.</li>'}
  catch(x){$("#myJobs").innerHTML=`<li class="empty">${esc(x.message)}</li>`}}
$("#jobForm").onsubmit=async e=>{e.preventDefault();$("#jobErr").textContent="";
  try{await api("/jobs/",{method:"POST",body:Object.fromEntries(new FormData(e.target))});
    const c=e.target.company.value;e.target.reset();e.target.company.value=c;toast("Job published");loadDash()}catch(x){$("#jobErr").textContent=x.message}};
$("#myJobs").onclick=async e=>{const b=e.target.closest("[data-cands]");if(!b)return;
  const box=$("#c"+b.dataset.cands);if(!box.hidden){box.hidden=true;return}
  try{const list=await api(`/jobs/${b.dataset.cands}/applicants/`);
    box.innerHTML=list.length?list.map(a=>`<div class="app"><div><strong>${esc(a.name)}</strong> <span class="small">${esc(a.email)}</span>
      <div class="tags">${a.skills.map(s=>`<span class="tag has">${esc(s)}</span>`).join("")}</div>
      ${a.note?`<div class="small">“${esc(a.note)}”</div>`:""}</div>
      <select data-st="${a.id}" aria-label="Status">${["applied","shortlisted","rejected"].map(s=>`<option ${s===a.status?"selected":""}>${s}</option>`).join("")}</select></div>`).join("")
      :'<p class="small">No applications yet.</p>';box.hidden=false}catch(x){toast(x.message)}};
$("#myJobs").onchange=async e=>{const s=e.target.closest("[data-st]");if(!s)return;
  try{await api(`/applications/${s.dataset.st}/`,{method:"PATCH",body:{status:s.value}});toast("Status updated")}catch(x){toast(x.message)}};

nav();home();

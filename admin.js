const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editingId=null;
const $=s=>document.querySelector(s);

async function check(){const {data:{session}}=await sb.auth.getSession();toggle(!!session);if(session)loadEvents()}
function toggle(on){$("#loginView").classList.toggle("hidden",on);$("#adminView").classList.toggle("hidden",!on)}
$("#loginForm").onsubmit=async e=>{e.preventDefault();const email=$("#email").value.trim(),password=$("#password").value;const {error}=await sb.auth.signInWithPassword({email,password});if(error)return alert(error.message);toggle(true);loadEvents()}
$("#logout").onclick=async()=>{await sb.auth.signOut();toggle(false)}

function applySameDay(){
  const checked=$("#same_day").checked;
  const start=$("#start_date").value;
  $("#end_date").disabled=checked;
  if(checked) $("#end_date").value=start;
}
$("#same_day").addEventListener("change",applySameDay);
$("#start_date").addEventListener("change",()=>{if($("#same_day").checked)$("#end_date").value=$("#start_date").value});

$("#eventForm").onsubmit=async e=>{
  e.preventDefault();
  const start=$("#start_date").value;
  const end=$("#same_day").checked ? start : ($("#end_date").value||null);
  const payload={
    title:$("#title").value.trim(),
    start_date:start,
    end_date:end,
    category:$("#category").value,
    status:$("#status").value,
    location:$("#location").value.trim(),
    description:$("#description").value.trim(),
    detail_url:$("#detail_url").value.trim()||null
  };
  let q=editingId?sb.from("events").update(payload).eq("id",editingId):sb.from("events").insert(payload);
  const {error}=await q;
  if(error)return alert(error.message);
  resetForm();
  loadEvents();
}
function resetForm(){
  editingId=null;
  $("#eventForm").reset();
  $("#end_date").disabled=false;
  $("#saveText").textContent="일정 저장";
  $("#cancelEdit").classList.add("hidden")
}
$("#cancelEdit").onclick=resetForm;

async function loadEvents(){
  const {data,error}=await sb.from("events").select("*").order("start_date");
  if(error)return alert(error.message);
  $("#items").innerHTML="";
  if(!data.length)$("#items").innerHTML='<div class="empty">등록된 일정이 없습니다.</div>';
  data.forEach(addItem)
}
function addItem(e){
  const d=document.createElement("div");
  const sameDay = e.end_date && e.start_date===e.end_date;
  const dateLabel = sameDay ? `${e.start_date} · 당일` : `${e.start_date}${e.end_date?" ~ "+e.end_date:""}`;
  d.className="adminitem";
  d.innerHTML=`<div><h3>${e.title}</h3><p>${dateLabel} · ${e.category} · ${e.status}</p></div><div class="actions"><button class="btn edit">수정</button><button class="btn danger del">삭제</button></div>`;
  d.querySelector(".edit").onclick=()=>{
    editingId=e.id;
    ["title","start_date","category","status","location","description","detail_url"].forEach(k=>$("#"+k).value=e[k]||"");
    $("#end_date").value=e.end_date||"";
    $("#same_day").checked=!!sameDay;
    applySameDay();
    $("#saveText").textContent="수정 저장";
    $("#cancelEdit").classList.remove("hidden");
    scrollTo({top:0,behavior:"smooth"})
  };
  d.querySelector(".del").onclick=async()=>{
    if(!confirm(`"${e.title}" 일정을 삭제할까요?`))return;
    const {error}=await sb.from("events").delete().eq("id",e.id);
    if(error)return alert(error.message);
    loadEvents()
  };
  $("#items").appendChild(d)
}
check();

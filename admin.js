const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let editingId=null, allEvents=[];let customEventColor=null;
const escapeHTML=s=>String(s??" ").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
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
    description:DSCalendarColors.encode($("#description").value.trim(),customEventColor),
    detail_url:$("#detail_url").value.trim()||null
  };
  if(!payload.title)return alert("일정 제목을 입력해 주세요.");
  if(end && end<start)return alert("종료일은 시작일 이후로 선택해 주세요.");
  const saveButton=$("#eventForm button[type=submit]");saveButton.disabled=true;
  let q=editingId?sb.from("events").update(payload).eq("id",editingId):sb.from("events").insert(payload);
  const {error}=await q;
  saveButton.disabled=false;
  if(error)return alert(error.message);
  resetForm();
  $("#saveMessage").textContent="저장했습니다. 공개 일정표에 바로 반영됩니다.";
  loadEvents();
}
function resetForm(){
  editingId=null;
  $("#eventForm").reset();
  customEventColor=null;updateEventColor();
  $("#end_date").disabled=false;
  $("#saveText").textContent="일정 저장";
  $("#cancelEdit").classList.add("hidden")
}
$("#cancelEdit").onclick=resetForm;

async function loadEvents(){
  const {data,error}=await sb.from("events").select("*").order("start_date");
  if(error)return alert(error.message);
  allEvents=(data||[]).map(DSCalendarColors.decode);renderAdminEvents();
}
function addItem(e){
  const d=document.createElement("div");
  const sameDay = e.end_date && e.start_date===e.end_date;
  const dateLabel = sameDay ? `${e.start_date} · 당일` : `${e.start_date}${e.end_date?" ~ "+e.end_date:""}`;
  d.className="adminitem";
  DSCalendarColors.paint(d,e);
  d.innerHTML=`<div><h3>${escapeHTML(e.title)}</h3><p>${dateLabel} · ${e.category} · ${e.status}</p></div><div class="actions"><button class="btn edit">수정</button><button class="btn danger del">삭제</button></div>`;
  d.querySelector(".edit").onclick=()=>{
    editingId=e.id;customEventColor=e.color||null;
    ["title","start_date","category","status","location","description","detail_url"].forEach(k=>$("#"+k).value=e[k]||"");
    updateEventColor();
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

function renderAdminEvents(){const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()),q=$('#adminSearch').value.trim().toLowerCase();const items=allEvents.filter(e=>($('#showPast').checked||(e.end_date||e.start_date)>=today)&&[e.title,e.location,e.category].join(' ').toLowerCase().includes(q));$('#items').replaceChildren();$('#adminMessage').textContent=items.length+'개 일정';if(!items.length)$('#items').textContent='표시할 일정이 없습니다.';items.forEach(addItem)}
$('#adminSearch').oninput=renderAdminEvents;$('#showPast').onchange=renderAdminEvents;

function updateEventColor(){const sample={title:$('#title').value,category:$('#category').value,color:customEventColor};const value=DSCalendarColors.color(sample);$('#eventColor').value=value;$('#eventColorHex').value=value;$('#eventColorHex').setCustomValidity('');const p=$('#eventColorPreview');p.textContent=($('#title').value.trim()||'일정 색상 미리보기')+(customEventColor?' · 직접 선택':' · 자동 색상');p.style.cssText=DSCalendarColors.style(sample,true)}
$('#eventColor').oninput=()=>{customEventColor=$('#eventColor').value;updateEventColor()};$('#eventColorHex').oninput=()=>{const value=$('#eventColorHex').value;if(DSCalendarColors.valid(value)){customEventColor=value.toLowerCase();updateEventColor()}else $('#eventColorHex').setCustomValidity('#과 6자리 색상 코드를 입력해 주세요.')};$('#autoEventColor').onclick=()=>{customEventColor=null;updateEventColor()};$('#title').addEventListener('input',updateEventColor);$('#category').addEventListener('change',updateEventColor);
[['파랑','#0369a1'],['남색','#4338ca'],['초록','#15803d'],['청록','#0f766e'],['주황','#b45309'],['보라','#7e22ce'],['분홍','#be185d'],['회색','#475569']].forEach(([label,color])=>{const b=document.createElement('button');b.type='button';b.className='event-color-swatch';b.style.backgroundColor=color;b.setAttribute('aria-label',label+' 색상');b.title=label;b.onclick=()=>{customEventColor=color;updateEventColor()};$('#eventColorPresets').appendChild(b)});updateEventColor();

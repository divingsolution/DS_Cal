const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const cls={"국내투어":"domestic","해외투어":"overseas","교육":"education","프로과정":"pro"};
let cursor=new Date();cursor.setDate(1);let filter="전체",events=[];

const $=s=>document.querySelector(s);
const dateOnly=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
function occurs(e,d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()),a=dateOnly(e.start_date),b=e.end_date?dateOnly(e.end_date):a;return x>=a&&x<=b}
function dateText(e){const f=new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});return e.end_date?`${f.format(dateOnly(e.start_date))} ~ ${f.format(dateOnly(e.end_date))}`:f.format(dateOnly(e.start_date))}
async function load(){const {data,error}=await sb.from("events").select("*").order("start_date");if(error){alert("일정을 불러오지 못했습니다: "+error.message);return}events=data||[];render()}
function visible(){return filter==="전체"?events:events.filter(e=>e.category===filter)}
function render(){
 const y=cursor.getFullYear(),m=cursor.getMonth();$("#monthTitle").textContent=`${y}년 ${m+1}월`;$("#grid").innerHTML="";$("#list").innerHTML="";
 const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const box=document.createElement("div");box.className="day"+(d.getMonth()!=m?" out":"");box.innerHTML=`<div class="num">${d.getDate()}</div>`;
 visible().filter(e=>occurs(e,d)).slice(0,3).forEach(e=>{const b=document.createElement("button");b.className=`event ${cls[e.category]||""}`;b.innerHTML=`<b>${e.title}</b><small>${e.status}</small>`;b.onclick=()=>openEvent(e);box.appendChild(b)});$("#grid").appendChild(box)}
 const list=visible().filter(e=>{const a=dateOnly(e.start_date),b=e.end_date?dateOnly(e.end_date):a;return b>=new Date(y,m,1)&&a<=new Date(y,m+1,0)}).sort((a,b)=>dateOnly(a.start_date)-dateOnly(b.start_date));
 if(!list.length)$("#list").innerHTML='<div class="empty">등록된 일정이 없습니다.</div>';
 list.forEach(e=>{const b=document.createElement("button");b.className="listitem";b.innerHTML=`<small>${dateText(e)}</small><h3>${e.title}</h3><small>${e.location||""} · ${e.category} · ${e.status}</small>`;b.onclick=()=>openEvent(e);$("#list").appendChild(b)})
}
function openEvent(e){$("#mTitle").textContent=e.title;$("#mInfo").innerHTML=`<div><b>일정</b>　${dateText(e)}</div><div><b>장소</b>　${e.location||"추후 안내"}</div><div><b>상태</b>　${e.status}</div><div><b>안내</b>　${e.description||""}</div>`;const a=$("#mLink");if(e.detail_url){a.href=e.detail_url;a.classList.remove("hidden")}else a.classList.add("hidden");$("#modal").classList.add("open")}
$("#prev").onclick=()=>{cursor.setMonth(cursor.getMonth()-1);render()};$("#next").onclick=()=>{cursor.setMonth(cursor.getMonth()+1);render()};$("#today").onclick=()=>{cursor=new Date();cursor.setDate(1);render()};
document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.filter;render()});
$("#close").onclick=()=>$("#modal").classList.remove("open");$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.remove("open")};
load();

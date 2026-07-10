const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const categoryClass = {
  "국내투어":"domestic",
  "해외투어":"overseas",
  "교육":"education",
  "프로과정":"pro"
};

let cursor = new Date();
cursor.setDate(1);
let filter = "전체";
let events = [];

const $ = s => document.querySelector(s);

function dateOnly(value){
  const [y,m,d] = value.split("-").map(Number);
  return new Date(y,m-1,d);
}
function normalize(date){
  return new Date(date.getFullYear(),date.getMonth(),date.getDate());
}
function range(event){
  const start = dateOnly(event.start_date);
  const end = event.end_date ? dateOnly(event.end_date) : start;
  return {start,end};
}
function dateText(event){
  const f = new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  const {start,end} = range(event);
  return start.getTime() === end.getTime()
    ? `${f.format(start)} · 당일`
    : `${f.format(start)} ~ ${f.format(end)}`;
}
function visibleEvents(){
  return filter === "전체" ? events : events.filter(e => e.category === filter);
}
function statusClass(event){
  const today = normalize(new Date());
  const {end} = range(event);
  if(end < today) return "ended";
  if(event.status === "마감임박") return "urgent";
  if(event.status === "마감") return "closed";
  return "open";
}
function statusLabel(event){
  const cls = statusClass(event);
  if(cls === "ended") return "종료";
  return event.status || "모집중";
}
async function load(){
  const {data,error} = await sb.from("events").select("*").order("start_date");
  if(error){
    alert("일정을 불러오지 못했습니다: "+error.message);
    return;
  }
  events = data || [];
  render();
}
function calendarStart(year,month){
  const first = new Date(year,month,1);
  return new Date(year,month,1-first.getDay());
}
function weekDates(start,weekIndex){
  return Array.from({length:7},(_,i)=>{
    const d = new Date(start);
    d.setDate(start.getDate()+weekIndex*7+i);
    return d;
  });
}
function buildSegments(days,items){
  const ws = normalize(days[0]);
  const we = normalize(days[6]);
  const segments = items.map(event=>{
    const {start,end} = range(event);
    if(end < ws || start > we) return null;
    const a = start < ws ? ws : start;
    const b = end > we ? we : end;
    return {
      event,
      startCol:Math.round((a-ws)/86400000)+1,
      endCol:Math.round((b-ws)/86400000)+2
    };
  }).filter(Boolean).sort((a,b)=>
    a.startCol-b.startCol || (b.endCol-b.startCol)-(a.endCol-a.startCol)
  );

  const tracks = [];
  segments.forEach(seg=>{
    let track = tracks.findIndex(list=>!list.some(x=>seg.startCol < x.endCol && seg.endCol > x.startCol));
    if(track === -1){track = tracks.length;tracks.push([])}
    seg.track = track+1;
    tracks[track].push(seg);
  });
  return segments;
}
function renderCalendar(year,month){
  const body = $("#calendarBody");
  body.innerHTML = "";
  const start = calendarStart(year,month);
  const today = normalize(new Date());
  const items = visibleEvents();

  for(let w=0;w<6;w++){
    const days = weekDates(start,w);
    const row = document.createElement("div");
    row.className = "calendar-week";

    days.forEach(d=>{
      const day = document.createElement("div");
      day.className = "calendar-day" +
        (d.getMonth() !== month ? " out" : "") +
        (normalize(d).getTime() === today.getTime() ? " today" : "");
      day.innerHTML = `<span class="day-number">${d.getDate()}</span>`;
      row.appendChild(day);
    });

    const layer = document.createElement("div");
    layer.className = "event-layer";

    buildSegments(days,items).slice(0,12).forEach(seg=>{
      const e = seg.event;
      const button = document.createElement("button");
      const sClass = statusClass(e);
      button.className = `event-bar ${categoryClass[e.category] || "domestic"} ${sClass === "ended" ? "ended" : ""}`;
      button.style.gridColumn = `${seg.startCol}/${seg.endCol}`;
      button.style.gridRow = `${seg.track}`;
      button.innerHTML = `${e.title}<span class="event-status status-${sClass}">${statusLabel(e)}</span>`;
      button.title = `${e.title} · ${statusLabel(e)}`;
      button.onclick = ()=>openEvent(e);
      layer.appendChild(button);
    });

    row.appendChild(layer);
    body.appendChild(row);
  }
}
function renderMobile(year,month){
  const list = $("#mobileList");
  list.innerHTML = "";
  const ms = new Date(year,month,1);
  const me = new Date(year,month+1,0);
  const items = visibleEvents().filter(e=>{
    const {start,end} = range(e);
    return end >= ms && start <= me;
  }).sort((a,b)=>dateOnly(a.start_date)-dateOnly(b.start_date));

  if(!items.length){
    list.innerHTML = '<div class="mobile-item">등록된 일정이 없습니다.</div>';
    return;
  }
  items.forEach(e=>{
    const button = document.createElement("button");
    button.className = "mobile-item";
    button.innerHTML = `<small>${dateText(e)}</small><h3>${e.title}</h3><small>${e.location || ""} · ${e.category} · ${statusLabel(e)}</small>`;
    button.onclick = ()=>openEvent(e);
    list.appendChild(button);
  });
}
function renderMini(year,month){
  $("#miniMonthTitle").textContent = `${year}년 ${month+1}월`;
  const grid = $("#miniCalendar");
  grid.innerHTML = "";
  const start = calendarStart(year,month);
  const today = normalize(new Date());

  for(let i=0;i<42;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const hasEvent = events.some(e=>{
      const {start:s,end} = range(e);
      return normalize(d) >= s && normalize(d) <= end;
    });
    const el = document.createElement("span");
    el.className = "mini-day" +
      (d.getMonth() !== month ? " out" : "") +
      (normalize(d).getTime() === today.getTime() ? " selected" : "") +
      (hasEvent ? " has-event" : "");
    el.textContent = d.getDate();
    grid.appendChild(el);
  }
}
function render(){
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  $("#monthTitle").textContent = `${y}년 ${m+1}월`;
  renderCalendar(y,m);
  renderMobile(y,m);
  renderMini(y,m);
}
function openEvent(event){
  $("#mCategory").textContent = event.category;
  $("#mTitle").textContent = event.title;
  $("#mInfo").innerHTML = `
    <div><strong>일정</strong>　${dateText(event)}</div>
    <div><strong>장소</strong>　${event.location || "추후 안내"}</div>
    <div><strong>상태</strong>　${statusLabel(event)}</div>
    <div><strong>안내</strong>　${event.description || ""}</div>
  `;
  const link = $("#mLink");
  if(event.detail_url){
    link.href = event.detail_url;
    link.classList.remove("hidden");
  }else{
    link.classList.add("hidden");
  }
  $("#modal").classList.add("open");
}
function moveMonth(delta){
  cursor.setMonth(cursor.getMonth()+delta);
  render();
}
$("#prev").onclick = ()=>moveMonth(-1);
$("#next").onclick = ()=>moveMonth(1);
$("#miniPrev").onclick = ()=>moveMonth(-1);
$("#miniNext").onclick = ()=>moveMonth(1);
$("#today").onclick = ()=>{
  cursor = new Date();
  cursor.setDate(1);
  render();
};
document.querySelectorAll(".filter-button").forEach(button=>{
  button.onclick = ()=>{
    document.querySelectorAll(".filter-button").forEach(b=>b.classList.remove("active"));
    button.classList.add("active");
    filter = button.dataset.filter;
    render();
  };
});
$("#close").onclick = ()=>$("#modal").classList.remove("open");
$("#modal").onclick = event=>{
  if(event.target.id === "modal") $("#modal").classList.remove("open");
};
document.addEventListener("keydown",event=>{
  if(event.key === "Escape") $("#modal").classList.remove("open");
});
load();

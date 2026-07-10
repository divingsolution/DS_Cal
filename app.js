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
  const f = new Intl.DateTimeFormat("ko-KR",{
    year:"numeric",
    month:"long",
    day:"numeric",
    weekday:"short"
  });

  const {start,end} = range(event);

  return start.getTime() === end.getTime()
    ? `${f.format(start)} · 당일`
    : `${f.format(start)} ~ ${f.format(end)}`;
}

function shortDateText(event){
  const {start,end} = range(event);
  const formatter = new Intl.DateTimeFormat("ko-KR",{
    month:"long",
    day:"numeric",
    weekday:"short"
  });

  return start.getTime() === end.getTime()
    ? `${formatter.format(start)} · 당일`
    : `${formatter.format(start)} ~ ${formatter.format(end)}`;
}

function visibleEvents(){
  return filter === "전체"
    ? events
    : events.filter(event => event.category === filter);
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
  const {data,error} = await sb
    .from("events")
    .select("*")
    .order("start_date");

  if(error){
    alert("일정을 불러오지 못했습니다: " + error.message);
    return;
  }

  events = data || [];
  render();
  renderUpcoming();
}

function calendarStart(year,month){
  const first = new Date(year,month,1);
  return new Date(year,month,1-first.getDay());
}

function weekDates(start,weekIndex){
  return Array.from({length:7},(_,i)=>{
    const date = new Date(start);
    date.setDate(start.getDate()+weekIndex*7+i);
    return date;
  });
}

function buildSegments(days,items){
  const weekStart = normalize(days[0]);
  const weekEnd = normalize(days[6]);

  const segments = items
    .map(event=>{
      const {start,end} = range(event);

      if(end < weekStart || start > weekEnd) return null;

      const segmentStart = start < weekStart ? weekStart : start;
      const segmentEnd = end > weekEnd ? weekEnd : end;

      return {
        event,
        startCol:Math.round((segmentStart-weekStart)/86400000)+1,
        endCol:Math.round((segmentEnd-weekStart)/86400000)+2
      };
    })
    .filter(Boolean)
    .sort((a,b)=>
      a.startCol-b.startCol ||
      (b.endCol-b.startCol)-(a.endCol-a.startCol)
    );

  const tracks = [];

  segments.forEach(segment=>{
    let track = tracks.findIndex(list=>
      !list.some(existing=>
        segment.startCol < existing.endCol &&
        segment.endCol > existing.startCol
      )
    );

    if(track === -1){
      track = tracks.length;
      tracks.push([]);
    }

    segment.track = track+1;
    tracks[track].push(segment);
  });

  return segments;
}

function renderUpcoming(){
  const container = $("#upcomingCards");
  container.innerHTML = "";

  const today = normalize(new Date());
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate()+7);

  const upcoming = events
    .filter(event=>{
      const {start,end} = range(event);
      return end >= today && start <= nextWeek;
    })
    .sort((a,b)=>dateOnly(a.start_date)-dateOnly(b.start_date))
    .slice(0,3);

  if(!upcoming.length){
    container.innerHTML = `
      <div class="upcoming-empty">
        이번 주에 등록된 일정이 없습니다. 아래 전체 캘린더에서 다음 일정을 확인해 주세요.
      </div>
    `;
    return;
  }

  upcoming.forEach(event=>{
    const button = document.createElement("button");
    button.className = "upcoming-card";
    button.innerHTML = `
      <span class="date">${shortDateText(event)}</span>
      <h3>${event.title}</h3>
      <p>${event.location || "장소 추후 안내"} · ${event.category}</p>
      <span class="badge">${statusLabel(event)}</span>
    `;
    button.onclick = ()=>openEvent(event);
    container.appendChild(button);
  });
}

function renderCalendar(year,month){
  const body = $("#calendarBody");
  body.innerHTML = "";

  const start = calendarStart(year,month);
  const today = normalize(new Date());
  const items = visibleEvents();

  for(let week=0;week<6;week++){
    const days = weekDates(start,week);
    const row = document.createElement("div");
    row.className = "calendar-week";

    days.forEach(date=>{
      const day = document.createElement("div");
      day.className =
        "calendar-day" +
        (date.getMonth() !== month ? " out" : "") +
        (normalize(date).getTime() === today.getTime() ? " today" : "");

      day.innerHTML = `<button class="day-hit" type="button" aria-label="${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일 일정 보기"><span class="day-number">${date.getDate()}</span></button>`;
      day.querySelector(".day-hit").onclick = ()=>openDay(date);
      row.appendChild(day);
    });

    const layer = document.createElement("div");
    layer.className = "event-layer";

    buildSegments(days,items).slice(0,12).forEach(segment=>{
      const event = segment.event;
      const button = document.createElement("button");
      const currentStatusClass = statusClass(event);

      button.className =
        `event-bar ${categoryClass[event.category] || "domestic"} ` +
        `${currentStatusClass === "ended" ? "ended" : ""}`;

      button.style.gridColumn = `${segment.startCol}/${segment.endCol}`;
      button.style.gridRow = `${segment.track}`;

      button.innerHTML = `
        ${event.title}
        <span class="event-status status-${currentStatusClass}">
          ${statusLabel(event)}
        </span>
      `;

      button.title = `${event.title} · ${statusLabel(event)}`;
      button.onclick = ()=>openEvent(event);

      layer.appendChild(button);
    });

    row.appendChild(layer);
    body.appendChild(row);
  }
}

function renderMobile(year,month){
  const list = $("#mobileList");
  list.innerHTML = "";

  const monthStart = new Date(year,month,1);
  const monthEnd = new Date(year,month+1,0);

  const items = visibleEvents()
    .filter(event=>{
      const {start,end} = range(event);
      return end >= monthStart && start <= monthEnd;
    })
    .sort((a,b)=>dateOnly(a.start_date)-dateOnly(b.start_date));

  if(!items.length){
    list.innerHTML = '<div class="mobile-item">등록된 일정이 없습니다.</div>';
    return;
  }

  items.forEach(event=>{
    const button = document.createElement("button");
    button.className = "mobile-item";

    button.innerHTML = `
      <small>${dateText(event)}</small>
      <h3>${event.title}</h3>
      <small>
        ${event.location || ""} · ${event.category} · ${statusLabel(event)}
      </small>
    `;

    button.onclick = ()=>openEvent(event);
    list.appendChild(button);
  });
}

function renderMini(year,month){
  $("#miniMonthTitle").textContent = `${year}년 ${month+1}월`;

  const grid = $("#miniCalendar");
  grid.innerHTML = "";

  const start = calendarStart(year,month);
  const today = normalize(new Date());

  for(let index=0;index<42;index++){
    const date = new Date(start);
    date.setDate(start.getDate()+index);

    const hasEvent = events.some(event=>{
      const {start:eventStart,end:eventEnd} = range(event);
      return normalize(date) >= eventStart && normalize(date) <= eventEnd;
    });

    const element = document.createElement("span");

    element.className =
      "mini-day" +
      (date.getMonth() !== month ? " out" : "") +
      (normalize(date).getTime() === today.getTime() ? " selected" : "") +
      (hasEvent ? " has-event" : "");

    element.textContent = date.getDate();
    grid.appendChild(element);
  }
}

function render(){
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  $("#monthTitle").textContent = `${year}년 ${month+1}월`;

  renderCalendar(year,month);
  renderMobile(year,month);
  renderMini(year,month);
}


function eventsForDate(date){
  const target = normalize(date);
  return visibleEvents()
    .filter(event=>{
      const {start,end} = range(event);
      return target >= start && target <= end;
    })
    .sort((a,b)=>dateOnly(a.start_date)-dateOnly(b.start_date));
}

function openDay(date){
  const sheet = $("#daySheet");
  const title = $("#daySheetTitle");
  const items = $("#daySheetItems");
  const dayEvents = eventsForDate(date);

  title.textContent = `${date.getMonth()+1}월 ${date.getDate()}일 일정`;
  items.innerHTML = "";

  if(!dayEvents.length){
    items.innerHTML = '<div class="day-sheet-empty">등록된 일정이 없습니다.</div>';
  }else{
    dayEvents.forEach(event=>{
      const button = document.createElement("button");
      button.className = `day-sheet-item ${categoryClass[event.category] || "domestic"}`;
      button.innerHTML = `
        <span class="day-sheet-status">${statusLabel(event)}</span>
        <strong>${event.title}</strong>
        <small>${event.location || "장소 추후 안내"} · ${event.category}</small>
      `;
      button.onclick = ()=>{ closeDaySheet(); openEvent(event); };
      items.appendChild(button);
    });
  }

  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden","false");
  document.body.classList.add("sheet-open");
}

function closeDaySheet(){
  const sheet = $("#daySheet");
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden","true");
  document.body.classList.remove("sheet-open");
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
    document
      .querySelectorAll(".filter-button")
      .forEach(item=>item.classList.remove("active"));

    button.classList.add("active");
    filter = button.dataset.filter;
    render();
  };
});

$("#close").onclick = ()=>$("#modal").classList.remove("open");
$("#daySheetClose").onclick = closeDaySheet;
$("#daySheetBackdrop").onclick = closeDaySheet;

$("#modal").onclick = event=>{
  if(event.target.id === "modal"){
    $("#modal").classList.remove("open");
  }
};

document.addEventListener("keydown",event=>{
  if(event.key === "Escape"){
    $("#modal").classList.remove("open");
    closeDaySheet();
  }
});

load();

// V3.1: iPhone Safari landscape detection fallback.
// Some iOS Safari versions briefly report stale orientation media-query values
// while the browser chrome is resizing, so use the actual viewport ratio too.
(function setupResponsiveOrientationFallback(){
  let viewportTimer;

  function syncViewportMode(){
    const isLandscapeMobile =
      window.innerWidth > window.innerHeight && window.innerWidth <= 950;

    document.documentElement.classList.toggle(
      "is-landscape-mobile",
      isLandscapeMobile
    );
  }

  function scheduleSync(){
    clearTimeout(viewportTimer);
    syncViewportMode();
    viewportTimer = setTimeout(syncViewportMode, 180);
  }

  window.addEventListener("resize", scheduleSync, { passive:true });
  window.addEventListener("orientationchange", scheduleSync, { passive:true });
  window.addEventListener("pageshow", scheduleSync, { passive:true });
  document.addEventListener("visibilitychange", ()=>{
    if(!document.hidden) scheduleSync();
  });

  scheduleSync();
})();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const categoryClass = {
  "국내투어": "domestic",
  "해외투어": "overseas",
  "교육": "education",
  "프로과정": "pro"
};

let cursor = new Date();
cursor.setDate(1);
let filter = "전체";
let events = [];

const $ = selector => document.querySelector(selector);

function dateOnly(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function normalizeDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function eventRange(event) {
  const start = dateOnly(event.start_date);
  const end = event.end_date ? dateOnly(event.end_date) : start;
  return { start, end };
}

function eventOccursOn(event, date) {
  const target = normalizeDay(date);
  const { start, end } = eventRange(event);
  return target >= start && target <= end;
}

function dateText(event) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });

  const { start, end } = eventRange(event);

  if (start.getTime() === end.getTime()) {
    return `${formatter.format(start)} · 당일`;
  }

  return `${formatter.format(start)} ~ ${formatter.format(end)}`;
}

function visibleEvents() {
  return filter === "전체"
    ? events
    : events.filter(event => event.category === filter);
}

async function load() {
  const { data, error } = await sb
    .from("events")
    .select("*")
    .order("start_date");

  if (error) {
    alert("일정을 불러오지 못했습니다: " + error.message);
    return;
  }

  events = data || [];
  render();
}

function getCalendarStart(year, month) {
  const first = new Date(year, month, 1);
  return new Date(year, month, 1 - first.getDay());
}

function getWeekDates(calendarStart, weekIndex) {
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + weekIndex * 7 + dayIndex);
    return date;
  });
}

function splitEventsIntoWeekSegments(weekDates, items) {
  const weekStart = normalizeDay(weekDates[0]);
  const weekEnd = normalizeDay(weekDates[6]);

  const segments = items
    .map(event => {
      const { start, end } = eventRange(event);

      if (end < weekStart || start > weekEnd) return null;

      const segmentStart = start < weekStart ? weekStart : start;
      const segmentEnd = end > weekEnd ? weekEnd : end;

      const startColumn = Math.round((segmentStart - weekStart) / 86400000) + 1;
      const endColumn = Math.round((segmentEnd - weekStart) / 86400000) + 2;

      return {
        event,
        startColumn,
        endColumn,
        beginsHere: start >= weekStart && start <= weekEnd,
        endsHere: end >= weekStart && end <= weekEnd
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.startColumn !== b.startColumn) return a.startColumn - b.startColumn;
      return (b.endColumn - b.startColumn) - (a.endColumn - a.startColumn);
    });

  const tracks = [];

  segments.forEach(segment => {
    let selectedTrack = -1;

    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const overlaps = tracks[trackIndex].some(existing =>
        segment.startColumn < existing.endColumn &&
        segment.endColumn > existing.startColumn
      );

      if (!overlaps) {
        selectedTrack = trackIndex;
        break;
      }
    }

    if (selectedTrack === -1) {
      selectedTrack = tracks.length;
      tracks.push([]);
    }

    segment.track = selectedTrack + 1;
    tracks[selectedTrack].push(segment);
  });

  return segments;
}

function renderDesktopCalendar(year, month) {
  const calendarBody = $("#calendarBody");
  calendarBody.innerHTML = "";

  const start = getCalendarStart(year, month);
  const today = normalizeDay(new Date());
  const items = visibleEvents();

  for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
    const weekDates = getWeekDates(start, weekIndex);
    const week = document.createElement("div");
    week.className = "calendar-week";

    weekDates.forEach(date => {
      const day = document.createElement("div");
      const isOutside = date.getMonth() !== month;
      const isToday = normalizeDay(date).getTime() === today.getTime();

      day.className =
        "calendar-day" +
        (isOutside ? " out" : "") +
        (isToday ? " today" : "");

      day.innerHTML = `<div class="num">${date.getDate()}</div>`;
      week.appendChild(day);
    });

    const eventLayer = document.createElement("div");
    eventLayer.className = "event-layer";

    const segments = splitEventsIntoWeekSegments(weekDates, items);
    const maxVisibleTracks = 3;
    let hiddenCount = 0;

    segments.forEach(segment => {
      if (segment.track > maxVisibleTracks) {
        hiddenCount++;
        return;
      }

      const button = document.createElement("button");
      const event = segment.event;
      const className = categoryClass[event.category] || "domestic";
      const closedClass = event.status === "마감" ? " status-closed" : "";

      button.className =
        `event-bar ${className}${closedClass}` +
        (segment.beginsHere ? " segment-start" : "") +
        (segment.endsHere ? " segment-end" : "");

      button.style.gridColumn = `${segment.startColumn} / ${segment.endColumn}`;
      button.style.gridRow = `${segment.track}`;

      const status = event.status ? `<span class="status-text">${event.status}</span>` : "";
      button.innerHTML = `${event.title}${status}`;
      button.title = `${event.title} · ${event.status || ""}`;
      button.addEventListener("click", () => openEvent(event));

      eventLayer.appendChild(button);
    });

    week.appendChild(eventLayer);

    if (hiddenCount > 0) {
      const more = document.createElement("div");
      more.className = "more-events";
      more.textContent = `+${hiddenCount}개 일정`;
      week.appendChild(more);
    }

    calendarBody.appendChild(week);
  }
}

function renderMobileList(year, month) {
  const listElement = $("#list");
  listElement.innerHTML = "";

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const monthEvents = visibleEvents()
    .filter(event => {
      const { start, end } = eventRange(event);
      return end >= monthStart && start <= monthEnd;
    })
    .sort((a, b) => dateOnly(a.start_date) - dateOnly(b.start_date));

  if (!monthEvents.length) {
    listElement.innerHTML = '<div class="empty">등록된 일정이 없습니다.</div>';
    return;
  }

  monthEvents.forEach(event => {
    const button = document.createElement("button");
    button.className = "listitem";
    button.innerHTML = `
      <small>${dateText(event)}</small>
      <h3>${event.title}</h3>
      <small>${event.location || ""} · ${event.category} · ${event.status}</small>
    `;
    button.addEventListener("click", () => openEvent(event));
    listElement.appendChild(button);
  });
}

function render() {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  $("#monthTitle").textContent = `${year}년 ${month + 1}월`;

  renderDesktopCalendar(year, month);
  renderMobileList(year, month);
}

function openEvent(event) {
  $("#mTitle").textContent = event.title;
  $("#mInfo").innerHTML = `
    <div><b>일정</b>　${dateText(event)}</div>
    <div><b>장소</b>　${event.location || "추후 안내"}</div>
    <div><b>상태</b>　${event.status || ""}</div>
    <div><b>안내</b>　${event.description || ""}</div>
  `;

  const detailLink = $("#mLink");

  if (event.detail_url) {
    detailLink.href = event.detail_url;
    detailLink.classList.remove("hidden");
  } else {
    detailLink.classList.add("hidden");
  }

  $("#modal").classList.add("open");
}

$("#prev").addEventListener("click", () => {
  cursor.setMonth(cursor.getMonth() - 1);
  render();
});

$("#next").addEventListener("click", () => {
  cursor.setMonth(cursor.getMonth() + 1);
  render();
});

$("#today").addEventListener("click", () => {
  cursor = new Date();
  cursor.setDate(1);
  render();
});

document.querySelectorAll(".chip").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    filter = button.dataset.filter;
    render();
  });
});

$("#close").addEventListener("click", () => {
  $("#modal").classList.remove("open");
});

$("#modal").addEventListener("click", event => {
  if (event.target.id === "modal") {
    $("#modal").classList.remove("open");
  }
});

load();

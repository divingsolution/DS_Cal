(() => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function parseLocalDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function updateScheduleStatus() {
    const today = startOfToday();

    document.querySelectorAll(".ie-date-card").forEach((card) => {
      const startValue = card.dataset.start;
      const endValue = card.dataset.end;
      const status = card.querySelector(".schedule-status");
      const action = card.querySelector(".schedule-action");

      if (!startValue || !endValue || !status || !action) return;

      const startDate = parseLocalDate(startValue);
      const endDate = parseLocalDate(endValue);

      card.classList.remove("ended", "ongoing", "upcoming");

      if (today > endDate) {
        card.classList.add("ended");
        status.textContent = "종료된 IE 일정";
        action.textContent = "종료";
        action.removeAttribute("href");
        action.removeAttribute("target");
        action.setAttribute("aria-disabled", "true");
        return;
      }

      if (today >= startDate && today <= endDate) {
        card.classList.add("ongoing");
        status.textContent = "현재 진행 중";
        action.textContent = "상담하기";
        return;
      }

      const daysLeft = Math.ceil((startDate - today) / DAY_MS);
      card.classList.add("upcoming");
      status.textContent = daysLeft === 0 ? "오늘 시작" : `모집중 · D-${daysLeft}`;
      action.textContent = "상담하기";
    });
  }

  updateScheduleStatus();
})();

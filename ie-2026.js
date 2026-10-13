(() => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function parseLocalDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function startOfToday() {
    const now = parseLocalDate(new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(new Date()));
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
      const manualStatus = card.dataset.manualStatus;

      card.classList.remove("ended", "ongoing", "upcoming");

      if (manualStatus === "training-full" && today <= endDate) {
        card.classList.add("training-full");
        status.textContent = "현재 교육 진행 중 · 2명 · 추가 모집 마감";
        action.textContent = "추가 모집 마감";
        action.removeAttribute("href");
        action.removeAttribute("target");
        action.setAttribute("aria-disabled", "true");
        return;
      }

      if (today > endDate) {
        card.classList.add("ended");

        const allPassed = card.dataset.allPassed === "true";
        const passedCount = Number(card.dataset.passedCount || 0);

        if (allPassed && passedCount > 0) {
          status.textContent = `${passedCount}명의 후보생이 성공적으로 PADI IE에 합격했습니다.`;
          card.classList.add("passed-result");
        } else if (allPassed) {
          status.textContent = "참가 후보생 전원이 성공적으로 PADI IE에 합격했습니다.";
          card.classList.add("passed-result");
        } else {
          status.textContent = "종료된 IE 일정";
        }

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
      status.textContent = `모집중 · D-${daysLeft}`;
      action.textContent = "상담하기";
    });
  }

  updateScheduleStatus();
})();
// Keep upcoming exams visible first, with previous exams available on demand.
(()=>{const grid=document.querySelector('.ie-schedule-grid');const past=[...grid.querySelectorAll('.ie-date-card.ended')];if(!past.length)return;const details=document.createElement('details');details.className='past-ie';const summary=document.createElement('summary');summary.textContent=`지난 IE 일정 ${past.length}개 보기`;const pastGrid=document.createElement('div');pastGrid.className='ie-schedule-grid';past.forEach(card=>pastGrid.append(card));details.append(summary,pastGrid);grid.after(details)})();

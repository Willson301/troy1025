// 스케줄 관리 JavaScript

// 전역 변수
let currentView = "calendar";
let currentDate = new Date();
let schedules = [
  {
    id: 1,
    campaignName: "백마로지스 쿠팡 구매평",
    campaignId: "AG202409101001",
    clientName: "백마로지스",
    startDate: "2025-09-10T09:00",
    endDate: "2025-09-12T18:00",
  },
  {
    id: 2,
    campaignName: "바눈 인스타그램 체험단",
    campaignId: "AG202409101002",
    clientName: "바눈",
    startDate: "2025-09-10T10:00",
    endDate: "2025-09-15T17:00",
  },
  {
    id: 3,
    campaignName: "킹기문주식회사 네이버 블로그",
    campaignId: "AG202409101003",
    clientName: "킹기문주식회사",
    startDate: "2025-09-10T14:00",
    endDate: "2025-09-13T16:00",
  },
  {
    id: 4,
    campaignName: "백마로지스 유튜브 광고",
    campaignId: "AG202409101004",
    clientName: "백마로지스",
    startDate: "2025-09-10T15:00",
    endDate: "2025-09-14T19:00",
  },
  {
    id: 5,
    campaignName: "바눈 티스토리 포스팅",
    campaignId: "AG202409101005",
    clientName: "바눈",
    startDate: "2025-09-10T16:00",
    endDate: "2025-09-11T20:00",
  },
  {
    id: 6,
    campaignName: "삼성물산 브랜딩 캠페인",
    campaignId: "AG202409121001",
    clientName: "삼성물산",
    startDate: "2025-09-12T09:00",
    endDate: "2025-09-18T18:00",
  },
  {
    id: 7,
    campaignName: "현대건설 홍보 영상",
    campaignId: "AG202409121002",
    clientName: "현대건설",
    startDate: "2025-09-12T10:00",
    endDate: "2025-09-16T17:00",
  },
  {
    id: 8,
    campaignName: "LG전자 제품 리뷰",
    campaignId: "AG202409121003",
    clientName: "LG전자",
    startDate: "2025-09-12T11:00",
    endDate: "2025-09-15T16:00",
  },
  {
    id: 9,
    campaignName: "킹기문주식회사 SNS 마케팅",
    campaignId: "AG202409121004",
    clientName: "킹기문주식회사",
    startDate: "2025-09-12T13:00",
    endDate: "2025-09-17T19:00",
  },
  {
    id: 10,
    campaignName: "바눈 라이브 커머스",
    campaignId: "AG202409151001",
    clientName: "바눈",
    startDate: "2025-09-15T09:00",
    endDate: "2025-09-20T18:00",
  },
];

// DOM 로드 완료 후 초기화
document.addEventListener("DOMContentLoaded", function () {
  initializeCalendar();
});

// 캘린더 초기화
function initializeCalendar() {
  updateCalendarHeader();
  generateCalendarGrid();
}

// 캘린더 헤더 업데이트
function updateCalendarHeader() {
  const monthNames = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  const year = currentDate.getFullYear();
  const month = monthNames[currentDate.getMonth()];

  document.getElementById("currentMonth").textContent = `${year}년 ${month}`;
}

// 캘린더 그리드 생성
function generateCalendarGrid() {
  const calendarGrid = document.getElementById("calendarGrid");
  calendarGrid.innerHTML = "";
  calendarGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        background: #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        padding: 8px;
    `;

  // 요일 헤더
  const dayHeaders = ["일", "월", "화", "수", "목", "금", "토"];
  dayHeaders.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day-header";
    dayHeader.textContent = day;
    dayHeader.style.cssText = `
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 16px 8px;
            text-align: center;
            font-weight: 600;
            color: #64748b;
            border-bottom: 2px solid #e2e8f0;
            border-radius: 8px 8px 0 0;
            margin-bottom: 8px;
        `;
    calendarGrid.appendChild(dayHeader);
  });

  // 첫 번째 날과 마지막 날 계산
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  // 현재 달의 날짜만 표시하도록 계산
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  const totalCells = Math.ceil((daysInMonth + startDayOfWeek) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // 현재 달이 아닌 날짜는 표시하지 않음
    if (date.getMonth() !== currentDate.getMonth()) {
      const emptyElement = document.createElement("div");
      emptyElement.style.cssText = `background: transparent;`;
      calendarGrid.appendChild(emptyElement);
      continue;
    }

    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.style.cssText = `
            background: white;
            padding: 16px 8px;
            min-height: 120px;
            position: relative;
            border: 1px solid #f1f5f9;
            border-radius: 8px;
            margin: 1px;
        `;

    // 오늘 날짜 스타일
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      dayElement.style.background =
        "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)";
      dayElement.style.border = "2px solid #3b82f6";
    }

    // 날짜 번호
    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = date.getDate();
    dayNumber.style.cssText = `
            font-weight: 600;
            margin-bottom: 8px;
            color: #1e293b;
        `;
    dayElement.appendChild(dayNumber);

    // 해당 날짜의 일정들 추가
    const daySchedules = getSchedulesForDate(date);
    const maxVisible = 3; // 최대 3개까지만 표시

    daySchedules.slice(0, maxVisible).forEach((schedule) => {
      const eventElement = document.createElement("div");
      eventElement.className = `calendar-event`;
      eventElement.textContent = schedule.campaignName;
      eventElement.title = `${schedule.campaignName}\n${schedule.clientName}`;
      eventElement.onclick = () => viewSchedule(schedule.id);
      eventElement.style.cssText = `
                background: #3b82f6;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                margin-bottom: 2px;
                cursor: pointer;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            `;
      dayElement.appendChild(eventElement);
    });

    // 더 많은 일정이 있으면 +개수 표시
    if (daySchedules.length > maxVisible) {
      const moreElement = document.createElement("div");
      moreElement.className = "calendar-more";
      moreElement.textContent = `+${daySchedules.length - maxVisible}`;
      moreElement.title = `${
        daySchedules.length - maxVisible
      }개의 추가 일정이 있습니다`;
      moreElement.onclick = () => showAllSchedules(date, daySchedules);
      moreElement.style.cssText = `
                background: #64748b;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                margin-bottom: 2px;
                cursor: pointer;
                text-align: center;
                font-weight: 600;
            `;
      dayElement.appendChild(moreElement);
    }

    calendarGrid.appendChild(dayElement);
  }
}

// 특정 날짜의 일정 가져오기
function getSchedulesForDate(date) {
  return schedules.filter((schedule) => {
    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate);
    return date >= startDate && date <= endDate;
  });
}

// 월 변경
function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  updateCalendarHeader();
  generateCalendarGrid();
}

// 뷰 전환
function switchView(view) {
  currentView = view;

  document.querySelectorAll(".view-content").forEach((content) => {
    content.classList.remove("active");
  });

  document.getElementById("calendarBtn").classList.remove("active");
  document.getElementById("tableBtn").classList.remove("active");
  document.getElementById("timelineBtn").classList.remove("active");

  document.getElementById(`${view}View`).classList.add("active");
  document.getElementById(`${view}Btn`).classList.add("active");

  if (view === "calendar") {
    generateCalendarGrid();
  }
}

// 필터 기능
function resetFilters() {
  document.getElementById("searchInput").value = "";
}

function applyFilters() {
  generateCalendarGrid();
}

// 일정 추가 모달
function openAddScheduleModal() {
  document.getElementById("modalTitle").textContent = "새 일정 추가";
  document.getElementById("scheduleForm").reset();
  document.getElementById("scheduleModal").style.display = "flex";
}

function closeScheduleModal() {
  document.getElementById("scheduleModal").style.display = "none";
  document.getElementById("scheduleForm").removeAttribute("data-edit-id");
}

// 일정 관리
function editSchedule(id) {
  alert("일정 편집 기능은 준비 중입니다.");
}

function deleteSchedule(id) {
  if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
    schedules = schedules.filter((s) => s.id !== id);
    generateCalendarGrid();
  }
}

function viewSchedule(id) {
  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) return;
  alert(`일정: ${schedule.campaignName}\n클라이언트: ${schedule.clientName}`);
}

function saveSchedule(event) {
  event.preventDefault();
  alert("일정 저장 기능은 준비 중입니다.");
  closeScheduleModal();
}

// 기타 함수들
function goToHome() {
  window.location.href = "index.html";
}

function showCampaignCreate() {
  window.location.href = "campaign-create.html";
}

function showNoticeBoard() {
  alert("공지사항 기능은 준비 중입니다.");
}

function showServiceInfo() {
  alert("서비스 소개 기능은 준비 중입니다.");
}

// 모든 일정 보기 함수
function showAllSchedules(date, schedules) {
  const dateStr = date.toLocaleDateString("ko-KR");
  let message = `${dateStr}의 모든 일정:\n\n`;

  schedules.forEach((schedule, index) => {
    message += `${index + 1}. ${schedule.campaignName}\n`;
    message += `   클라이언트: ${schedule.clientName}\n\n`;
  });

  alert(message);
}

// 사용하지 않는 함수들 (호출 에러 방지용)
function updateTableView() {}
function generateTimeline() {}
function zoomTimeline() {}

// 고객사 스케줄 관리
let customerSchedulesCurrentDate = new Date();
let currentView = "calendar"; // calendar, table, timeline, gantt
let customerSchedules = [];

// 긴 텍스트 말줄임(보호적 트렁케이션)
function truncateText(text, maxLength) {
  try {
    const s = String(text || "");
    return s.length > maxLength ? s.slice(0, maxLength - 1) + "…" : s;
  } catch (_) {
    return text;
  }
}

// 고객 토큰 획득
function getCustomerToken() {
  try {
    if (typeof getRoleSessionToken === "function") {
      const t = getRoleSessionToken("customer");
      if (t && t.trim() !== "") return t;
    }
  } catch (_) {}
  try {
    let t =
      sessionStorage.getItem("troy_token_customer") ||
      localStorage.getItem("troy_token_customer") ||
      sessionStorage.getItem("troy_token_agency") ||
      localStorage.getItem("troy_token_agency") ||
      localStorage.getItem("troy_token");
    if (t && t.trim() !== "") return t;
  } catch (_) {}
  return "";
}

function computeStatus(startDate, endDate) {
  const now = new Date();
  if (now < startDate) return "예정";
  if (now > endDate) return "완료";
  return "진행중";
}

function computeProgress(startDate, endDate) {
  const now = new Date();
  const total = endDate - startDate;
  if (total <= 0) return 0;
  if (now <= startDate) return 0;
  if (now >= endDate) return 100;
  return Math.max(
    0,
    Math.min(100, Math.round(((now - startDate) / total) * 100))
  );
}

async function loadSchedulesFromAPI() {
  const token = getCustomerToken();
  if (!token) {
    customerSchedules = [];
    updateCalendarHeader();
    renderCurrentView();
    return;
  }
  try {
    const res = await fetch("/api/auth/my-campaigns", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || data?.error) throw new Error(data?.error || res.status);

    const items = Array.isArray(data.campaigns) ? data.campaigns : [];
    customerSchedules = items
      .filter((c) => c.start_date && c.end_date)
      .map((c, idx) => {
        const start = new Date(c.start_date);
        const end = new Date(c.end_date);
        const name =
          `${c.brand_name || ""} ${c.product_title || c.title || ""}`.trim() ||
          c.campaign_code ||
          `캠페인 ${idx + 1}`;
        const client = c.brand_name || c.client_name || "클라이언트";
        const product = c.product_title || c.title || `제품 ${idx + 1}`;
        const status = computeStatus(start, end);
        const progress = computeProgress(start, end);
        return {
          id: c.id || c.campaign_code || idx + 1,
          campaignName: name,
          productName: product,
          clientName: client,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          status,
          priority: "보통",
          progress,
          assignee: "",
          type: c.campaign_type || "",
        };
      });
  } catch (e) {
    console.error("loadSchedulesFromAPI error", e);
    customerSchedules = [];
  }
  updateCalendarHeader();
  renderCurrentView();
}

function initCustomerScheduleManagement() {
  bindViewButtons();
  loadSchedulesFromAPI();
}

// 뷰 버튼 이벤트 바인딩
function bindViewButtons() {
  const buttons = document.querySelectorAll(".view-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const view = e.target.dataset.view;
      switchView(view);
    });
  });
}

// 뷰 전환
function switchView(view) {
  currentView = view;

  // 버튼 활성화 상태 업데이트
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-view="${view}"]`).classList.add("active");

  // 뷰 렌더링
  renderCurrentView();
}

// 현재 뷰 렌더링
function renderCurrentView() {
  const container = document.getElementById("schedule-content");
  if (!container) return;

  switch (currentView) {
    case "calendar":
      renderCalendarView();
      break;
    case "table":
      renderTableView();
      break;
    case "timeline":
      renderTimelineView();
      break;
    case "gantt":
      renderGanttView();
      break;
  }
}

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
  const year = customerSchedulesCurrentDate.getFullYear();
  const month = monthNames[customerSchedulesCurrentDate.getMonth()];
  const el = document.getElementById("currentMonth");
  if (el) el.textContent = `${year}년 ${month}`;
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
  const container = document.getElementById("schedule-content");

  // 상품별 색상 범례 생성
  const uniqueProducts = [
    ...new Set(customerSchedules.map((s) => s.productName)),
  ];
  const legend = uniqueProducts
    .map(
      (product) => `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 16px; height: 16px; background: ${getProductColor(
        product
      )}; border-radius: 4px;"></div>
      <span style="font-size: 12px; color: #374151;">${product}</span>
    </div>
  `
    )
    .join("");

  container.innerHTML = `
    <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">상품별 색상 구분</div>
      <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        ${legend}
      </div>
    </div>
    <div id="calendarGrid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e2e8f0; border-radius: 8px; overflow: hidden;"></div>
  `;
  generateCalendarGrid();
}

function generateCalendarGrid() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // 요일 헤더
  ["일", "월", "화", "수", "목", "금", "토"].forEach((d) => {
    const hd = document.createElement("div");
    hd.textContent = d;
    hd.style.cssText =
      "background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);padding:16px 8px;text-align:center;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0;";
    grid.appendChild(hd);
  });

  const first = new Date(
    customerSchedulesCurrentDate.getFullYear(),
    customerSchedulesCurrentDate.getMonth(),
    1
  );
  const last = new Date(
    customerSchedulesCurrentDate.getFullYear(),
    customerSchedulesCurrentDate.getMonth() + 1,
    0
  );
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  const daysInMonth = last.getDate();
  const startDow = first.getDay();
  const total = Math.ceil((daysInMonth + startDow) / 7) * 7;

  for (let i = 0; i < total; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const cell = document.createElement("div");
    cell.style.cssText =
      "background: white; min-height: 120px; padding: 8px; border: 1px solid #e2e8f0; position: relative;";

    if (date.getMonth() !== customerSchedulesCurrentDate.getMonth()) {
      cell.style.background = "#f8fafc";
      cell.style.color = "#94a3b8";
    }

    const num = document.createElement("div");
    num.textContent = date.getDate();
    num.style.cssText = "font-weight: 600; margin-bottom: 4px; color: #374151;";
    cell.appendChild(num);

    const ds = getSchedulesForDate(date);
    const max = 2;
    ds.slice(0, max).forEach((s) => {
      const ev = document.createElement("div");
      // 캠페인명이 20자 이상이면 20자 이후로 "..." 처리
      const campaignName =
        s.campaignName.length > 20
          ? s.campaignName.substring(0, 20) + "..."
          : s.campaignName;
      ev.textContent = campaignName;
      ev.title = `${s.campaignName}\n${s.productName}\n상태: ${s.status}`;
      ev.style.cssText = `background: ${getProductColor(
        s.productName
      )}; color: white; padding: 2px 6px; margin: 1px 0; border-radius: 4px; font-size: 11px; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
      ev.onclick = () => viewSchedule(s.id);
      cell.appendChild(ev);
    });

    if (ds.length > max) {
      const more = document.createElement("div");
      more.textContent = `+${ds.length - max}`;
      more.title = `추가 일정 ${ds.length - max}개`;
      more.style.cssText =
        "background: #6b7280; color: white; padding: 2px 6px; margin: 1px 0; border-radius: 4px; font-size: 11px; cursor: pointer; text-align: center;";
      more.onclick = () => showAllSchedules(date, ds);
      cell.appendChild(more);
    }

    grid.appendChild(cell);
  }
}

function getSchedulesForDate(date) {
  return customerSchedules.filter((s) => {
    const st = new Date(s.startDate);
    const en = new Date(s.endDate);

    // 날짜만 비교 (시간 제거)
    const targetDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const startDate = new Date(st.getFullYear(), st.getMonth(), st.getDate());
    const endDate = new Date(en.getFullYear(), en.getMonth(), en.getDate());

    return targetDate >= startDate && targetDate <= endDate;
  });
}

// 테이블 뷰 렌더링
function renderTableView() {
  const container = document.getElementById("schedule-content");
  container.innerHTML = `
    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background: #f8fafc;">
          <tr>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600;">캠페인명</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600;">시작일</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600;">종료일</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600;">상태</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600;">우선순위</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600;">진행률</th>
          </tr>
        </thead>
        <tbody>
          ${customerSchedules
            .map(
              (schedule) => `
            <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer;" onclick="viewSchedule(${
              schedule.id
            })">
              <td style="padding: 12px;">${schedule.campaignName}</td>
              <td style="padding: 12px;">${new Date(
                schedule.startDate
              ).toLocaleDateString("ko-KR")}</td>
              <td style="padding: 12px;">${new Date(
                schedule.endDate
              ).toLocaleDateString("ko-KR")}</td>
              <td style="padding: 12px;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${getStatusColor(
                  schedule.status
                )}; color: white;">
                  ${schedule.status}
                </span>
              </td>
              <td style="padding: 12px;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${getPriorityColor(
                  schedule.priority
                )}; color: white;">
                  ${schedule.priority}
                </span>
              </td>
              <td style="padding: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="flex: 1; background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: #3b82f6; height: 100%; width: ${
                      schedule.progress
                    }%; transition: width 0.3s ease;"></div>
                  </div>
                  <span style="font-size: 12px; font-weight: 600; color: #374151;">${
                    schedule.progress
                  }%</span>
                </div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// 타임라인 뷰 렌더링
function renderTimelineView() {
  const container = document.getElementById("schedule-content");
  const sortedSchedules = [...customerSchedules].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  container.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="position: relative;">
        ${sortedSchedules
          .map((schedule, index) => {
            const startDate = new Date(schedule.startDate);
            const endDate = new Date(schedule.endDate);
            const duration =
              Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            return `
              <div style="display: flex; align-items: center; margin-bottom: 24px; position: relative;">
                <div style="width: 12px; height: 12px; background: ${getProductColor(
                  schedule.productName
                )}; border-radius: 50%; margin-right: 16px; z-index: 2; position: relative;"></div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">${
                    schedule.campaignName
                  }</h3>
                  <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${getStatusColor(
                    schedule.status
                  )}; color: white;">
                    ${schedule.status}
                  </span>
                  <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${getPriorityColor(
                    schedule.priority
                  )}; color: white;">
                    ${schedule.priority}
                  </span>
                </div>
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                  ${schedule.productName} • ${
              schedule.assignee
            } • ${duration}일간
                </div>
                <div style="background: #f1f5f9; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 4px;">
                  <div style="background: #3b82f6; height: 100%; width: ${
                    schedule.progress
                  }%; transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 12px; color: #6b7280;">
                  ${startDate.toLocaleDateString(
                    "ko-KR"
                  )} ~ ${endDate.toLocaleDateString("ko-KR")} (${
              schedule.progress
            }% 완료)
                </div>
              </div>
              ${
                index < sortedSchedules.length - 1
                  ? '<div style="position: absolute; left: 5px; top: 24px; width: 2px; height: 24px; background: #e2e8f0;"></div>'
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;
}

// 간트차트 뷰 렌더링
function renderGanttView() {
  const container = document.getElementById("schedule-content");

  // 현재 월에 해당하는 일정만 필터링
  const currentYear = customerSchedulesCurrentDate.getFullYear();
  const currentMonth = customerSchedulesCurrentDate.getMonth();

  // 간트차트에서는 모든 일정을 표시 (월 필터링 제거)
  const filteredSchedules = customerSchedules;

  const sortedSchedules = [...filteredSchedules].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  // 모든 일정의 날짜 범위로 설정
  const startDate = new Date(
    Math.min(...customerSchedules.map((s) => new Date(s.startDate)))
  );
  const endDate = new Date(
    Math.max(...customerSchedules.map((s) => new Date(s.endDate)))
  );
  const totalDays =
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // 날짜 헤더 생성
  const dateHeaders = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dateHeaders.push(date);
  }

  container.innerHTML = `
    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="display: grid; grid-template-columns: 300px 1fr; border-bottom: 1px solid #e2e8f0;">
        <div style="padding: 12px; background: #f8fafc; font-weight: 600; border-right: 1px solid #e2e8f0;">캠페인</div>
        <div style="display: grid; grid-template-columns: repeat(${totalDays}, 1fr);">
          ${dateHeaders
            .map(
              (date) => `
            <div style="padding: 12px 4px; background: #f8fafc; text-align: center; font-size: 12px; font-weight: 600; border-right: 1px solid #e2e8f0;">
              ${date.getDate()}
            </div>
          `
            )
            .join("")}
        </div>
      </div>
      ${sortedSchedules
        .map((schedule) => {
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);

          // 전체 날짜 범위 내에서의 시작 위치 계산
          const startOffset = Math.ceil(
            (scheduleStart - startDate) / (1000 * 60 * 60 * 24)
          );

          // 전체 날짜 범위 내에서의 종료 위치 계산
          const endOffset = Math.ceil(
            (scheduleEnd - startDate) / (1000 * 60 * 60 * 24)
          );

          const duration = Math.max(1, endOffset - startOffset + 1);

          // 막대의 시작 위치와 너비 계산 (CSS grid 기반)
          const barStart = startOffset;
          const barSpan = duration;

          // 툴팁용 날짜 정보
          const startDateStr = scheduleStart.toLocaleDateString("ko-KR");
          const endDateStr = scheduleEnd.toLocaleDateString("ko-KR");
          const tooltipText = `${startDateStr} ~ ${endDateStr} (${schedule.progress}%)`;

          return `
          <div style="display: grid; grid-template-columns: 300px 1fr; border-bottom: 1px solid #f1f5f9; position: relative;">
            <div style="padding: 12px; border-right: 1px solid #e2e8f0; display: flex; align-items: center;">
              <div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${
                  schedule.campaignName
                }</div>
                <div style="font-size: 12px; color: #6b7280;">${
                  schedule.productName
                }</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(${totalDays}, 1fr); position: relative; min-height: 44px;">
              ${dateHeaders
                .map(
                  (date, index) => `
                <div style="padding: 12px 4px; border-right: 1px solid #f1f5f9; position: relative;">
                </div>
              `
                )
                .join("")}
              
              <!-- 연속된 막대 렌더링 -->
              <div style="
                position: absolute;
                top: 12px;
                left: ${(barStart / totalDays) * 100}%;
                width: ${(barSpan / totalDays) * 100}%;
                height: 20px;
                background: ${getProductColor(schedule.productName)};
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 600;
                color: white;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                padding: 0 4px;
                box-sizing: border-box;
              " 
              onclick="viewSchedule(${schedule.id})" 
              title="${tooltipText}">
                ${schedule.campaignName}
              </div>
              
              <!-- 진행률 표시 막대 -->
              <div style="
                position: absolute;
                top: 12px;
                left: ${(barStart / totalDays) * 100}%;
                width: ${
                  (barSpan / totalDays) * 100 * (schedule.progress / 100)
                }%;
                height: 20px;
                background: rgba(255,255,255,0.3);
                border-radius: 4px;
                pointer-events: none;
              "></div>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

// 상품별 색상 반환
function getProductColor(productName) {
  const colors = [
    "#38bdf8", // 적당한 하늘색 - 겨울 코트
    "#4ade80", // 적당한 연두색 - 스킨케어 세트
    "#2dd4bf", // 적당한 민트 - 인테리어 소품
    "#60a5fa", // 적당한 블루 - 스마트폰
    "#8b5cf6", // 적당한 퍼플 - 건강식품
    "#22d3ee", // 적당한 시안 - 메이크업 키트
    "#84cc16", // 적당한 라임 - 신선식품
    "#fb923c", // 적당한 오렌지 - 인테리어 소품
  ];

  // 상품명을 기반으로 일관된 색상 할당
  let hash = 0;
  for (let i = 0; i < productName.length; i++) {
    hash = productName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// 상태별 색상 반환
function getStatusColor(status) {
  switch (status) {
    case "완료":
      return "#10b981";
    case "진행중":
      return "#3b82f6";
    case "예정":
      return "#f59e0b";
    default:
      return "#6b7280";
  }
}

// 우선순위별 색상 반환
function getPriorityColor(priority) {
  switch (priority) {
    case "높음":
      return "#ef4444";
    case "보통":
      return "#f59e0b";
    case "낮음":
      return "#10b981";
    default:
      return "#6b7280";
  }
}

function changeMonth(dir) {
  customerSchedulesCurrentDate.setMonth(
    customerSchedulesCurrentDate.getMonth() + dir
  );
  updateCalendarHeader();
  if (currentView === "calendar") {
    renderCalendarView();
  }
}
function resetFilters() {
  const si = document.getElementById("searchInput");
  if (si) si.value = "";
}
function applyFilters() {
  generateCalendarGrid();
}
function openAddScheduleModal() {
  const m = document.getElementById("scheduleModal");
  if (m) m.style.display = "flex";
}
function closeScheduleModal() {
  const m = document.getElementById("scheduleModal");
  if (m) m.style.display = "none";
}
function saveSchedule(e) {
  e.preventDefault();
  alert("일정 저장 기능은 준비 중입니다.");
  closeScheduleModal();
}
function viewSchedule(id) {
  const s = customerSchedules.find((x) => x.id === id);
  if (!s) return;

  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById("scheduleDetailModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = "scheduleDetailModal";
  modal.className = "modal";
  modal.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;";

  modal.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%; position: relative;">
      <button onclick="closeScheduleDetailModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; padding: 4px; line-height: 1;">&times;</button>
      
      <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1e293b;">캠페인 상세 정보</h3>
      
      <div style="margin-bottom: 16px;">
        <strong>캠페인명:</strong> ${s.campaignName}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>상품명:</strong> ${s.productName}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>시작일:</strong> ${new Date(s.startDate).toLocaleDateString(
          "ko-KR"
        )} ${new Date(s.startDate).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>종료일:</strong> ${new Date(s.endDate).toLocaleDateString(
          "ko-KR"
        )} ${new Date(s.endDate).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>상태:</strong> 
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${getStatusColor(
          s.status
        )}; color: white;">
          ${s.status}
        </span>
      </div>
      <div style="margin-bottom: 16px;">
        <strong>우선순위:</strong> 
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${getPriorityColor(
          s.priority
        )}; color: white;">
          ${s.priority}
        </span>
      </div>
      <div style="margin-bottom: 16px;">
        <strong>담당자:</strong> ${s.assignee}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>타입:</strong> ${s.type}
      </div>
      <div style="margin-bottom: 20px;">
        <strong>진행률:</strong> ${s.progress}%
        <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 4px;">
          <div style="background: #3b82f6; height: 100%; width: ${
            s.progress
          }%; transition: width 0.3s ease;"></div>
        </div>
      </div>
      
      <div style="text-align: right;">
        <button onclick="closeScheduleDetailModal()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          닫기
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 모달 외부 클릭 시 닫기
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeScheduleDetailModal();
    }
  });
}

// 스케줄 상세 모달 닫기 함수
function closeScheduleDetailModal() {
  const modal = document.getElementById("scheduleDetailModal");
  if (modal) {
    modal.remove();
  }
}
function showAllSchedules(date, list) {
  const d = date.toLocaleDateString("ko-KR");
  let msg = `${d}의 모든 일정:\n\n`;
  list.forEach((s, i) => {
    msg += `${i + 1}. ${s.campaignName}\n   상품: ${s.productName}\n\n`;
  });
  alert(msg);
}

// 전역 함수 등록
window.initCustomerScheduleManagement = initCustomerScheduleManagement;
window.switchView = switchView;
window.changeMonth = changeMonth;
window.viewSchedule = viewSchedule;
window.closeScheduleDetailModal = closeScheduleDetailModal;
window.showAllSchedules = showAllSchedules;
window.openAddScheduleModal = openAddScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.saveSchedule = saveSchedule;
window.resetFilters = resetFilters;
window.applyFilters = applyFilters;

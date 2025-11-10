// API 호출을 위한 헬퍼 함수들
const ScheduleAPI = {
  base: "/api/admin",
  token() {
    let t = localStorage.getItem("troy_token");
    if (!t || !String(t).startsWith("admin_token_")) {
      try {
        localStorage.setItem("troy_token", "admin_token_dev");
        t = "admin_token_dev";
      } catch (_) {
        t = null;
      }
    }
    return t;
  },
  headers() {
    const h = { "Content-Type": "application/json" };
    const t = this.token();
    if (t) h["Authorization"] = `Bearer ${t}`;
    return h;
  },
  async getCustomers() {
    const res = await fetch(`${this.base}/customers`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("고객사 목록 조회 실패");
    const data = await res.json();
    return data.items || [];
  },
  async getAgencies() {
    const res = await fetch(`${this.base}/agencies`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("대행사 목록 조회 실패");
    const data = await res.json();
    return data.items || [];
  },
  async getPartners() {
    // 파트너사 API가 없다면 빈 배열 반환
    try {
      const res = await fetch(`${this.base}/partners`, {
        headers: this.headers(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    } catch (error) {
      console.log("파트너사 API 없음, 빈 배열 반환");
      return [];
    }
  },
  async getCampaigns() {
    const res = await fetch(`${this.base}/campaigns?page=1&limit=1000`, {
      headers: this.headers(),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "캠페인 목록 조회 실패");
    return data.campaigns || data.items || [];
  },
};

// 현재 스케줄 상태 (연/월/타입)
let CURRENT_SCHEDULE_YEAR = new Date().getFullYear();
let CURRENT_SCHEDULE_MONTH = new Date().getMonth() + 1; // 1-12
let CURRENT_SCHEDULE_TYPE = "customer";

// 전역 스케줄 데이터 저장소 (데이터 보존용)
let globalScheduleData = {
  customer: null,
  partner: null,
  agency: null,
};

function updateMonthHeader() {
  const headerEl = document.querySelector(".month-year");
  if (headerEl)
    headerEl.textContent = `${CURRENT_SCHEDULE_YEAR}년 ${CURRENT_SCHEDULE_MONTH}월`;
}

// 스케줄 필터 기능
async function showSchedule(type) {
  console.log("스케줄 필터:", type);

  // 필터 버튼 스타일 업데이트
  const customerBtn = document.getElementById("customer-filter");
  const partnerBtn = document.getElementById("partner-filter");
  const agencyBtn = document.getElementById("agency-filter");
  const calendarTitle = document.getElementById("calendar-title");

  // 모든 버튼 초기화
  if (customerBtn && partnerBtn && agencyBtn) {
    customerBtn.style.background = "white";
    customerBtn.style.border = "2px solid #255ffe";
    customerBtn.style.color = "#255ffe";
    customerBtn.classList.remove("active");

    partnerBtn.style.background = "white";
    partnerBtn.style.border = "2px solid #10b981";
    partnerBtn.style.color = "#10b981";
    partnerBtn.classList.remove("active");

    agencyBtn.style.background = "white";
    agencyBtn.style.border = "2px solid #8b5cf6";
    agencyBtn.style.color = "#8b5cf6";
    agencyBtn.classList.remove("active");

    // 선택된 버튼 스타일링
    if (type === "customer") {
      customerBtn.style.background =
        "linear-gradient(135deg, #255ffe 0%, #1d4ed8 100%)";
      customerBtn.style.border = "none";
      customerBtn.style.color = "white";
      customerBtn.classList.add("active");
      if (calendarTitle) calendarTitle.textContent = "고객사 스케줄";
    } else if (type === "partner") {
      partnerBtn.style.background =
        "linear-gradient(135deg, #10b981 0%, #059669 100%)";
      partnerBtn.style.border = "none";
      partnerBtn.style.color = "white";
      partnerBtn.classList.add("active");
      if (calendarTitle) calendarTitle.textContent = "파트너사 스케줄";
    } else if (type === "agency") {
      agencyBtn.style.background =
        "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
      agencyBtn.style.border = "none";
      agencyBtn.style.color = "white";
      agencyBtn.classList.add("active");
      if (calendarTitle) calendarTitle.textContent = "대행사 스케줄";
    }
  }

  // 현재 타입 저장 및 헤더 업데이트
  CURRENT_SCHEDULE_TYPE = type;
  updateMonthHeader();

  // 실제 데이터를 기반으로 스케줄 업데이트
  await updateCalendarEvents(type);
}

// 캘린더 이벤트 업데이트
async function updateCalendarEvents(type) {
  const calendarBody = document.getElementById("calendar-body");
  if (!calendarBody) return;

  try {
    let scheduleData = { events: {} };

    // 관리자 캠페인 실제 데이터로 스케줄 생성
    const campaigns = await ScheduleAPI.getCampaigns();
    scheduleData = generateScheduleFromCampaigns(campaigns, type);

    // 전역 저장
    currentCalendarData = scheduleData;

    // 타임라인/간트 동기화
    updateTimelineAndGanttFromCalendar(type === "customer" ? "client" : type);

    // 캘린더 렌더링
    calendarBody.innerHTML = "";
    for (let day = 1; day <= 31; day++) {
      const dayElement = document.createElement("div");
      dayElement.className = "calendar-day";
      const dayNumber = document.createElement("div");
      dayNumber.className = "day-number";
      dayNumber.textContent = day;
      dayElement.appendChild(dayNumber);

      if (scheduleData.events[day]) {
        const campaigns = Array.isArray(scheduleData.events[day])
          ? scheduleData.events[day]
          : [scheduleData.events[day]];
        campaigns.forEach((campaign) => {
          const ev = document.createElement("div");
          ev.className = `event ${type}-event`;
          ev.textContent = campaign.name || campaign.title || "캠페인";
          ev.style.cursor = "pointer";
          ev.addEventListener("click", (e) => {
            e.stopPropagation();
            showCampaignDetailModal({
              name: campaign.title || campaign.name,
              company:
                campaign.customer ||
                campaign.company_name ||
                campaign.__business_name ||
                "-",
              type: campaign.category || campaign.type || "-",
              status: campaign.status || "-",
              startDay: new Date(
                campaign.start_date || campaign.created_at
              ).getDate(),
              endDay: new Date(
                campaign.end_date || campaign.created_at
              ).getDate(),
              budget: Number(campaign.amount || campaign.budget || 0),
              target: Number(campaign.target || 0),
              category: type,
              deliveryAddress: {},
            });
          });
          dayElement.appendChild(ev);
        });
      }
      calendarBody.appendChild(dayElement);
    }
  } catch (error) {
    console.error("스케줄 데이터 로드 실패:", error);
    calendarBody.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">
        <div style="font-size: 16px; margin-bottom: 8px;">⚠️</div>
        <div>스케줄 데이터를 불러오는 중 오류가 발생했습니다.</div>
      </div>
    `;
  }
}

function generateScheduleFromCampaigns(campaigns, type) {
  const events = {};
  const currentMonth = CURRENT_SCHEDULE_MONTH - 1;
  const currentYear = CURRENT_SCHEDULE_YEAR;

  campaigns.forEach((c) => {
    const s = new Date(c.start_date || c.created_at || c.date || Date.now());
    const e = new Date(c.end_date || c.created_at || c.date || Date.now());
    if (s.getFullYear() !== currentYear || s.getMonth() !== currentMonth)
      return;
    const startDay = s.getDate();
    const endDay = Math.max(startDay, e.getDate());

    // 역할 필터: type이 지정되면 created_by/partner_id/advertiser_id로 간단 필터
    if (type === "agency" && !c.created_by) return;
    if (type === "partner" && !c.partner_id) return;
    if (type === "customer" && !c.advertiser_id) return;

    const entry = {
      name: c.title || c.campaign_name || c.name || `캠페인 ${c.id}`,
      status: c.status || "-",
      startDay,
      endDay,
      category: type,
    };
    for (let d = startDay; d <= endDay; d++) {
      if (!events[d]) events[d] = [];
      events[d].push(entry);
    }
  });

  return { events };
}

// 날짜 포맷팅 함수
function getFormattedDate(day) {
  const targetDate = new Date(
    CURRENT_SCHEDULE_YEAR,
    CURRENT_SCHEDULE_MONTH - 1,
    day
  );
  const month = targetDate.getMonth() + 1;
  const date = targetDate.getDate();

  return `${month}월 ${date}일`;
}

// 캠페인 인라인 상세보기
function showCampaignDetailInline(campaign) {
  const detailSection = document.getElementById("campaign-detail-section");
  const detailContent = document.getElementById("campaign-detail-content");

  if (!detailSection || !detailContent) return;

  const statusColor = campaign.status === "진행중" ? "#dcfce7" : "#fef3c7";
  const statusTextColor = campaign.status === "진행중" ? "#166534" : "#92400e";
  const categoryColor =
    campaign.category === "customer"
      ? "#255ffe"
      : campaign.category === "partner"
      ? "#10b981"
      : "#8b5cf6";

  detailContent.innerHTML = `
    <div class="campaign-info" style="margin-bottom: 24px;">
      <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div class="info-item">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인명</label>
          <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
            campaign.name
          }</div>
        </div>
        <div class="info-item">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">회사명</label>
          <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
            campaign.company
          }</div>
        </div>
        <div class="info-item">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인 유형</label>
          <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
            campaign.type
          }</div>
        </div>
        <div class="info-item">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">상태</label>
          <div style="padding: 8px 12px; background: ${statusColor}; color: ${statusTextColor}; border-radius: 6px; font-weight: 600;">${
    campaign.status
  }</div>
        </div>
        <div class="info-item">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">시작일</label>
          <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${getFormattedDate(
            campaign.startDay
          )}</div>
        </div>
        <div class="info-item">
          <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">종료일</label>
          <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${getFormattedDate(
            campaign.endDay
          )}</div>
        </div>
      </div>
    </div>
    
    <div class="campaign-stats" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 16px; color: #1e293b;">캠페인 통계</h3>
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${categoryColor};">
          <div style="font-size: 24px; font-weight: 700; color: ${categoryColor};">${campaign.budget.toLocaleString()}원</div>
          <div style="font-size: 14px; color: #64748b;">캠페인 예산</div>
        </div>
        <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${categoryColor};">
          <div style="font-size: 24px; font-weight: 700; color: ${categoryColor};">${campaign.target.toLocaleString()}명</div>
          <div style="font-size: 14px; color: #64748b;">타겟 인원</div>
        </div>
      </div>
    </div>

    <div class="campaign-duration" style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">캠페인 기간</h3>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
          <div style="font-size: 12px; color: #64748b;">시작일</div>
          <div style="font-weight: 600;">${getFormattedDate(
            campaign.startDay
          )}</div>
        </div>
        <div style="color: #64748b;">→</div>
        <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
          <div style="font-size: 12px; color: #64748b;">종료일</div>
          <div style="font-weight: 600;">${getFormattedDate(
            campaign.endDay
          )}</div>
        </div>
        <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
          <div style="font-size: 12px; color: #64748b;">총 기간</div>
          <div style="font-weight: 600;">${
            campaign.endDay - campaign.startDay + 1
          }일</div>
        </div>
      </div>
    </div>
  `;

  // 상세보기 영역 표시
  detailSection.style.display = "block";

  // 부드러운 스크롤 효과
  detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// 캠페인 상세보기 모달 (기존 함수 유지)
function showCampaignDetailModal(campaign) {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById("campaignDetailModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = "campaignDetailModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  const statusColor = campaign.status === "진행중" ? "#dcfce7" : "#fef3c7";
  const statusTextColor = campaign.status === "진행중" ? "#166534" : "#92400e";
  const categoryColor =
    campaign.category === "customer"
      ? "#255ffe"
      : campaign.category === "partner"
      ? "#10b981"
      : "#8b5cf6";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b;">캠페인 상세정보</h2>
        <span class="close" onclick="closeCampaignDetailModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
      </div>
      <div class="modal-body">
        <div class="campaign-info" style="margin-bottom: 24px;">
          <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인명</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                campaign.name
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">회사명</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                campaign.company
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인 유형</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                campaign.type
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">상태</label>
              <div style="padding: 8px 12px; background: ${statusColor}; color: ${statusTextColor}; border-radius: 6px; font-weight: 600;">${
    campaign.status
  }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">시작일</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${getFormattedDate(
                campaign.startDay
              )}</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">종료일</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${getFormattedDate(
                campaign.endDay
              )}</div>
            </div>
          </div>
        </div>
        
        <div class="campaign-stats" style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 16px; color: #1e293b;">캠페인 통계</h3>
          <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${categoryColor};">
              <div style="font-size: 24px; font-weight: 700; color: ${categoryColor};">${campaign.budget.toLocaleString()}원</div>
              <div style="font-size: 14px; color: #64748b;">캠페인 예산</div>
            </div>
            <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${categoryColor};">
              <div style="font-size: 24px; font-weight: 700; color: ${categoryColor};">${campaign.target.toLocaleString()}명</div>
              <div style="font-size: 14px; color: #64748b;">타겟 인원</div>
            </div>
          </div>
        </div>

        <div class="campaign-duration" style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">캠페인 기간</h3>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b;">시작일</div>
              <div style="font-weight: 600;">${getFormattedDate(
                campaign.startDay
              )}</div>
            </div>
            <div style="color: #64748b;">→</div>
            <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b;">종료일</div>
              <div style="font-weight: 600;">${getFormattedDate(
                campaign.endDay
              )}</div>
            </div>
            <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b;">총 기간</div>
              <div style="font-weight: 600;">${
                campaign.endDay - campaign.startDay + 1
              }일</div>
            </div>
          </div>
        </div>

        <div class="delivery-address" style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">🚚 로켓배송 주소</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">수령인</div>
              <div style="font-weight: 600; color: #1e293b;">${
                campaign.deliveryAddress?.recipient || "-"
              }</div>
            </div>
            <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">연락처</div>
              <div style="font-weight: 600; color: #1e293b;">${
                campaign.deliveryAddress?.phone || "-"
              }</div>
            </div>
            <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">우편번호</div>
              <div style="font-weight: 600; color: #1e293b;">${
                campaign.deliveryAddress?.zipCode || "-"
              }</div>
            </div>
            <div style="padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">배송 메모</div>
              <div style="font-weight: 600; color: #1e293b;">${
                campaign.deliveryAddress?.memo || "-"
              }</div>
            </div>
            <div style="grid-column: 1 / -1; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">기본주소</div>
              <div style="font-weight: 600; color: #1e293b;">${
                campaign.deliveryAddress?.address || "-"
              }</div>
            </div>
            <div style="grid-column: 1 / -1; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">상세주소</div>
              <div style="font-weight: 600; color: #1e293b;">${
                campaign.deliveryAddress?.detailAddress || "-"
              }</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <button onclick="closeCampaignDetailModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// 캠페인 인라인 상세보기 닫기
function closeCampaignDetail() {
  const detailSection = document.getElementById("campaign-detail-section");
  if (detailSection) {
    detailSection.style.display = "none";
  }
}

// 캠페인 상세보기 모달 닫기
function closeCampaignDetailModal() {
  const modal = document.getElementById("campaignDetailModal");
  if (modal) {
    modal.remove();
  }
}

// 이전 달로 이동
function previousMonth() {
  // 월 감소
  if (CURRENT_SCHEDULE_MONTH === 1) {
    CURRENT_SCHEDULE_MONTH = 12;
    CURRENT_SCHEDULE_YEAR -= 1;
  } else {
    CURRENT_SCHEDULE_MONTH -= 1;
  }
  updateMonthHeader();
  // 현재 타입으로 다시 렌더링
  updateCalendarEvents(CURRENT_SCHEDULE_TYPE);
}

// 다음 달로 이동
function nextMonth() {
  // 월 증가
  if (CURRENT_SCHEDULE_MONTH === 12) {
    CURRENT_SCHEDULE_MONTH = 1;
    CURRENT_SCHEDULE_YEAR += 1;
  } else {
    CURRENT_SCHEDULE_MONTH += 1;
  }
  updateMonthHeader();
  // 현재 타입으로 다시 렌더링
  updateCalendarEvents(CURRENT_SCHEDULE_TYPE);
}

// 페이지 로드 시 기본 설정
async function initScheduleManagementComponent() {
  console.log("스케줄 관리 컴포넌트 초기화");

  // API에서 스케줄 데이터 가져오기
  await fetchScheduleData();

  // 기본적으로 고객사 스케줄 표시
  await showSchedule("customer");

  // 기본 필터 설정
  currentRoleFilter = "client";
  updateFilterButtonStates("client");

  // 디버깅 정보 출력
  console.log("초기화 완료 - 데이터 상태:");
  debugCalendarData();
}

// 타임라인 데이터 (JSON 배열) - 역할별 데이터
let timelineData = [
  {
    role: "agency",
    date: "2024-10-08",
    title: "캠페인 기획 회의",
    status: "예정",
  },
  {
    role: "client",
    date: "2024-10-09",
    title: "요구사항 검토",
    status: "진행중",
  },
  {
    role: "partner",
    date: "2024-10-11",
    title: "소재 제작 완료",
    status: "완료",
  },
  {
    role: "agency",
    date: "2024-10-15",
    title: "마케팅 전략 수립",
    status: "예정",
  },
  {
    role: "client",
    date: "2024-10-18",
    title: "캠페인 검토",
    status: "진행중",
  },
  { role: "partner", date: "2024-10-22", title: "정산 처리", status: "완료" },
  { role: "agency", date: "2024-10-25", title: "월간 리포트", status: "예정" },
];

// 뷰 전환 함수들
function switchToCalendarView() {
  document.getElementById("calendar-section").style.display = "block";
  document.getElementById("timeline-section").style.display = "none";
  document.getElementById("gantt-section").style.display = "none";

  document.getElementById("calendar-view-btn").classList.add("active");
  document.getElementById("timeline-view-btn").classList.remove("active");
  document.getElementById("gantt-view-btn").classList.remove("active");
}

function switchToTimelineView() {
  document.getElementById("calendar-section").style.display = "none";
  document.getElementById("timeline-section").style.display = "block";
  document.getElementById("gantt-section").style.display = "none";

  document.getElementById("calendar-view-btn").classList.remove("active");
  document.getElementById("timeline-view-btn").classList.add("active");
  document.getElementById("gantt-view-btn").classList.remove("active");

  renderTimeline();
}

function switchToGanttView() {
  document.getElementById("calendar-section").style.display = "none";
  document.getElementById("timeline-section").style.display = "none";
  document.getElementById("gantt-section").style.display = "block";

  document.getElementById("calendar-view-btn").classList.remove("active");
  document.getElementById("timeline-view-btn").classList.remove("active");
  document.getElementById("gantt-view-btn").classList.add("active");

  renderGanttChart();
}

// 타임라인 렌더링
function renderTimeline() {
  const timelineContent = document.getElementById("timeline-content");
  if (!timelineContent) return;

  // 필터링된 데이터 가져오기
  const filteredData = getFilteredTimelineData();

  // 날짜순으로 정렬
  const sortedData = [...filteredData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  timelineContent.innerHTML = "";

  sortedData.forEach((item) => {
    const timelineItem = createTimelineItem(item);
    timelineContent.appendChild(timelineItem);
  });
}

// 필터링된 타임라인 데이터 가져오기
function getFilteredTimelineData() {
  if (currentRoleFilter === "all") {
    return timelineData;
  }
  return timelineData.filter((item) => item.role === currentRoleFilter);
}

// 타임라인 아이템 생성
function createTimelineItem(item) {
  const timelineItem = document.createElement("div");
  timelineItem.className = `timeline-item ${getStatusClass(item.status)}`;

  const timelineCard = document.createElement("div");
  timelineCard.className = `timeline-card ${getStatusClass(item.status)}`;

  const date = document.createElement("div");
  date.className = "timeline-date";
  date.textContent = formatDate(item.date);

  const title = document.createElement("div");
  title.className = "timeline-title-text";

  // 역할 정보 추가
  const roleNames = {
    agency: "대행사",
    client: "고객사",
    partner: "파트너사",
  };
  title.innerHTML = `<span style="color: ${getRoleColor(
    item.role
  )}; font-weight: 600;">[${roleNames[item.role]}]</span> ${item.title}`;

  const status = document.createElement("div");
  status.className = `timeline-status ${getStatusClass(item.status)}`;
  status.textContent = item.status;

  timelineCard.appendChild(date);
  timelineCard.appendChild(title);
  timelineCard.appendChild(status);
  timelineItem.appendChild(timelineCard);

  return timelineItem;
}

// 상태에 따른 CSS 클래스 반환
function getStatusClass(status) {
  switch (status) {
    case "예정":
      return "scheduled";
    case "진행중":
      return "in-progress";
    case "완료":
      return "completed";
    default:
      return "scheduled";
  }
}

// 날짜 포맷팅
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[date.getDay()];

  return `${year}.${month}.${day} (${weekday})`;
}

// 일정 추가 모달 표시
function showAddScheduleModal() {
  const modal = document.getElementById("add-schedule-modal");
  if (modal) {
    modal.style.display = "flex";

    // 오늘 날짜를 기본값으로 설정
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("schedule-date");
    if (dateInput) {
      dateInput.value = today;
    }
  }
}

// 일정 추가 모달 닫기
function closeAddScheduleModal() {
  const modal = document.getElementById("add-schedule-modal");
  if (modal) {
    modal.style.display = "none";

    // 폼 초기화
    const form = document.getElementById("add-schedule-form");
    if (form) {
      form.reset();
    }
  }
}

// 새 일정 추가
function addSchedule() {
  const dateInput = document.getElementById("schedule-date");
  const titleInput = document.getElementById("schedule-title");
  const statusSelect = document.getElementById("schedule-status");

  if (!dateInput || !titleInput || !statusSelect) return;

  const date = dateInput.value;
  const title = titleInput.value.trim();
  const status = statusSelect.value;

  if (!date || !title) {
    alert("날짜와 제목을 모두 입력해주세요.");
    return;
  }

  // 새 일정 추가
  const newSchedule = {
    date: date,
    title: title,
    status: status,
  };

  timelineData.push(newSchedule);

  // 타임라인 다시 렌더링
  renderTimeline();

  // 모달 닫기
  closeAddScheduleModal();

  // 성공 메시지
  alert("일정이 성공적으로 추가되었습니다.");
}

// 간트차트 데이터 (JSON 배열) - 역할별 데이터
let ganttData = [
  {
    role: "agency",
    title: "추석 캠페인 광고 제작",
    startDate: "2024-10-05",
    endDate: "2024-10-10",
    color: "#FFB84C",
  },
  {
    role: "client",
    title: "캠페인 검수 및 승인",
    startDate: "2024-10-08",
    endDate: "2024-10-12",
    color: "#A3D977",
  },
  {
    role: "partner",
    title: "소재 납품",
    startDate: "2024-10-06",
    endDate: "2024-10-09",
    color: "#5AB2FF",
  },
  {
    role: "agency",
    title: "마케팅 전략 수립",
    startDate: "2024-10-12",
    endDate: "2024-10-16",
    color: "#FFB84C",
  },
  {
    role: "client",
    title: "최종 검토",
    startDate: "2024-10-15",
    endDate: "2024-10-18",
    color: "#A3D977",
  },
  {
    role: "partner",
    title: "콘텐츠 제작",
    startDate: "2024-10-10",
    endDate: "2024-10-14",
    color: "#5AB2FF",
  },
];

// 현재 선택된 역할 필터
let currentRoleFilter = "all";

// 캘린더 데이터를 저장할 전역 변수
let currentCalendarData = { events: {} };

// 통합 스케줄 데이터 (캘린더, 타임라인, 간트차트 공용)
let unifiedScheduleData = {
  calendar: { events: {} },
  timeline: [],
  gantt: [],
};

// 캘린더 데이터를 타임라인과 간트차트 형식으로 변환
function convertCalendarToTimelineAndGantt(calendarData, role) {
  const timelineItems = [];
  const ganttItems = [];

  // 캘린더 이벤트를 순회하여 타임라인과 간트차트 데이터 생성
  Object.keys(calendarData.events).forEach((day) => {
    const events = Array.isArray(calendarData.events[day])
      ? calendarData.events[day]
      : [calendarData.events[day]];

    events.forEach((event) => {
      // 타임라인 데이터 생성 (시작일만)
      if (event.startDay === parseInt(day)) {
        timelineItems.push({
          role: role,
          date: `2024-10-${day.toString().padStart(2, "0")}`,
          title: event.name,
          status: event.status === "진행중" ? "진행중" : "예정",
        });
      }

      // 간트차트 데이터 생성 (시작일과 종료일)
      if (event.startDay === parseInt(day)) {
        ganttItems.push({
          role: role,
          title: event.name,
          startDate: `2024-10-${event.startDay.toString().padStart(2, "0")}`,
          endDate: `2024-10-${event.endDay.toString().padStart(2, "0")}`,
          color: getRoleColor(role),
          // 원본 캠페인 정보 추가 (모달 표시용)
          originalCampaign: event,
        });
      }
    });
  });

  return { timeline: timelineItems, gantt: ganttItems };
}

// 캘린더 데이터를 기반으로 타임라인과 간트차트 데이터 업데이트
function updateTimelineAndGanttFromCalendar(role) {
  if (Object.keys(currentCalendarData.events).length === 0) return;

  const convertedData = convertCalendarToTimelineAndGantt(
    currentCalendarData,
    role
  );

  // 기존 데이터에서 해당 역할의 데이터 제거
  timelineData = timelineData.filter((item) => item.role !== role);
  ganttData = ganttData.filter((item) => item.role !== role);
  unifiedScheduleData.timeline = unifiedScheduleData.timeline.filter(
    (item) => item.role !== role
  );
  unifiedScheduleData.gantt = unifiedScheduleData.gantt.filter(
    (item) => item.role !== role
  );

  // 새로운 데이터 추가
  timelineData.push(...convertedData.timeline);
  ganttData.push(...convertedData.gantt);
  unifiedScheduleData.timeline.push(...convertedData.timeline);
  unifiedScheduleData.gantt.push(...convertedData.gantt);
}

// 간트차트 렌더링
function renderGanttChart() {
  const taskList = document.getElementById("gantt-task-list");
  const dateHeader = document.getElementById("gantt-date-header");
  const chartContent = document.getElementById("gantt-chart-content");

  if (!taskList || !dateHeader || !chartContent) {
    console.log("간트차트 DOM 요소를 찾을 수 없습니다");
    return;
  }

  // 필터링된 데이터 가져오기
  const filteredData = getFilteredGanttData();
  console.log("간트차트 렌더링 - 필터링된 데이터:", filteredData);

  // 날짜 범위 계산
  const dateRange = calculateDateRange(filteredData);
  const cellWidth = 40; // 각 날짜 셀의 너비

  // 작업 목록 렌더링 (역할별)
  renderRoleBasedTaskList(taskList);

  // 날짜 헤더 렌더링
  renderDateHeader(dateHeader, dateRange, cellWidth);

  // 차트 내용 렌더링 (역할별)
  renderRoleBasedChartContent(chartContent, dateRange, cellWidth);
}

// 필터링된 간트차트 데이터 가져오기
function getFilteredGanttData() {
  // 통합 데이터가 있으면 우선 사용, 없으면 기본 데이터 사용
  const data =
    unifiedScheduleData.gantt.length > 0
      ? unifiedScheduleData.gantt
      : ganttData;

  if (currentRoleFilter === "all") {
    return data;
  }
  return data.filter((task) => task.role === currentRoleFilter);
}

// 날짜 범위 계산
function calculateDateRange(tasks) {
  if (tasks.length === 0) {
    const today = new Date();
    return {
      start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 7일 전
      end: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // 14일 후
    };
  }

  let startDate = new Date(tasks[0].startDate);
  let endDate = new Date(tasks[0].endDate);

  tasks.forEach((task) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    if (taskStart < startDate) startDate = taskStart;
    if (taskEnd > endDate) endDate = taskEnd;
  });

  // 여유 공간 추가
  startDate.setDate(startDate.getDate() - 2);
  endDate.setDate(endDate.getDate() + 2);

  return { start: startDate, end: endDate };
}

// 역할별 작업 목록 렌더링
function renderRoleBasedTaskList(container) {
  container.innerHTML = "";

  const roles = ["agency", "client", "partner"];
  const roleNames = {
    agency: "대행사",
    client: "고객사",
    partner: "파트너사",
  };

  roles.forEach((role) => {
    const roleItem = document.createElement("div");
    roleItem.className = `gantt-task-item role-${role}`;
    roleItem.textContent = roleNames[role];
    roleItem.style.borderLeft = `4px solid ${getRoleColor(role)}`;
    roleItem.style.fontWeight = "600";
    container.appendChild(roleItem);
  });
}

// 역할별 색상 반환
function getRoleColor(role) {
  const colors = {
    agency: "#FFB84C",
    client: "#A3D977",
    partner: "#5AB2FF",
  };
  return colors[role] || "#94a3b8";
}

// 날짜 헤더 렌더링
function renderDateHeader(container, dateRange, cellWidth) {
  container.innerHTML = "";

  const currentDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  while (currentDate <= endDate) {
    const dateCell = document.createElement("div");
    dateCell.className = "gantt-date-cell";

    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1;

    // 주말 표시
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dateCell.classList.add("weekend");
    }

    // 오늘 표시
    const today = new Date();
    if (currentDate.toDateString() === today.toDateString()) {
      dateCell.classList.add("today");
    }

    dateCell.innerHTML = `
      <div>${month}/${day}</div>
      <div style="font-size: 10px; color: #9ca3af;">${getWeekdayName(
        dayOfWeek
      )}</div>
    `;

    container.appendChild(dateCell);
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

// 역할별 차트 내용 렌더링
function renderRoleBasedChartContent(container, dateRange, cellWidth) {
  container.innerHTML = "";

  const roles = ["agency", "client", "partner"];

  roles.forEach((role) => {
    const chartRow = document.createElement("div");
    chartRow.className = "gantt-chart-row";

    // 날짜 셀들 생성
    const currentDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    while (currentDate <= endDate) {
      const cell = document.createElement("div");
      cell.className = "gantt-chart-cell";

      // 주말 표시
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        cell.classList.add("weekend");
      }

      // 오늘 표시
      const today = new Date();
      if (currentDate.toDateString() === today.toDateString()) {
        cell.classList.add("today");
      }

      chartRow.appendChild(cell);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 해당 역할의 작업들 렌더링 (겹침 처리 포함)
    const data =
      unifiedScheduleData.gantt.length > 0
        ? unifiedScheduleData.gantt
        : ganttData;
    const roleTasks = data.filter((task) => task.role === role);

    // 겹침 처리를 위한 스택 렌더링
    const maxStackLevel = renderStackedGanttBars(
      chartRow,
      roleTasks,
      dateRange,
      cellWidth
    );

    // 행 높이를 스택 레벨에 따라 동적 조정
    adjustRowHeight(chartRow, maxStackLevel);

    container.appendChild(chartRow);
  });
}

// 겹침 처리를 위한 스택 렌더링 함수
function renderStackedGanttBars(chartRow, tasks, dateRange, cellWidth) {
  if (tasks.length === 0) return 0;

  // 시작일 기준으로 정렬
  const sortedTasks = tasks.sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  // 겹침 감지 및 스택 레벨 계산
  const stackLevels = calculateStackLevels(sortedTasks);

  // 최대 스택 레벨 계산
  const maxStackLevel = Math.max(...stackLevels);

  // 각 작업을 스택 레벨에 따라 렌더링
  sortedTasks.forEach((task, index) => {
    const ganttBar = createGanttBar(task, dateRange, cellWidth);
    if (ganttBar) {
      // 스택 레벨에 따른 Y 위치 조정
      const stackLevel = stackLevels[index];
      const baseTop = 8; // 기본 top 위치 (CSS와 일치)
      const barHeight = 32; // 바 높이 (CSS와 일치)
      const spacing = 5; // 바 간격
      const top = baseTop + stackLevel * (barHeight + spacing);

      ganttBar.style.top = `${top}px`;

      // 스택된 바에 CSS 클래스 추가
      if (stackLevel > 0) {
        ganttBar.classList.add("stacked");
      }

      chartRow.appendChild(ganttBar);
    }
  });

  return maxStackLevel;
}

// 행 높이를 스택 레벨에 따라 동적 조정
function adjustRowHeight(chartRow, maxStackLevel) {
  const baseHeight = 48; // 기본 행 높이
  const barHeight = 32; // 바 높이
  const spacing = 5; // 바 간격
  const padding = 8; // 하단 패딩

  // 스택 레벨이 0보다 큰 경우에만 높이 조정
  if (maxStackLevel > 0) {
    const additionalHeight = maxStackLevel * (barHeight + spacing) + padding;
    const newHeight = baseHeight + additionalHeight;
    chartRow.style.minHeight = `${newHeight}px`;
    chartRow.classList.add("stacked");
  } else {
    chartRow.style.minHeight = `${baseHeight}px`;
    chartRow.classList.remove("stacked");
  }
}

// 겹침 감지 및 스택 레벨 계산 함수
function calculateStackLevels(tasks) {
  const stackLevels = new Array(tasks.length).fill(0);
  const activeTasks = []; // 현재 활성화된 작업들 (끝나지 않은 작업들)

  tasks.forEach((task, index) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    // 현재 작업 시작 전에 끝난 작업들을 제거
    for (let i = activeTasks.length - 1; i >= 0; i--) {
      const activeTask = activeTasks[i];
      const activeTaskEnd = new Date(activeTask.endDate);
      if (activeTaskEnd <= taskStart) {
        activeTasks.splice(i, 1);
      }
    }

    // 현재 사용 가능한 스택 레벨 찾기
    let availableLevel = 0;
    const usedLevels = activeTasks.map((activeTask) => {
      const activeIndex = tasks.findIndex((t) => t === activeTask);
      return stackLevels[activeIndex];
    });

    while (usedLevels.includes(availableLevel)) {
      availableLevel++;
    }

    stackLevels[index] = availableLevel;
    activeTasks.push(task);
  });

  return stackLevels;
}

// 간트 바 생성
function createGanttBar(task, dateRange, cellWidth) {
  const startDate = new Date(task.startDate);
  const endDate = new Date(task.endDate);
  const rangeStart = new Date(dateRange.start);

  // 날짜 범위를 벗어나는 경우 처리
  if (endDate < rangeStart || startDate > dateRange.end) {
    return null;
  }

  const bar = document.createElement("div");
  bar.className = "gantt-bar";

  // 시작 위치 계산
  const daysDiff = Math.floor((startDate - rangeStart) / (1000 * 60 * 60 * 24));
  const left = daysDiff * cellWidth;

  // 너비 계산
  const duration =
    Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const width = duration * cellWidth - 4; // 4px 여백

  bar.style.left = `${left}px`;
  bar.style.width = `${width}px`;
  bar.style.backgroundColor = task.color;

  // 역할별 클래스 추가
  bar.classList.add(`role-${task.role}`);

  // 텍스트 추가
  const text = document.createElement("div");
  text.className = "gantt-bar-text";
  text.textContent = task.title;
  bar.appendChild(text);

  // 클릭 이벤트 - 상세보기 모달 표시
  bar.addEventListener("click", () => {
    if (task.originalCampaign) {
      // 원본 캠페인 정보가 있으면 상세보기 모달 표시
      showCampaignDetailModal(task.originalCampaign);
    } else {
      // 원본 정보가 없으면 기본 알림
      const roleNames = {
        agency: "대행사",
        client: "고객사",
        partner: "파트너사",
      };
      alert(
        `역할: ${roleNames[task.role]}\n작업: ${task.title}\n시작일: ${
          task.startDate
        }\n종료일: ${task.endDate}`
      );
    }
  });

  return bar;
}

// 색상 인덱스 반환
function getColorIndex(color) {
  const colors = [
    "#FAD02E",
    "#8BD3E6",
    "#FF9AA2",
    "#A8E6CF",
    "#FFB3BA",
    "#B19CD9",
    "#FFD93D",
    "#6BCF7F",
  ];
  return colors.indexOf(color) + 1;
}

// 요일명 반환
function getWeekdayName(dayOfWeek) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return weekdays[dayOfWeek];
}

// 작업 추가 모달 표시
function showAddTaskModal() {
  const modal = document.getElementById("add-task-modal");
  if (modal) {
    modal.style.display = "flex";

    // 오늘 날짜를 기본값으로 설정
    const today = new Date().toISOString().split("T")[0];
    const startDateInput = document.getElementById("task-start-date");
    const endDateInput = document.getElementById("task-end-date");

    if (startDateInput) startDateInput.value = today;
    if (endDateInput) endDateInput.value = today;
  }
}

// 작업 추가 모달 닫기
function closeAddTaskModal() {
  const modal = document.getElementById("add-task-modal");
  if (modal) {
    modal.style.display = "none";

    // 폼 초기화
    const form = document.getElementById("add-task-form");
    if (form) {
      form.reset();
    }
  }
}

// 새 작업 추가
function addTask() {
  const titleInput = document.getElementById("task-title");
  const startDateInput = document.getElementById("task-start-date");
  const endDateInput = document.getElementById("task-end-date");
  const colorSelect = document.getElementById("task-color");

  if (!titleInput || !startDateInput || !endDateInput || !colorSelect) return;

  const title = titleInput.value.trim();
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const color = colorSelect.value;

  if (!title || !startDate || !endDate) {
    alert("모든 필드를 입력해주세요.");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("시작일은 종료일보다 이전이어야 합니다.");
    return;
  }

  // 새 작업 추가
  const newTask = {
    title: title,
    startDate: startDate,
    endDate: endDate,
    color: color,
  };

  ganttData.push(newTask);

  // 간트차트 다시 렌더링
  renderGanttChart();

  // 모달 닫기
  closeAddTaskModal();

  // 성공 메시지
  alert("작업이 성공적으로 추가되었습니다.");
}

// 역할 필터링 함수
function filterByRole(role) {
  currentRoleFilter = role;

  // 필터 버튼 활성 상태 업데이트
  updateFilterButtonStates(role);

  // 간트차트 다시 렌더링
  if (document.getElementById("gantt-section").style.display !== "none") {
    renderGanttChart();
  }

  // 타임라인도 다시 렌더링
  if (document.getElementById("timeline-section").style.display !== "none") {
    renderTimeline();
  }

  // 캘린더도 다시 렌더링
  if (document.getElementById("calendar-section").style.display !== "none") {
    // 캘린더 렌더링 로직이 있다면 여기에 추가
  }
}

// 필터 버튼 활성 상태 업데이트
function updateFilterButtonStates(selectedRole) {
  const buttons = {
    all: document.getElementById("all-filter"),
    client: document.getElementById("customer-filter"),
    partner: document.getElementById("partner-filter"),
    agency: document.getElementById("agency-filter"),
  };

  // 모든 버튼 비활성화
  Object.values(buttons).forEach((btn) => {
    if (btn) btn.classList.remove("active");
  });

  // 선택된 버튼 활성화
  if (buttons[selectedRole]) {
    buttons[selectedRole].classList.add("active");
  }
}

// API에서 스케줄 데이터 가져오기
async function fetchScheduleData() {
  try {
    const response = await fetch("/api/schedule");
    if (!response.ok) {
      throw new Error("네트워크 응답이 올바르지 않습니다");
    }
    const data = await response.json();

    // 데이터가 올바른 형식인지 확인
    if (Array.isArray(data)) {
      ganttData = data;

      // 현재 표시 중인 뷰에 따라 다시 렌더링
      if (document.getElementById("gantt-section").style.display !== "none") {
        renderGanttChart();
      }
      if (
        document.getElementById("timeline-section").style.display !== "none"
      ) {
        renderTimeline();
      }
    }
  } catch (error) {
    console.error("스케줄 데이터를 가져오는 중 오류 발생:", error);
    // 오류 발생 시 기존 데이터 유지
  }
}

// 전역 등록
window.showSchedule = showSchedule;
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;
window.initScheduleManagementComponent = initScheduleManagementComponent;
window.showCampaignDetailInline = showCampaignDetailInline;
window.closeCampaignDetail = closeCampaignDetail;
window.showCampaignDetailModal = showCampaignDetailModal;
window.closeCampaignDetailModal = closeCampaignDetailModal;
window.switchToCalendarView = switchToCalendarView;
window.switchToTimelineView = switchToTimelineView;
window.switchToGanttView = switchToGanttView;
window.showAddScheduleModal = showAddScheduleModal;
window.closeAddScheduleModal = closeAddScheduleModal;
window.addSchedule = addSchedule;
window.showAddTaskModal = showAddTaskModal;
window.closeAddTaskModal = closeAddTaskModal;
window.addTask = addTask;
window.renderGanttChart = renderGanttChart;
window.filterByRole = filterByRole;
window.fetchScheduleData = fetchScheduleData;
window.getFilteredGanttData = getFilteredGanttData;
window.getFilteredTimelineData = getFilteredTimelineData;
window.updateFilterButtonStates = updateFilterButtonStates;
window.convertCalendarToTimelineAndGantt = convertCalendarToTimelineAndGantt;
window.updateTimelineAndGanttFromCalendar = updateTimelineAndGanttFromCalendar;
window.renderStackedGanttBars = renderStackedGanttBars;
window.calculateStackLevels = calculateStackLevels;
window.adjustRowHeight = adjustRowHeight;

// 디버깅용 함수
window.debugCalendarData = function () {
  console.log("현재 캘린더 데이터:", currentCalendarData);
  console.log("현재 타임라인 데이터:", timelineData);
  console.log("현재 간트차트 데이터:", ganttData);
  console.log("통합 스케줄 데이터:", unifiedScheduleData);
  console.log("현재 역할 필터:", currentRoleFilter);
};

// 스택 레벨 테스트 함수
window.testStackLevels = function (role = "client") {
  const data =
    unifiedScheduleData.gantt.length > 0
      ? unifiedScheduleData.gantt
      : ganttData;
  const roleTasks = data.filter((task) => task.role === role);
  const stackLevels = calculateStackLevels(roleTasks);
  console.log(`${role} 역할의 스택 레벨:`, stackLevels);
  console.log(`최대 스택 레벨:`, Math.max(...stackLevels));
  return stackLevels;
};

// 테스트 데이터 추가 함수
window.addTestData = function () {
  const testGanttData = [
    {
      role: "client",
      title: "테스트 캠페인 1",
      startDate: "2024-10-05",
      endDate: "2024-10-10",
      color: "#A3D977",
    },
    {
      role: "client",
      title: "테스트 캠페인 2",
      startDate: "2024-10-08",
      endDate: "2024-10-12",
      color: "#A3D977",
    },
    {
      role: "partner",
      title: "파트너 테스트",
      startDate: "2024-10-06",
      endDate: "2024-10-09",
      color: "#5AB2FF",
    },
  ];

  // 기존 데이터에 테스트 데이터 추가
  ganttData.push(...testGanttData);
  unifiedScheduleData.gantt.push(...testGanttData);

  console.log("테스트 데이터 추가 완료:", testGanttData);

  // 간트차트 다시 렌더링
  if (document.getElementById("gantt-section").style.display !== "none") {
    renderGanttChart();
  }
};

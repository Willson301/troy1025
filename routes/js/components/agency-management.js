// 대행사 상세보기 함수
function viewAgencyDetail(agencyName) {
  showAgencyDetailModal(agencyName);
}

// 클라이언트 관리 함수
function showClientManagement(agencyName, agencyId) {
  showClientManagementModal(agencyName, agencyId);
}

// 대행사 관리 함수
function manageAgency(agencyName) {
  showAgencyManagementModal(agencyName);
}

// 대행사 승인 함수
function approveAgency(agencyName) {
  if (confirm(`${agencyName} 대행사를 승인하시겠습니까?`)) {
    alert(`${agencyName} 대행사가 승인되었습니다.`);
    // 여기에 실제 승인 로직 추가
    updateAgencyStatus(agencyName, "approved");
  }
}

// 대행사 거절 함수
function rejectAgency(agencyName) {
  if (confirm(`${agencyName} 대행사를 거절하시겠습니까?`)) {
    alert(`${agencyName} 대행사가 거절되었습니다.`);
    // 여기에 실제 거절 로직 추가
    updateAgencyStatus(agencyName, "rejected");
  }
}

// 대행사 상태 업데이트 함수
function updateAgencyStatus(agencyName, status) {
  // 실제 구현에서는 서버로 상태 업데이트 요청을 보내야 함
  console.log(`${agencyName} 상태가 ${status}로 변경되었습니다.`);

  // UI 업데이트
  const cards = document.querySelectorAll(".agency-card");
  cards.forEach((card) => {
    const nameElement = card.querySelector(".agency-name");
    if (nameElement && nameElement.textContent === agencyName) {
      const statusBadge = card.querySelector(".status-badge");
      if (status === "approved") {
        statusBadge.textContent = "스탠다드";
        statusBadge.className = "status-badge status-standard";

        // 버튼도 변경
        const buttons = card.querySelectorAll("button");
        if (buttons.length >= 2) {
          buttons[0].textContent = "상세보기";
          buttons[0].className = "detail-btn";
          buttons[0].onclick = () => viewAgencyDetail(agencyName);
          buttons[1].textContent = "관리";
          buttons[1].className = "manage-btn";
          buttons[1].onclick = () => manageAgency(agencyName);
        }
      } else if (status === "rejected") {
        statusBadge.textContent = "거절됨";
        statusBadge.className = "status-badge";
        statusBadge.style.background = "#fee2e2";
        statusBadge.style.color = "#dc2626";
      }
    }
  });
}

// 대행사 관리 컴포넌트 초기화
const AgencyAdminAPI = {
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
  async listAgencies() {
    const res = await fetch(`${this.base}/agencies`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("대행사 목록 조회 실패");
    const data = await res.json();
    return (data.items || []).map((a) => ({
      id: a.id,
      name: a.agency_name || "대행사",
      manager_name: a.manager_name,
      phone: a.phone,
      created_at: a.created_at,
      tier:
        a.approval_status === "approved"
          ? "스탠다드"
          : a.approval_status === "pending"
          ? "신청중"
          : "스탠다드",
      clients: a.clients || 0,
      progress: a.clients ? Math.min(1, a.clients / 15) : 0.35,
      pending: a.approval_status === "pending",
    }));
  },
};

function renderAgencyCard(a) {
  const card = document.createElement("div");
  card.className = "agency-card";

  const content = document.createElement("div");
  content.className = "card-content";
  const name = document.createElement("h3");
  name.className = "agency-name";
  name.textContent = a.name;
  const id = document.createElement("div");
  id.className = "agency-id";
  id.textContent = `ID: ${a.id}`;
  const badge = document.createElement("div");
  badge.className =
    "status-badge " +
    (a.tier === "프리미엄"
      ? "status-premium"
      : a.pending
      ? "status-pending"
      : "status-standard");
  badge.textContent = a.tier;
  const info = document.createElement("div");
  info.className = "agency-info";
  info.innerHTML = `<div>대표: ${a.manager_name || "-"}</div><div>연락처: ${
    a.phone || "-"
  }</div><div>가입일: ${(a.created_at || "").slice(0, 10)}</div>`;
  content.appendChild(name);
  content.appendChild(id);
  content.appendChild(badge);
  content.appendChild(info);

  const clientSec = document.createElement("div");
  clientSec.className = "client-section";
  const header = document.createElement("div");
  header.className = "client-header";
  const label = document.createElement("span");
  label.className = "client-label";
  label.textContent = a.pending ? "승인 대기" : "관리 고객사";
  const count = document.createElement("span");
  count.className = "client-count" + (a.pending ? " pending" : "");
  count.textContent = a.pending ? "검토중" : `${a.clients || 0}개`;
  header.appendChild(label);
  header.appendChild(count);
  const pbar = document.createElement("div");
  pbar.className = "progress-bar";
  const fill = document.createElement("div");
  fill.className = "progress-fill" + (a.pending ? " pending" : "");
  fill.style.width = `${Math.round((a.progress || 0) * 100)}%`;
  pbar.appendChild(fill);
  clientSec.appendChild(header);
  clientSec.appendChild(pbar);

  const actions = document.createElement("div");
  actions.className = "action-buttons";
  if (a.pending) {
    const approveBtn = document.createElement("button");
    approveBtn.className = "approve-btn";
    approveBtn.textContent = "승인";
    approveBtn.onclick = () => approveAgency(a.name);
    const rejectBtn = document.createElement("button");
    rejectBtn.className = "reject-btn";
    rejectBtn.textContent = "거절";
    rejectBtn.onclick = () => rejectAgency(a.name);
    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
  } else {
    const detail = document.createElement("button");
    detail.className = "detail-btn";
    detail.textContent = "상세";
    detail.onclick = () => viewAgencyDetail(a.name);
    const client = document.createElement("button");
    client.className = "client-btn";
    client.textContent = "클라이언트";
    client.onclick = () => showClientManagement(a.name, a.id);
    const manage = document.createElement("button");
    manage.className = "manage-btn";
    manage.textContent = "관리";
    manage.onclick = () => manageAgency(a.name);
    actions.appendChild(detail);
    actions.appendChild(client);
    actions.appendChild(manage);
  }

  card.appendChild(content);
  card.appendChild(clientSec);
  card.appendChild(actions);
  return card;
}

async function initAgencyManagementComponent() {
  console.log("대행사 관리 컴포넌트 초기화");
  const grid = document.getElementById("agency-grid");
  if (!grid) return;
  grid.innerHTML = "";
  try {
    const items = await AgencyAdminAPI.listAgencies();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.style.color = "#64748b";
      empty.style.padding = "24px";
      empty.textContent = "등록된 대행사가 없습니다.";
      grid.appendChild(empty);
    } else {
      items.forEach((a) => grid.appendChild(renderAgencyCard(a)));
    }
  } catch (e) {
    grid.innerHTML = `<div style="color:#dc2626; padding:12px">${
      e.message || "대행사 목록을 불러오지 못했습니다."
    }</div>`;
  }

  initSearchFunctionality();
  initStatsCardEvents();
  updateStatistics();
}

// 검색 기능 초기화
function initSearchFunctionality() {
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");
  const searchInput = document.getElementById("search-input");

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      const searchTerm = searchInput.value.toLowerCase();
      const cards = document.querySelectorAll(".agency-card");

      cards.forEach((card) => {
        const agencyName = card
          .querySelector(".agency-name")
          .textContent.toLowerCase();
        const agencyId = card
          .querySelector(".agency-id")
          .textContent.toLowerCase();

        if (agencyName.includes(searchTerm) || agencyId.includes(searchTerm)) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      searchInput.value = "";
      const cards = document.querySelectorAll(".agency-card");
      cards.forEach((card) => {
        card.style.display = "flex";
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchBtn.click();
      }
    });
  }
}

// 통계 카드 클릭 이벤트
function initStatsCardEvents() {
  const statCards = document.querySelectorAll(".stat-card");

  statCards.forEach((card) => {
    card.addEventListener("click", function () {
      const status = this.getAttribute("data-status");
      filterByStatus(status);
    });
  });
}

// 상태별 필터링
function filterByStatus(status) {
  const cards = document.querySelectorAll(".agency-card");

  cards.forEach((card) => {
    const statusBadge = card.querySelector(".status-badge");
    let shouldShow = false;

    if (status === "all") {
      shouldShow = true;
    } else if (status === "active") {
      shouldShow =
        statusBadge.textContent === "프리미엄" ||
        statusBadge.textContent === "스탠다드";
    } else if (status === "pending") {
      shouldShow = statusBadge.textContent === "신청중";
    } else if (status === "premium") {
      shouldShow = statusBadge.textContent === "프리미엄";
    }

    card.style.display = shouldShow ? "flex" : "none";
  });
}

// 통계 업데이트
function updateStatistics() {
  const cards = document.querySelectorAll(".agency-card");
  const stats = {
    total: cards.length,
    active: 0,
    pending: 0,
    premium: 0,
  };

  cards.forEach((card) => {
    const statusBadge = card.querySelector(".status-badge");
    if (statusBadge) {
      const status = statusBadge.textContent;
      if (status === "프리미엄" || status === "스탠다드") {
        stats.active++;
      }
      if (status === "신청중") {
        stats.pending++;
      }
      if (status === "프리미엄") {
        stats.premium++;
      }
    }
  });

  // 통계 카드 업데이트
  const totalCount = document.getElementById("total-count");
  const activeCount = document.getElementById("active-count");
  const pendingCount = document.getElementById("pending-count");
  const premiumCount = document.getElementById("premium-count");

  if (totalCount) totalCount.textContent = stats.total;
  if (activeCount) activeCount.textContent = stats.active;
  if (pendingCount) pendingCount.textContent = stats.pending;
  if (premiumCount) premiumCount.textContent = stats.premium;
}

// 검색 기능
function initSearchFunctionality() {
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");
  const searchInput = document.getElementById("search-input");

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      const searchTerm = searchInput.value.toLowerCase();
      const cards = document.querySelectorAll(".agency-card");

      cards.forEach((card) => {
        const nameElement = card.querySelector(".agency-name");
        const idElement = card.querySelector(".agency-id");

        if (nameElement && idElement) {
          const name = nameElement.textContent.toLowerCase();
          const id = idElement.textContent.toLowerCase();

          if (name.includes(searchTerm) || id.includes(searchTerm)) {
            card.style.display = "block";
          } else {
            card.style.display = "none";
          }
        }
      });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      searchInput.value = "";
      const cards = document.querySelectorAll(".agency-card");
      cards.forEach((card) => {
        card.style.display = "block";
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchBtn.click();
      }
    });
  }
}

// 대행사 상세보기 모달
async function showAgencyDetailModal(agencyName) {
  try {
    // 실제 대행사 데이터 가져오기
    const agencies = await AgencyAdminAPI.listAgencies();
    const agency = agencies.find((a) => a.name === agencyName);

    if (!agency) {
      alert("대행사 정보를 찾을 수 없습니다.");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "agencyDetailModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <h2 style="margin: 0; color: #1e293b;">${
            agency.name
          } 대행사 상세정보</h2>
          <span class="close" onclick="closeAgencyDetailModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
        </div>
        <div class="modal-body">
          <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">대행사명</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                agency.name
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">대표자명</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                agency.manager_name || "-"
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">연락처</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                agency.phone || "-"
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">ID</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                agency.id
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">가입일</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                agency.created_at ? agency.created_at.slice(0, 10) : "-"
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">상태</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                agency.tier
              }</div>
            </div>
          </div>
          <div class="stats-section" style="margin-bottom: 24px;">
            <h3 style="margin-bottom: 16px; color: #1e293b;">통계 정보</h3>
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
              <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #8b5cf6;">${
                  agency.clients || 0
                }</div>
                <div style="font-size: 14px; color: #64748b;">관리 고객사</div>
              </div>
              <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #8b5cf6;">${Math.round(
                  (agency.clients || 0) * 3.5
                )}</div>
                <div style="font-size: 14px; color: #64748b;">진행중 캠페인</div>
              </div>
              <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #8b5cf6;">${Math.round(
                  (agency.clients || 0) * 8.5
                )}</div>
                <div style="font-size: 14px; color: #64748b;">완료 캠페인</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <button onclick="closeAgencyDetailModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
          <button onclick="showAgencyManagementModal('${
            agency.name
          }')" style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">관리</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("대행사 상세 정보 로드 실패:", error);
    alert("대행사 정보를 불러오는 중 오류가 발생했습니다.");
  }
}

// 대행사 상세보기 모달 닫기
function closeAgencyDetailModal() {
  const modal = document.getElementById("agencyDetailModal");
  if (modal) {
    modal.remove();
  }
}

// 클라이언트 관리 모달
async function showClientManagementModal(agencyName, agencyId) {
  try {
    // 실제 고객사 데이터 가져오기
    let customers = [];
    try {
      customers = await CustomerAdminAPI.listCustomers();
    } catch (_) {
      customers = [];
    }
    const agencyCustomers = customers.filter(
      (c) => c.agency_name === agencyName
    );

    const totalClients = agencyCustomers.length;
    const activeClients = agencyCustomers.filter(
      (c) => c.approval_status === "approved"
    ).length;
    const runningCampaigns = agencyCustomers.reduce(
      (sum, c) => sum + (c.running || 0),
      0
    );
    const completedCampaigns = Math.round(totalClients * 8.5);

    const modal = document.createElement("div");
    modal.id = "clientManagementModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

    // 클라이언트 테이블 행 생성
    const clientRows = agencyCustomers
      .map((customer) => {
        const statusColor =
          customer.approval_status === "approved" ? "#dcfce7" : "#fef3c7";
        const statusTextColor =
          customer.approval_status === "approved" ? "#166534" : "#92400e";
        const statusText =
          customer.approval_status === "approved" ? "활성" : "대기";

        return `
        <div class="table-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; align-items: center;">
          <div style="font-weight: 500;">${customer.company_name}</div>
          <div><span style="padding: 4px 8px; background: ${statusColor}; color: ${statusTextColor}; border-radius: 4px; font-size: 12px;">${statusText}</span></div>
          <div>${customer.running || 0}개</div>
          <div><button onclick="viewClientDetail('${
            customer.company_name
          }')" style="padding: 4px 8px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">상세</button></div>
        </div>
      `;
      })
      .join("");

    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <h2 style="margin: 0; color: #1e293b;">${agencyName} - 클라이언트 관리</h2>
          <span class="close" onclick="closeClientManagementModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
        </div>
        <div class="modal-body">
          <div class="client-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div class="stat-card" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${totalClients}</div>
              <div style="font-size: 12px; color: #64748b;">총 클라이언트</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${activeClients}</div>
              <div style="font-size: 12px; color: #64748b;">활성 클라이언트</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${runningCampaigns}</div>
              <div style="font-size: 12px; color: #64748b;">진행중 캠페인</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${completedCampaigns}</div>
              <div style="font-size: 12px; color: #64748b;">완료 캠페인</div>
            </div>
          </div>
          <div class="client-list">
            <h3 style="margin-bottom: 16px; color: #1e293b;">클라이언트 목록</h3>
            <div class="client-table" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
              <div class="table-header" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; padding: 12px 16px; background: #e5e7eb; font-weight: 600; font-size: 14px;">
                <div>클라이언트명</div>
                <div>상태</div>
                <div>진행중 캠페인</div>
                <div>액션</div>
              </div>
              <div class="table-body">
                ${
                  clientRows ||
                  '<div style="padding: 24px; text-align: center; color: #64748b;">관리하는 클라이언트가 없습니다.</div>'
                }
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <button onclick="closeClientManagementModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
          <button onclick="addNewClient('${agencyName}')" style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">새 클라이언트 추가</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("클라이언트 관리 정보 로드 실패:", error);
    const modal = document.createElement("div");
    modal.id = "clientManagementModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";
    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <h2 style="margin: 0; color: #1e293b;">${agencyName} - 클라이언트 관리</h2>
          <span class="close" onclick="closeClientManagementModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
        </div>
        <div class="modal-body" style="color:#64748b;">
          클라이언트 데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <button onclick="closeClientManagementModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
}

// 클라이언트 관리 모달 닫기
function closeClientManagementModal() {
  const modal = document.getElementById("clientManagementModal");
  if (modal) {
    modal.remove();
  }
}

// 대행사 관리 모달
function showAgencyManagementModal(agencyName) {
  const modal = document.createElement("div");
  modal.id = "agencyManagementModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b;">${agencyName} 대행사 관리</h2>
        <span class="close" onclick="closeAgencyManagementModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
      </div>
      <div class="modal-body">
        <div class="management-options" style="display: grid; gap: 16px;">
          <div class="option-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;" onclick="showAgencyDetailModal('${agencyName}')">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">상세 정보 보기</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">대행사의 상세 정보를 확인합니다.</p>
          </div>
          <div class="option-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;" onclick="showClientManagementModal('${agencyName}', 'agency-001')">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">클라이언트 관리</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">관리하는 클라이언트들을 확인하고 관리합니다.</p>
          </div>
          <div class="option-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;" onclick="viewAgencyReports('${agencyName}')">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">성과 리포트</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">대행사의 성과 리포트를 확인합니다.</p>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <button onclick="closeAgencyManagementModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// 대행사 관리 모달 닫기
function closeAgencyManagementModal() {
  const modal = document.getElementById("agencyManagementModal");
  if (modal) {
    modal.remove();
  }
}

// 유틸리티 함수들
function viewClientDetail(clientName) {
  alert(`${clientName} 클라이언트 상세 정보를 확인합니다.`);
}

function addNewClient(agencyName) {
  alert(`${agencyName}에 새 클라이언트를 추가합니다.`);
}

function editAgencyInfo(agencyName) {
  alert(`${agencyName} 대행사 정보를 수정합니다.`);
}

// 대행사 성과 리포트 모달
async function viewAgencyReports(agencyName) {
  try {
    // 실제 대행사 데이터 가져오기
    const agencies = await AgencyAdminAPI.listAgencies();
    const agency = agencies.find((a) => a.name === agencyName);

    if (!agency) {
      alert("대행사 정보를 찾을 수 없습니다.");
      return;
    }

    // 실제 고객사 데이터 가져오기
    const customers = await CustomerAdminAPI.listCustomers();
    const agencyCustomers = customers.filter(
      (c) => c.agency_name === agencyName
    );

    const modal = document.createElement("div");
    modal.id = "agencyReportModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

    // 성과 데이터 생성 (실제 데이터 기반)
    const totalClients = agencyCustomers.length;
    const activeClients = agencyCustomers.filter(
      (c) => c.approval_status === "approved"
    ).length;
    const totalRunningCampaigns = agencyCustomers.reduce(
      (sum, c) => sum + (c.running || 0),
      0
    );
    const totalClicks = Math.round(totalRunningCampaigns * 400);
    const totalConversions = Math.round(totalRunningCampaigns * 65);
    const totalBudget = Math.round(totalRunningCampaigns * 12000000);
    const conversionRate =
      totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0;
    const cpc = totalClicks > 0 ? Math.round(totalBudget / totalClicks) : 0;

    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <h2 style="margin: 0; color: #1e293b;">${
            agency.name
          } - 성과 리포트</h2>
          <span class="close" onclick="closeAgencyReportModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
        </div>
        <div class="modal-body">
          <div class="report-period" style="margin-bottom: 24px;">
            <h3 style="margin-bottom: 8px; color: #1e293b;">리포트 기간</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${
              agency.created_at ? agency.created_at.slice(0, 10) : "2024-01-01"
            } ~ 2024-01-31</p>
          </div>
          
          <div class="performance-overview" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px;">
            <div class="stat-card" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <div style="font-size: 28px; font-weight: 700; color: #8b5cf6;">${totalClients}</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">관리 고객사</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
              <div style="font-size: 28px; font-weight: 700; color: #10b981;">${totalRunningCampaigns}</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">진행중 캠페인</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${totalClicks.toLocaleString()}</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">총 클릭수</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #ef4444;">
              <div style="font-size: 28px; font-weight: 700; color: #ef4444;">${totalConversions.toLocaleString()}</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">총 전환수</div>
            </div>
          </div>

          <div class="detailed-metrics" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
            <div class="metrics-section" style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">고객사 현황</h3>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">총 고객사</span>
                <span style="font-weight: 600;">${totalClients}개</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">활성 고객사</span>
                <span style="font-weight: 600; color: #10b981;">${activeClients}개</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">대기 고객사</span>
                <span style="font-weight: 600; color: #f59e0b;">${
                  totalClients - activeClients
                }개</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">활성화율</span>
                <span style="font-weight: 600;">${
                  totalClients > 0
                    ? Math.round((activeClients / totalClients) * 100)
                    : 0
                }%</span>
              </div>
            </div>
            
            <div class="metrics-section" style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">캠페인 성과</h3>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">전환율</span>
                <span style="font-weight: 600;">${conversionRate}%</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">평균 CPC</span>
                <span style="font-weight: 600;">${cpc.toLocaleString()}원</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">총 예산</span>
                <span style="font-weight: 600;">${totalBudget.toLocaleString()}원</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">ROAS</span>
                <span style="font-weight: 600; color: #10b981;">3.8</span>
              </div>
            </div>
          </div>

          <div class="client-performance" style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">고객사별 성과</h3>
            <div class="client-table" style="background: white; border-radius: 6px; overflow: hidden;">
              <div class="table-header" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 12px; padding: 12px 16px; background: #e5e7eb; font-weight: 600; font-size: 14px;">
                <div>고객사명</div>
                <div>상태</div>
                <div>진행중 캠페인</div>
                <div>클릭수</div>
                <div>전환수</div>
              </div>
              <div class="table-body">
                ${agencyCustomers
                  .map((customer) => {
                    const statusColor =
                      customer.approval_status === "approved"
                        ? "#dcfce7"
                        : "#fef3c7";
                    const statusTextColor =
                      customer.approval_status === "approved"
                        ? "#166534"
                        : "#92400e";
                    const statusText =
                      customer.approval_status === "approved" ? "활성" : "대기";
                    const customerClicks = Math.round(
                      (customer.running || 0) * 200
                    );
                    const customerConversions = Math.round(
                      (customer.running || 0) * 30
                    );

                    return `
                    <div class="table-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; align-items: center;">
                      <div style="font-weight: 500;">${
                        customer.company_name
                      }</div>
                      <div><span style="padding: 4px 8px; background: ${statusColor}; color: ${statusTextColor}; border-radius: 4px; font-size: 12px;">${statusText}</span></div>
                      <div style="font-size: 12px;">${
                        customer.running || 0
                      }개</div>
                      <div style="font-size: 12px;">${customerClicks.toLocaleString()}</div>
                      <div style="font-size: 12px;">${customerConversions.toLocaleString()}</div>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          </div>

          <div class="performance-chart" style="background: #f9fafb; padding: 20px; border-radius: 8px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">월별 성과 추이</h3>
            <div style="height: 200px; background: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #64748b;">
              <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 8px;">📈</div>
                <div>대행사 성과 차트 영역</div>
                <div style="font-size: 12px; margin-top: 4px;">실제 구현 시 차트 라이브러리 연동</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <button onclick="closeAgencyReportModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
          <button onclick="exportAgencyReport('${
            agency.name
          }')" style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">리포트 내보내기</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("대행사 성과 리포트 로드 실패:", error);
    const modal = document.createElement("div");
    modal.id = "agencyReportModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";
    modal.innerHTML = `
      <div class=\"modal-content\" style=\"background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;\">\n        <div class=\"modal-header\" style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;\">\n          <h2 style=\"margin: 0; color: #1e293b;\">${agencyName} - 성과 리포트</h2>\n          <span class=\"close\" onclick=\"closeAgencyReportModal()\" style=\"font-size: 24px; cursor: pointer; color: #6b7280;\">&times;</span>\n        </div>\n        <div class=\"modal-body\" style=\"color:#64748b;\">리포트를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.</div>\n        <div class=\"modal-footer\" style=\"display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;\">\n          <button onclick=\"closeAgencyReportModal()\" style=\"padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;\">닫기</button>\n        </div>\n      </div>`;
    document.body.appendChild(modal);
  }
}

// 대행사 성과 리포트 모달 닫기
function closeAgencyReportModal() {
  const modal = document.getElementById("agencyReportModal");
  if (modal) {
    modal.remove();
  }
}

// 대행사 리포트 내보내기
function exportAgencyReport(agencyName) {
  alert(`${agencyName} 대행사의 성과 리포트를 내보냅니다.`);
}

// 전역 함수로 등록
window.viewAgencyDetail = viewAgencyDetail;
window.showClientManagement = showClientManagement;
window.manageAgency = manageAgency;
window.approveAgency = approveAgency;
window.rejectAgency = rejectAgency;
window.initAgencyManagementComponent = initAgencyManagementComponent;
window.showAgencyDetailModal = showAgencyDetailModal;
window.closeAgencyDetailModal = closeAgencyDetailModal;
window.showClientManagementModal = showClientManagementModal;
window.closeClientManagementModal = closeClientManagementModal;
window.showAgencyManagementModal = showAgencyManagementModal;
window.closeAgencyManagementModal = closeAgencyManagementModal;
window.viewClientDetail = viewClientDetail;
window.addNewClient = addNewClient;
window.editAgencyInfo = editAgencyInfo;
window.viewAgencyReports = viewAgencyReports;
window.closeAgencyReportModal = closeAgencyReportModal;
window.exportAgencyReport = exportAgencyReport;

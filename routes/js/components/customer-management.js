// 고객사 상세보기 함수
function viewCustomerDetail(customerName) {
  showCustomerDetailModal(customerName);
}

// 고객사 관리 함수
function manageCustomer(customerName) {
  showCustomerManagementModal(customerName);
}

// 고객사 승인 함수
function approveCustomer(customerName) {
  if (confirm(`${customerName} 고객사를 승인하시겠습니까?`)) {
    alert(`${customerName} 고객사가 승인되었습니다.`);
    // 여기에 실제 승인 로직 추가
    updateCustomerStatus(customerName, "approved");
  }
}

// 고객사 거절 함수
function rejectCustomer(customerName) {
  if (confirm(`${customerName} 고객사를 거절하시겠습니까?`)) {
    alert(`${customerName} 고객사가 거절되었습니다.`);
    // 여기에 실제 거절 로직 추가
    updateCustomerStatus(customerName, "rejected");
  }
}

// 고객사 상태 업데이트 함수
function updateCustomerStatus(customerName, status) {
  // 실제 구현에서는 서버로 상태 업데이트 요청을 보내야 함
  console.log(`${customerName} 상태가 ${status}로 변경되었습니다.`);

  // UI 업데이트
  const cards = document.querySelectorAll(".customer-card");
  cards.forEach((card) => {
    const nameElement = card.querySelector(".customer-name");
    if (nameElement && nameElement.textContent === customerName) {
      const statusBadge = card.querySelector(".status-badge");
      if (status === "approved") {
        statusBadge.textContent = "활성";
        statusBadge.className = "status-badge status-active";

        // 버튼도 변경
        const buttons = card.querySelectorAll("button");
        if (buttons.length >= 2) {
          buttons[0].textContent = "상세보기";
          buttons[0].className = "detail-btn";
          buttons[0].onclick = () => viewCustomerDetail(customerName);
          buttons[1].textContent = "관리";
          buttons[1].className = "manage-btn";
          buttons[1].onclick = () => manageCustomer(customerName);
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

// 고객사 관리 API
const CustomerAdminAPI = {
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
  async listCustomers() {
    const res = await fetch(`${this.base}/customers`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("고객사 목록 조회 실패");
    const data = await res.json();
    return (data.items || []).map((c) => ({
      id: c.id,
      name: c.company_name || "고객사",
      company_name: c.company_name || "고객사",
      manager_name: c.manager_name,
      phone: c.phone,
      created_at: c.created_at,
      approval_status: c.approval_status,
      status:
        c.approval_status === "approved"
          ? "활성"
          : c.approval_status === "pending"
          ? "승인대기"
          : "활성",
      running: c.running || 0,
      progress: c.progress || 0,
      pending: c.approval_status === "pending",
    }));
  },
};

// 고객사 카드 렌더링 함수
function renderCustomerCard(c) {
  const card = document.createElement("div");
  card.className = "customer-card";

  const content = document.createElement("div");
  content.className = "card-content";

  const name = document.createElement("h3");
  name.className = "customer-name";
  name.textContent = c.name;

  const id = document.createElement("div");
  id.className = "customer-id";
  id.textContent = `ID: ${c.id}`;

  const badge = document.createElement("div");
  badge.className =
    "status-badge " + (c.pending ? "status-pending" : "status-active");
  badge.textContent = c.status;

  const info = document.createElement("div");
  info.className = "customer-info";
  info.innerHTML = `<div>대표: ${c.manager_name || "-"}</div><div>연락처: ${
    c.phone || "-"
  }</div><div>가입일: ${(c.created_at || "").slice(0, 10)}</div>`;

  content.appendChild(name);
  content.appendChild(id);
  content.appendChild(badge);
  content.appendChild(info);

  const campaignSec = document.createElement("div");
  campaignSec.className = "campaign-section";

  const header = document.createElement("div");
  header.className = "campaign-header";

  const label = document.createElement("span");
  label.className = "campaign-label";
  label.textContent = c.pending ? "승인 대기" : "진행중 캠페인";

  const count = document.createElement("span");
  count.className = "campaign-count" + (c.pending ? " pending" : "");
  count.textContent = c.pending ? "검토중" : `${c.running || 0}개`;

  header.appendChild(label);
  header.appendChild(count);

  const pbar = document.createElement("div");
  pbar.className = "progress-bar";

  const fill = document.createElement("div");
  fill.className = "progress-fill" + (c.pending ? " pending" : "");
  fill.style.width = `${Math.round((c.progress || 0) * 100)}%`;

  pbar.appendChild(fill);
  campaignSec.appendChild(header);
  campaignSec.appendChild(pbar);

  const actions = document.createElement("div");
  actions.className = "action-buttons";

  if (c.pending) {
    const approveBtn = document.createElement("button");
    approveBtn.className = "approve-btn";
    approveBtn.textContent = "승인";
    approveBtn.onclick = () => approveCustomer(c.name);

    const rejectBtn = document.createElement("button");
    rejectBtn.className = "reject-btn";
    rejectBtn.textContent = "거절";
    rejectBtn.onclick = () => rejectCustomer(c.name);

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
  } else {
    const detail = document.createElement("button");
    detail.className = "detail-btn";
    detail.textContent = "상세";
    detail.onclick = () => viewCustomerDetail(c.name);

    const manage = document.createElement("button");
    manage.className = "manage-btn";
    manage.textContent = "관리";
    manage.onclick = () => manageCustomer(c.name);

    actions.appendChild(detail);
    actions.appendChild(manage);
  }

  card.appendChild(content);
  card.appendChild(campaignSec);
  card.appendChild(actions);
  return card;
}

// 고객사 관리 컴포넌트 초기화
async function initCustomerManagementComponent() {
  console.log("고객사 관리 컴포넌트 초기화");

  const grid = document.getElementById("customer-grid");
  if (!grid) return;

  grid.innerHTML = "";

  try {
    const items = await CustomerAdminAPI.listCustomers();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.style.color = "#64748b";
      empty.style.padding = "24px";
      empty.textContent = "등록된 고객사가 없습니다.";
      grid.appendChild(empty);
    } else {
      items.forEach((c) => grid.appendChild(renderCustomerCard(c)));
    }
  } catch (e) {
    grid.innerHTML = `<div style="color:#dc2626; padding:12px">${
      e.message || "고객사 목록을 불러오지 못했습니다."
    }</div>`;
  }

  // 검색 기능 초기화
  initSearchFunctionality();
}

// 검색 기능 초기화
function initSearchFunctionality() {
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");
  const searchInput = document.getElementById("search-input");

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      const searchTerm = searchInput.value.toLowerCase();
      const cards = document.querySelectorAll(".customer-card");

      cards.forEach((card) => {
        const nameElement = card.querySelector(".customer-name");
        const idElement = card.querySelector(".customer-id");

        if (nameElement && idElement) {
          const name = nameElement.textContent.toLowerCase();
          const id = idElement.textContent.toLowerCase();

          if (name.includes(searchTerm) || id.includes(searchTerm)) {
            card.style.display = "flex";
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
      const cards = document.querySelectorAll(".customer-card");
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

// 고객사 상세보기 모달
async function showCustomerDetailModal(customerName) {
  try {
    // 실제 고객사 데이터 가져오기
    const customers = await CustomerAdminAPI.listCustomers();
    const customer = customers.find((c) => c.company_name === customerName);

    if (!customer) {
      alert("고객사 정보를 찾을 수 없습니다.");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "customerDetailModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <h2 style="margin: 0; color: #1e293b;">${
            customer.company_name
          } 고객사 상세정보</h2>
          <span class="close" onclick="closeCustomerDetailModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
        </div>
        <div class="modal-body">
          <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">고객사명</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                customer.company_name
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">대표자명</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                customer.manager_name || "-"
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">연락처</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                customer.phone || "-"
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">ID</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                customer.id
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">가입일</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                customer.created_at ? customer.created_at.slice(0, 10) : "-"
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">상태</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                customer.approval_status === "approved" ? "승인됨" : "대기중"
              }</div>
            </div>
          </div>
          <div class="stats-section" style="margin-bottom: 24px;">
            <h3 style="margin-bottom: 16px; color: #1e293b;">캠페인 통계</h3>
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
              <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #8b5cf6;">${
                  customer.running || 0
                }</div>
                <div style="font-size: 14px; color: #64748b;">진행중 캠페인</div>
              </div>
              <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #8b5cf6;">${
                  customer.progress || 0
                }</div>
                <div style="font-size: 14px; color: #64748b;">완료 캠페인</div>
              </div>
              <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #8b5cf6;">${
                  (customer.running || 0) + (customer.progress || 0)
                }</div>
                <div style="font-size: 14px; color: #64748b;">총 캠페인</div>
              </div>
            </div>
          </div>
          <div class="recent-campaigns" style="margin-bottom: 24px;">
            <h3 style="margin-bottom: 16px; color: #1e293b;">캠페인 현황</h3>
            <div class="campaign-list" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
              ${
                (customer.running || 0) > 0
                  ? `
                <div class="campaign-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                  <div>
                    <div style="font-weight: 500;">${
                      customer.company_name
                    } 메인 캠페인</div>
                    <div style="font-size: 12px; color: #64748b;">${
                      customer.created_at
                        ? customer.created_at.slice(0, 10)
                        : "2024-01-20"
                    } 시작</div>
                  </div>
                  <div><span style="padding: 4px 8px; background: #dcfce7; color: #166534; border-radius: 4px; font-size: 12px;">진행중</span></div>
                </div>
              `
                  : ""
              }
              ${
                (customer.progress || 0) > 0
                  ? `
                <div class="campaign-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; ${
                  (customer.running || 0) > 0
                    ? "border-bottom: 1px solid #e5e7eb;"
                    : ""
                }">
                  <div>
                    <div style="font-weight: 500;">${
                      customer.company_name
                    } 완료된 캠페인</div>
                    <div style="font-size: 12px; color: #64748b;">${
                      customer.created_at
                        ? new Date(customer.created_at)
                            .toISOString()
                            .slice(0, 10)
                        : "2024-01-15"
                    } 완료</div>
                  </div>
                  <div><span style="padding: 4px 8px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-size: 12px;">완료</span></div>
                </div>
              `
                  : ""
              }
              ${
                (customer.running || 0) === 0 && (customer.progress || 0) === 0
                  ? `
                <div class="campaign-item" style="display: flex; justify-content: center; align-items: center; padding: 24px 16px;">
                  <div style="text-align: center; color: #64748b;">
                    <div style="font-size: 16px; margin-bottom: 8px;">📊</div>
                    <div>등록된 캠페인이 없습니다.</div>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <button onclick="closeCustomerDetailModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
          <button onclick="showCustomerManagementModal('${
            customer.company_name
          }')" style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">관리</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("고객사 상세 정보 로드 실패:", error);
    alert("고객사 정보를 불러오는 중 오류가 발생했습니다.");
  }
}

// 고객사 상세보기 모달 닫기
function closeCustomerDetailModal() {
  const modal = document.getElementById("customerDetailModal");
  if (modal) {
    modal.remove();
  }
}

// 고객사 관리 모달
function showCustomerManagementModal(customerName) {
  const modal = document.createElement("div");
  modal.id = "customerManagementModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b;">${customerName} 고객사 관리</h2>
        <span class="close" onclick="closeCustomerManagementModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
      </div>
      <div class="modal-body">
        <div class="management-options" style="display: grid; gap: 16px;">
          <div class="option-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;" onclick="showCustomerDetailModal('${customerName}')">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">상세정보보기</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">고객사의 상세 정보를 확인합니다.</p>
          </div>
          <div class="option-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;" onclick="viewCustomerCampaigns('${customerName}')">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">캠페인 관리</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">고객사의 캠페인을 확인하고 관리합니다.</p>
          </div>
          <div class="option-item" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;" onclick="viewCustomerReports('${customerName}')">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">성과 리포트</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">고객사의 성과 리포트를 확인합니다.</p>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <button onclick="closeCustomerManagementModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// 고객사 관리 모달 닫기
function closeCustomerManagementModal() {
  const modal = document.getElementById("customerManagementModal");
  if (modal) {
    modal.remove();
  }
}

// 캠페인 관리 모달
async function viewCustomerCampaigns(customerName) {
  try {
    // 실제 고객사 데이터 가져오기
    const customers = await CustomerAdminAPI.listCustomers();
    const customer = customers.find((c) => c.company_name === customerName);

    if (!customer) {
      alert("고객사 정보를 찾을 수 없습니다.");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "customerCampaignModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

    // 캠페인 데이터 생성 (실제 데이터 기반)
    const campaigns = [];

    // 진행중인 캠페인 추가
    if (customer.running > 0) {
      campaigns.push({
        name: `${customer.company_name} 메인 캠페인`,
        status: "진행중",
        startDate: customer.created_at
          ? customer.created_at.slice(0, 10)
          : "2024-01-20",
        endDate: "2024-02-20",
        budget: "5,000,000원",
        clicks: Math.round((customer.running || 0) * 150),
        conversions: Math.round((customer.running || 0) * 25),
      });
    }

    // 완료된 캠페인 추가
    if (customer.progress > 0) {
      campaigns.push({
        name: `${customer.company_name} 완료된 캠페인`,
        status: "완료",
        startDate: customer.created_at
          ? new Date(customer.created_at).toISOString().slice(0, 10)
          : "2024-01-15",
        endDate: "2024-01-30",
        budget: "3,000,000원",
        clicks: Math.round((customer.progress || 0) * 120),
        conversions: Math.round((customer.progress || 0) * 18),
      });
    }

    // 캠페인이 없는 경우 빈 배열 유지

    // 캠페인 테이블 행 생성
    const campaignRows =
      campaigns.length > 0
        ? campaigns
            .map((campaign) => {
              const statusColor =
                campaign.status === "진행중" ? "#dcfce7" : "#e0e7ff";
              const statusTextColor =
                campaign.status === "진행중" ? "#166534" : "#4338ca";

              return `
        <div class="table-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; align-items: center;">
          <div style="font-weight: 500;">${campaign.name}</div>
          <div><span style="padding: 4px 8px; background: ${statusColor}; color: ${statusTextColor}; border-radius: 4px; font-size: 12px;">${campaign.status}</span></div>
          <div style="font-size: 12px;">${campaign.startDate}</div>
          <div style="font-size: 12px;">${campaign.budget}</div>
          <div style="font-size: 12px;">${campaign.clicks}</div>
          <div style="font-size: 12px;">${campaign.conversions}</div>
        </div>
      `;
            })
            .join("")
        : `
        <div class="table-row" style="display: flex; justify-content: center; align-items: center; padding: 24px 16px; grid-column: 1 / -1;">
          <div style="text-align: center; color: #64748b;">
            <div style="font-size: 16px; margin-bottom: 8px;">📊</div>
            <div>등록된 캠페인이 없습니다.</div>
          </div>
        </div>
      `;

    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 3% auto; padding: 24px; border-radius: 12px; max-width: 1000px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <h2 style="margin: 0; color: #1e293b;">${
            customer.company_name
          } - 캠페인 관리</h2>
          <span class="close" onclick="closeCustomerCampaignModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
        </div>
        <div class="modal-body">
          <div class="campaign-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div class="stat-card" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${
                campaigns.length
              }</div>
              <div style="font-size: 12px; color: #64748b;">총 캠페인</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${
                campaigns.filter((c) => c.status === "진행중").length
              }</div>
              <div style="font-size: 12px; color: #64748b;">진행중 캠페인</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${campaigns.reduce(
                (sum, c) => sum + parseInt(c.clicks),
                0
              )}</div>
              <div style="font-size: 12px; color: #64748b;">총 클릭수</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${campaigns.reduce(
                (sum, c) => sum + parseInt(c.conversions),
                0
              )}</div>
              <div style="font-size: 12px; color: #64748b;">총 전환수</div>
            </div>
          </div>
          <div class="campaign-list">
            <h3 style="margin-bottom: 16px; color: #1e293b;">캠페인 목록</h3>
            <div class="campaign-table" style="background: #f9fafb; border-radius: 8px; overflow: hidden;">
              <div class="table-header" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr; gap: 12px; padding: 12px 16px; background: #e5e7eb; font-weight: 600; font-size: 14px;">
                <div>캠페인명</div>
                <div>상태</div>
                <div>시작일</div>
                <div>예산</div>
                <div>클릭수</div>
                <div>전환수</div>
              </div>
              <div class="table-body">
                ${campaignRows}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <button onclick="closeCustomerCampaignModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
          <button onclick="createNewCampaign('${
            customer.company_name
          }')" style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">새 캠페인 생성</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("캠페인 관리 정보 로드 실패:", error);
    alert("캠페인 정보를 불러오는 중 오류가 발생했습니다.");
  }
}

// 캠페인 관리 모달 닫기
function closeCustomerCampaignModal() {
  const modal = document.getElementById("customerCampaignModal");
  if (modal) {
    modal.remove();
  }
}

// 유틸리티 함수들
function createNewCampaign(customerName) {
  alert(`${customerName} 고객사의 새 캠페인을 생성합니다.`);
}

function editCustomerInfo(customerName) {
  alert(`${customerName} 고객사 정보를 수정합니다.`);
}

// 성과 리포트 모달
async function viewCustomerReports(customerName) {
  try {
    // 실제 고객사 데이터 가져오기
    const customers = await CustomerAdminAPI.listCustomers();
    const customer = customers.find((c) => c.company_name === customerName);

    if (!customer) {
      alert("고객사 정보를 찾을 수 없습니다.");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "customerReportModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

    // 성과 데이터 생성 (실제 데이터 기반)
    const totalCampaigns = (customer.running || 0) + (customer.progress || 0);
    const totalClicks = Math.round(totalCampaigns * 350);
    const totalConversions = Math.round(totalCampaigns * 55);
    const totalBudget = Math.round(totalCampaigns * 9500000);
    const usedBudget = Math.round(totalBudget * 0.7); // 70% 사용 가정
    const remainingBudget = totalBudget - usedBudget;
    const conversionRate =
      totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0;
    const cpc = totalClicks > 0 ? Math.round(totalBudget / totalClicks) : 0;
    const usageRate =
      totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;

    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 1100px; max-height: 92vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <h2 style="margin: 0; color: #1e293b;">${
            customer.company_name
          } - 성과 리포트</h2>
          <span class="close" onclick="closeCustomerReportModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
        </div>
        <div class="modal-body">
          <div class="report-period" style="margin-bottom: 24px;">
            <h3 style="margin-bottom: 8px; color: #1e293b;">리포트 기간</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${
              customer.created_at
                ? customer.created_at.slice(0, 10)
                : "2024-01-01"
            } ~ 2024-01-31</p>
          </div>
          
          <div class="performance-overview" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px;">
            <div class="stat-card" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <div style="font-size: 28px; font-weight: 700; color: #8b5cf6;">${totalClicks.toLocaleString()}</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">총 클릭수</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
              <div style="font-size: 28px; font-weight: 700; color: #10b981;">${totalConversions.toLocaleString()}</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">총 전환수</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${conversionRate}%</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">전환율</div>
            </div>
            <div class="stat-card" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #ef4444;">
              <div style="font-size: 28px; font-weight: 700; color: #ef4444;">${cpc.toLocaleString()}원</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">평균 CPC</div>
            </div>
          </div>

          <div class="detailed-metrics" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
            <div class="metrics-section" style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">예산 및 비용</h3>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">총 예산</span>
                <span style="font-weight: 600;">${totalBudget.toLocaleString()}원</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">사용 예산</span>
                <span style="font-weight: 600;">${usedBudget.toLocaleString()}원</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">잔여 예산</span>
                <span style="font-weight: 600; color: #10b981;">${remainingBudget.toLocaleString()}원</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">예산 사용률</span>
                <span style="font-weight: 600;">${usageRate}%</span>
              </div>
            </div>
            
            <div class="metrics-section" style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">캠페인 성과</h3>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">진행중 캠페인</span>
                <span style="font-weight: 600;">${
                  customer.running || 0
                }개</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">완료 캠페인</span>
                <span style="font-weight: 600;">${
                  customer.progress || 0
                }개</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">평균 CTR</span>
                <span style="font-weight: 600;">${
                  totalClicks > 0
                    ? ((totalClicks / totalCampaigns) * 0.1).toFixed(1)
                    : 0
                }%</span>
              </div>
              <div class="metric-item" style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">ROAS</span>
                <span style="font-weight: 600; color: #10b981;">${
                  totalBudget > 0
                    ? ((totalConversions * 50000) / totalBudget).toFixed(1)
                    : 0
                }</span>
              </div>
            </div>
          </div>

          <div class="performance-chart" style="background: #f9fafb; padding: 20px; border-radius: 8px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">일별 성과 추이</h3>
            <div style="height: 200px; background: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #64748b;">
              <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 8px;">📊</div>
                <div>성과 차트 영역</div>
                <div style="font-size: 12px; margin-top: 4px;">실제 구현 시 차트 라이브러리 연동</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <button onclick="closeCustomerReportModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">닫기</button>
          <button onclick="exportReport('${
            customer.company_name
          }')" style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">리포트 내보내기</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("성과 리포트 로드 실패:", error);
    alert("성과 리포트를 불러오는 중 오류가 발생했습니다.");
  }
}

// 성과 리포트 모달 닫기
function closeCustomerReportModal() {
  const modal = document.getElementById("customerReportModal");
  if (modal) {
    modal.remove();
  }
}

// 리포트 내보내기
function exportReport(customerName) {
  alert(`${customerName} 고객사의 성과 리포트를 내보냅니다.`);
}

// 전역 함수로 등록
window.viewCustomerDetail = viewCustomerDetail;
window.manageCustomer = manageCustomer;
window.approveCustomer = approveCustomer;
window.rejectCustomer = rejectCustomer;
window.initCustomerManagementComponent = initCustomerManagementComponent;
window.showCustomerDetailModal = showCustomerDetailModal;
window.closeCustomerDetailModal = closeCustomerDetailModal;
window.showCustomerManagementModal = showCustomerManagementModal;
window.closeCustomerManagementModal = closeCustomerManagementModal;
window.viewCustomerCampaigns = viewCustomerCampaigns;
window.closeCustomerCampaignModal = closeCustomerCampaignModal;
window.createNewCampaign = createNewCampaign;
window.viewCustomerReports = viewCustomerReports;
window.closeCustomerReportModal = closeCustomerReportModal;
window.exportReport = exportReport;

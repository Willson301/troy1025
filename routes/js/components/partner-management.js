const PartnerAdminAPI = {
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
  async listPartners() {
    const res = await fetch(`${this.base}/partners`, {
      headers: this.headers(),
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json()
      : { error: await res.text() };
    if (!res.ok) throw new Error(data.error || "파트너 목록 조회 실패");
    return data.items || [];
  },
  async getPartner(id) {
    const res = await fetch(`${this.base}/partners/${id}`, {
      headers: this.headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "파트너 상세 조회 실패");
    return data;
  },
  async getSettlement(id) {
    const res = await fetch(`${this.base}/partners/${id}/settlement`, {
      headers: this.headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "정산 조회 실패");
    return data;
  },
};

function viewPartnerDetailById(id) {
  PartnerAdminAPI.getPartner(id)
    .then((detail) => {
      // 기존 모달 제거
      const existing = document.getElementById("partnerDetailModal");
      if (existing) existing.remove();

      const modal = document.createElement("div");
      modal.id = "partnerDetailModal";
      modal.className = "modal";
      modal.style.cssText =
        "display:block; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5);";

      const statusBadgeBg =
        detail.approval_status === "approved"
          ? "#dcfce7"
          : detail.approval_status === "pending"
          ? "#fef3c7"
          : "#e5e7eb";
      const statusBadgeColor =
        detail.approval_status === "approved"
          ? "#166534"
          : detail.approval_status === "pending"
          ? "#92400e"
          : "#374151";

      modal.innerHTML = `
        <div class="modal-content" style="background-color:white; margin:2% auto; padding:28px; border-radius:14px; width:95%; max-width:1100px; max-height:92vh; overflow-y:auto;">
          <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid #e5e7eb; padding-bottom:16px;">
            <h2 style="margin:0; color:#1e293b;">파트너 상세정보</h2>
            <span class="close" onclick="closePartnerDetailModal()" style="font-size:24px; cursor:pointer; color:#6b7280;">&times;</span>
          </div>
          <div class="modal-body">
            <div class="info-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
              <div class="info-item">
                <label style="display:block; margin-bottom:4px; font-weight:600; color:#374151;">파트너명</label>
                <div style="padding:8px 12px; background:#f9fafb; border-radius:6px;">${
                  detail.name || "-"
                }</div>
              </div>
              <div class="info-item">
                <label style="display:block; margin-bottom:4px; font-weight:600; color:#374151;">담당자</label>
                <div style="padding:8px 12px; background:#f9fafb; border-radius:6px;">${
                  detail.manager_name || "-"
                }</div>
              </div>
              <div class="info-item">
                <label style="display:block; margin-bottom:4px; font-weight:600; color:#374151;">연락처</label>
                <div style="padding:8px 12px; background:#f9fafb; border-radius:6px;">${
                  detail.phone || "-"
                }</div>
              </div>
              <div class="info-item">
                <label style="display:block; margin-bottom:4px; font-weight:600; color:#374151;">파트너 코드</label>
                <div style="padding:8px 12px; background:#f9fafb; border-radius:6px;">${
                  detail.partner_code || "-"
                }</div>
              </div>
              <div class="info-item">
                <label style="display:block; margin-bottom:4px; font-weight:600; color:#374151;">사업자명</label>
                <div style="padding:8px 12px; background:#f9fafb; border-radius:6px;">${
                  detail.business_name || "-"
                }</div>
              </div>
              <div class="info-item">
                <label style="display:block; margin-bottom:4px; font-weight:600; color:#374151;">사업자번호</label>
                <div style="padding:8px 12px; background:#f9fafb; border-radius:6px;">${
                  detail.business_number || "-"
                }</div>
              </div>
              <div class="info-item">
                <label style="display:block; margin-bottom:4px; font-weight:600; color:#374151;">가입일</label>
                <div style="padding:8px 12px; background:#f9fafb; border-radius:6px;">${
                  (detail.created_at || "").slice(0, 10) || "-"
                }</div>
              </div>
              <div class="info-item">
                <label style="display:block; margin-bottom:4px; font-weight:600; color:#374151;">승인상태</label>
                <div style="padding:8px 12px; background:${statusBadgeBg}; color:${statusBadgeColor}; border-radius:6px; font-weight:600; text-align:center;">${
        detail.approval_status || "-"
      }</div>
              </div>
            </div>

            <div class="stats-section" style="margin-bottom:24px;">
              <h3 style="margin-bottom:12px; color:#1e293b; font-size:16px;">최근 실적</h3>
              <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px;">
                <div style="text-align:center; padding:16px; background:#f8fafc; border-radius:8px;">
                  <div style="font-size:24px; font-weight:700; color:#8b5cf6;">${(
                    detail.monthly_revenue || 0
                  ).toLocaleString()}원</div>
                  <div style="font-size:13px; color:#64748b;">월 매출</div>
                </div>
                <div style="text-align:center; padding:16px; background:#f8fafc; border-radius:8px;">
                  <div style="font-size:24px; font-weight:700; color:#10b981;">${
                    detail.active_clients || 0
                  }개</div>
                  <div style="font-size:13px; color:#64748b;">활성 클라이언트</div>
                </div>
                <div style="text-align:center; padding:16px; background:#f8fafc; border-radius:8px;">
                  <div style="font-size:24px; font-weight:700; color:#f59e0b;">${
                    detail.completed_projects || 0
                  }건</div>
                  <div style="font-size:13px; color:#64748b;">완료 프로젝트</div>
                </div>
              </div>
            </div>

            <div class="members-section" style="margin-bottom:24px;">
              <h3 style="margin-bottom:12px; color:#1e293b; font-size:16px;">해당 코드로 가입한 회원 목록</h3>
              <div id="partner-members-list" style="background:#f8fafc; border-radius:8px; padding:16px; min-height:200px;">
                <div style="text-align:center; color:#64748b; padding:40px;">
                  <div style="margin-bottom:8px;">회원 목록을 불러오는 중...</div>
                  <div style="font-size:12px;">잠시만 기다려주세요.</div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; gap:12px; justify-content:flex-end; border-top:1px solid #e5e7eb; padding-top:16px;">
            <button onclick="closePartnerDetailModal()" style="padding:8px 16px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer;">닫기</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // 회원 목록 로드
      loadPartnerMembers(detail.partner_code);
    })
    .catch((e) => {
      const msg = typeof e === "string" ? e : e.message;
      alert(msg);
    });
}

// 파트너 코드로 가입한 회원 목록 로드
async function loadPartnerMembers(partnerCode) {
  const membersListEl = document.getElementById("partner-members-list");
  if (!membersListEl) return;

  try {
    const res = await fetch(
      `/api/admin/partner-members?code=${encodeURIComponent(partnerCode)}`,
      {
        headers: PartnerAdminAPI.headers(),
        cache: "no-store",
      }
    );
    const data = await res.json();
    const members = Array.isArray(data.items) ? data.items : [];

    if (members.length === 0) {
      membersListEl.innerHTML =
        '<div style="text-align:center; color:#64748b; padding:40px;">데이터가 없습니다.</div>';
      return;
    }

    membersListEl.innerHTML = members
      .map((m) => {
        return `
        <div style="display:grid; grid-template-columns: 1.2fr 1.2fr 1fr 0.8fr 0.8fr; gap:12px; padding:12px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px;">
          <div><strong>${
            m.name || "-"
          }</strong><div style="color:#6b7280;font-size:12px;">${
          m.email || "-"
        }</div></div>
          <div>${m.phone || "-"}</div>
          <div>${(m.joinDate || "").slice(0, 10) || "-"}</div>
          <div>${m.totalOrders || 0}건</div>
          <div>${(m.totalAmount || 0).toLocaleString()}원</div>
        </div>`;
      })
      .join("");
  } catch (e) {
    console.error("loadPartnerMembers error", e);
    membersListEl.innerHTML =
      '<div style="text-align:center; color:#dc2626; padding:40px;">목록을 불러오지 못했습니다.</div>';
  }
}

function processSettlementById(id) {
  Promise.all([
    PartnerAdminAPI.getPartner(id),
    PartnerAdminAPI.getSettlement(id),
  ])
    .then(([detail, s]) => {
      const existing = document.getElementById("partnerSettlementModal");
      if (existing) existing.remove();

      const modal = document.createElement("div");
      modal.id = "partnerSettlementModal";
      modal.className = "modal";
      modal.style.cssText =
        "display:block; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5);";

      const month = s.month || "-";
      const total = (s.payableAmount || 0).toLocaleString();
      const items = Array.isArray(s.items) ? s.items : [];

      const rows = items
        .map((it) => {
          const name = it.name || it.campaign || "항목";
          const qty = it.quantity || it.count || 0;
          const amt = (it.amount || 0).toLocaleString();
          return `
            <div class="table-row" style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; padding:12px 16px; border-bottom:1px solid #e5e7eb; align-items:center;">
              <div style="font-weight:500;">${name}</div>
              <div style="font-size:12px; color:#64748b; text-align:right;">${qty}</div>
              <div style="font-size:12px; text-align:right;">₩${amt}</div>
            </div>`;
        })
        .join("");

      modal.innerHTML = `
        <div class="modal-content" style="background-color:white; margin:2% auto; padding:28px; border-radius:14px; width:95%; max-width:1100px; max-height:92vh; overflow-y:auto;">
          <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid #e5e7eb; padding-bottom:16px;">
            <h2 style="margin:0; color:#1e293b;">파트너 정산</h2>
            <span class="close" onclick="closePartnerSettlementModal()" style="font-size:24px; cursor:pointer; color:#6b7280;">&times;</span>
          </div>
          <div class="modal-body">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
              <div style="background:#f9fafb; border-radius:8px; padding:16px;">
                <div style="color:#64748b; font-size:12px;">파트너</div>
                <div style="font-weight:600;">${detail.name || "-"}</div>
              </div>
              <div style="background:#f9fafb; border-radius:8px; padding:16px; text-align:right;">
                <div style="color:#64748b; font-size:12px;">정산월</div>
                <div style="font-weight:600;">${month}</div>
              </div>
            </div>

            <div style="background:#f9fafb; border-radius:8px; padding:16px; margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="color:#64748b;">지급 예정액</div>
                <div style="font-weight:700; font-size:20px; color:#1e293b;">₩${total}</div>
              </div>
            </div>

            <div class="table" style="background:white; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
              <div class="table-header" style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; padding:12px 16px; background:#e5e7eb; font-weight:600; font-size:14px;">
                <div>항목</div>
                <div style="text-align:right;">수량</div>
                <div style="text-align:right;">금액</div>
              </div>
              <div class="table-body">
                ${
                  rows ||
                  `<div style=\"padding:16px; color:#64748b; text-align:center;\">상세 항목이 없습니다.</div>`
                }
              </div>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; gap:12px; justify-content:flex-end; border-top:1px solid #e5e7eb; padding-top:16px;">
            <button onclick="closePartnerSettlementModal()" style="padding:8px 16px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer;">닫기</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    })
    .catch((e) => {
      const msg = typeof e === "string" ? e : e.message;
      alert(msg);
    });
}

function closePartnerDetailModal() {
  const m = document.getElementById("partnerDetailModal");
  if (m) m.remove();
}

function closePartnerSettlementModal() {
  const m = document.getElementById("partnerSettlementModal");
  if (m) m.remove();
}

// 승인/거절은 회원사 가입승인 화면에서 처리. 이 화면에서는 상세/정산 위주

// 파트너사 상태 업데이트 함수
// 상태 업데이트 로직은 이 화면에서 수행하지 않음

// 파트너사 관리 컴포넌트 초기화
async function initPartnerManagementComponent() {
  const grid = document.getElementById("partner-grid");
  if (!grid) return;
  grid.innerHTML = "";
  try {
    PartnerAdminAPI.token();
    const items = await PartnerAdminAPI.listPartners();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.style.gridColumn = "1 / -1";
      empty.style.color = "#64748b";
      empty.textContent = "등록된 파트너사가 없습니다.";
      grid.appendChild(empty);
    } else {
      items.forEach((p) => grid.appendChild(renderPartnerCard(p)));
    }
  } catch (e) {
    grid.innerHTML = `<div style="grid-column:1 / -1; color:#dc2626;">${e.message}</div>`;
  }
}

function renderPartnerCard(p) {
  const card = document.createElement("div");
  card.className = "partner-card";

  const content = document.createElement("div");
  content.className = "card-content";
  const h3 = document.createElement("h3");
  h3.className = "partner-name";
  h3.textContent = p.name || p.manager_name || "파트너";
  const idDiv = document.createElement("div");
  idDiv.className = "partner-id";
  idDiv.textContent = `ID: ${p.id}`;
  const badge = document.createElement("div");
  badge.className =
    "status-badge " +
    (p.approval_status === "approved"
      ? "status-active"
      : p.approval_status === "pending"
      ? "status-pending"
      : "");
  badge.textContent =
    p.approval_status === "approved"
      ? "활성"
      : p.approval_status === "pending"
      ? "검토중"
      : "";
  const info = document.createElement("div");
  info.className = "partner-info";
  info.innerHTML = `
    <div>대표: ${p.manager_name || "-"}</div>
    <div>연락처: ${p.phone || "-"}</div>
    <div>가입일: ${(p.created_at || "").slice(0, 10)}</div>
  `;
  content.appendChild(h3);
  content.appendChild(idDiv);
  content.appendChild(badge);
  content.appendChild(info);

  const revenue = document.createElement("div");
  revenue.className = "revenue-section";
  const revHeader = document.createElement("div");
  revHeader.className = "revenue-header";
  const label = document.createElement("span");
  label.className = "revenue-label";
  label.textContent = "월 매출";
  const amount = document.createElement("span");
  amount.className = "revenue-amount";
  amount.textContent = `₩${(p.monthly_revenue || 0).toLocaleString()}`;
  revHeader.appendChild(label);
  revHeader.appendChild(amount);
  const bar = document.createElement("div");
  bar.className = "progress-bar";
  const fill = document.createElement("div");
  fill.className = "progress-fill";
  const rate = Math.min(
    100,
    Math.round(((p.monthly_revenue || 0) / 30000000) * 100)
  );
  fill.style.width = `${rate}%`;
  bar.appendChild(fill);
  revenue.appendChild(revHeader);
  revenue.appendChild(bar);

  const actions = document.createElement("div");
  actions.className = "action-buttons";
  const detailBtn = document.createElement("button");
  detailBtn.className = "detail-btn";
  detailBtn.textContent = "상세보기";
  detailBtn.onclick = () => viewPartnerDetailById(p.id);
  const settleBtn = document.createElement("button");
  settleBtn.className = "settlement-btn";
  settleBtn.textContent = "정산";
  settleBtn.onclick = () => processSettlementById(p.id);
  actions.appendChild(detailBtn);
  actions.appendChild(settleBtn);

  card.appendChild(content);
  card.appendChild(revenue);
  card.appendChild(actions);
  return card;
}

// 검색 기능 초기화
function initSearchFunctionality() {
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");
  const searchInput = document.getElementById("search-input");

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      const searchTerm = searchInput.value.toLowerCase();
      const cards = document.querySelectorAll(".partner-card");

      cards.forEach((card) => {
        const partnerName = card
          .querySelector(".partner-name")
          .textContent.toLowerCase();
        const partnerId = card
          .querySelector(".partner-id")
          .textContent.toLowerCase();

        if (
          partnerName.includes(searchTerm) ||
          partnerId.includes(searchTerm)
        ) {
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
      const cards = document.querySelectorAll(".partner-card");
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
  const cards = document.querySelectorAll(".partner-card");

  cards.forEach((card) => {
    const statusBadge = card.querySelector(".status-badge");
    let shouldShow = false;

    if (status === "all") {
      shouldShow = true;
    } else if (status === "active") {
      shouldShow = statusBadge.textContent === "활성";
    } else if (status === "pending") {
      shouldShow = statusBadge.textContent === "검토중";
    } else if (status === "inactive") {
      shouldShow =
        statusBadge.textContent === "비활성" ||
        statusBadge.textContent === "거절됨";
    }

    card.style.display = shouldShow ? "flex" : "none";
  });
}

// 통계 업데이트
function updateStatistics() {
  const cards = document.querySelectorAll(".partner-card");
  const stats = {
    total: cards.length,
    active: 0,
    pending: 0,
    inactive: 0,
  };

  cards.forEach((card) => {
    const statusBadge = card.querySelector(".status-badge");
    if (statusBadge) {
      const status = statusBadge.textContent;
      if (status === "활성") {
        stats.active++;
      } else if (status === "검토중") {
        stats.pending++;
      } else if (status === "비활성" || status === "거절됨") {
        stats.inactive++;
      }
    }
  });

  // 통계 카드 업데이트
  const totalCount = document.getElementById("total-count");
  const activeCount = document.getElementById("active-count");
  const pendingCount = document.getElementById("pending-count");
  const inactiveCount = document.getElementById("inactive-count");

  if (totalCount) totalCount.textContent = stats.total;
  if (activeCount) activeCount.textContent = stats.active;
  if (pendingCount) pendingCount.textContent = stats.pending;
  if (inactiveCount) inactiveCount.textContent = stats.inactive;
}

// 검색 기능
function initSearchFunctionality() {
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");
  const searchInput = document.getElementById("search-input");

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      const searchTerm = searchInput.value.toLowerCase();
      const cards = document.querySelectorAll(".partner-card");

      cards.forEach((card) => {
        const nameElement = card.querySelector(".partner-name");
        const idElement = card.querySelector(".partner-id");

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
      const cards = document.querySelectorAll(".partner-card");
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

// 전역 함수로 등록
// 전역 등록(버튼 핸들러)
window.viewPartnerDetail = viewPartnerDetailById;
window.processSettlement = processSettlementById;
window.initPartnerManagementComponent = initPartnerManagementComponent;

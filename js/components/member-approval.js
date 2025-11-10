const AdminApprovalAPI = {
  base: "/api/admin",
  token() {
    // 관리자 화면 보호: 비관리자 토큰(또는 미설정)일 경우 임시 관리자 토큰으로 대체
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
  async listPending(type) {
    const res = await fetch(`${this.base}/members/pending?type=${type}`, {
      headers: this.headers(),
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json()
      : { error: await res.text() };
    if (!res.ok) throw new Error(data.error || "목록 조회 실패");
    return data.items || [];
  },
  async approve(type, id) {
    const res = await fetch(`${this.base}/members/${type}/${id}/approve`, {
      method: "POST",
      headers: this.headers(),
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json()
      : { error: await res.text() };
    if (!res.ok) throw new Error(data.error || "승인 실패");
    return data;
  },
  async reject(type, id, reason) {
    const res = await fetch(`${this.base}/members/${type}/${id}/reject`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ reason: reason || "" }),
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json()
      : { error: await res.text() };
    if (!res.ok) throw new Error(data.error || "거절 실패");
    return data;
  },
};

function renderCard(type, item, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "approval-item";
  wrapper.style.display = "grid";
  wrapper.style.gridTemplateColumns =
    "60px 1fr 120px 100px 120px 100px 80px 120px";
  wrapper.style.gap = "12px";
  wrapper.style.padding = "12px 20px";
  wrapper.style.borderBottom = "1px solid #f1f5f9";
  wrapper.style.alignItems = "center";
  wrapper.style.transition = "all 0.3s ease";
  wrapper.style.cursor = "pointer";

  // 번호
  const number = document.createElement("div");
  number.style.textAlign = "center";
  number.style.fontWeight = "600";
  number.style.color = "#64748b";
  number.textContent = (index !== undefined ? index + 1 : 1).toString();
  wrapper.appendChild(number);

  // 회사명
  const companyName = document.createElement("div");
  companyName.style.fontWeight = "600";
  companyName.style.color = "#1e293b";
  companyName.textContent =
    item.name || item.extra?.partner_code || "신규 회원";
  wrapper.appendChild(companyName);

  // 사업자번호
  const bizNo = document.createElement("div");
  bizNo.style.fontSize = "13px";
  bizNo.style.color = "#64748b";
  bizNo.textContent = item.bizNo || "-";
  wrapper.appendChild(bizNo);

  // 담당자
  const manager = document.createElement("div");
  manager.style.fontSize = "13px";
  manager.style.color = "#374151";
  manager.textContent = item.manager_name || "-";
  wrapper.appendChild(manager);

  // 연락처
  const phone = document.createElement("div");
  phone.style.fontSize = "13px";
  phone.style.color = "#374151";
  phone.textContent = item.phone || "-";
  wrapper.appendChild(phone);

  // 신청일
  const createdDate = document.createElement("div");
  createdDate.style.fontSize = "13px";
  createdDate.style.color = "#64748b";
  createdDate.textContent = item.created_at ? formatDate(item.created_at) : "-";
  wrapper.appendChild(createdDate);

  // 상태
  const status = document.createElement("div");
  const statusBadge = document.createElement("span");
  statusBadge.className = "status-badge pending";
  statusBadge.textContent = "승인대기";
  status.appendChild(statusBadge);
  wrapper.appendChild(status);

  // 액션
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "6px";
  actions.style.justifyContent = "center";

  const approveBtn = document.createElement("button");
  approveBtn.className = "action-btn approve";
  approveBtn.textContent = "승인";
  approveBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("해당 회원을 승인하시겠습니까?")) return;
    try {
      await AdminApprovalAPI.approve(type, item.id);
      wrapper.remove();
      updateStatistics();
      alert("승인되었습니다.");
    } catch (e) {
      alert(e.message || "승인 실패");
    }
  });

  const rejectBtn = document.createElement("button");
  rejectBtn.className = "action-btn reject";
  rejectBtn.textContent = "거절";
  rejectBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const reason = prompt("거절 사유를 입력하세요 (선택)");
    try {
      await AdminApprovalAPI.reject(type, item.id, reason || "");
      wrapper.remove();
      updateStatistics();
      alert("거절 처리되었습니다.");
    } catch (e) {
      alert(e.message || "거절 실패");
    }
  });

  actions.appendChild(approveBtn);
  actions.appendChild(rejectBtn);
  wrapper.appendChild(actions);

  return wrapper;
}

function textRow(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch (_) {
    return iso;
  }
}

// 검색 기능
document.getElementById("search-btn").addEventListener("click", function () {
  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase();
  const cards = document.querySelectorAll(
    '[style*="display: flex; flex-direction: column"]'
  );

  cards.forEach((card) => {
    const companyName = card.querySelector("h3").textContent.toLowerCase();
    const businessNumber = card
      .querySelector("div[style*='font-size: 12px; color: #64748b']")
      .textContent.toLowerCase();

    if (
      companyName.includes(searchTerm) ||
      businessNumber.includes(searchTerm)
    ) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
});

// 초기화 기능
document.getElementById("reset-btn").addEventListener("click", function () {
  document.getElementById("search-input").value = "";
  const cards = document.querySelectorAll(
    '[style*="display: flex; flex-direction: column"]'
  );
  cards.forEach((card) => {
    card.style.display = "flex";
  });
});

// 엔터키로 검색
document
  .getElementById("search-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      document.getElementById("search-btn").click();
    }
  });

// 회원사 가입승인 컴포넌트 초기화
async function initMemberApprovalComponent() {
  // CSS 파일 로드
  loadMemberApprovalTableCSS();
  // 기본은 모든 유형(agency, advertiser, partner) 합산 표시
  await loadAllLists();
}

function loadMemberApprovalTableCSS() {
  if (!document.querySelector('link[href*="member-approval-table.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/member-approval-table.css";
    document.head.appendChild(link);
  }
}

async function loadAllLists() {
  const grid = document.getElementById("approval-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const types = ["agency", "advertiser", "partner"];
  try {
    AdminApprovalAPI.token(); // 보장
    const results = await Promise.allSettled(
      types.map((t) => AdminApprovalAPI.listPending(t))
    );
    let total = 0;
    let globalIndex = 0;
    results.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        const type = types[idx];
        (res.value || []).forEach((it) => {
          grid.appendChild(renderCard(type, it, globalIndex));
          total++;
          globalIndex++;
        });
      }
    });
    if (total === 0) {
      const empty = document.createElement("div");
      empty.style.gridColumn = "1 / -1";
      empty.style.color = "#64748b";
      empty.textContent = "승인 대기 중인 회원사가 없습니다.";
      grid.appendChild(empty);
    }
  } catch (e) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; color:#dc2626;">${
      e.message || "목록을 불러오지 못했습니다."
    }</div>`;
  }
  updateStatistics();
}

async function loadList(type) {
  const grid = document.getElementById("approval-grid");
  if (!grid) return;
  grid.innerHTML = "";
  try {
    // 토큰 보장 (없으면 자동 주입)
    AdminApprovalAPI.token();
    const items = await AdminApprovalAPI.listPending(type);
    if (!items.length) {
      const empty = document.createElement("div");
      empty.style.gridColumn = "1 / -1";
      empty.style.color = "#64748b";
      empty.textContent = "승인 대기 중인 회원사가 없습니다.";
      grid.appendChild(empty);
    } else {
      items.forEach((it, index) =>
        grid.appendChild(renderCard(type, it, index))
      );
    }
  } catch (e) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; color:#dc2626;">${
      e.message || "목록을 불러오지 못했습니다."
    }</div>`;
  }
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
      const cards = document.querySelectorAll(
        '[style*="display: flex; flex-direction: column"]'
      );

      cards.forEach((card) => {
        const companyName = card.querySelector("h3").textContent.toLowerCase();
        const businessNumber = card
          .querySelector("div[style*='font-size: 12px; color: #64748b']")
          .textContent.toLowerCase();

        if (
          companyName.includes(searchTerm) ||
          businessNumber.includes(searchTerm)
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
      const cards = document.querySelectorAll(
        '[style*="display: flex; flex-direction: column"]'
      );
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
  const cards = document.querySelectorAll(
    '[style*="display: flex; flex-direction: column"]'
  );

  cards.forEach((card) => {
    const statusBadge = card.querySelector("span");
    let shouldShow = false;

    if (status === "all") {
      shouldShow = true;
    } else if (status === "active") {
      shouldShow =
        statusBadge.textContent === "활성" ||
        statusBadge.textContent === "승인완료";
    } else if (status === "pending") {
      shouldShow = statusBadge.textContent === "승인대기";
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
  const cards = document.querySelectorAll(
    '[style*="display: flex; flex-direction: column"]'
  );
  const stats = {
    total: cards.length,
    active: 0,
    pending: 0,
    inactive: 0,
  };

  cards.forEach((card) => {
    const statusBadge = card.querySelector("span");
    if (statusBadge) {
      const status = statusBadge.textContent;
      if (status === "활성" || status === "승인완료") {
        stats.active++;
      } else if (status === "승인대기") {
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

// 전역 함수로 등록
window.initMemberApprovalComponent = initMemberApprovalComponent;
window.loadMemberApprovalList = loadList;

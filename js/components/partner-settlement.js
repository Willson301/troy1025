// 파트너 정산 데이터 (고객별 구매평 건수 기준)
const settlementData = [
  {
    id: "SETTLE-001",
    partner: "크리에이티브 파트너",
    partnerCode: "creative",
    customer: "테크노 브랜드",
    inviteCode: "CREAT2024",
    joinDate: "2025-08-15",
    reviewCount: 45,
    amount: 13500,
    settlementMonth: "2025-09",
    status: "completed",
  },
  {
    id: "SETTLE-002",
    partner: "크리에이티브 파트너",
    partnerCode: "creative",
    customer: "오디오 컴퍼니",
    inviteCode: "CREAT2024",
    joinDate: "2025-08-20",
    reviewCount: 38,
    amount: 11400,
    settlementMonth: "2025-09",
    status: "completed",
  },
  {
    id: "SETTLE-003",
    partner: "미디어 플러스",
    partnerCode: "media",
    customer: "홈데코 스토리",
    inviteCode: "MEDIA2024",
    joinDate: "2025-08-10",
    reviewCount: 52,
    amount: 15600,
    settlementMonth: "2025-09",
    status: "pending",
  },
  {
    id: "SETTLE-004",
    partner: "미디어 플러스",
    partnerCode: "media",
    customer: "피트니스 라이프",
    inviteCode: "MEDIA2024",
    joinDate: "2025-08-25",
    reviewCount: 67,
    amount: 20100,
    settlementMonth: "2025-09",
    status: "pending",
  },
  {
    id: "SETTLE-005",
    partner: "콘텐츠 메이커",
    partnerCode: "content",
    customer: "브랜드 X",
    inviteCode: "CONTE2024",
    joinDate: "2025-07-30",
    reviewCount: 73,
    amount: 21900,
    settlementMonth: "2025-09",
    status: "completed",
  },
  {
    id: "SETTLE-006",
    partner: "콘텐츠 메이커",
    partnerCode: "content",
    customer: "테크 이노베이션",
    inviteCode: "CONTE2024",
    joinDate: "2025-08-05",
    reviewCount: 41,
    amount: 12300,
    settlementMonth: "2025-09",
    status: "completed",
  },
  {
    id: "SETTLE-007",
    partner: "인플루언서 네트워크",
    partnerCode: "influencer",
    customer: "뉴트리션 컴퍼니",
    inviteCode: "INFLU2024",
    joinDate: "2025-08-12",
    reviewCount: 89,
    amount: 26700,
    settlementMonth: "2025-09",
    status: "processing",
  },
  {
    id: "SETTLE-008",
    partner: "인플루언서 네트워크",
    partnerCode: "influencer",
    customer: "푸드테크",
    inviteCode: "INFLU2024",
    joinDate: "2025-08-18",
    reviewCount: 35,
    amount: 10500,
    settlementMonth: "2025-09",
    status: "pending",
  },
];

// 정산 단가 (건당 300원)
const PRICE_PER_REVIEW = 300;

function goBackToMain() {
  if (typeof loadMainContent === "function") {
    loadMainContent();
  } else {
    history.back();
  }
}

// 고객 상세 정보 보기
function viewCustomerDetail(inviteCode, customerName) {
  const settlement = settlementData.find(
    (s) => s.inviteCode === inviteCode && s.customer === customerName
  );
  if (!settlement) return;

  const modalBody = document.getElementById("modal-body");
  const actionBtn = document.getElementById("modal-action-btn");

  modalBody.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937;">정산 상세 정보</h3>
      <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; font-size: 14px;">
        <div style="color: #6b7280; font-weight: 500;">정산번호:</div>
        <div style="color: #1f2937; font-family: monospace;">${
          settlement.id
        }</div>
        <div style="color: #6b7280; font-weight: 500;">파트너사:</div>
        <div style="color: #1f2937; font-weight: 600;">${
          settlement.partner
        }</div>
        <div style="color: #6b7280; font-weight: 500;">고객명:</div>
        <div style="color: #1f2937; font-weight: 600;">${
          settlement.customer
        }</div>
        <div style="color: #6b7280; font-weight: 500;">초대코드:</div>
        <div style="color: #1f2937; font-family: monospace;">${
          settlement.inviteCode
        }</div>
        <div style="color: #6b7280; font-weight: 500;">가입일:</div>
        <div style="color: #1f2937;">${settlement.joinDate}</div>
        <div style="color: #6b7280; font-weight: 500;">정산월:</div>
        <div style="color: #1f2937;">${settlement.settlementMonth}</div>
        <div style="color: #6b7280; font-weight: 500;">상태:</div>
        <div><span class="status-badge ${getStatusClass(
          settlement.status
        )}">${getStatusText(settlement.status)}</span></div>
      </div>
    </div>
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937;">정산 계산</h3>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-bottom: 8px;">
          <div style="color: #374151;">구매평 완료 건수</div>
          <div style="font-weight: 600; color: #3b82f6;">${
            settlement.reviewCount
          }건</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-bottom: 8px;">
          <div style="color: #374151;">건당 정산 단가</div>
          <div style="font-weight: 600; color: #374151;">₩${PRICE_PER_REVIEW.toLocaleString()}</div>
        </div>
        <hr style="margin: 12px 0; border: none; border-top: 1px solid #e5e7eb;">
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px;">
          <div style="color: #1f2937; font-weight: 600; font-size: 16px;">총 정산 금액</div>
          <div style="font-weight: 700; color: #059669; font-size: 18px;">₩${settlement.amount.toLocaleString()}</div>
        </div>
      </div>
    </div>
    <div>
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937;">정산 기준</h3>
      <div style="color: #6b7280; font-size: 13px; line-height: 1.6;">
        • 매월 1일 기준으로 전월 완료된 구매평 건수 집계<br>
        • 캠페인 완료 기준으로 정산되므로 진행중 캠페인은 다음달 이월<br>
        • 건당 ₩${PRICE_PER_REVIEW.toLocaleString()}씩 지급 (${
    settlement.reviewCount
  }건 × ₩${PRICE_PER_REVIEW.toLocaleString()})
      </div>
    </div>
  `;

  // 상태에 따른 액션 버튼 설정
  if (settlement.status === "pending") {
    actionBtn.textContent = "승인하기";
    actionBtn.onclick = () => {
      closeModal();
      approveSettlement(settlement.inviteCode, settlement.customer);
    };
  } else if (settlement.status === "processing") {
    actionBtn.textContent = "처리하기";
    actionBtn.onclick = () => {
      closeModal();
      processSettlement(settlement.inviteCode, settlement.customer);
    };
  } else {
    actionBtn.textContent = "완료됨";
    actionBtn.disabled = true;
    actionBtn.style.background = "#d1d5db";
  }

  document.getElementById("customer-modal").style.display = "block";
}

// 정산 승인
function approveSettlement(inviteCode, customerName) {
  const settlement = settlementData.find(
    (s) => s.inviteCode === inviteCode && s.customer === customerName
  );
  if (!settlement) return;

  if (
    confirm(
      `${customerName} 고객의 정산을 승인하시겠습니까?\n\n정산금액: ₩${settlement.amount.toLocaleString()}\n구매평 건수: ${
        settlement.reviewCount
      }건`
    )
  ) {
    settlement.status = "completed";

    updateSettlementTable();
    updateStats();

    alert(`${customerName} 고객의 정산이 승인되고 지급되었습니다.`);
  }
}

// 정산 처리
function processSettlement(inviteCode, customerName) {
  const settlement = settlementData.find(
    (s) => s.inviteCode === inviteCode && s.customer === customerName
  );
  if (!settlement) return;

  if (
    confirm(
      `${customerName} 고객의 정산을 처리하시겠습니까?\n\n정산금액: ₩${settlement.amount.toLocaleString()}`
    )
  ) {
    settlement.status = "completed";

    updateSettlementTable();
    updateStats();

    alert(`${customerName} 고객의 정산 처리가 완료되었습니다.`);
  }
}

// 모달 닫기
function closeModal() {
  document.getElementById("customer-modal").style.display = "none";
}

// 검색 기능
function searchSettlements() {
  const searchInput = document.getElementById("search-input");
  const searchTerm = searchInput.value.toLowerCase();
  filterAndDisplaySettlements({ search: searchTerm });
}

// 검색 초기화
function resetSearch() {
  document.getElementById("search-input").value = "";
  document.getElementById("month-filter").value = "2025-09";
  document.getElementById("partner-filter").value = "all";
  document.getElementById("status-filter").value = "all";
  filterAndDisplaySettlements({});
}

// 필터링 및 표시 함수
function filterAndDisplaySettlements(filters = {}) {
  const {
    search = "",
    month = "2025-09",
    partner = "all",
    status = "all",
  } = filters;

  let filteredData = settlementData.filter((settlement) => {
    // 검색 필터
    const matchesSearch =
      settlement.partner.toLowerCase().includes(search) ||
      settlement.customer.toLowerCase().includes(search) ||
      settlement.inviteCode.toLowerCase().includes(search) ||
      settlement.id.toLowerCase().includes(search);

    // 월별 필터
    const matchesMonth = settlement.settlementMonth === month;

    // 파트너 필터
    const matchesPartner =
      partner === "all" || settlement.partnerCode === partner;

    // 상태 필터
    const matchesStatus = status === "all" || settlement.status === status;

    return matchesSearch && matchesMonth && matchesPartner && matchesStatus;
  });

  // 정산금액 기준 내림차순 정렬
  filteredData.sort((a, b) => b.amount - a.amount);

  // 테이블 업데이트
  updateSettlementTable(filteredData);

  // 통계 업데이트
  updateStats(filteredData);
}

// 테이블 업데이트
function updateSettlementTable(data = settlementData) {
  const tbody = document.getElementById("settlement-tbody");
  if (!tbody) return;

  tbody.innerHTML = data
    .map(
      (settlement) => `
    <tr>
      <td>${settlement.partner}</td>
      <td>${settlement.customer}</td>
      <td>${settlement.inviteCode}</td>
      <td>${settlement.joinDate}</td>
      <td class="review-count">${settlement.reviewCount}</td>
      <td class="amount">₩${settlement.amount.toLocaleString()}</td>
      <td>${settlement.settlementMonth}</td>
      <td><span class="status-badge ${getStatusClass(
        settlement.status
      )}">${getStatusText(settlement.status)}</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-btn view" onclick="viewCustomerDetail('${
            settlement.inviteCode
          }', '${settlement.customer}')">보기</button>
          ${getActionButton(settlement)}
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

// 상태별 액션 버튼 반환
function getActionButton(settlement) {
  switch (settlement.status) {
    case "pending":
      return `<button class="action-btn approve" onclick="approveSettlement('${settlement.inviteCode}', '${settlement.customer}')">승인</button>`;
    case "processing":
      return `<button class="action-btn process" onclick="processSettlement('${settlement.inviteCode}', '${settlement.customer}')">처리</button>`;
    case "completed":
      return `<button class="action-btn completed" disabled>완료</button>`;
    default:
      return "";
  }
}

// 상태 클래스 반환
function getStatusClass(status) {
  switch (status) {
    case "completed":
      return "green";
    case "pending":
      return "orange";
    case "processing":
      return "blue";
    default:
      return "gray";
  }
}

// 상태 텍스트 반환
function getStatusText(status) {
  switch (status) {
    case "completed":
      return "지급완료";
    case "pending":
      return "지급대기";
    case "processing":
      return "처리중";
    default:
      return "알 수 없음";
  }
}

// 통계 업데이트
function updateStats(data = settlementData) {
  // 파트너사 수 계산
  const uniquePartners = [...new Set(data.map((s) => s.partnerCode))].length;

  // 상태별 금액 계산
  const pendingAmount = data
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + s.amount, 0);
  const completedAmount = data
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.amount, 0);

  // 총 구매평 건수
  const totalReviews = data.reduce((sum, s) => sum + s.reviewCount, 0);

  document.getElementById("total-partners").textContent = uniquePartners;
  document.getElementById(
    "pending-amount"
  ).textContent = `₩${pendingAmount.toLocaleString()}`;
  document.getElementById(
    "completed-amount"
  ).textContent = `₩${completedAmount.toLocaleString()}`;
  document.getElementById("total-reviews").textContent =
    totalReviews.toLocaleString();
}

// 엑셀 다운로드
function downloadExcel() {
  const monthFilter = document.getElementById("month-filter").value;
  const partnerFilter = document.getElementById("partner-filter").value;
  const statusFilter = document.getElementById("status-filter").value;
  const searchTerm = document.getElementById("search-input").value;

  // 현재 필터 조건에 맞는 데이터 가져오기
  let dataToExport = settlementData.filter((settlement) => {
    const matchesSearch =
      settlement.partner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.inviteCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth = settlement.settlementMonth === monthFilter;
    const matchesPartner =
      partnerFilter === "all" || settlement.partnerCode === partnerFilter;
    const matchesStatus =
      statusFilter === "all" || settlement.status === statusFilter;

    return matchesSearch && matchesMonth && matchesPartner && matchesStatus;
  });

  // 정산금액 기준 내림차순 정렬
  dataToExport.sort((a, b) => b.amount - a.amount);

  // CSV 형식으로 변환
  const headers = [
    "정산번호",
    "파트너사",
    "고객명",
    "초대코드",
    "가입일",
    "구매평건수",
    "정산금액",
    "정산월",
    "상태",
  ];

  let csvContent = headers.join(",") + "\n";

  dataToExport.forEach((settlement) => {
    const row = [
      settlement.id,
      settlement.partner,
      settlement.customer,
      settlement.inviteCode,
      settlement.joinDate,
      settlement.reviewCount,
      settlement.amount,
      settlement.settlementMonth,
      getStatusText(settlement.status),
    ];
    csvContent +=
      row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",") +
      "\n";
  });

  // 파일 다운로드
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `파트너정산_${monthFilter}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert(`${dataToExport.length}건의 정산 데이터가 다운로드되었습니다.`);
}

// 통계 카드 필터링
function filterByStat(category) {
  let filters = {};

  if (category === "pending") {
    filters.status = "pending";
  } else if (category === "completed") {
    filters.status = "completed";
  }

  document.getElementById("status-filter").value = filters.status || "all";

  const searchTerm = document.getElementById("search-input").value;
  const monthFilter = document.getElementById("month-filter").value;
  const partnerFilter = document.getElementById("partner-filter").value;

  filterAndDisplaySettlements({
    search: searchTerm,
    month: monthFilter,
    partner: partnerFilter,
    status: filters.status || "all",
  });

  // 활성 상태 표시
  const statCards = document.querySelectorAll(".stat-card");
  statCards.forEach((c) => c.classList.remove("active"));
  document.querySelector(`[data-status="${category}"]`).classList.add("active");
}

// 파트너 정산 컴포넌트 초기화
function initPartnerSettlementComponent() {
  console.log("파트너 정산 관리 컴포넌트 초기화");

  // 검색 기능 이벤트 리스너
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");
  const excelBtn = document.getElementById("excel-btn");
  const searchInput = document.getElementById("search-input");
  const monthFilter = document.getElementById("month-filter");
  const partnerFilter = document.getElementById("partner-filter");
  const statusFilter = document.getElementById("status-filter");

  if (searchBtn) {
    searchBtn.addEventListener("click", searchSettlements);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetSearch);
  }

  if (excelBtn) {
    excelBtn.addEventListener("click", downloadExcel);
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchSettlements();
      }
    });
  }

  if (monthFilter) {
    monthFilter.addEventListener("change", function () {
      const searchTerm = document.getElementById("search-input").value;
      const partnerValue = document.getElementById("partner-filter").value;
      const statusValue = document.getElementById("status-filter").value;
      filterAndDisplaySettlements({
        search: searchTerm,
        month: this.value,
        partner: partnerValue,
        status: statusValue,
      });
    });
  }

  if (partnerFilter) {
    partnerFilter.addEventListener("change", function () {
      const searchTerm = document.getElementById("search-input").value;
      const monthValue = document.getElementById("month-filter").value;
      const statusValue = document.getElementById("status-filter").value;
      filterAndDisplaySettlements({
        search: searchTerm,
        month: monthValue,
        partner: this.value,
        status: statusValue,
      });
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      const searchTerm = document.getElementById("search-input").value;
      const monthValue = document.getElementById("month-filter").value;
      const partnerValue = document.getElementById("partner-filter").value;
      filterAndDisplaySettlements({
        search: searchTerm,
        month: monthValue,
        partner: partnerValue,
        status: this.value,
      });
    });
  }

  // 통계 카드 클릭 이벤트
  const statCards = document.querySelectorAll(".stat-card");
  statCards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", function () {
      const category = card.getAttribute("data-status");
      if (["pending", "completed"].includes(category)) {
        filterByStat(category);
      }
    });
  });

  // 모달 외부 클릭 시 닫기
  const modal = document.getElementById("customer-modal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // 초기 데이터 로드
  filterAndDisplaySettlements({});
}

// 페이지 로드 시 자동 초기화
document.addEventListener("DOMContentLoaded", function () {
  initPartnerSettlementComponent();
});

// API 헬퍼 (파트너 관리에서 사용한 규약과 동일)
const PartnerSettlementAPI = {
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
      : { items: [] };
    if (!res.ok) throw new Error(data.error || "파트너 목록 조회 실패");
    return data.items || [];
  },
  async getSettlementSummary(partnerId) {
    // 파트너별 정산(요약/항목) 조회. partner-management.js의 getSettlement와 동일 경로 사용
    const res = await fetch(`${this.base}/partners/${partnerId}/settlement`, {
      headers: this.headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "정산 조회 실패");
    return data; // { month, payableAmount, items: [{name, quantity, amount}], invited, reviews }
  },
};

// 공통 대형 모달 생성 유틸
function createLargeModal(id, title, bodyHTML) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = id;
  modal.className = "modal";
  modal.style.cssText =
    "display:block; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5);";
  modal.innerHTML = `
    <div class="modal-content" style="background-color:white; margin:2% auto; padding:28px; border-radius:14px; width:95%; max-width:1100px; max-height:92vh; overflow-y:auto;">
      <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid #e5e7eb; padding-bottom:16px;">
        <h2 style="margin:0; color:#1e293b;">${title}</h2>
        <span class="close" style="font-size:24px; cursor:pointer; color:#6b7280;" onclick="(function(){document.getElementById('${id}').remove();})()">&times;</span>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      <div class="modal-footer" style="display:flex; gap:12px; justify-content:flex-end; border-top:1px solid #e5e7eb; padding-top:16px;">
        <button style="padding:8px 16px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer;" onclick="(function(){document.getElementById('${id}').remove();})()">닫기</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function showPartnerClients(partnerId, partnerName) {
  try {
    const summary = await PartnerSettlementAPI.getSettlementSummary(partnerId);
    // 초대 회원/구매평 등을 UI 그대로 수치 치환
    const invited = summary.invited || summary.invitedCount || 0;
    const reviews = summary.reviews || summary.reviewCount || 0;
    const avg = invited > 0 ? (reviews / invited).toFixed(1) : 0;
    const total = summary.payableAmount || reviews * 300 || 0;
    const body = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <div>
          <div style="color:#374151; font-weight:600; font-size:16px; margin-bottom:4px;">${partnerName}</div>
          <div style="color:#9ca3af; font-size:12px;">${
            summary.month || "이번 달"
          } 정산</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#374151; font-weight:600; font-size:18px;">₩${total.toLocaleString()}</div>
          <div style="color:#9ca3af; font-size:11px;">${reviews}건 × ₩300</div>
        </div>
      </div>
      <div style="background:#f9fafb; padding:12px; border-radius:6px; margin-bottom:16px;">
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; font-size:12px;">
          <div><div style="color:#6b7280; margin-bottom:4px;">초대 회원</div><div style="color:#374151; font-weight:500;">${invited}명</div></div>
          <div><div style="color:#6b7280; margin-bottom:4px;">구매평 완료</div><div style="color:#374151; font-weight:500;">${reviews}건</div></div>
          <div><div style="color:#6b7280; margin-bottom:4px;">평균 활동률</div><div style="color:#374151; font-weight:500;">${avg}건/회원</div></div>
        </div>
      </div>`;
    createLargeModal("partnerClientsModal", "파트너 클라이언트", body);
  } catch (e) {
    createLargeModal(
      "partnerClientsModal",
      "파트너 클라이언트",
      `<div style=\"color:#64748b;\">데이터를 불러오는 중 오류가 발생했습니다.</div>`
    );
  }
}

async function viewSettlementDetail(partnerId) {
  try {
    const s = await PartnerSettlementAPI.getSettlementSummary(partnerId);
    const items = Array.isArray(s.items) ? s.items : [];
    const rows = items
      .map((it) => {
        const name = it.name || it.campaign || "항목";
        const qty = it.quantity || it.count || 0;
        const amt = (it.amount || 0).toLocaleString();
        return `<div class=\"table-row\" style=\"display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; padding:12px 16px; border-bottom:1px solid #e5e7eb; align-items:center;\"><div style=\"font-weight:500;\">${name}</div><div style=\"font-size:12px; color:#64748b; text-align:right;\">${qty}</div><div style=\"font-size:12px; text-align:right;\">₩${amt}</div></div>`;
      })
      .join("");
    const body = `
      <div style=\"margin-bottom:16px; color:#64748b;\">정산월: ${
        s.month || "-"
      }</div>
      <div class=\"table\" style=\"background:white; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;\">
        <div class=\"table-header\" style=\"display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; padding:12px 16px; background:#e5e7eb; font-weight:600; font-size:14px;\">
          <div>항목</div><div style=\"text-align:right;\">수량</div><div style=\"text-align:right;\">금액</div>
        </div>
        <div class=\"table-body\">${
          rows ||
          `<div style=\"padding:16px; color:#64748b; text-align:center;\">상세 항목이 없습니다.</div>`
        }</div>
      </div>`;
    createLargeModal("settlementDetailModal", "상세 정산 내역", body);
  } catch (e) {
    createLargeModal(
      "settlementDetailModal",
      "상세 정산 내역",
      `<div style=\"color:#64748b;\">데이터를 불러오는 중 오류가 발생했습니다.</div>`
    );
  }
}

function markSettlementComplete(partnerId) {
  if (confirm(`${partnerId} 파트너의 정산을 완료 처리하시겠습니까?`)) {
    alert("정산 완료 처리되었습니다.");
  }
}

function approveSettlement(partnerId) {
  if (confirm(`${partnerId} 파트너의 정산을 승인하고 지급하시겠습니까?`)) {
    alert("정산 승인 및 지급이 완료되었습니다.");
  }
}

// 전역 등록
window.showPartnerClients = showPartnerClients;
window.viewSettlementDetail = viewSettlementDetail;
window.markSettlementComplete = markSettlementComplete;
window.approveSettlement = approveSettlement;
window.initPartnerSettlementComponent = initPartnerSettlementComponent;

(function () {
  function getAdminToken() {
    try {
      return (
        sessionStorage.getItem("troy_token_admin") ||
        localStorage.getItem("troy_token_admin") ||
        localStorage.getItem("troy_token") ||
        "admin_temp_token"
      );
    } catch (_) {
      return "admin_temp_token";
    }
  }

  function headers() {
    return { Authorization: `Bearer ${getAdminToken()}` };
  }

  function formatCurrencyKRW(n) {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(Number(n) || 0);
  }

  function showLoading(show) {
    const l = document.getElementById("partnerSettlementLoading");
    const t = document.getElementById("partnerSettlementTable");
    if (l) l.style.display = show ? "block" : "none";
    if (t && show) t.style.display = "none";
  }

  function showError(msg) {
    const e = document.getElementById("partnerSettlementError");
    const t = document.getElementById("partnerSettlementTable");
    if (e) {
      e.textContent = msg || "데이터를 불러오지 못했습니다.";
      e.style.display = "block";
    }
    if (t) t.style.display = "none";
  }

  function hideError() {
    const e = document.getElementById("partnerSettlementError");
    if (e) e.style.display = "none";
  }

  async function fetchSettlements() {
    const res = await fetch(
      "/api/admin/partner-settlements?page=1&limit=1000",
      {
        headers: headers(),
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  function renderStats(items) {
    const totalPartners = new Set(items.map((it) => it.partner_id)).size;
    const pendingAmount = items
      .filter((it) => (it.status || "").toLowerCase() === "pending")
      .reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const completedAmount = items
      .filter((it) => (it.status || "").toLowerCase() === "completed")
      .reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const totalReviews = items.reduce(
      (s, it) => s + (Number(it.review_count) || 0),
      0
    );

    const elTotalPartners = document.getElementById("total-partners");
    const elPending = document.getElementById("pending-amount");
    const elCompleted = document.getElementById("completed-amount");
    const elReviews = document.getElementById("total-reviews");

    if (elTotalPartners) elTotalPartners.textContent = String(totalPartners);
    if (elPending) elPending.textContent = formatCurrencyKRW(pendingAmount);
    if (elCompleted)
      elCompleted.textContent = formatCurrencyKRW(completedAmount);
    if (elReviews) elReviews.textContent = String(totalReviews);
  }

  function normalize(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.settlements)) return data.settlements;
    return [];
  }

  function renderTable(items) {
    const body = document.getElementById("partnerSettlementBody");
    const table = document.getElementById("partnerSettlementTable");
    if (!body || !table) return;

    if (items.length === 0) {
      body.innerHTML =
        '<div style="grid-column:1/-1;padding:16px;color:#6b7280;text-align:center;">데이터가 없습니다.</div>';
      table.style.display = "block";
      return;
    }

    body.innerHTML = items
      .map((row) => {
        const month = row.month || row.settlement_month || "-";
        const partnerName = row.partner_name || row.partner || "-";
        const customerName = row.customer_name || row.customer || "-";
        const count = Number(row.review_count) || 0;
        const unit = Number(row.unit_price) || 300;
        const amount = Number(row.amount) || count * unit;
        const status = (row.status || "pending").toLowerCase();
        const statusClass =
          status === "completed"
            ? "completed"
            : status === "processing"
            ? "processing"
            : "pending";
        const statusLabel =
          status === "completed"
            ? "지급완료"
            : status === "processing"
            ? "처리중"
            : "지급대기";
        return `
        <div class="table-row" data-settlement-row>
          <div><strong style="color:#255ffe">${month}</strong></div>
          <div>${partnerName}</div>
          <div>${customerName}</div>
          <div><strong style="color:#3b82f6">${count}건</strong></div>
          <div>${formatCurrencyKRW(unit)}</div>
          <div><strong style="color:#10b981">${formatCurrencyKRW(
            amount
          )}</strong></div>
          <div><span class="status-badge ${statusClass}">${statusLabel}</span></div>
        </div>`;
      })
      .join("");

    table.style.display = "block";
  }

  function applyFilters(items) {
    const statusSel = document.getElementById("status-filter");
    const partnerSel = document.getElementById("partner-filter");
    const q = (document.getElementById("search-input")?.value || "")
      .trim()
      .toLowerCase();

    let filtered = items;
    if (statusSel && statusSel.value !== "all") {
      filtered = filtered.filter(
        (it) => (it.status || "").toLowerCase() === statusSel.value
      );
    }
    if (partnerSel && partnerSel.value !== "all") {
      filtered = filtered.filter((it) =>
        String(it.partner_name || it.partner || "").includes(partnerSel.value)
      );
    }
    if (q) {
      filtered = filtered.filter((it) => {
        const hay = `${it.partner_name || ""} ${it.customer_name || ""} ${
          it.month || it.settlement_month || ""
        }`.toLowerCase();
        return hay.includes(q);
      });
    }
    return filtered;
  }

  async function init() {
    showLoading(true);
    hideError();
    try {
      const data = await fetchSettlements();
      const items = normalize(data);

      // 파트너 목록 드롭다운 구성
      const partnerSel = document.getElementById("partner-filter");
      if (partnerSel) {
        const names = Array.from(
          new Set(items.map((it) => it.partner_name).filter(Boolean))
        );
        partnerSel.innerHTML =
          '<option value="all">모든 파트너</option>' +
          names.map((n) => `<option value="${n}">${n}</option>`).join("");
      }

      renderStats(items);
      renderTable(items);

      // 검색/필터 이벤트
      const reapply = () => {
        const filtered = applyFilters(items);
        renderTable(filtered);
      };
      document.getElementById("search-btn")?.addEventListener("click", reapply);
      document.getElementById("reset-btn")?.addEventListener("click", () => {
        const si = document.getElementById("search-input");
        if (si) si.value = "";
        const ps = document.getElementById("partner-filter");
        if (ps) ps.value = "all";
        const ss = document.getElementById("status-filter");
        if (ss) ss.value = "all";
        reapply();
      });
      document
        .getElementById("partner-filter")
        ?.addEventListener("change", reapply);
      document
        .getElementById("status-filter")
        ?.addEventListener("change", reapply);
    } catch (e) {
      console.error("/api/admin/partner-settlements error", e);
      showError("데이터를 불러오지 못했습니다.");
    } finally {
      showLoading(false);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

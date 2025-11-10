let completionData = [
  {
    id: "CAM-001",
    title: "아이폰 15 프로 케이스 구매평 캠페인",
    deadline: "2025-09-24",
    timeLeft: "6시간",
    progress: 45,
    current: 54,
    target: 120,
    urgency: "critical",
    status: "critical",
    category: "urgent",
  },
  {
    id: "CAM-002",
    title: "블루투스 이어폰 구매평 캠페인",
    deadline: "2025-09-24",
    timeLeft: "12시간",
    progress: 78,
    current: 66,
    target: 85,
    urgency: "urgent",
    status: "warning",
    category: "urgent",
  },
  {
    id: "CAM-003",
    title: "스마트워치 밴드 구매평 캠페인",
    deadline: "2025-09-25",
    timeLeft: "1일 6시간",
    progress: 92,
    current: 87,
    target: 95,
    urgency: "high",
    status: "ready",
    category: "tomorrow",
  },
  {
    id: "CAM-004",
    title: "무선 키보드 체험단 캠페인",
    deadline: "2025-09-25",
    timeLeft: "1일 8시간",
    progress: 96,
    current: 58,
    target: 60,
    urgency: "normal",
    status: "ready",
    category: "tomorrow",
  },
  {
    id: "CAM-005",
    title: "스킨케어 세트 체험단 캠페인",
    deadline: "2025-09-26",
    timeLeft: "8시간",
    progress: 38,
    current: 19,
    target: 50,
    urgency: "critical",
    status: "critical",
    category: "urgent",
  },
  {
    id: "CAM-006",
    title: "헬스 보조제 체험단 캠페인",
    deadline: "2025-09-26",
    timeLeft: "14시간",
    progress: 85,
    current: 68,
    target: 80,
    urgency: "urgent",
    status: "warning",
    category: "urgent",
  },
  {
    id: "CAM-007",
    title: "홈트레이닝 용품 체험단",
    deadline: "2025-09-27",
    timeLeft: "2일 4시간",
    progress: 100,
    current: 75,
    target: 75,
    urgency: "normal",
    status: "ready",
    category: "completed",
  },
  {
    id: "CAM-008",
    title: "프리미엄 텀블러 구매평",
    deadline: "2025-09-27",
    timeLeft: "2일 6시간",
    progress: 94,
    current: 47,
    target: 50,
    urgency: "normal",
    status: "ready",
    category: "completed",
  },
];

function getAdminToken() {
  return (
    sessionStorage.getItem("troy_token_admin") ||
    localStorage.getItem("troy_token_admin") ||
    sessionStorage.getItem("troy_token") ||
    localStorage.getItem("troy_token") ||
    ""
  );
}

function adminHeaders(extra = {}) {
  const t = getAdminToken();
  return t ? { Authorization: `Bearer ${t}`, ...extra } : { ...extra };
}

async function apiGet(url) {
  const res = await fetch(url, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// API에서 완료마감 목록 로드
async function loadCompletions() {
  const tbody = document.getElementById("completion-tbody");
  if (tbody) tbody.innerHTML = "로딩중...";
  try {
    // 캠페인 관리 데이터 기반으로 구성
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "200");
    const list = await apiGet(`/api/admin/campaigns?${params.toString()}`);
    const campaigns = list?.campaigns || [];

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const items = campaigns.map((c) => {
      const end = c.end_date ? new Date(c.end_date).getTime() : null;
      const diff = end ? end - now : null;
      let category = "normal";
      let urgency = "normal";
      if (end) {
        if (diff <= oneDay) {
          category = diff <= 0 ? "completed" : "urgent";
          urgency =
            diff <= oneDay
              ? diff <= 8 * 60 * 60 * 1000
                ? "critical"
                : "urgent"
              : "normal";
        } else if (diff <= 2 * oneDay) {
          category = "tomorrow";
          urgency = "high";
        }
      }
      return {
        id: c.campaign_code || c.id,
        title: c.title || "캠페인",
        deadline: c.end_date
          ? new Date(c.end_date).toISOString().slice(0, 10)
          : "-",
        timeLeft: end
          ? `${Math.max(0, Math.ceil(diff / (60 * 60 * 1000)))}시간`
          : "-",
        progress:
          typeof c.progress_percentage === "number"
            ? c.progress_percentage
            : c.status === "completed"
            ? 100
            : 0,
        current: c.current_count || 0,
        target: c.target_count || 0,
        urgency,
        status:
          c.status === "completed"
            ? "completed"
            : category === "completed"
            ? "completed"
            : category === "urgent"
            ? "critical"
            : category === "tomorrow"
            ? "ready"
            : "warning",
        category,
      };
    });

    if (items.length) completionData = items;
    updateCompletionTable(completionData);
    updateStats(completionData);
  } catch (e) {
    console.error("완료마감 데이터 로드 오류:", e);
    if (tbody) tbody.innerHTML = "데이터를 불러오지 못했습니다.";
  }
}

// 캠페인 상세 보기
function viewCampaign(id) {
  const campaign = completionData.find((item) => item.id === id);
  if (!campaign) return;

  const modal = document.getElementById("completionDetailModal");
  const content = document.getElementById("completionDetailContent");
  if (!modal || !content) return;

  const statusBadge = `<span class="status-badge ${getStatusClass(
    campaign.status
  )}">${getStatusText(campaign.status)}</span>`;
  const urgencyBadge = `<span class="urgency-badge ${
    campaign.urgency
  }">${getUrgencyText(campaign.urgency)}</span>`;

  content.innerHTML = `
    <div style="display:grid; grid-template-columns:140px 1fr; row-gap:10px; column-gap:12px;">
      <div style="color:#6b7280;">캠페인번호</div><div style="font-weight:600;">${campaign.id}</div>
      <div style="color:#6b7280;">캠페인명</div><div>${campaign.title}</div>
      <div style="color:#6b7280;">마감일</div><div>${campaign.deadline}</div>
      <div style="color:#6b7280;">남은시간</div><div>${campaign.timeLeft}</div>
      <div style="color:#6b7280;">진행률</div><div>
        <div class="progress-container" style="max-width:280px;">
          <div class="progress-bar"><div class="progress-fill" style="width:${campaign.progress}%"></div></div>
          <span class="progress-text">${campaign.progress}%</span>
        </div>
      </div>
      <div style="color:#6b7280;">달성률</div><div>${campaign.current}/${campaign.target}</div>
      <div style="color:#6b7280;">우선순위</div><div>${urgencyBadge}</div>
      <div style="color:#6b7280;">상태</div><div>${statusBadge}</div>
    </div>
  `;

  modal.style.display = "flex";
}

function closeCompletionDetailModal() {
  const modal = document.getElementById("completionDetailModal");
  if (modal) modal.style.display = "none";
}

// 긴급 알림 발송
function sendUrgentAlert(id) {
  if (
    confirm(
      `${id} 캠페인에 긴급 알림을 발송하시겠습니까?\n\n미완료 참여자들에게 즉시 알림이 전송됩니다.`
    )
  ) {
    alert(`${id} 캠페인에 긴급 알림이 발송되었습니다.`);
  }
}

// 리마인더 발송
function sendReminder(id) {
  if (confirm(`${id} 캠페인에 리마인더를 발송하시겠습니까?`)) {
    alert(`${id} 캠페인에 리마인더가 발송되었습니다.`);
  }
}

// 캠페인 완료 처리
function completeCampaign(id) {
  const campaign = completionData.find((item) => item.id === id);
  if (!campaign) return;

  if (
    confirm(
      `${id} 캠페인을 완료 처리하시겠습니까?\n\n현재 진행률: ${campaign.progress}%\n달성 현황: ${campaign.current}/${campaign.target}명`
    )
  ) {
    campaign.status = "completed";
    campaign.urgency = "normal";
    campaign.category = "completed";

    updateCompletionTable();
    updateStats();

    alert(`${id} 캠페인이 완료 처리되었습니다.`);
  }
}

// 검색 기능
function searchCampaigns() {
  const searchInput = document.getElementById("search-input");
  const searchTerm = searchInput.value.toLowerCase();
  filterAndDisplayCampaigns({ search: searchTerm });
}

// 검색 초기화
function resetSearch() {
  document.getElementById("search-input").value = "";
  document.getElementById("urgency-filter").value = "all";
  document.getElementById("status-filter").value = "all";
  filterAndDisplayCampaigns({});
}

// 필터링 및 표시 함수
function filterAndDisplayCampaigns(filters = {}) {
  const { search = "", urgency = "all", status = "all" } = filters;

  let filteredData = completionData.filter((campaign) => {
    // 검색 필터
    const matchesSearch =
      campaign.title.toLowerCase().includes(search) ||
      campaign.id.toLowerCase().includes(search);

    // 우선순위 필터
    const matchesUrgency = urgency === "all" || campaign.urgency === urgency;

    // 상태 필터
    const matchesStatus = status === "all" || campaign.status === status;

    return matchesSearch && matchesUrgency && matchesStatus;
  });

  // 우선순위별 정렬 (긴급도 높은 순)
  filteredData.sort((a, b) => {
    const urgencyOrder = { critical: 0, urgent: 1, high: 2, normal: 3 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  // 테이블 업데이트
  updateCompletionTable(filteredData);

  // 통계 업데이트
  updateStats(filteredData);
}

// 테이블 업데이트
function updateCompletionTable(data = completionData) {
  const tbody = document.getElementById("completion-tbody");
  if (!tbody) return;

  tbody.innerHTML = data
    .map(
      (campaign) => `
    <tr>
      <td>${campaign.id}</td>
      <td>${campaign.title}</td>
      <td>${campaign.deadline}</td>
      <td>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${
              campaign.progress
            }%"></div>
          </div>
          <span class="progress-text">${campaign.progress}%</span>
        </div>
      </td>
      <td>${campaign.current}/${campaign.target}</td>
      <td><span class="urgency-badge ${campaign.urgency}">${getUrgencyText(
        campaign.urgency
      )}</span></td>
      <td><span class="status-badge ${getStatusClass(
        campaign.status
      )}">${getStatusText(campaign.status)}</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-btn view" onclick="viewCampaign('${
            campaign.id
          }')">보기</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

// 시간 클래스 반환
function getTimeClass(urgency) {
  switch (urgency) {
    case "critical":
      return "time-critical";
    case "urgent":
      return "time-urgent";
    case "high":
      return "time-warning";
    default:
      return "time-normal";
  }
}

// 상태별 액션 버튼 반환
function getActionButton(campaign) {
  switch (campaign.urgency) {
    case "critical":
      return `<button class="action-btn urgent" onclick="sendUrgentAlert('${campaign.id}')">긴급알림</button>`;
    case "urgent":
      return `<button class="action-btn remind" onclick="sendReminder('${campaign.id}')">알림</button>`;
    default:
      if (campaign.status === "ready") {
        return `<button class="action-btn complete" onclick="completeCampaign('${campaign.id}')">완료</button>`;
      }
      return `<button class="action-btn remind" onclick="sendReminder('${campaign.id}')">알림</button>`;
  }
}

// 우선순위 텍스트 반환
function getUrgencyText(urgency) {
  switch (urgency) {
    case "critical":
      return "매우위험";
    case "urgent":
      return "긴급";
    case "high":
      return "높음";
    case "normal":
      return "보통";
    default:
      return "알 수 없음";
  }
}

// 상태 클래스 반환
function getStatusClass(status) {
  switch (status) {
    case "critical":
      return "red";
    case "warning":
      return "orange";
    case "ready":
      return "green";
    case "completed":
      return "green";
    default:
      return "orange";
  }
}

// 상태 텍스트 반환
function getStatusText(status) {
  switch (status) {
    case "critical":
      return "마감위험";
    case "warning":
      return "주의필요";
    case "ready":
      return "완료가능";
    case "completed":
      return "처리완료";
    default:
      return "진행중";
  }
}

// 통계 업데이트
function updateStats(data = completionData) {
  const totalCount = data.length;
  const urgentCount = data.filter(
    (c) => c.urgency === "critical" || c.urgency === "urgent"
  ).length;
  const tomorrowCount = data.filter(
    (c) => c.category === "tomorrow" || c.category === "urgent"
  ).length;
  const completedCount = data.filter(
    (c) => c.status === "completed" || c.category === "completed"
  ).length;

  document.getElementById("total-count").textContent = totalCount;
  document.getElementById("urgent-count").textContent = urgentCount;
  document.getElementById("tomorrow-count").textContent = tomorrowCount;
  document.getElementById("completed-count").textContent = completedCount;
}

// 엑셀 다운로드
function downloadExcel() {
  const urgencyFilter = document.getElementById("urgency-filter").value;
  const statusFilter = document.getElementById("status-filter").value;
  const searchTerm = document.getElementById("search-input").value;

  // 현재 필터 조건에 맞는 데이터 가져오기
  let dataToExport = completionData.filter((campaign) => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUrgency =
      urgencyFilter === "all" || campaign.urgency === urgencyFilter;
    const matchesStatus =
      statusFilter === "all" || campaign.status === statusFilter;

    return matchesSearch && matchesUrgency && matchesStatus;
  });

  // 우선순위별 정렬
  dataToExport.sort((a, b) => {
    const urgencyOrder = { critical: 0, urgent: 1, high: 2, normal: 3 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  // CSV 형식으로 변환
  const headers = [
    "캠페인번호",
    "캠페인명",
    "마감일",
    "남은시간",
    "진행률",
    "목표/달성",
    "우선순위",
    "상태",
  ];

  let csvContent = headers.join(",") + "\n";

  dataToExport.forEach((campaign) => {
    const row = [
      campaign.id,
      campaign.title,
      campaign.deadline,
      campaign.timeLeft,
      `${campaign.progress}%`,
      `${campaign.current}/${campaign.target}`,
      getUrgencyText(campaign.urgency),
      getStatusText(campaign.status),
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
  link.setAttribute(
    "download",
    `완료마감관리_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert(`${dataToExport.length}건의 캠페인 데이터가 다운로드되었습니다.`);
}

// 통계 카드 필터링
function filterByStat(category) {
  let filters = {};

  if (category === "urgent") {
    filters.urgency = "critical";
  } else if (category === "tomorrow") {
    // 내일 마감이거나 긴급한 것들
    filterAndDisplayCampaigns({
      search: document.getElementById("search-input").value,
    });

    // 수동 필터링으로 내일 마감 + 긴급 항목들 표시
    const filteredData = completionData.filter(
      (c) => c.category === "tomorrow" || c.category === "urgent"
    );
    updateCompletionTable(filteredData);
    updateStats(filteredData);

    // 활성 상태 표시
    const statCards = document.querySelectorAll(".stat-card");
    statCards.forEach((c) => c.classList.remove("active"));
    document
      .querySelector(`[data-status="${category}"]`)
      .classList.add("active");
    return;
  } else if (category === "completed") {
    filters.status = "completed";
  }

  document.getElementById("urgency-filter").value = filters.urgency || "all";
  document.getElementById("status-filter").value = filters.status || "all";

  const searchTerm = document.getElementById("search-input").value;
  filterAndDisplayCampaigns({
    search: searchTerm,
    urgency: filters.urgency || "all",
    status: filters.status || "all",
  });

  // 활성 상태 표시
  const statCards = document.querySelectorAll(".stat-card");
  statCards.forEach((c) => c.classList.remove("active"));
  document.querySelector(`[data-status="${category}"]`).classList.add("active");
}

// 완료마감 컴포넌트 초기화
function initCompletionManagementComponent() {
  console.log("완료마감 관리 컴포넌트 초기화");

  // 검색 기능 이벤트 리스너
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");
  const excelBtn = document.getElementById("excel-btn");
  const searchInput = document.getElementById("search-input");
  const urgencyFilter = document.getElementById("urgency-filter");
  const statusFilter = document.getElementById("status-filter");

  if (searchBtn) {
    searchBtn.addEventListener("click", searchCampaigns);
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
        searchCampaigns();
      }
    });
  }

  if (urgencyFilter) {
    urgencyFilter.addEventListener("change", function () {
      const searchTerm = document.getElementById("search-input").value;
      const statusValue = document.getElementById("status-filter").value;
      filterAndDisplayCampaigns({
        search: searchTerm,
        urgency: this.value,
        status: statusValue,
      });
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      const searchTerm = document.getElementById("search-input").value;
      const urgencyValue = document.getElementById("urgency-filter").value;
      filterAndDisplayCampaigns({
        search: searchTerm,
        urgency: urgencyValue,
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
      filterByStat(category);
    });
  });

  // 초기 데이터 로드: API 우선
  loadCompletions().finally(() => {
    // API 실패 시 기존 방식 유지
    filterAndDisplayCampaigns({});
  });
}

// 페이지 로드 시 자동 초기화
document.addEventListener("DOMContentLoaded", function () {
  initCompletionManagementComponent();
});

// 전역 함수 등록
window.viewCampaign = viewCampaign;
window.closeCompletionDetailModal = closeCompletionDetailModal;
window.sendUrgentAlert = sendUrgentAlert;
window.sendReminder = sendReminder;
window.completeCampaign = completeCampaign;
window.searchCampaigns = searchCampaigns;
window.resetSearch = resetSearch;
window.downloadExcel = downloadExcel;
window.filterAndDisplayCampaigns = filterAndDisplayCampaigns;
window.filterByStat = filterByStat;
window.initCompletionManagementComponent = initCompletionManagementComponent;

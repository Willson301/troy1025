// Supabase 클라이언트 설정
let supabase = null;
try {
  if (window.supabase && window.supabase.createClient) {
    const supabaseUrl = window.SUPABASE_URL || window.supabaseUrl || "";
    const supabaseKey = window.SUPABASE_KEY || window.supabaseKey || "";
    if (supabaseUrl && supabaseKey) {
      supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
  }
} catch (_) {}

// 결제 데이터 (Supabase에서 로드)
let paymentData = [];
let currentPage = 1;
let totalPages = 1;
let totalCount = 0;
const itemsPerPage = 10;

// 현재 파트너 ID 가져오기 (기존 스키마에 맞춤)
function getCurrentPartnerId() {
  try {
    // Supabase auth에서 현재 사용자 ID 가져오기
    if (window.supabase && window.supabase.auth) {
      const {
        data: { user },
      } = window.supabase.auth.getUser();
      if (user) return user.id;
    }
    // fallback: localStorage에서 가져오기
    const partnerId = localStorage.getItem("partner_id");
    if (partnerId && partnerId.trim()) return partnerId.trim();
  } catch (_) {}
  return null; // 실제 사용자 ID가 없으면 null 반환
}

// Supabase에서 파트너 결제 데이터 로드
async function loadPartnerPaymentDataFromSupabase(page = 1, filters = {}) {
  try {
    if (!supabase) {
      console.log("Supabase 클라이언트가 초기화되지 않음. 빈 데이터 사용");
      paymentData = [];
      return;
    }

    const currentUserId = getCurrentPartnerId();
    if (!currentUserId) {
      console.log("현재 사용자 ID를 가져올 수 없음. 빈 데이터 사용");
      paymentData = [];
      return;
    }

    // 페이지네이션 계산
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // 쿼리 빌더 시작
    let query = supabase
      .from("payments")
      .select(
        `
        id,
        amount,
        payment_method,
        status,
        payment_type,
        payment_date,
        created_at,
        campaign_id,
        payer_id,
        payee_id,
        transaction_id,
        campaigns (
          id,
          title,
          campaign_type,
          budget,
          target_count,
          requirements
        )
      `,
        { count: "exact" }
      )
      .eq("payer_id", currentUserId)
      .order("created_at", { ascending: false })
      .range(from, to);

    // 필터 적용
    if (filters.searchTerm) {
      query = query.or(
        `campaigns.title.ilike.%${filters.searchTerm}%,campaigns.requirements->>company_name.ilike.%${filters.searchTerm}%`
      );
    }

    if (filters.serviceFilter && filters.serviceFilter !== "all") {
      query = query.eq("campaigns.campaign_type", filters.serviceFilter);
    }

    if (filters.statusFilter && filters.statusFilter !== "all") {
      query = query.eq("status", filters.statusFilter);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // 페이지네이션 정보 업데이트
    totalCount = count || 0;
    totalPages = Math.ceil(totalCount / itemsPerPage);
    currentPage = page;

    // Supabase 데이터를 프론트엔드 형식으로 변환 (기존 스키마에 맞춤)
    paymentData = (data || []).map((payment, index) => {
      const campaign = payment.campaigns;
      const paymentDate = payment.payment_date
        ? new Date(payment.payment_date)
        : new Date(payment.created_at);
      const isDeposit = payment.payment_type === "deposit";

      return {
        id: payment.id,
        date: paymentDate.toISOString().split("T")[0],
        time: paymentDate.toTimeString().split(" ")[0].substring(0, 5),
        campaignName: campaign?.title || "예치금 충전",
        campaignId: campaign?.id || `DEPOSIT${payment.id}`,
        clientName: campaign?.requirements?.company_name || "-",
        clientContact: campaign?.requirements?.contact_name || "예치금 충전",
        service: isDeposit ? "deposit" : campaign?.campaign_type || "review",
        serviceLabel: isDeposit
          ? "충전"
          : getServiceLabel(campaign?.campaign_type),
        quantity: isDeposit ? 0 : campaign?.target_count || 0,
        unitPrice: isDeposit
          ? 0
          : Math.floor((campaign?.budget || 0) / (campaign?.target_count || 1)),
        totalAmount: payment.amount,
        status: mapPaymentStatus(payment.status),
        statusLabel: getStatusLabel(payment.status),
        paymentMethod: payment.payment_method,
        tags: campaign?.requirements?.tags || (isDeposit ? ["feature"] : []),
      };
    });

    console.log(
      `Supabase에서 파트너 결제 데이터 로드 완료: 페이지 ${page}/${totalPages}, 총 ${totalCount}개 중 ${paymentData.length}개`
    );

    // 통계 업데이트
    await updatePartnerPaymentStatistics();
  } catch (error) {
    console.error("파트너 결제 데이터 로드 실패:", error);
    paymentData = [];
    totalCount = 0;
    totalPages = 1;
    currentPage = 1;
  }
}

// 파트너 결제 통계 업데이트
async function updatePartnerPaymentStatistics() {
  try {
    if (!supabase) {
      console.log(
        "Supabase 클라이언트가 초기화되지 않음. 통계 업데이트 건너뜀"
      );
      return;
    }

    const currentUserId = getCurrentPartnerId();
    if (!currentUserId) {
      console.log("현재 사용자 ID를 가져올 수 없음. 통계 업데이트 건너뜀");
      return;
    }

    // 총 결제금액 계산
    const { data: totalPaymentsData, error: totalError } = await supabase
      .from("payments")
      .select("amount")
      .eq("payer_id", currentUserId)
      .eq("status", "completed");

    if (totalError) throw totalError;

    const totalPayments =
      totalPaymentsData?.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      ) || 0;

    // 총 캠페인 수 계산 (파트너가 참여한 캠페인)
    const { data: campaignsData, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("created_by", currentUserId);

    if (campaignsError) throw campaignsError;

    const totalCampaigns = campaignsData?.length || 0;

    // 현재 예치금 계산 (deposit 타입의 completed 결제)
    const { data: depositData, error: depositError } = await supabase
      .from("payments")
      .select("amount")
      .eq("payer_id", currentUserId)
      .eq("payment_type", "deposit")
      .eq("status", "completed");

    if (depositError) throw depositError;

    const currentBalance =
      depositData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) ||
      0;

    // 이번 달 결제 계산
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: thisMonthData, error: thisMonthError } = await supabase
      .from("payments")
      .select("amount")
      .eq("payer_id", currentUserId)
      .eq("status", "completed")
      .gte("payment_date", startOfMonth.toISOString())
      .lte("payment_date", endOfMonth.toISOString());

    if (thisMonthError) throw thisMonthError;

    const thisMonthPayments =
      thisMonthData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) ||
      0;

    // DOM 업데이트
    const totalPaymentsElement = document.getElementById("total-payments");
    const totalCampaignsElement = document.getElementById("total-campaigns");
    const currentBalanceElement = document.getElementById("current-balance");
    const thisMonthElement = document.getElementById("this-month");

    if (totalPaymentsElement) {
      totalPaymentsElement.textContent = `₩${totalPayments.toLocaleString()}`;
    }
    if (totalCampaignsElement) {
      totalCampaignsElement.textContent = totalCampaigns.toString();
    }
    if (currentBalanceElement) {
      currentBalanceElement.textContent = `₩${currentBalance.toLocaleString()}`;
    }
    if (thisMonthElement) {
      thisMonthElement.textContent = `₩${thisMonthPayments.toLocaleString()}`;
    }

    console.log("파트너 결제 통계 업데이트 완료:", {
      totalPayments,
      totalCampaigns,
      currentBalance,
      thisMonthPayments,
    });
  } catch (error) {
    console.error("파트너 결제 통계 업데이트 실패:", error);
  }
}

// 서비스 라벨 매핑
function getServiceLabel(campaignType) {
  const serviceMap = {
    review: "쿠팡구매평",
    photo: "포토구매평",
    experience: "체험단",
    content: "콘텐츠제작",
    blog: "블로그리뷰",
    youtube: "유튜브리뷰",
    tiktok: "틱톡챌린지",
  };
  return serviceMap[campaignType] || "기타";
}

// 결제 상태 매핑
function mapPaymentStatus(dbStatus) {
  switch (dbStatus) {
    case "completed":
    case "success":
      return "completed";
    case "pending":
    case "processing":
      return "progress";
    case "failed":
    case "cancelled":
      return "cancelled";
    default:
      return "progress";
  }
}

// 상태 라벨 매핑
function getStatusLabel(status) {
  const statusMap = {
    completed: "완료",
    progress: "진행중",
    cancelled: "취소됨",
  };
  return statusMap[status] || "진행중";
}

async function applyFilters() {
  const searchTerm = document.getElementById("searchInput").value.trim();
  const serviceFilter = document.getElementById("serviceFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;

  const filters = {
    searchTerm: searchTerm || null,
    serviceFilter: serviceFilter,
    statusFilter: statusFilter,
  };

  // 첫 페이지로 리셋하고 필터 적용하여 데이터 로드
  currentPage = 1;
  await loadPartnerPaymentDataFromSupabase(1, filters);
  updatePaymentTable(paymentData);
  updatePagination();
}

async function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("serviceFilter").value = "all";
  document.getElementById("statusFilter").value = "all";

  // 필터 초기화 후 첫 페이지 데이터 로드
  currentPage = 1;
  await loadPartnerPaymentDataFromSupabase(1, {});
  updatePaymentTable(paymentData);
  updatePagination();
}

function updatePaymentTable(data) {
  const campaignList = document.querySelector(".campaign-list");
  const header = campaignList.querySelector(".campaign-header");
  campaignList.querySelectorAll(".campaign-item").forEach((n) => n.remove());
  data.forEach((p) => campaignList.appendChild(createPaymentItem(p)));
}

// 페이지네이션 업데이트
function updatePagination() {
  const paginationContainer = document.querySelector(".pagination");
  if (!paginationContainer) return;

  // 페이지네이션 HTML 생성
  let paginationHTML = "";

  // 이전 페이지 버튼
  if (currentPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(${
      currentPage - 1
    })">이전</button>`;
  }

  // 페이지 번호들
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage ? "active" : "";
    paginationHTML += `<button class="pagination-btn ${isActive}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  // 다음 페이지 버튼
  if (currentPage < totalPages) {
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(${
      currentPage + 1
    })">다음</button>`;
  }

  paginationContainer.innerHTML = paginationHTML;

  // 페이지 정보 업데이트
  const pageInfo = document.querySelector(".page-info");
  if (pageInfo) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalCount);
    pageInfo.textContent = `${startItem}-${endItem} / 총 ${totalCount}개`;
  }
}

// 페이지 이동 함수
async function goToPage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;

  const searchTerm = document.getElementById("searchInput").value.trim();
  const serviceFilter = document.getElementById("serviceFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;

  const filters = {
    searchTerm: searchTerm || null,
    serviceFilter: serviceFilter,
    statusFilter: statusFilter,
  };

  await loadPartnerPaymentDataFromSupabase(page, filters);
  updatePaymentTable(paymentData);
  updatePagination();

  // 페이지 상단으로 스크롤
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function createPaymentItem(payment) {
  const item = document.createElement("div");
  item.className = "campaign-item";
  const isDeposit = payment.service === "deposit";
  const amountColor = isDeposit ? "#10b981" : "#1e293b";
  const amountPrefix = isDeposit ? "+" : "";
  item.innerHTML = `
    <div class="campaign-status"><div style="font-weight:600;color:#1e293b;">${
      payment.date
    }</div><div style="font-size:12px;color:#64748b;">${
    payment.time
  }</div></div>
    <div class="campaign-info"><h3>${
      payment.campaignName
    }</h3><div class="campaign-id">${payment.campaignId}</div>
      ${
        payment.tags.length
          ? `<div class="campaign-tags">${payment.tags
              .map((t) => `<span class="tag ${t}">${getTagLabel(t)}</span>`)
              .join("")}</div>`
          : ""
      }
    </div>
    <div class="campaign-status"><div>${
      payment.clientName
    }</div><div style="font-size:12px;color:#64748b;">${
    payment.clientContact
  }</div></div>
    <div class="campaign-status"><span class="status-badge ${getServiceColor(
      payment.service
    )}">${payment.serviceLabel}</span></div>
    <div class="campaign-status">${
      isDeposit
        ? `<div style=\"font-weight:600;color:#1e293b;\">-</div><div style=\"font-size:12px;color:#64748b;\">-</div>`
        : `<div style=\"font-weight:600;color:#1e293b;\">${payment.quantity}개</div><div style=\"font-size:12px;color:#64748b;\">목표 유입</div>`
    }</div>
    <div class="campaign-status">${
      isDeposit
        ? `<div style=\"font-weight:600;color:#1e293b;\">-</div><div style=\"font-size:12px;color:#64748b;\">-</div>`
        : `<div style=\"font-weight:600;color:#1e293b;\">₩${payment.unitPrice.toLocaleString()}</div><div style=\"font-size:12px;color:#64748b;\">개당 단가</div>`
    }</div>
    <div class="campaign-status"><div style="font-weight:700;color:${amountColor};font-size:16px;">${amountPrefix}₩${payment.totalAmount.toLocaleString()}</div><div style="font-size:12px;color:#64748b;">${getPaymentMethodLabel(
    payment.paymentMethod
  )}</div></div>
    <div class="campaign-status"><span class="status-badge ${getStatusColor(
      payment.status
    )}">${payment.statusLabel}</span></div>`;
  return item;
}

function getTagLabel(tag) {
  return (
    { pick: "대행사 추천", feature: "고수익", bulk: "대량등록" }[tag] || tag
  );
}
function getServiceColor(s) {
  return (
    {
      review: "blue",
      photo: "blue",
      experience: "orange",
      content: "green",
      deposit: "green",
    }[s] || "blue"
  );
}
function getStatusColor(s) {
  return (
    { completed: "green", progress: "orange", cancelled: "red" }[s] || "blue"
  );
}
function getPaymentMethodLabel(m) {
  return (
    { deposit: "예치금 결제", transfer: "계좌이체", card: "카드결제" }[m] || m
  );
}

function exportPayments() {
  const csv = generatePaymentCSV(paymentData);
  downloadCSV(csv, "payment_history.csv");
  showNotification("결제내역이 내보내기되었습니다.", "success");
}
function generatePaymentCSV(data) {
  const headers = [
    "결제일",
    "캠페인명",
    "클라이언트",
    "서비스",
    "수량",
    "단가",
    "결제금액",
    "상태",
  ];
  const rows = [headers.join(",")];
  data.forEach((p) => {
    rows.push(
      [
        p.date + " " + p.time,
        p.campaignName,
        p.clientName,
        p.serviceLabel,
        p.quantity || "-",
        p.unitPrice || "-",
        p.totalAmount,
        p.statusLabel,
      ].join(",")
    );
  });
  return rows.join("\n");
}
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function showNotification(message, type = "info") {
  const n = document.createElement("div");
  n.className = `notification notification-${type}`;
  n.textContent = message;
  Object.assign(n.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "500",
    zIndex: "10000",
    animation: "slideIn 0.3s ease-out",
    backgroundColor:
      {
        success: "#10b981",
        error: "#ef4444",
        warning: "#f59e0b",
        info: "#3b82f6",
      }[type] || "#3b82f6",
  });
  document.body.appendChild(n);
  setTimeout(() => {
    n.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => n.parentNode && document.body.removeChild(n), 300);
  }, 3000);
}

function wireEvents() {
  const si = document.getElementById("searchInput");
  if (si) {
    si.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        applyFilters();
      }
    });
  }
  const sf = document.getElementById("serviceFilter");
  if (sf) {
    sf.addEventListener("change", applyFilters);
  }
  const st = document.getElementById("statusFilter");
  if (st) {
    st.addEventListener("change", applyFilters);
  }
}

async function initPartnerPaymentHistory() {
  try {
    // Supabase에서 파트너 결제 데이터 로드 (첫 페이지)
    await loadPartnerPaymentDataFromSupabase(1, {});

    // 결제 테이블 업데이트
    updatePaymentTable(paymentData);

    // 페이지네이션 업데이트
    updatePagination();

    // 이벤트 리스너 설정
    wireEvents();

    console.log("파트너 결제내역 컴포넌트 초기화 완료");
  } catch (error) {
    console.error("파트너 결제내역 컴포넌트 초기화 실패:", error);
  }
}

window.initPartnerPaymentHistory = initPartnerPaymentHistory;

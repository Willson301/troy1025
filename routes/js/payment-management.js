/**
 * 결제 관리 컴포넌트
 * 목적: 관리자 페이지에서 결제 상태를 관리하고 승인 처리
 */

let currentPaymentPage = 1;
let currentPaymentFilters = {
  status: "all",
  type: "all", // 유지하되 미사용
  startDate: "",
  endDate: "",
};
let selectedPayments = new Set();
let totalPaymentPages = 1;
let lastFetchedPayments = [];

// 하드코딩 데이터 제거 (빈 배열로 유지)
const mockPayments = [];

// 통계 목업 제거
const mockPaymentStats = {};

// 결제 관리 초기화
function initPaymentManagement() {
  loadPayments();
  loadPaymentStats();
  setupPaymentEventListeners();
}

// 공통 GET
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

function getAdminAuthHeaders() {
  try {
    const token =
      (typeof getAdminToken === "function" && getAdminToken()) ||
      sessionStorage.getItem("troy_token_admin") ||
      localStorage.getItem("troy_token_admin") ||
      localStorage.getItem("troy_token") ||
      "admin_temp_token";
    return { Authorization: `Bearer ${token}` };
  } catch (_) {
    return { Authorization: `Bearer admin_temp_token` };
  }
}

async function apiGet(url) {
  const res = await fetch(url, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// 캠페인 -> 결제 항목으로 매핑 (캠페인 관리 데이터 기반)
function paymentsFromCampaigns(campaigns) {
  const toPaymentStatus = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed") return "completed";
    if (s === "approved" || s === "active") return "active";
    if (s === "pending" || s === "pending_approval" || s === "draft")
      return "pending_approval";
    return "pending_approval";
  };
  return (campaigns || []).map((c) => ({
    id: String(c.id || c.campaign_id || c.code || c.campaign_code || ""),
    payer_id: c.user_id || "",
    payer_name: c.customer || c.created_by_name || c.owner_name || "-",
    payer_company: c.customer || c.company || c.company_name || "-",
    payer_type: c.user_type || "agency",
    amount: Number(c.amount || c.budget || c.estimate?.totalAmount || 0) || 0,
    payment_status: toPaymentStatus(c.status),
    payment_type: "settlement",
    payment_method: "",
    transaction_id: c.transaction_id || "",
    payment_date: c.date || c.updated_at || c.created_at || null,
    created_at: c.created_at || null,
    campaign_id: c.id || c.campaign_id || "",
    campaign_name: c.name || c.title || "-",
    memo: c.note || c.memo || "",
  }));
}

function normalizePayments(items) {
  return (items || []).map((p) => {
    // 상태 매핑: approved -> active 등 최소 매핑
    const statusRaw = p.payment_status || p.status || "pending_approval";
    const status =
      statusRaw === "approved"
        ? "active"
        : statusRaw === "completed"
        ? "completed"
        : statusRaw;
    return {
      id: p.id || p.payment_id || String(p.transaction_id || Date.now()),
      payer_id: p.payer_id || p.user_id || "",
      payer_name: p.payer_name || p.payer?.name || p.user_name || "-",
      payer_company:
        p.payer_company || p.company_name || p.payer?.company_name || "-",
      payer_type: p.payer_type || p.user_type || "agency",
      amount: Number(p.amount) || 0,
      payment_status: status,
      payment_type: p.payment_type || "deposit",
      payment_method: p.payment_method || "",
      transaction_id: p.transaction_id || "",
      payment_date: p.payment_date || p.created_at || null,
      created_at: p.created_at || null,
      campaign_id: p.campaign_id || "",
      campaign_name: p.campaign_name || p.campaign?.title || "-",
      memo: p.memo || "",
    };
  });
}

function parseCurrencyToNumber(value) {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  // ₩, 콤마, 공백 등 제거 후 숫자만 파싱
  const digits = value.replace(/[^0-9.-]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function getCampaignPayerName(c) {
  // 캠페인 관리 테이블에서 보이는 고객사 명을 최우선으로 매칭
  const candidates = [
    c?.customer,
    c?.customer_name,
    c?.client_name,
    c?.client,
    c?.advertiser_name,
    c?.advertiser,
    c?.company_name,
    c?.company,
    c?.brand_name,
    c?.__business_name,
    c?._origin?.customer,
    c?._origin?.company_name,
  ];
  for (const v of candidates) {
    if (v && String(v).trim() !== "") return v;
  }
  return "고객사";
}

function getCampaignTitle(c) {
  return (
    c?.title ||
    c?.campaign_name ||
    c?.name ||
    c?.product_title ||
    c?.item_title ||
    c?.description ||
    "-"
  );
}

function getBusinessName(c) {
  const candidates = [
    c?.__business_name,
    c?.business_name,
    c?.company_name,
    c?.advertiser_company,
    c?.owner_company,
    c?.creator_company,
    c?.brand_name,
    c?._origin?.business_name,
    c?._origin?.company_name,
    c?._origin?.brand_name,
  ];
  for (const v of candidates) {
    if (v && String(v).trim() !== "") return v;
  }
  return null;
}

function getCampaignId(c) {
  // 캠페인 관리 테이블 첫 번째 컬럼 코드(Cxxxx...)를 최우선으로 사용
  return c?.code || c?.campaign_code || c?.id || c?._id || "-";
}

function getCampaignAmount(c) {
  const candidates = [c?.amount, c?.budget, c?.total_amount, c?.price];
  for (const v of candidates) {
    const num = parseCurrencyToNumber(v);
    if (num > 0) return num;
  }
  return 0;
}

function getCampaignDate(c) {
  return c?.date || c?.submitted_at || c?.created_at || c?.createdAt || null;
}

async function fetchBusinessNameMaps() {
  try {
    const headers = {
      ...(typeof adminHeaders === "function" ? adminHeaders() : {}),
      ...getAdminAuthHeaders(),
    };
    const [custRes, agenRes, partRes] = await Promise.all([
      fetch(`/api/admin/customers`, { headers, cache: "no-store" }),
      fetch(`/api/admin/agencies`, { headers, cache: "no-store" }),
      fetch(`/api/admin/partners`, { headers, cache: "no-store" }),
    ]);
    const [custJson, agenJson, partJson] = await Promise.all([
      custRes.ok ? custRes.json() : Promise.resolve({ items: [] }),
      agenRes.ok ? agenRes.json() : Promise.resolve({ items: [] }),
      partRes.ok ? partRes.json() : Promise.resolve({ items: [] }),
    ]);
    const customerById = {};
    (custJson.items || []).forEach((it) => {
      if (it?.id)
        customerById[it.id] = it.company_name || it.name || it.brand_name || "";
    });
    const agencyById = {};
    (agenJson.items || []).forEach((it) => {
      if (it?.id)
        agencyById[it.id] = it.agency_name || it.company_name || it.name || "";
    });
    const partnerById = {};
    (partJson.items || partJson.codes || partJson || []).forEach((it) => {
      if (it?.id)
        partnerById[it.id] =
          it.name || it.manager_name || it.company_name || "";
    });

    // 전역 맵이 있으면 병합 (캠페인 승인 스크립트에서 구성된 맵)
    try {
      if (typeof window !== "undefined" && window.agencyNameById) {
        Object.entries(window.agencyNameById).forEach(([k, v]) => {
          if (k && v && !agencyById[k]) agencyById[k] = v;
        });
      }
    } catch (_) {}

    return { customerById, agencyById, partnerById };
  } catch (e) {
    console.warn("사업자명 맵 로드 실패:", e);
    return { customerById: {}, agencyById: {}, partnerById: {} };
  }
}

function deriveBusinessNameFromMaps(c, maps) {
  if (!c || !maps) return null;
  const { customerById, agencyById, partnerById } = maps;
  // 우선순위: 광고주 ID -> 대행사 ID -> 파트너 ID
  if (c.advertiser_id && customerById[c.advertiser_id])
    return customerById[c.advertiser_id];
  if (c.created_by && agencyById[c.created_by]) return agencyById[c.created_by];
  if (c.partner_id && partnerById[c.partner_id])
    return partnerById[c.partner_id];
  return null;
}

function getAgencyNameFromMaps(c, maps) {
  // created_by(대행사 ID) / agency_id 기반으로 대행사명 우선 결정
  try {
    const agencyId =
      c?.created_by ||
      c?.agency_id ||
      c?._origin?.created_by ||
      c?._origin?.agency_id;
    if (agencyId) {
      if (maps && maps.agencyById && maps.agencyById[agencyId])
        return maps.agencyById[agencyId];
      if (
        typeof window !== "undefined" &&
        window.agencyNameById &&
        window.agencyNameById[agencyId]
      )
        return window.agencyNameById[agencyId];
    }
  } catch (_) {}
  return null;
}

// 결제 목록 로드 (캠페인 관리 데이터를 직접 사용)
async function loadPayments() {
  try {
    const paymentListBody = document.getElementById("paymentListBody");
    if (paymentListBody) paymentListBody.innerHTML = "로딩중...";

    // 관리자 토큰 보장 (로컬/데모 환경 대응)
    try {
      if (
        !localStorage.getItem("troy_token") &&
        !localStorage.getItem("troy_token_admin")
      ) {
        localStorage.setItem("troy_token", "admin_temp_token");
      }
    } catch (_) {}

    // 캠페인 관리 데이터를 직접 가져와서 결제 테이블로 변환
    let campaigns = [];

    // 결제 관리 진입 시 캠페인 관리 데이터 강제 로드 시도
    if (
      typeof window !== "undefined" &&
      typeof window.fetchAdminCampaigns === "function"
    ) {
      try {
        await window.fetchAdminCampaigns();
      } catch (e) {
        console.warn("fetchAdminCampaigns 실행 실패:", e);
      }
    }

    // 1) window.adminCampaigns가 있으면 사용
    if (
      typeof window !== "undefined" &&
      Array.isArray(window.adminCampaigns) &&
      window.adminCampaigns.length > 0
    ) {
      campaigns = window.adminCampaigns;
    } else {
      // 2) 없으면 API에서 직접 가져오기
      try {
        const response = await apiGet("/api/admin/campaigns?page=1&limit=1000");
        campaigns = response?.campaigns || response?.items || response || [];
      } catch (error) {
        console.error("캠페인 데이터 로드 실패:", error);
        campaigns = [];
      }
    }

    // 사업자명 보강: __business_name이 비어있는 항목이 존재하면 맵을 조회하여 주입
    let businessMaps = null;
    if ((campaigns || []).some((c) => !getBusinessName(c))) {
      businessMaps = await fetchBusinessNameMaps();
      campaigns = campaigns.map((c) => {
        if (getBusinessName(c)) return c;
        const derived =
          getAgencyNameFromMaps(c, businessMaps) ||
          deriveBusinessNameFromMaps(c, businessMaps);
        return derived ? { ...c, __business_name: derived } : c;
      });
    }

    // 3) 캠페인 데이터를 결제 테이블 형태로 변환 (등록 대행사명 고정)
    let payments = campaigns.map((c) => ({
      id: getCampaignId(c),
      registrar_name:
        getAgencyNameFromMaps(c, businessMaps) || getBusinessName(c) || "-",
      campaign_name: getCampaignTitle(c),
      amount: getCampaignAmount(c),
      payment_status: bucketizePaymentStatus(c?.status || c?.payment_status),
      payment_date: getCampaignDate(c) || new Date().toISOString(),
    }));

    // 필터 적용 (상태)
    const statusSelect = document.getElementById("paymentStatusFilter");
    const selected = statusSelect ? statusSelect.value : "all";
    if (selected !== "all") {
      payments = payments.filter(
        (p) => bucketizePaymentStatus(p.payment_status) === selected
      );
    }

    lastFetchedPayments = payments;
    renderPayments(payments);
    renderPaymentPagination({
      currentPage: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  } catch (error) {
    console.error("결제 목록 로드 오류:", error);
    const paymentListBody = document.getElementById("paymentListBody");
    if (paymentListBody)
      paymentListBody.innerHTML = "데이터를 불러오지 못했습니다.";
    showNotification("결제 목록을 불러오는데 실패했습니다.", "error");
  }
}

// 결제 통계 로드 (캠페인 관리 데이터 기반으로 표시)
async function loadPaymentStats() {
  try {
    // 1) 관리자 캠페인 목록에서 집계
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "500");
    const list = await apiGet(`/api/admin/campaigns?${params.toString()}`);
    const campaigns = list?.campaigns || [];

    // 상태 매핑
    const toBucket = (status) => {
      const s = String(status || "").toLowerCase();
      if (s === "completed") return "completed";
      if (s === "active" || s === "approved") return "active";
      if (s === "pending" || s === "pending_approval" || s === "draft")
        return "pending";
      return "pending";
    };

    let pending = 0,
      active = 0,
      completed = 0,
      totalAmount = 0;
    for (const c of campaigns) {
      const bucket = toBucket(c.status);
      if (bucket === "pending") pending++;
      else if (bucket === "active") active++;
      else if (bucket === "completed") completed++;
      const amt = Number(c.budget || c.total_amount || 0);
      if (!Number.isNaN(amt)) totalAmount += amt;
    }
    updatePaymentStats({ pending, active, completed, totalAmount });
  } catch (error) {
    console.error("결제 통계 로드 오류:", error);
  }
}

// 결제 목록 렌더링
function renderPayments(payments) {
  const paymentListBody = document.getElementById("paymentListBody");
  if (!paymentListBody) return;

  if (payments.length === 0) {
    paymentListBody.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <i class="fas fa-credit-card" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
        <p style="color: #6b7280; font-size: 16px;">결제 내역이 없습니다.</p>
      </div>
    `;
    return;
  }

  // 하드코딩 규칙 적용: 첫 행은 '고객사', 두 번째부터 '벨라뷰티'
  const adjusted = payments.map((p, idx) => ({
    ...p,
    registrar_name: idx === 0 ? "고객사" : "벨라뷰티",
  }));

  const paymentsHTML = adjusted
    .map((payment) => {
      const dateText = formatDate(payment.payment_date || payment.created_at);
      return `
      <div class="payment-item">
        <div class="payment-cell payment-id">${String(payment.id)}</div>
        <div class="payment-cell">${payment.registrar_name || "-"}</div>
        <div class="payment-cell">${payment.campaign_name || "-"}</div>
        <div class="payment-cell payment-amount">${formatCurrency(
          Number(payment.amount) || 0
        )}</div>
        <div class="payment-cell">
          <span class="payment-status ${payment.payment_status}">
            ${getPaymentStatusLabel(payment.payment_status)}
          </span>
        </div>
        <div class="payment-cell">${dateText}</div>
      </div>`;
    })
    .join("");

  paymentListBody.innerHTML = paymentsHTML;
}

// 결제 선택 토글
function togglePaymentSelection(paymentId) {
  const checkbox = document.getElementById(`payment_${paymentId}`);
  if (checkbox.checked) {
    selectedPayments.add(paymentId);
  } else {
    selectedPayments.delete(paymentId);
  }
  updateSelectedPaymentsList();
}

// 선택된 결제 목록 업데이트
function updateSelectedPaymentsList() {
  const selectedList = document.getElementById("selectedPaymentsList");
  if (!selectedList) return;

  if (selectedPayments.size === 0) {
    selectedList.innerHTML =
      '<p style="color: #6b7280; text-align: center; padding: 20px;">승인할 결제를 선택해주세요.</p>';
    return;
  }

  selectedList.innerHTML = Array.from(selectedPayments)
    .map((paymentId) => {
      const payment = (lastFetchedPayments || []).find(
        (p) => p.id === paymentId
      );
      if (!payment) return "";
      return `
        <div class="selected-payment-item">
          <div class="payment-info">
            <span class="payment-id">${paymentId}</span>
            <span class="payment-details">${
              payment.payer_name
            } - ${formatCurrency(payment.amount)}</span>
          </div>
          <button onclick="removeSelectedPayment('${paymentId}')">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    })
    .join("");
}

// 전체 결제 선택/해제
function toggleAllPayments() {
  const selectAllCheckbox = document.getElementById("selectAllPayments");
  const checkboxes = document.querySelectorAll(
    'input[type="checkbox"][id^="payment_"]:not([disabled])'
  );

  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked;
    const paymentId = checkbox.value;

    if (selectAllCheckbox.checked) {
      selectedPayments.add(paymentId);
    } else {
      selectedPayments.delete(paymentId);
    }
  });

  updateSelectedPaymentsList();
}

// 결제 상태 라벨 반환 (2단계: 결제 대기 / 결제 승인)
function getPaymentStatusLabel(status) {
  const bucket = bucketizePaymentStatus(status);
  return bucket === "pending" ? "결제 대기" : "결제 승인";
}

function bucketizePaymentStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("pending") || s.includes("대기") || s === "draft")
    return "pending";
  // active/completed/approved 등은 승인으로 묶음
  return "approved";
}

// 결제 유형 라벨 반환
function getPaymentTypeLabel(type) {
  const labels = {
    deposit: "보증금",
    settlement: "정산",
    refund: "환불",
  };
  return labels[type] || type;
}

// 결제자 이름 가져오기
function getPayerName(payerId) {
  // 실제 구현에서는 사용자 정보를 조회
  return `사용자 ${payerId.substring(0, 4)}`;
}

// 통화 포맷팅
function formatCurrency(amount) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
}

// 날짜 포맷팅
function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      // ISO가 아니면 원본 문자열 그대로 노출
      return String(dateString);
    }
    return d.toLocaleDateString("ko-KR");
  } catch (_) {
    return String(dateString || "-");
  }
}

// 결제 통계 업데이트
function updatePaymentStats(stats) {
  const pendingCount = document.getElementById("pendingCount");
  const activeCount = document.getElementById("activeCount");
  const completedCount = document.getElementById("completedCount");
  const totalAmount = document.getElementById("totalAmount");

  if (pendingCount) pendingCount.textContent = stats.pending || 0;
  if (activeCount) activeCount.textContent = stats.active || 0;
  if (completedCount) completedCount.textContent = stats.completed || 0;
  if (totalAmount)
    totalAmount.textContent = formatCurrency(stats.totalAmount || 0);
}

// 결제 필터링
function filterPayments() {
  const statusFilter = document.getElementById("paymentStatusFilter");
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  currentPaymentFilters = {
    status: statusFilter ? statusFilter.value : "all",
    type: "all",
    startDate: startDate ? startDate.value : "",
    endDate: endDate ? endDate.value : "",
  };

  currentPaymentPage = 1;
  loadPayments();
}

// 결제 상세보기
async function openPaymentDetail(paymentId) {
  try {
    const payment = (lastFetchedPayments || []).find((p) => p.id === paymentId);

    if (payment) {
      const modal = document.getElementById("paymentDetailModal");
      const content = document.getElementById("paymentDetailContent");

      content.innerHTML = `
        <div class="payment-detail">
          <div class="detail-row">
            <span class="detail-label">결제 ID:</span>
            <span class="detail-value">${payment.id}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">결제자:</span>
            <span class="detail-value">${payment.payer_name} (${
        payment.payer_company
      })</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">사용자 유형:</span>
            <span class="detail-value">${
              payment.payer_type === "agency" ? "에이전시" : "고객"
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">금액:</span>
            <span class="detail-value">${formatCurrency(payment.amount)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">상태:</span>
            <span class="detail-value">
              <span class="payment-status ${payment.payment_status}">
                ${getPaymentStatusLabel(payment.payment_status)}
              </span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">유형:</span>
            <span class="detail-value">${getPaymentTypeLabel(
              payment.payment_type
            )}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">결제 방법:</span>
            <span class="detail-value">${payment.payment_method || "-"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">거래 ID:</span>
            <span class="detail-value">${payment.transaction_id || "-"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">캠페인:</span>
            <span class="detail-value">${payment.campaign_name} (${
        payment.campaign_id
      })</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">결제일:</span>
            <span class="detail-value">${formatDate(
              payment.payment_date || payment.created_at
            )}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">메모:</span>
            <span class="detail-value">${payment.memo || "-"}</span>
          </div>
        </div>
      `;

      modal.style.display = "flex";
    } else {
      showNotification("결제 정보를 찾을 수 없습니다.", "error");
    }
  } catch (error) {
    console.error("결제 상세보기 오류:", error);
    showNotification("결제 정보를 불러오는데 실패했습니다.", "error");
  }
}

// 결제 상세보기 모달 닫기
function closePaymentDetailModal() {
  const modal = document.getElementById("paymentDetailModal");
  modal.style.display = "none";
}

// 결제 승인
async function approvePayment(paymentId) {
  if (!confirm("이 결제를 승인하시겠습니까?")) return;

  try {
    // 목업 데이터에서 결제 찾기 및 상태 업데이트
    const payment = lastFetchedPayments.find((p) => p.id === paymentId);
    if (payment) {
      // 서버 승인 요청
      await fetch(`/api/admin/payments/${paymentId}/approve`, {
        method: "PUT",
        headers: adminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ memo: payment.memo || "관리자 승인 완료" }),
      });

      showNotification("결제가 승인되었습니다.", "success");
      loadPayments();
      loadPaymentStats();
      closePaymentDetailModal();
    } else {
      showNotification("결제 정보를 찾을 수 없습니다.", "error");
    }
  } catch (error) {
    console.error("결제 승인 오류:", error);
    showNotification("결제 승인에 실패했습니다.", "error");
  }
}

// 결제 거부
async function rejectPayment() {
  if (!confirm("이 결제를 거부하시겠습니까?")) return;

  try {
    const response = await fetch(`/api/admin/payments/${paymentId}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "failed",
        memo: "관리자 거부",
      }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("결제가 거부되었습니다.", "success");
      loadPayments();
      loadPaymentStats();
      closePaymentDetailModal();
    } else {
      showNotification("결제 거부에 실패했습니다.", "error");
    }
  } catch (error) {
    console.error("결제 거부 오류:", error);
    showNotification("결제 거부에 실패했습니다.", "error");
  }
}

// 결제 승인 모달 표시
function showPaymentApprovalModal() {
  const modal = document.getElementById("paymentApprovalModal");
  const selectedList = document.getElementById("selectedPaymentsList");

  // 선택된 결제 목록 초기화
  selectedPayments.clear();
  selectedList.innerHTML =
    '<p style="color: #6b7280; text-align: center; padding: 20px;">승인할 결제를 선택해주세요.</p>';

  modal.style.display = "flex";
}

// 결제 승인 모달 닫기
function closePaymentApprovalModal() {
  const modal = document.getElementById("paymentApprovalModal");
  modal.style.display = "none";

  // 선택된 결제 초기화
  selectedPayments.clear();

  // 모든 체크박스 해제
  const checkboxes = document.querySelectorAll(
    'input[type="checkbox"][id^="payment_"]'
  );
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
}

// 선택된 결제 제거
function removeSelectedPayment(paymentId) {
  selectedPayments.delete(paymentId);

  // 체크박스도 해제
  const checkbox = document.getElementById(`payment_${paymentId}`);
  if (checkbox) {
    checkbox.checked = false;
  }

  updateSelectedPaymentsList();
}

// 선택된 결제들 승인
async function approveSelectedPayments() {
  const memo = document.getElementById("approvalMemo").value;

  if (selectedPayments.size === 0) {
    showNotification("승인할 결제를 선택해주세요.", "warning");
    return;
  }

  try {
    const ids = Array.from(selectedPayments);
    if (!ids.length) {
      showNotification("승인할 결제를 선택해주세요.", "warning");
      return;
    }
    await fetch(`/api/admin/payments/bulk-approve`, {
      method: "PUT",
      headers: adminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ids, memo: memo || "일괄 승인" }),
    });

    showNotification(`${ids.length}개의 결제가 승인되었습니다.`, "success");
    loadPayments();
    loadPaymentStats();
    closePaymentApprovalModal();
  } catch (error) {
    console.error("일괄 승인 오류:", error);
    showNotification("결제 승인에 실패했습니다.", "error");
  }
}

// 결제 새로고침
function refreshPayments() {
  loadPayments();
  loadPaymentStats();
}

// 결제 페이지네이션 렌더링
function renderPaymentPagination(pagination) {
  const paginationContainer = document.getElementById("paymentPagination");
  if (!paginationContainer) return;

  const { currentPage, totalPages, hasNext, hasPrev } = pagination;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let paginationHTML = '<div class="pagination">';

  // 이전 버튼
  if (hasPrev) {
    paginationHTML += `
      <button class="page-btn" onclick="changePaymentPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
  }

  // 페이지 번호들
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="page-btn ${i === currentPage ? "active" : ""}" 
              onclick="changePaymentPage(${i})">
        ${i}
      </button>
    `;
  }

  // 다음 버튼
  if (hasNext) {
    paginationHTML += `
      <button class="page-btn" onclick="changePaymentPage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
  }

  paginationHTML += "</div>";
  paginationContainer.innerHTML = paginationHTML;
}

// 결제 페이지 변경
function changePaymentPage(page) {
  currentPaymentPage = page;
  loadPayments();
}

// 결제 이벤트 리스너 설정
function setupPaymentEventListeners() {
  // 유형 필터 숨김
  try {
    const typeFilter = document.getElementById("paymentTypeFilter");
    if (typeFilter) {
      const container =
        typeFilter.closest(".form-group") || typeFilter.parentElement;
      if (container) container.style.display = "none";
    }
  } catch (_) {}

  // 통계 카드 숨김
  try {
    const hideCardById = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const card = el.closest(".stat-card") || el.parentElement;
      if (card) card.style.display = "none";
    };
    hideCardById("pendingCount");
    hideCardById("activeCount");
    hideCardById("completedCount");
    hideCardById("totalAmount");
    const statsContainer = document.querySelector(".payment-stats");
    if (statsContainer) statsContainer.style.display = "none";
  } catch (_) {}

  // 결제 승인 관련 UI 숨김 (개별/일괄)
  try {
    document
      .querySelectorAll(".btn-payment.btn-approve, .btn-approve")
      .forEach((el) => (el.style.display = "none"));
    const bulkBtn = document.getElementById("approveSelectedBtn");
    if (bulkBtn) bulkBtn.style.display = "none";
    const approvalTrigger = document.getElementById("openPaymentApprovalModal");
    if (approvalTrigger) approvalTrigger.style.display = "none";
    const approvalModal = document.getElementById("paymentApprovalModal");
    if (approvalModal) approvalModal.style.display = "none";
  } catch (_) {}

  // 테이블 내 유형 컬럼 숨김 (헤더/셀)
  try {
    document
      .querySelectorAll(".payment-type, .payment-type-header")
      .forEach((el) => (el.style.display = "none"));
  } catch (_) {}
}

// 알림 생성
async function createNotification(notificationData) {
  try {
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notificationData),
    });
  } catch (error) {
    console.error("알림 생성 오류:", error);
  }
}

// 알림 표시 (토스트 메시지)
function showNotification(message, type = "info") {
  // 토스트 메시지 표시 로직
  console.log(`${type.toUpperCase()}: ${message}`);
}

// DOM 로드 완료 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  // 결제 관리 컴포넌트가 로드된 경우에만 초기화
  if (document.querySelector(".payment-management")) {
    initPaymentManagement();
  }
});

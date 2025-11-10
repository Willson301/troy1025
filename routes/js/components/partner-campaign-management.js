// 공통 패딩 적용 함수 사용
let allPartnerCampaigns = [];

function applySearch() {
  const input = document.querySelector(".search-input");
  const keyword = (input?.value || "").trim().toLowerCase();
  const items = document.querySelectorAll(".campaign-item");
  items.forEach((item) => {
    const text = item.textContent?.toLowerCase() || "";
    item.style.display = keyword && !text.includes(keyword) ? "none" : "";
  });
}

function resetSearch() {
  const input = document.querySelector(".search-input");
  if (input) input.value = "";
  const items = document.querySelectorAll(".campaign-item");
  items.forEach((item) => (item.style.display = ""));
}

// 간편등록 모달 표시
function showQuickRegisterModal() {
  const modal = document.getElementById("quickRegisterModal");
  if (modal) {
    modal.style.display = "block";
  }
}

// 간편등록 모달 숨김
function hideQuickRegisterModal() {
  const modal = document.getElementById("quickRegisterModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// 간편등록 폼 제출
function submitQuickRegister(event) {
  event.preventDefault();
  alert("간편 캠페인이 등록되었습니다!");
  hideQuickRegisterModal();
}

// 가격 계산 업데이트
function updatePriceCalculation() {
  const productPrice = parseInt(
    document.getElementById("productPrice")?.value || 0
  );
  const recruitCount = parseInt(
    document.getElementById("recruitCount")?.value || 0
  );

  const commissionCost = recruitCount * 3000;
  const productCost = productPrice * recruitCount;
  const totalCost = commissionCost + productCost;

  const commissionCostElement = document.getElementById("commissionCost");
  const productCostElement = document.getElementById("productCost");
  const totalCostElement = document.getElementById("totalCost");

  if (commissionCostElement)
    commissionCostElement.textContent = commissionCost.toLocaleString() + "원";
  if (productCostElement)
    productCostElement.textContent = productCost.toLocaleString() + "원";
  if (totalCostElement)
    totalCostElement.textContent = totalCost.toLocaleString() + "원";
}

// 이미지 미리보기
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const imagePreview = document.getElementById("imagePreview");
      if (imagePreview) {
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="제품 이미지">`;
      }
    };
    reader.readAsDataURL(file);
  }
}

function getToken() {
  try {
    if (typeof getRoleSessionToken === "function") {
      const t = getRoleSessionToken("partner");
      if (t && t.trim() !== "") return t;
    }
  } catch (_) {}
  try {
    // 현재 창 저장소 우선
    let t =
      sessionStorage.getItem("troy_token_partner") ||
      localStorage.getItem("troy_token_partner") ||
      localStorage.getItem("troy_token");
    if (t && t.trim() !== "") return t;
    // 부모 창 저장소 (same-origin 가정)
    try {
      if (window.parent && window.parent !== window) {
        t =
          window.parent.sessionStorage.getItem("troy_token_partner") ||
          window.parent.localStorage.getItem("troy_token_partner") ||
          window.parent.localStorage.getItem("troy_token");
      }
    } catch (_) {}
    if (t && t.trim() !== "") return t;
    return t || "";
  } catch (_) {
    return "";
  }
}

function bindPartnerCampaignManagementEvents() {
  const searchBtn = document.querySelector(".search-btn");
  const resetBtn = document.querySelector(".reset-btn");
  searchBtn?.addEventListener("click", applySearch);
  resetBtn?.addEventListener("click", resetSearch);

  // 가격 계산 이벤트
  const productPriceInput = document.getElementById("productPrice");
  const recruitCountInput = document.getElementById("recruitCount");

  if (productPriceInput) {
    productPriceInput.addEventListener("input", updatePriceCalculation);
  }

  if (recruitCountInput) {
    recruitCountInput.addEventListener("input", updatePriceCalculation);
  }

  // 이미지 업로드 이벤트
  const imageInput = document.getElementById("productImage");
  if (imageInput) {
    imageInput.addEventListener("change", handleImageUpload);
  }

  // 모달 외부 클릭으로 닫히지 않도록 처리 (닫기 버튼으로만 닫힘)
  const modal = document.getElementById("quickRegisterModal");
  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        // 의도적으로 아무 동작도 하지 않음
        event.stopPropagation();
      }
    });
  }
}

// 파트너 캠페인 데이터 로드
async function loadPartnerCampaigns() {
  try {
    const token = getToken();
    if (!token) {
      console.log("토큰이 없습니다.");
      return;
    }

    const response = await fetch("/api/auth/my-campaigns", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.campaigns) {
      allPartnerCampaigns = data.campaigns;
      renderPartnerCampaigns(data.campaigns);
    }
  } catch (error) {
    console.error("파트너 캠페인 로드 오류:", error);
  }
}

function getTypeInfo(type) {
  const m = {
    product: { text: "제품형", cls: "type-product" },
    traffic: { text: "유입형", cls: "type-traffic" },
    content: { text: "콘텐츠형", cls: "type-content" },
    review: { text: "리뷰", cls: "type-review" },
    sns: { text: "SNS", cls: "type-sns" },
    search: { text: "검색", cls: "type-search" },
    shopping: { text: "쇼핑", cls: "type-shopping" },
  };
  return m[type] || { text: type || "일반", cls: "type-default" };
}

// 캠페인 상태를 통계 카테고리로 매핑
function mapCampaignStatus(status) {
  const s = (status || "").toString().toLowerCase();
  if (s === "completed") return "completed";
  if (s === "active" || s === "approved") return "progress";
  if (s === "pending" || s === "draft" || s === "scheduled") return "scheduled";
  return "scheduled"; // 기본값
}

function getStatusInfo(status) {
  const m = {
    draft: { text: "임시", color: "#9ca3af" },
    pending: { text: "승인대기", color: "#f59e0b" },
    approved: { text: "승인완료", color: "#10b981" },
    active: { text: "진행중", color: "#3b82f6" },
    completed: { text: "완료", color: "#6b7280" },
    cancelled: { text: "취소", color: "#ef4444" },
    rejected: { text: "반려", color: "#ef4444" },
  };
  return m[status] || { text: status || "-", color: "#666" };
}

function safeDateRange(c) {
  const s = c.start_date || c.created_at || c.date;
  const e = c.end_date || c.endDate || c.created_at || c.date;
  const fs = s ? new Date(s).toLocaleDateString("ko-KR") : "-";
  const fe = e ? new Date(e).toLocaleDateString("ko-KR") : "-";
  return `${fs} ~ ${fe}`;
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return "orange";
  if (s === "approved") return "green";
  if (s === "active") return "blue";
  if (s === "completed") return "green";
  if (s === "rejected" || s === "cancelled") return "red";
  return "blue";
}

// 파트너 캠페인 목록 렌더링 (대행사 스타일 + 파트너 CSS 호환)
function renderPartnerCampaigns(campaigns) {
  const list = document.querySelector(".campaign-list");
  if (!list) return;

  if (!Array.isArray(campaigns) || campaigns.length === 0) {
    list.innerHTML = `
      <div class="campaign-item empty-message">
        <div style="grid-column:1/-1;text-align:center;padding:24px;color:#666;">등록된 캠페인이 없습니다.</div>
      </div>`;
    return;
  }

  list.querySelectorAll(".campaign-item").forEach((n) => n.remove());

  const itemsHTML = campaigns
    .map((c) => {
      const imgSrc = c.thumbnail_url || c.image_url || "";
      const brand = c.brand_name || c.company_name || "";
      const titleRaw =
        c.product_title || c.title || c.campaign_name || "캠페인";
      const title =
        titleRaw.length > 25 ? titleRaw.substring(0, 25) + "..." : titleRaw;
      const typeInfo = getTypeInfo(c.campaign_type);
      const statusInfo = getStatusInfo(c.status);
      const qty = c.recruit_count || c.quantity || c.qty || 0;
      const dateRange = safeDateRange(c);
      const codeOrId = c.campaign_code || c.id || "-";
      const infoDesc = c.short_desc || c.description || c.memo || "";
      const channelBadge =
        '<span class="channel-badge coupang"><span class="cou">cou</span><span class="p">p</span><span class="a">a</span><span class="n">n</span><span class="g">g</span></span>';
      const badgeCls = statusBadgeClass(c.status);

      return `
      <div class="campaign-item" data-status="${mapCampaignStatus(c.status)}">
        <div class="campaign-cell">
          ${
            imgSrc
              ? `<img src="${imgSrc}" alt="이미지" style="width:120px;height:120px;object-fit:cover;border-radius:4px;">`
              : '<div style="width:120px;height:120px;background:#f5f5f5;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#999;">이미지</div>'
          }
        </div>
        <div class="campaign-cell campaign-info">
          <div class="info-title-wrapper">
            <div class="info-title">${brand} ${title}</div>
          </div>
          <div class="info-meta">
            <div class="info-code">CODE: ${codeOrId}</div>
          </div>
          <div class="info-desc">${infoDesc || "-"}</div>
        </div>
        <div class="campaign-cell">${channelBadge}</div>
        <div class="campaign-cell"><span class="type-badge ${typeInfo.cls}">${
        typeInfo.text
      }</span></div>
        <div class="campaign-cell" style="color:${
          statusInfo.color
        };font-weight:700;">${statusInfo.text}</div>
        <div class="campaign-cell">0/${qty}</div>
        <div class="campaign-cell">${dateRange}</div>
        <div class="campaign-cell campaign-actions">
          <div class="button-container agency-detail-btn-container" style="position:relative;display:inline-block;">
            <button class="space-button" data-id="${
              c.id
            }" data-campaign-id="${codeOrId}">
              <div class="bright-particles"></div>
              <span>상세</span>
            </button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  list.insertAdjacentHTML("beforeend", itemsHTML);

  // 통계 카드 업데이트
  updatePartnerStatistics();

  // 상세 버튼 클릭 이벤트 위임 바인딩
  if (!list.dataset.boundClick) {
    list.addEventListener("click", function (e) {
      const detailBtn = e.target.closest(".space-button");
      if (!detailBtn) return;
      const id = detailBtn.getAttribute("data-id");
      if (!id) return;
      viewCampaignDetail(id);
    });
    list.dataset.boundClick = "1";
  }
}

// 통계 업데이트 함수
function updatePartnerStatistics() {
  // empty-message 클래스가 있는 요소는 제외
  const campaigns = Array.from(
    document.querySelectorAll(".campaign-item")
  ).filter((el) => !el.classList.contains("empty-message"));
  const stats = {
    total: campaigns.length,
    scheduled: 0,
    progress: 0,
    completed: 0,
  };

  campaigns.forEach((campaign) => {
    const status = campaign.getAttribute("data-status");
    if (stats.hasOwnProperty(status)) {
      stats[status]++;
    }
  });

  // 통계 카드 업데이트
  const totalEl = document.getElementById("total-count");
  const scheduledEl = document.getElementById("scheduled-count");
  const progressEl = document.getElementById("progress-count");
  const completedEl = document.getElementById("completed-count");
  if (!totalEl || !scheduledEl || !progressEl || !completedEl) return;
  totalEl.textContent = stats.total;
  scheduledEl.textContent = stats.scheduled;
  progressEl.textContent = stats.progress;
  completedEl.textContent = stats.completed;
}

// 캠페인 상태 텍스트 반환
function getCampaignStatusText(status) {
  const statusMap = {
    draft: "초안",
    pending: "승인대기",
    approved: "승인완료",
    active: "진행중",
    completed: "완료",
    cancelled: "취소",
    rejected: "반려",
  };
  return statusMap[status] || status;
}

// 캠페인 상태 클래스 반환
function getCampaignStatusClass(status) {
  const classMap = {
    draft: "status-draft",
    pending: "status-pending",
    approved: "status-approved",
    active: "status-active",
    completed: "status-completed",
    cancelled: "status-cancelled",
    rejected: "status-rejected",
  };
  return classMap[status] || "status-default";
}

// 캠페인 상세보기
async function viewCampaignDetail(campaignId) {
  // 캠페인 상세보기 모달 표시 로직
  console.log("캠페인 상세보기:", campaignId);
  const campaign = allPartnerCampaigns.find(
    (c) =>
      String(c.id) === String(campaignId) ||
      String(c.campaign_code) === String(campaignId)
  );
  if (campaign && typeof window.adoptCustomerDetailModal === "function") {
    await window.adoptCustomerDetailModal(campaign);
  } else {
    alert(`캠페인 ${campaignId} 상세보기 기능은 추후 구현 예정입니다.`);
  }
}

// 파트너 캠페인 데이터 새로고침
async function refreshPartnerCampaigns() {
  console.log("파트너 캠페인 데이터 새로고침");
  await loadPartnerCampaigns();
}

// 파트너 캠페인 관리 초기화
function initPartnerCampaignManagement() {
  console.log("파트너 캠페인 관리 페이지 초기화");

  // 공통 패딩 강제 적용
  if (typeof ensureMainContentPadding === "function") {
    ensureMainContentPadding();
  }

  bindPartnerCampaignManagementEvents();

  // 캠페인 데이터 로드
  loadPartnerCampaigns();
}

// 전역 함수로 등록
window.initPartnerCampaignManagement = initPartnerCampaignManagement;
window.refreshPartnerCampaigns = refreshPartnerCampaigns;
window.applySearch = applySearch;
window.resetSearch = resetSearch;
window.showQuickRegisterModal = showQuickRegisterModal;
window.hideQuickRegisterModal = hideQuickRegisterModal;
window.submitQuickRegister = submitQuickRegister;

// 페이지 로드 시 자동 초기화
document.addEventListener("DOMContentLoaded", function () {
  bindPartnerCampaignManagementEvents();
});

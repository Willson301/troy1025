/**
 * 파일: js/agency-dashboard.js
 * 목적: 대행사 대시보드 상호작용 제어 (통계/검색/탭/모달 등)
 */

// 캠페인 데이터 초기화 및 통계 계산
function updateStatistics() {
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

  // 통계 카드 업데이트 (요소가 없는 화면에서는 스킵)
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

// 필터링 기능: 선택된 상태만 표시
function filterCampaigns(status) {
  const campaigns = document.querySelectorAll(".campaign-item");

  campaigns.forEach((campaign) => {
    if (status === "all" || campaign.getAttribute("data-status") === status) {
      campaign.style.display = "grid";
    } else {
      campaign.style.display = "none";
    }
  });

  // 활성 상태 카드 표시
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.classList.remove("active");
  });
  document.querySelector(`[data-status="${status}"]`).classList.add("active");
}

// TROY 로고 클릭 시 홈으로 이동 (대시보드 유지)
function goToHome() {
  // 대행사 대시보드에서 TROY 로고 클릭 시 캠페인 관리 화면으로 이동
  if (typeof loadCampaignManagement === "function") {
    loadCampaignManagement();
  }
}

// 페이지 전환 함수들
function showCampaignCreate() {
  loadPageContent("campaign-create.html");
}

function showClientManagement() {
  loadClientManagementContent();
}

function showBulkCampaign() {
  loadClientManagementContent();
}

function showScheduleManagement() {
  loadScheduleManagementContent();
}

// 메인 콘텐츠 영역에 외부 페이지를 비동기 로드
function loadPageContent(url) {
  const mainContent = document.querySelector(".main-content");

  // 로딩 상태 표시
  mainContent.innerHTML = `
    <div class="loading-container" style="display: flex; justify-content: center; align-items: center; height: 400px;">
      <div class="loading-spinner" style="border: 4px solid #f3f4f6; border-top: 4px solid #255ffe; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
      <span style="margin-left: 16px; color: #64748b;">페이지를 로딩중입니다...</span>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  // 페이지 내용을 fetch로 가져와서 메인 영역에 삽입
  fetch(url)
    .then((response) => response.text())
    .then((html) => {
      // HTML에서 body 내용만 추출
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const bodyContent = doc.body.innerHTML;

      // 메인 콘텐츠 영역에 삽입
      mainContent.innerHTML = bodyContent;

      // 필요시 새로운 스크립트들 실행
      executePageScripts(doc);
    })
    .catch((error) => {
      console.error("페이지 로딩 실패:", error);
      mainContent.innerHTML = `
        <div class="error-container" style="text-align: center; padding: 40px;">
          <h3 style="color: #ef4444;">페이지 로딩에 실패했습니다</h3>
          <p style="color: #64748b;">다시 시도해 주세요.</p>
        </div>
      `;
    });
}

// 로드된 페이지의 스크립트 실행
function executePageScripts(doc) {
  const scripts = doc.querySelectorAll("script");
  scripts.forEach((script) => {
    if (script.src) {
      // 외부 스크립트 파일 로드
      const newScript = document.createElement("script");
      newScript.src = script.src;
      newScript.onload = function () {
        // 스크립트 로드 완료 후 초기화 함수 실행 시도
        if (script.src.includes("client-management.js")) {
          // client-management.js가 로드된 후 앱 초기화
          setTimeout(() => {
            if (typeof TroyBulkCampaign !== "undefined") {
              window.clientApp = new TroyBulkCampaign();
            }
          }, 100);
        }
      };
      document.head.appendChild(newScript);
    } else {
      // 인라인 스크립트 실행
      try {
        eval(script.textContent);
      } catch (error) {
        console.error("스크립트 실행 오류:", error);
      }
    }
  });
}

// 클라이언트 관리 콘텐츠를 직접 로드
function loadClientManagementContent() {
  const mainContent = document.querySelector(".main-content");

  // 로딩 상태 표시
  mainContent.innerHTML = `
    <div class="loading-container" style="display: flex; justify-content: center; align-items: center; height: 400px;">
      <div class="loading-spinner" style="border: 4px solid #f3f4f6; border-top: 4px solid #255ffe; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
      <span style="margin-left: 16px; color: #64748b;">클라이언트 관리 페이지를 로딩중입니다...</span>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  // 0.5초 후 실제 콘텐츠 로드
  setTimeout(() => {
    mainContent.innerHTML = getClientManagementHTML();

    // CSS 파일 로드
    if (!document.querySelector('link[href="client-management.css"]')) {
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "client-management.css";
      document.head.appendChild(cssLink);
    }

    // 이벤트 리스너를 직접 바인딩
    bindClientManagementEvents();
  }, 500);
}

// 클라이언트 관리 HTML 콘텐츠 (troy-bulk-campaign.html에서 추출)
function getClientManagementHTML() {
  return `
<div class="header">
    <h1 class="page-title">클라이언트 관리</h1>
    <p class="page-subtitle">클라이언트와 대량 캠페인을 효율적으로 관리하세요</p>
</div>

<!-- Agency Dashboard Section -->
<section id="agency-dashboard-section" class="section active">
    <div class="section-header">
        <h2>클라이언트 관리</h2>
        <button id="add-client-btn" class="btn btn-primary">+ 새 클라이언트 추가</button>
    </div>
    
    <!-- Overall Stats -->
    <div class="dashboard-stats">
        <div class="stat-card">
            <div class="stat-number" id="total-campaigns">0</div>
            <div class="stat-label">총 캠페인</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="active-campaigns">0</div>
            <div class="stat-label">진행중</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="completed-campaigns">0</div>
            <div class="stat-label">완료</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="total-reviews">0</div>
            <div class="stat-label">총 구매평</div>
        </div>
    </div>

    <!-- Client List with Combined View -->
    <div class="client-dashboard-container">
        <div class="client-list-section">
            <h3>클라이언트 목록</h3>
            <div id="client-dashboard-grid" class="client-dashboard-grid">
                <!-- Client cards with campaigns will be dynamically inserted here -->
            </div>
        </div>
    </div>
</section>

<!-- Individual Client Dashboard Section -->
<section id="client-detail-section" class="section">
    <div class="section-header">
        <div class="header-left">
            <button id="back-to-dashboard" class="btn btn-secondary">← 클라이언트 목록으로</button>
            <h2 id="client-detail-name">클라이언트 상세</h2>
        </div>
        <div class="dashboard-actions">
            <button id="client-management-btn" class="btn btn-outline">클라이언트 관리</button>
            <button id="single-campaign-btn" class="btn btn-outline">캠페인 등록</button>
            <button id="bulk-campaign-btn" class="btn btn-primary">대량 캠페인 등록</button>
        </div>
    </div>
    
    <div class="dashboard-stats">
        <div class="stat-card">
            <div class="stat-number" id="client-total-campaigns">0</div>
            <div class="stat-label">총 캠페인</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="client-active-campaigns">0</div>
            <div class="stat-label">진행중</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="client-completed-campaigns">0</div>
            <div class="stat-label">완료</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="client-total-reviews">0</div>
            <div class="stat-label">총 구매평</div>
        </div>
    </div>

    <div class="campaign-table-container">
        <table id="campaign-table" class="campaign-table">
            <thead>
                <tr>
                    <th>그룹</th>
                    <th>상품명</th>
                    <th>상품 이미지</th>
                    <th>가격</th>
                    <th>목표 유입수</th>
                    <th>진행률</th>
                    <th>상태</th>
                    <th>등록일</th>
                </tr>
            </thead>
            <tbody id="campaign-tbody">
                <!-- Campaign rows will be dynamically inserted here -->
            </tbody>
        </table>
    </div>
</section>

<!-- Add Client Modal -->
<div id="add-client-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>새 클라이언트 추가</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <form id="add-client-form">
                <div class="form-group">
                    <label for="client-name-input">업체명</label>
                    <input type="text" id="client-name-input" required>
                </div>
                <div class="form-group">
                    <label for="client-business-name-input">사업자명</label>
                    <input type="text" id="client-business-name-input" required placeholder="대표자 또는 회사명">
                </div>
                <div class="form-group">
                    <label for="client-url-input">대표 URL</label>
                    <input type="url" id="client-url-input" required>
                </div>
                <div class="form-group">
                    <label for="client-business-input">사업자등록번호</label>
                    <input type="text" id="client-business-input" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary modal-close">취소</button>
                    <button type="submit" class="btn btn-primary">추가</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Client Management Modal -->
<div id="client-management-modal" class="modal">
    <div class="modal-content large">
        <div class="modal-header">
            <h3>클라이언트 관리</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="client-management-content">
                <div class="current-client-info">
                    <h4>현재 클라이언트 정보</h4>
                    <div class="client-details">
                        <div class="detail-row">
                            <span class="detail-label">업체명:</span>
                            <span class="detail-value" id="current-client-name">-</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">사업자명:</span>
                            <span class="detail-value" id="current-business-name">-</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">사업자번호:</span>
                            <span class="detail-value" id="current-business-number">-</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">대표 URL:</span>
                            <span class="detail-value" id="current-client-url">-</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">등록일:</span>
                            <span class="detail-value" id="current-created-date">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="client-actions">
                    <h4>관리 메뉴</h4>
                    <div class="action-buttons">
                        <button id="edit-client-btn" class="btn btn-outline">클라이언트 정보 수정</button>
                        <button id="export-campaigns-btn" class="btn btn-outline">캠페인 데이터 내보내기</button>
                        <button id="reset-client-data-btn" class="btn btn-outline">캠페인 데이터 초기화</button>
                        <button id="delete-client-btn" class="btn btn-danger">클라이언트 삭제</button>
                    </div>
                </div>
                
                <div class="client-statistics">
                    <h4>통계 요약</h4>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-title">총 캠페인</div>
                            <div class="stat-number" id="mgmt-total-campaigns">0</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-title">진행중</div>
                            <div class="stat-number" id="mgmt-active-campaigns">0</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-title">완료</div>
                            <div class="stat-number" id="mgmt-completed-campaigns">0</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-title">목표 유입</div>
                            <div class="stat-number" id="mgmt-target-traffic">0</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-title">완료 유입</div>
                            <div class="stat-number" id="mgmt-completed-traffic">0</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-title">집행률</div>
                            <div class="stat-number" id="mgmt-execution-rate">0%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Bulk Campaign Modal -->
<div id="bulk-campaign-modal" class="modal">
    <div class="modal-content large">
        <div class="modal-header">
            <h3>대량 캠페인 등록</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="bulk-form-container">
                <div class="bulk-form-left">
                    <div class="form-header">
                        <h4>상품 URL 등록</h4>
                        <button type="button" id="add-url-row-btn" class="btn btn-outline btn-sm">+ 추가</button>
                    </div>
                    <div class="url-inputs-container" id="url-inputs-container">
                        <div class="url-input-row" data-index="1">
                            <div class="row-header">
                                <span class="row-number">1</span>
                                <button type="button" class="remove-row-btn" style="display: none;">×</button>
                            </div>
                            <input type="url" class="url-input" placeholder="https://example.com/product1">
                            <div class="traffic-section">
                                <label class="traffic-label">유입수</label>
                                <input type="number" class="traffic-input" value="200" min="1" max="9999">
                                <span class="unit">개</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="bulk-form-right">
                    <div class="cart-container">
                        <div class="cart-header">
                            <h4>🛒 캠페인 장바구니</h4>
                            <div class="cart-info">제품가격 × 유입수 × 2,500원 = 캠페인 비용</div>
                        </div>
                        
                        <div class="cart-items" id="cart-items">
                            <div class="empty-cart">
                                <div class="empty-icon">📝</div>
                                <div class="empty-text">등록할 캠페인을 추가해주세요</div>
                            </div>
                        </div>
                        
                        <div class="cart-summary">
                            <div class="summary-row">
                                <span class="summary-label">총 캠페인</span>
                                <span class="summary-value" id="cart-campaign-count">0개</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">총 유입수</span>
                                <span class="summary-value" id="cart-total-traffic">0개</span>
                            </div>
                            <div class="summary-divider"></div>
                            <div class="summary-row total">
                                <span class="summary-label">총 결제금액</span>
                                <span class="summary-value" id="cart-total-price">0원</span>
                            </div>
                        </div>
                        
                        <div class="deposit-section">
                            <div class="deposit-row">
                                <span class="deposit-label">보유 예치금</span>
                                <span class="deposit-amount" id="deposit-balance">1,000,000원</span>
                            </div>
                            <div class="deposit-row">
                                <span class="deposit-label">결제 후 잔액</span>
                                <span class="remaining-amount" id="remaining-balance">1,000,000원</span>
                            </div>
                        </div>
                        
                        <div class="cart-actions">
                            <button type="button" id="preview-btn" class="btn btn-outline btn-sm">미리보기</button>
                            <button type="button" id="bulk-register-btn" class="btn btn-primary btn-block" disabled>
                                예치금으로 결제
                            </button>
                            <button type="button" id="charge-deposit-btn" class="btn btn-warning btn-block" style="display: none;">
                                예치금 충전하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="preview-section" class="preview-section" style="display: none;">
                <h4>스크래핑 결과 미리보기</h4>
                <div id="preview-grid" class="preview-grid">
                    <!-- Preview items will be dynamically inserted here -->
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Quick Campaign Modal -->
<div id="quick-campaign-modal" class="modal">
    <div class="modal-content medium">
        <div class="modal-header">
            <h3>간편 캠페인 등록</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="quick-campaign-form">
                <!-- URL Input Section -->
                <div class="url-section">
                    <div class="form-group">
                        <label for="quick-campaign-url">쿠팡 상품 URL</label>
                        <div class="url-input-wrapper">
                            <input type="url" id="quick-campaign-url" placeholder="https://www.coupang.com/vp/products/..." required>
                            <button type="button" id="quick-extract-btn" class="btn btn-outline btn-sm">추출</button>
                        </div>
                    </div>
                </div>

                <!-- Product Info Section -->
                <div id="quick-product-info" class="product-info-section" style="display: none;">
                    <h4>상품 정보</h4>
                    <div class="product-card">
                        <div class="product-image">
                            <img id="quick-product-image" src="" alt="상품 이미지">
                        </div>
                        <div class="product-details">
                            <div class="product-title" id="quick-product-title">-</div>
                            <div class="product-brand" id="quick-product-brand">-</div>
                            <div class="product-price" id="quick-product-price">-</div>
                        </div>
                    </div>

                    <!-- Campaign Settings -->
                    <div class="campaign-settings">
                        <!-- Product Info Tags -->
                        <div class="form-group">
                            <div class="product-tags">
                                <span class="product-tag brand-tag" id="quick-brand-tag">브랜드명</span>
                                <span class="product-tag product-tag-name" id="quick-product-tag">제품명</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>서비스 목록</label>
                            <div class="service-options">
                                <label class="checkbox-label">
                                    <input type="checkbox" value="로켓배송구매평" checked>
                                    <span class="checkmark"></span>
                                    로켓배송구매평
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" value="포토구매평">
                                    <span class="checkmark"></span>
                                    포토구매평
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" value="가구매평">
                                    <span class="checkmark"></span>
                                    가구매평
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="quick-target-traffic">목표 유입수</label>
                            <input type="number" id="quick-target-traffic" value="200" min="1" max="9999">
                            <span class="unit">개</span>
                        </div>

                        <!-- Price Calculation -->
                        <div class="price-calculation">
                            <div class="calc-row">
                                <span>제품가격 × 유입수</span>
                                <span id="quick-product-cost">0원</span>
                            </div>
                            <div class="calc-row">
                                <span>캠페인비용 (2,500원 × 유입수)</span>
                                <span id="quick-review-cost">500,000원</span>
                            </div>
                            <div class="calc-divider"></div>
                            <div class="calc-row total">
                                <span>총 캠페인 비용</span>
                                <span id="quick-total-cost">500,000원</span>
                            </div>
                        </div>

                        <!-- Campaign Actions -->
                        <div class="campaign-actions">
                            <div class="deposit-info">
                                <span>보유 예치금: <strong id="quick-current-deposit">1,000,000원</strong></span>
                                <span>결제 후 잔액: <strong id="quick-remaining-deposit">500,000원</strong></span>
                            </div>
                            <div class="action-buttons">
                                <button type="button" id="quick-register-btn" class="btn btn-primary btn-block">
                                    예치금으로 캠페인 등록
                                </button>
                                <button type="button" id="quick-charge-btn" class="btn btn-warning btn-block" style="display: none;">
                                    예치금 충전하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Loading Overlay -->
<div id="loading-overlay" class="loading-overlay" style="display: none;">
    <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">상품 정보를 가져오는 중...</div>
        <div class="loading-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%;"></div>
            </div>
            <div class="progress-text">0 / 0</div>
        </div>
    </div>
</div>
`;
}

// 클라이언트 관리 이벤트 바인딩
function bindClientManagementEvents() {
  // 새 클라이언트 추가 버튼
  const addClientBtn = document.getElementById("add-client-btn");
  if (addClientBtn) {
    addClientBtn.addEventListener("click", function () {
      document.getElementById("add-client-modal").style.display = "block";
    });
  }

  // 모달 닫기 버튼들
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none";
    });
  });

  // 모달 외부 클릭 시 닫기
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });

  // 클라이언트 추가 폼 제출
  const addClientForm = document.getElementById("add-client-form");
  if (addClientForm) {
    addClientForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const clientName = document.getElementById("client-name-input").value;
      const businessName = document.getElementById(
        "client-business-name-input"
      ).value;
      const clientUrl = document.getElementById("client-url-input").value;
      const businessNumber = document.getElementById(
        "client-business-input"
      ).value;

      if (clientName && businessName && clientUrl && businessNumber) {
        // 클라이언트 추가 로직
        addNewClient({
          name: clientName,
          businessName: businessName,
          url: clientUrl,
          businessNumber: businessNumber,
          createdAt: new Date().toISOString(),
          totalCampaigns: 0,
          activeCampaigns: 0,
          completedCampaigns: 0,
          targetTraffic: 0,
          completedTraffic: 0,
          executionRate: 0,
        });

        // 폼 리셋 및 모달 닫기
        addClientForm.reset();
        document.getElementById("add-client-modal").style.display = "none";
      }
    });
  }

  // 대량 캠페인 등록 버튼
  const bulkCampaignBtn = document.getElementById("bulk-campaign-btn");
  if (bulkCampaignBtn) {
    bulkCampaignBtn.addEventListener("click", function () {
      document.getElementById("bulk-campaign-modal").style.display = "block";
    });
  }

  // 클라이언트 관리 버튼
  const clientManagementBtn = document.getElementById("client-management-btn");
  if (clientManagementBtn) {
    clientManagementBtn.addEventListener("click", function () {
      document.getElementById("client-management-modal").style.display =
        "block";
    });
  }

  // URL 추가 버튼
  const addUrlBtn = document.getElementById("add-url-row-btn");
  if (addUrlBtn) {
    addUrlBtn.addEventListener("click", function () {
      addUrlRow();
    });
  }

  // 미리보기 버튼
  const previewBtn = document.getElementById("preview-btn");
  if (previewBtn) {
    previewBtn.addEventListener("click", function () {
      previewUrls();
    });
  }

  // 대량 등록 버튼
  const bulkRegisterBtn = document.getElementById("bulk-register-btn");
  if (bulkRegisterBtn) {
    bulkRegisterBtn.addEventListener("click", function () {
      bulkRegisterCampaigns();
    });
  }

  console.log("클라이언트 관리 이벤트 바인딩 완료");
}

// 새 클라이언트 추가
function addNewClient(clientData) {
  const clientGrid = document.getElementById("client-dashboard-grid");
  if (!clientGrid) return;

  const clientCard = document.createElement("div");
  clientCard.className = "client-card";
  clientCard.innerHTML = `
    <div class="client-header">
      <h4>\${clientData.name}</h4>
      <span class="client-status active">활성</span>
    </div>
    <div class="client-info">
      <p>사업자: \${clientData.businessName}</p>
      <p>URL: \${clientData.url}</p>
      <p>등록일: \${new Date(clientData.createdAt).toLocaleDateString('ko-KR')}</p>
    </div>
    <div class="client-stats">
      <div class="stat-item">
        <span class="stat-label">총 캠페인</span>
        <span class="stat-value">\${clientData.totalCampaigns}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">진행중</span>
        <span class="stat-value">\${clientData.activeCampaigns}</span>
      </div>
    </div>
    <div class="client-actions">
      <button class="btn btn-outline btn-sm" onclick="viewClientDetail('\${clientData.name}')">상세보기</button>
      <button class="btn btn-primary btn-sm" onclick="showBulkCampaignModal()">대량등록</button>
    </div>
  `;

  // 기존 "새 클라이언트를 추가해주세요" 메시지 제거
  const emptyMessage = clientGrid.querySelector(
    'div[style*="text-align: center"]'
  );
  if (emptyMessage) {
    emptyMessage.remove();
  }

  clientGrid.appendChild(clientCard);

  console.log("새 클라이언트 추가됨:", clientData.name);
}

// URL 행 추가
function addUrlRow() {
  const container = document.getElementById("url-inputs-container");
  if (!container) return;

  const rowCount = container.children.length + 1;
  const newRow = document.createElement("div");
  newRow.className = "url-input-row";
  newRow.setAttribute("data-index", rowCount);

  newRow.innerHTML = `
    <div class="row-header">
      <span class="row-number">\${rowCount}</span>
      <button type="button" class="remove-row-btn" onclick="removeUrlRow(this)">×</button>
    </div>
    <input type="url" class="url-input" placeholder="https://example.com/product\${rowCount}">
    <div class="traffic-section">
      <label class="traffic-label">유입수</label>
      <input type="number" class="traffic-input" value="200" min="1" max="9999">
      <span class="unit">개</span>
    </div>
  `;

  container.appendChild(newRow);
}

// URL 행 제거
function removeUrlRow(button) {
  button.closest(".url-input-row").remove();
}

// 미리보기
function previewUrls() {
  console.log("URL 미리보기 실행");
  const previewSection = document.getElementById("preview-section");
  if (previewSection) {
    previewSection.style.display = "block";
  }
}

// 대량 캠페인 등록
function bulkRegisterCampaigns() {
  console.log("대량 캠페인 등록 실행");
  alert("대량 캠페인이 등록되었습니다!");
}

// 클라이언트 상세보기
function viewClientDetail(clientName) {
  console.log("클라이언트 상세보기:", clientName);
  // 클라이언트 상세 섹션 표시 로직 구현
}

// 대량 캠페인 모달 표시
function showBulkCampaignModal() {
  document.getElementById("bulk-campaign-modal").style.display = "block";
}

// 이벤트 리스너
document.addEventListener("DOMContentLoaded", function () {
  // 통계 초기화
  updateStatistics();

  // 통계 카드 클릭 이벤트
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.addEventListener("click", function () {
      const status = this.getAttribute("data-status");
      filterCampaigns(status);
    });
  });

  // 로그아웃 기능
  document.querySelector(".logout").addEventListener("click", function () {
    window.location.href = "/";
  });

  // 새 캠페인 등록 버튼
  document
    .querySelector(".new-campaign-btn")
    .addEventListener("click", function () {
      try {
        if (typeof openCampaignCreateModal === "function") {
          openCampaignCreateModal(); // 모달로 캠페인 등록 열기 (embedded)
          return;
        }
      } catch (_) {}
      // 모달 함수가 없으면 페이지로 로드
      showCampaignCreate();
    });

  // 메뉴 아이템 클릭 이벤트
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", function () {
      document
        .querySelectorAll(".menu-item")
        .forEach((i) => i.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // 액션 버튼 클릭 이벤트
  document.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      alert("이 기능은 준비 중입니다.");
    });
  });

  // 삭제 버튼 클릭 이벤트
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      if (confirm("정말 삭제하시겠습니까?")) {
        alert("삭제 기능은 준비 중입니다.");
      }
    });
  });

  // 검색 기능
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      const query = searchInput.value.toLowerCase();
      searchCampaigns(query);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      searchInput.value = "";
      filterCampaigns("all");
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        const query = this.value.toLowerCase();
        searchCampaigns(query);
      }
    });
  }

  // 기본으로 전체 보기
  filterCampaigns("all");
});

// 검색 기능
function searchCampaigns(query) {
  const campaigns = document.querySelectorAll(".campaign-item");

  campaigns.forEach((campaign) => {
    const title = campaign.querySelector("h3").textContent.toLowerCase();
    const id = campaign.querySelector(".campaign-id").textContent.toLowerCase();

    if (title.includes(query) || id.includes(query)) {
      campaign.style.display = "grid";
    } else {
      campaign.style.display = "none";
    }
  });
}

// ===== 인라인에서 분리된 스크립트 =====

// 클라이언트 관리 페이지 로드
function showClientManagement() {
  const mainContent = document.querySelector(".main-content");
  mainContent.innerHTML = `
    <div class="header">
      <h1 class="page-title">클라이언트 관리</h1>
      <p class="page-subtitle">클라이언트와 대량 캠페인을 효율적으로 관리하세요</p>
    </div>

    <section class="section active">
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2>클라이언트 관리</h2>
        <button id="add-client-btn" class="btn btn-primary" onclick="openAddClientModal()">+ 새 클라이언트 추가</button>
      </div>

      <div class="dashboard-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px;">
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">총 캠페인</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">진행중</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">완료</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">총 구매평</div>
        </div>
      </div>

      <div class="client-dashboard-container">
        <div class="client-list-section">
          <h3>클라이언트 목록</h3>
          <div id="client-dashboard-grid" class="client-dashboard-grid">
            <div style="text-align: center; padding: 40px; color: #64748b;">
              새 클라이언트를 추가해주세요
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 클라이언트 추가 모달 -->
    <div id="add-client-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;">
      <div class="modal-content" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3>새 클라이언트 추가</h3>
          <button onclick="closeAddClientModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <form onsubmit="addNewClient(event)">
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500;">업체명</label>
              <input type="text" id="client-name" required style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px;">
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500;">사업자명</label>
              <input type="text" id="client-business-name" required placeholder="대표자 또는 회사명" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px;">
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500;">대표 URL</label>
              <input type="url" id="client-url" required style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px;">
            </div>
            <div style="margin-bottom: 24px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500;">사업자등록번호</label>
              <input type="text" id="client-business-number" required style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px;">
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button type="button" onclick="closeAddClientModal()" style="padding: 12px 24px; border: 1px solid #d1d5db; background: white; border-radius: 8px; cursor: pointer;">취소</button>
              <button type="submit" style="padding: 12px 24px; background: #255ffe; color: white; border: none; border-radius: 8px; cursor: pointer;">추가</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

function showBulkCampaign() {
  showClientManagement(); // 같은 페이지로 이동
}

// 스케줄 관리 콘텐츠 로드
function loadScheduleManagementContent() {
  const mainContent = document.querySelector(".main-content");

  // 로딩 상태 표시
  mainContent.innerHTML = `
    <div class="loading-container" style="display: flex; justify-content: center; align-items: center; height: 400px;">
      <div class="loading-spinner" style="border: 4px solid #f3f4f6; border-top: 4px solid #255ffe; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
      <span style="margin-left: 16px; color: #64748b;">스케줄 관리 페이지를 로딩중입니다...</span>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  // 스케줄 관리 HTML과 CSS, JS를 로드
  Promise.all([
    fetch("/html/components/agency-schedule-management.html").then((response) =>
      response.text()
    ),
    fetch("/css/agency-schedule-management.css").then((response) =>
      response.text()
    ),
  ])
    .then(([htmlContent, cssContent]) => {
      // CSS 스타일 추가
      const styleElement = document.createElement("style");
      styleElement.textContent = cssContent;
      document.head.appendChild(styleElement);

      // HTML 콘텐츠 삽입
      mainContent.innerHTML = htmlContent;

      // JavaScript 파일 로드
      const scriptElement = document.createElement("script");
      scriptElement.src = "/js/components/agency-schedule-management.js";
      scriptElement.onload = () => {
        // 스케줄 관리 초기화
        if (typeof initAgencyScheduleManagement === "function") {
          initAgencyScheduleManagement();
        }
      };
      document.head.appendChild(scriptElement);
    })
    .catch((error) => {
      console.error("스케줄 관리 페이지 로드 오류:", error);
      mainContent.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <h3>페이지 로드 오류</h3>
        <p>스케줄 관리 페이지를 불러오는데 실패했습니다.</p>
        <button onclick="loadScheduleManagementContent()" style="padding: 12px 24px; background: #255ffe; color: white; border: none; border-radius: 8px; cursor: pointer;">다시 시도</button>
      </div>
    `;
    });
}

// 모달 관련 함수들
function openAddClientModal() {
  document.getElementById("add-client-modal").style.display = "block";
}

function closeAddClientModal() {
  document.getElementById("add-client-modal").style.display = "none";
}

function addNewClient(event) {
  event.preventDefault();

  const clientName = document.getElementById("client-name").value;
  const businessName = document.getElementById("client-business-name").value;
  const clientUrl = document.getElementById("client-url").value;
  const businessNumber = document.getElementById(
    "client-business-number"
  ).value;

  // 새 클라이언트 카드 추가
  const clientGrid = document.getElementById("client-dashboard-grid");
  const emptyMessage = clientGrid.querySelector(
    'div[style*="text-align: center"]'
  );
  if (emptyMessage) {
    emptyMessage.remove();
  }

  const clientCard = document.createElement("div");
  clientCard.style.cssText =
    "background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);";
  clientCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h4 style="margin: 0; color: #1f2937;">\${clientName}</h4>
      <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">활성</span>
    </div>
    <div style="margin-bottom: 16px;">
      <p style="margin: 4px 0; color: #6b7280;">사업자: \${businessName}</p>
      <p style="margin: 4px 0; color: #6b7280;">URL: \${clientUrl}</p>
      <p style="margin: 4px 0; color: #6b7280;">등록일: \${new Date().toLocaleDateString('ko-KR')}</p>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
      <div style="text-align: center;">
        <div style="font-size: 18px; font-weight: bold; color: #255ffe;">0</div>
        <div style="font-size: 12px; color: #6b7280;">총 캠페인</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 18px; font-weight: bold; color: #f59e0b;">0</div>
        <div style="font-size: 12px; color: #6b7280;">진행중</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="viewClientDetail('\${clientName}')" style="flex: 1; padding: 8px 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;">상세보기</button>
      <button onclick="openBulkCampaignModal()" style="flex: 1; padding: 8px 12px; background: #255ffe; color: white; border: none; border-radius: 6px; cursor: pointer;">대량등록</button>
    </div>
  `;

  clientGrid.appendChild(clientCard);

  // 폼 리셋 및 모달 닫기
  event.target.reset();
  closeAddClientModal();
}

function viewClientDetail(clientName) {
  alert('클라이언트 "' + clientName + '" 상세페이지로 이동합니다.');
}

function openBulkCampaignModal() {
  alert("대량 캠페인 등록 모달을 준비 중입니다.");
}

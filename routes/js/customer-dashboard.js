// TROY 로고 클릭 시 홈으로 이동 (로그인 상태 유지)
function goToHome() {
  if (typeof loadCustomerCampaign === "function") {
    loadCustomerCampaign();
  }
}

// 공지사항 페이지로 이동
function showNoticeBoard() {
  window.location.href = "notice-board.html";
}

// 서비스 소개 페이지로 이동
function showServiceInfo() {
  window.location.href = "service-info.html";
}

// 스케줄 관리 페이지로 이동 - dashboard-common.js의 loadCustomerScheduleManagement 사용
function showScheduleManagement() {
  if (typeof loadCustomerScheduleManagement === "function") {
    loadCustomerScheduleManagement();
  }
}

// ===== 고객사 캠페인 현황 (실데이터 연동) =====
function getCustomerToken() {
  try {
    if (typeof getRoleSessionToken === "function") {
      const t = getRoleSessionToken("customer");
      if (t && t.trim() !== "") return t;
    }
  } catch (_) {}
  try {
    let t =
      sessionStorage.getItem("troy_token_customer") ||
      localStorage.getItem("troy_token_customer") ||
      localStorage.getItem("troy_token");
    if (t && t.trim() !== "") return t;
  } catch (_) {}
  return "";
}

async function fetchMyCampaigns() {
  const token = getCustomerToken();
  if (!token) return [];
  const res = await fetch("/api/auth/my-campaigns", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || data?.error) return [];
  return Array.isArray(data.campaigns) ? data.campaigns : [];
}

function mapType(type) {
  const m = {
    product: "제품형",
    traffic: "유입형",
    content: "콘텐츠형",
    review: "리뷰",
    sns: "SNS",
    search: "검색",
    shopping: "쇼핑",
  };
  return m[type] || type || "일반";
}

function getTypeLabelInfo(type) {
  const t = (type || "").toString().toLowerCase();
  if (t === "product") return { text: "제품형", cls: "type-product" };
  if (t === "traffic") return { text: "유입형", cls: "type-traffic" };
  if (t === "content") return { text: "콘텐츠형", cls: "type-content" };
  return { text: type || "-", cls: "type-default" };
}
function mapStatus(status) {
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
function dateRange(c) {
  const s = c.start_date || c.created_at || c.date;
  const e = c.end_date || c.created_at || c.date;
  const fs = s ? new Date(s).toLocaleDateString("ko-KR") : "-";
  const fe = e ? new Date(e).toLocaleDateString("ko-KR") : "-";
  return `${fs} ~ ${fe}`;
}

let customerCampaignsAll = [];

function renderCustomerCampaigns(items) {
  customerCampaignsAll = Array.isArray(items) ? items : [];
  const main = document.querySelector(".main-content");
  if (!main) return;

  const stats = (() => {
    const total = customerCampaignsAll.length;
    const pending = customerCampaignsAll.filter(
      (c) => String(c.status).toLowerCase() === "pending"
    ).length;
    const active = customerCampaignsAll.filter(
      (c) => String(c.status).toLowerCase() === "active"
    ).length;
    const completed = customerCampaignsAll.filter(
      (c) => String(c.status).toLowerCase() === "completed"
    ).length;
    return { total, pending, active, completed };
  })();

  main.innerHTML = `
    <div class="header">
      <h1 class="page-title">고객사 대시보드</h1>
      <p class="page-subtitle">캠페인 현황을 한눈에 확인하고 효율적으로 관리하세요</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card" data-status="all">
        <div class="stat-number">${stats.total}</div>
        <div class="stat-label">전체</div>
      </div>
      <div class="stat-card" data-status="scheduled">
        <div class="stat-number">${stats.pending}</div>
        <div class="stat-label">예정</div>
      </div>
      <div class="stat-card" data-status="progress">
        <div class="stat-number">${stats.active}</div>
        <div class="stat-label">진행중</div>
      </div>
      <div class="stat-card" data-status="completed">
        <div class="stat-number">${stats.completed}</div>
        <div class="stat-label">완료</div>
      </div>
    </div>
    <div class="search-section">
      <div class="search-controls">
        <input id="cust-camp-search" type="text" class="search-input" placeholder="캠페인 제목검색"/>
        <button id="cust-camp-search-btn" class="search-btn">검색</button>
        <button id="cust-camp-reset-btn" class="reset-btn">초기화</button>
      </div>
      <div class="notice-box">
        고객사 계정으로 관리 중인 캠페인입니다. 진행 상황과 결과를 실시간으로 확인하실 수 있습니다.
      </div>
    </div>
    <div class="campaign-list">
      <div class="campaign-header">
        <div data-label="이미지">이미지</div>
        <div data-label="캠페인 정보">캠페인 정보</div>
        <div data-label="리뷰플랫폼">플랫폼</div>
        <div data-label="유형">유형</div>
        <div data-label="상태">상태</div>
        <div data-label="현황">현황</div>
        <div data-label="제출/선정">제출/선정</div>
        <div data-label="상세">상세</div>
      </div>
      <div id="customerCampaignBody"></div>
    </div>`;

  const body = main.querySelector("#customerCampaignBody");
  const draw = (list) => {
    if (!body) return;
    if (!list.length) {
      body.innerHTML =
        '<div class="campaign-item empty-message"><div style="grid-column:1/-1;text-align:center;padding:24px;color:#666;">등록된 캠페인이 없습니다.</div></div>';
      return;
    }
    body.innerHTML = list
      .map((c) => {
        const imgSrc = c.thumbnail_url || c.image_url || "";
        const brand = c.brand_name || c.company_name || "";
        const titleRaw =
          c.product_title || c.title || c.campaign_name || "캠페인";
        const title =
          titleRaw.length > 25 ? titleRaw.substring(0, 25) + "..." : titleRaw;
        const status = mapStatus(c.status);
        const qty = c.recruit_count || c.quantity || c.qty || 0;
        const dr = dateRange(c);
        const code = c.campaign_code || c.id || "-";
        const typeInfo = getTypeLabelInfo(c.campaign_type);
        const channelBadge =
          '<span class="channel-badge coupang"><span class="cou">cou</span><span class="p">p</span><span class="a">a</span><span class="n">n</span><span class="g">g</span></span>';
        return `
        <div class="campaign-item">
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
              <div class="info-code">CODE: ${code}</div>
            </div>
            <div class="info-desc"></div>
          </div>
          <div class="campaign-cell">${channelBadge}</div>
          <div class="campaign-cell"><span class="type-badge ${typeInfo.cls}">${
          typeInfo.text
        }</span></div>
          <div class="campaign-cell" style="color:${
            status.color
          };font-weight:700;">${status.text}</div>
          <div class="campaign-cell">0/${qty}</div>
          <div class="campaign-cell">${dr}</div>
          <div class="campaign-cell campaign-actions">
            <div class="button-container agency-detail-btn-container" style="position:relative;display:inline-block;">
              <button class="space-button" data-id="${
                c.id
              }" data-campaign-id="${code}">
                <div class="bright-particles"></div>
                <span>상세</span>
              </button>
            </div>
          </div>
        </div>`;
      })
      .join("");
  };

  const apply = () => {
    const q = (document.getElementById("cust-camp-search")?.value || "")
      .trim()
      .toLowerCase();
    if (!q) return draw(customerCampaignsAll);
    const filtered = customerCampaignsAll.filter((c) => {
      const brand = (c.brand_name || c.company_name || "").toLowerCase();
      const title = (
        c.product_title ||
        c.title ||
        c.campaign_name ||
        ""
      ).toLowerCase();
      const code = String(c.campaign_code || c.id || "-").toLowerCase();
      return brand.includes(q) || title.includes(q) || code.includes(q);
    });
    draw(filtered);
  };

  document
    .getElementById("cust-camp-search-btn")
    ?.addEventListener("click", apply);
  document
    .getElementById("cust-camp-reset-btn")
    ?.addEventListener("click", () => {
      const i = document.getElementById("cust-camp-search");
      if (i) i.value = "";
      draw(customerCampaignsAll);
    });

  // 상세 버튼 클릭 이벤트 위임 바인딩
  if (body && !body.dataset.boundClick) {
    body.addEventListener("click", async function (e) {
      const detailBtn = e.target.closest(".space-button");
      if (!detailBtn) return;
      const id = detailBtn.getAttribute("data-id");
      if (!id) return;
      const campaign = customerCampaignsAll.find(
        (c) =>
          String(c.id) === String(id) || String(c.campaign_code) === String(id)
      );
      if (campaign && typeof window.adoptCustomerDetailModal === "function") {
        await window.adoptCustomerDetailModal(campaign);
      } else {
        alert(`캠페인 ${id} 상세보기 기능은 추후 구현 예정입니다.`);
      }
    });
    body.dataset.boundClick = "1";
  }

  draw(customerCampaignsAll);
}

async function loadCustomerCampaign() {
  const main = document.querySelector(".main-content");
  if (main)
    main.innerHTML = '<div style="padding:16px;color:#6b7280;">로딩중...</div>';
  try {
    const items = await fetchMyCampaigns();
    renderCustomerCampaigns(items);
  } catch (e) {
    console.error("loadCustomerCampaign error", e);
    if (main)
      main.innerHTML =
        '<div style="padding:16px;color:#dc2626;">데이터를 불러오지 못했습니다.</div>';
  }
}

// DOM 로드 후 초기 처리
document.addEventListener("DOMContentLoaded", function () {
  try {
    loadCustomerCampaign();
  } catch (_) {}
});

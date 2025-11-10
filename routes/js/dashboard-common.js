/**
 * 파일: js/dashboard-common.js
 * 목적: 모든 대시보드에서 공통으로 사용하는 함수들
 *       공지사항 컴포넌트 로드, 역할 기반 UI 제어 등
 */

// 현재 사용자 역할 확인
function getCurrentUserRole() {
  // 1) URL/파일명 기반으로 확정 (탭 간 localStorage 오염 방지)
  const path = (window.location.pathname || "").toLowerCase();
  if (path.includes("admin")) return "admin";
  if (path.includes("agency")) return "agency";
  if (path.includes("partner")) return "partner";
  if (path.includes("customer")) return "customer";

  // 2) URL 파라미터
  const urlParams = new URLSearchParams(window.location.search);
  const fromQuery = urlParams.get("role");
  if (fromQuery) return fromQuery;

  // 3) 마지막 수단으로 localStorage (교차 탭 영향 가능)
  return localStorage.getItem("userRole") || "agency";
}

// 역할별 세션 토큰 보장 및 공용 토큰 제거(탭 간 충돌 방지)
function ensureRoleSessionToken() {
  try {
    const role = getCurrentUserRole();

    // 관리자일 경우 닉네임/회사명을 '관리자'로 고정 표시
    if (role === "admin") {
      if (nameEl) nameEl.textContent = "관리자";
      if (brandCompanyEl) brandCompanyEl.textContent = "관리자";
      return;
    }
    const sessionKey = `troy_token_${role}`;
    // 1) 이미 세션에 있으면 그대로 사용
    let token = sessionStorage.getItem(sessionKey);
    if (token && token.trim() !== "") return;

    // 2) 역할별 로컬키 → 세션으로 마이그레이션
    const localRoleKey = `troy_token_${role}`;
    token = localStorage.getItem(localRoleKey);
    if (!token || token.trim() === "") {
      // 3) 최후: 공용 토큰이 있다면 한 번만 세션으로 승격
      const shared = localStorage.getItem("troy_token");
      if (shared && shared.trim() !== "") token = shared;
    }
    if (token && token.trim() !== "") {
      sessionStorage.setItem(sessionKey, token);
    }
    // 공용 토큰은 제거(역할간 덮어쓰기 방지)
    localStorage.removeItem("troy_token");
  } catch (_) {}
}

function getRoleSessionToken(role) {
  return sessionStorage.getItem(`troy_token_${role}`) || "";
}

// 저장된 계좌 정보를 입력 필드에 채우기 (사용자별)
function loadBankInfo(role) {
  try {
    const prefix =
      role === "agency"
        ? "agency"
        : role === "partner"
        ? "partner"
        : "customer";
    const userId = (localStorage.getItem("troy_user_id") || "").trim();
    const userScopedKey = userId
      ? `troy_bank_${prefix}_${userId}`
      : `troy_bank_${prefix}`;

    // 사용자 ID가 있으면 사용자별 키만 사용 (교차 계정 오염 방지)
    // 사용자 ID가 없을 때만 과거 키 사용
    let raw = localStorage.getItem(userScopedKey);
    if (!raw && !userId) raw = localStorage.getItem(`troy_bank_${prefix}`);
    if (!raw) return;

    const { bankName, accountHolder, accountNumber } = JSON.parse(raw || "{}");
    const bankEl = document.getElementById(`${prefix}-bank-name`);
    const holderEl = document.getElementById(`${prefix}-account-holder`);
    const numberEl = document.getElementById(`${prefix}-account-number`);
    if (bankEl && typeof bankName === "string") bankEl.value = bankName;
    if (holderEl && typeof accountHolder === "string")
      holderEl.value = accountHolder;
    if (numberEl && typeof accountNumber === "string")
      numberEl.value = accountNumber;
  } catch (_) {}
}

// 승인 상태 확인 후 승인 전이면 서비스 소개만 노출
async function enforceApprovalGate() {
  try {
    // 토큰 존재 시 프로필 조회
    const token = localStorage.getItem("troy_token");
    if (!token) return; // 비로그인 상태는 패스

    const res = await fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return;

    const user = data.user || {};
    const role = user.user_type;
    const approval = user.approval_status || "pending";

    if (role && role !== "admin" && approval !== "approved") {
      // 메뉴 숨김: 역할 메뉴 전부 비활성화
      const menuSelectors = [
        '[data-role="agency"]',
        '[data-role="partner"]',
        '[data-role="client"]',
        '[data-role="advertiser"]',
      ];
      menuSelectors.forEach((sel) => {
        document
          .querySelectorAll(sel)
          .forEach((el) => (el.style.display = "none"));
      });

      // 공지/지원 등도 숨기고 서비스 소개 로드
      loadServiceInfo();
    }
  } catch (_) {}
}

// 서비스 소개 컴포넌트 로드 (내용 제거됨)
async function loadServiceInfo() {
  try {
    // 서비스 소개 HTML 로드
    const response = await fetch("../html/components/service-intro.html");
    if (!response.ok) {
      throw new Error("서비스 소개 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    // 메인 콘텐츠 영역에 서비스 소개 삽입
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // 공통 패딩 강제 적용
      ensureMainContentPadding();

      // 서비스 소개 CSS 로드
      loadServiceInfoCSS();

      // 서비스 소개 JS 로드
      loadServiceInfoJS();

      // 페이지 제목 업데이트
      updatePageTitle("서비스 소개", "서비스 소개 내용이 준비 중입니다.");

      // 컴포넌트 초기화
      setTimeout(() => {
        if (window.initServiceIntroComponent) {
          window.initServiceIntroComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("서비스 소개 로드 중 오류:", error);
    alert("서비스 소개를 불러오는 중 오류가 발생했습니다.");
  }
}

// 공통: main-content 패딩 강제 적용
function ensureMainContentPadding() {
  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
    mainContent.style.padding = "40px";
  }
}

// 3사 공통: 캠페인 등록 모달 열기 (페이지를 모달로 임베드)
async function openCampaignCreateModal() {
  try {
    // 기존 모달 제거
    const existing = document.getElementById("campaignCreateModal");
    if (existing) existing.remove();

    // 현재 사용자 역할에 따라 iframe src 결정
    const currentRole = getCurrentUserRole();
    let iframeSrc = "./campaign-create.html?embedded=1";

    if (currentRole === "agency") {
      iframeSrc = "./campaign-create.html?from=agency&embedded=1";
    } else if (currentRole === "partner") {
      iframeSrc = "./campaign-create.html?from=partner&embedded=1";
    } else if (currentRole === "customer") {
      iframeSrc = "./campaign-create.html?from=customer&embedded=1";
    }

    const modal = document.createElement("div");
    modal.id = "campaignCreateModal";
    modal.className = "modal";
    modal.style.cssText =
      "display:block; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5);";

    modal.innerHTML = `
      <div class="modal-content" style="background:#fff; margin:2% auto; padding:0; border-radius:14px; width:95%; max-width:1100px; height:92vh; overflow:hidden; display:flex; flex-direction:column;">
        <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #e5e7eb;">
          <h2 style="margin:0; color:#1e293b; font-size:18px;">캠페인 등록</h2>
          <span class="close" onclick="closeCampaignCreateModal()" style="font-size:24px; cursor:pointer; color:#6b7280;">&times;</span>
        </div>
        <div style="flex:1; min-height:0;">
          <iframe src="${iframeSrc}" style="border:0; width:100%; height:100%;"></iframe>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // 모달 외부 클릭으로 닫히지 않도록 변경 (닫기 버튼으로만 닫힘)
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        e.stopPropagation();
        // 의도적으로 아무 동작도 하지 않음
      }
    });

    // ESC 키로 닫기
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeCampaignCreateModal();
      }
    });
  } catch (e) {
    console.error("openCampaignCreateModal error", e);
    alert("캠페인 등록 페이지를 불러오는 중 오류가 발생했습니다.");
  }
}

function closeCampaignCreateModal() {
  const modal = document.getElementById("campaignCreateModal");
  if (modal) modal.remove();
}

// 전역 노출
window.openCampaignCreateModal = openCampaignCreateModal;
window.closeCampaignCreateModal = closeCampaignCreateModal;

// 사이드바 사용자명(상호명) 표시 업데이트
async function updateSidebarNameFromProfile() {
  try {
    const nameEl = document.querySelector(".sidebar .user-info .user-name");
    const brandCompanyEl = document.querySelector(
      ".sidebar .logo-section .company-name"
    );
    if (!nameEl && !brandCompanyEl) return;
    const role = getCurrentUserRole();

    // 관리자: 고정 표시
    if (role === "admin") {
      if (nameEl) nameEl.textContent = "관리자";
      if (brandCompanyEl) brandCompanyEl.textContent = "관리자";
      return;
    }

    // 서버 프로필에서 회사명 우선 사용 (회원가입 시 입력한 사업자명)
    const roleToken =
      getRoleSessionToken(role) || localStorage.getItem("troy_token") || "";
    if (roleToken) {
      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${roleToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.user || {};
        const displayName = (p.company_name || p.username || "").trim();
        if (displayName) {
          if (nameEl) nameEl.textContent = displayName;
          if (brandCompanyEl) brandCompanyEl.textContent = displayName;
          return; // 서버값으로 확정 (깜빡임 방지)
        }
      }
    }
    // 서버에서 가져오지 못한 경우에는 기존 값을 유지
  } catch (_) {}
}

// 즉시 실행 (DOM 로드 전에도 실행 가능)
updateSidebarNameFromProfile();

// DOM 로드 후에도 한 번 더 실행 (안전장치)
document.addEventListener("DOMContentLoaded", () => {
  updateSidebarNameFromProfile();
});

// 공통 계좌정보 저장 함수 (로컬 스토리지)
window.saveBankInfo = function (role) {
  try {
    const prefix =
      role === "agency"
        ? "agency"
        : role === "partner"
        ? "partner"
        : "customer";
    const bankName =
      (document.getElementById(`${prefix}-bank-name`) || {}).value || "";
    const accountHolder =
      (document.getElementById(`${prefix}-account-holder`) || {}).value || "";
    const accountNumber =
      (document.getElementById(`${prefix}-account-number`) || {}).value || "";

    if (!bankName || !accountHolder || !accountNumber) {
      alert("은행명, 예금주, 계좌번호를 모두 입력해주세요.");
      return;
    }

    const payload = { bankName, accountHolder, accountNumber };
    const userId = (localStorage.getItem("troy_user_id") || "").trim();
    const key = userId
      ? `troy_bank_${prefix}_${userId}`
      : `troy_bank_${prefix}`; // 로그인 전/호환
    localStorage.setItem(key, JSON.stringify(payload));

    const msg = document.getElementById(`${prefix}-bank-save-msg`);
    if (msg) {
      msg.textContent = "저장되었습니다.";
      setTimeout(() => (msg.textContent = ""), 2000);
    } else {
      alert("저장되었습니다.");
    }
  } catch (e) {
    console.error("saveBankInfo error", e);
    alert("저장 중 오류가 발생했습니다.");
  }
};

// 공통: 폼 잠금/해제 토글 + 버튼 라벨 변경
window.toggleBankEdit = function (role) {
  const prefix =
    role === "agency" ? "agency" : role === "partner" ? "partner" : "customer";
  const btn = document.getElementById(`${prefix}-bank-toggle-btn`);
  if (!btn) return;

  // 기본정보 섹션 내부의 모든 폼 컨트롤을 잠금/해제
  const section =
    btn.closest(".basic-info-section") ||
    document.querySelector(".basic-info-section");
  const controls = section
    ? section.querySelectorAll("input, select, textarea")
    : [];
  if (!controls.length) return;

  const willEnable = controls[0].disabled === true;
  controls.forEach((el) => {
    try {
      el.disabled = !willEnable;
    } catch (_) {}
  });

  if (willEnable) {
    btn.textContent = "저장";
    btn.onclick = function () {
      saveBankInfo(prefix);
      toggleBankEdit(prefix);
    };
  } else {
    btn.textContent = "변경하기";
    btn.onclick = function () {
      toggleBankEdit(prefix);
    };
  }
};

// 클라이언트 관리 로드 (본문만 주입)
async function loadClientManagement() {
  try {
    const res = await fetch("../html/client-management-integrated.html");
    if (!res.ok) {
      throw new Error("클라이언트 관리 화면을 로드할 수 없습니다.");
    }
    const html = await res.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const sourceMain = parsed.querySelector(".main-content");
    const target = document.querySelector(".main-content");
    if (target) {
      target.innerHTML = sourceMain ? sourceMain.innerHTML : html;
      updatePageTitle(
        "클라이언트 관리",
        "클라이언트 현황을 한눈에 확인하고 효율적으로 관리하세요"
      );

      // 별도 라이트 초기화 스크립트 로드 및 초기화 (중복 로드 방지)
      if (!document.querySelector('script[src*="client-management-lite.js"]')) {
        const s = document.createElement("script");
        s.src = "../js/client-management-lite.js";
        s.defer = true;
        s.onload = () => {
          if (window.initClientManagementLite) {
            window.initClientManagementLite();
          }
        };
        document.head.appendChild(s);
      } else if (window.initClientManagementLite) {
        window.initClientManagementLite();
      }
    }
  } catch (e) {
    console.error("클라이언트 관리 로드 오류:", e);
    alert("클라이언트 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 공지사항 컴포넌트 로드 (관리자/대행사 공통)
async function loadNoticeBoard() {
  try {
    // 공지사항 HTML 로드
    const response = await fetch("../html/notice-board-component.html");
    if (!response.ok) {
      throw new Error("공지사항 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    // 메인 콘텐츠 영역에 공지사항 삽입
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // 공통 패딩 강제 적용
      ensureMainContentPadding();

      // 공지사항 CSS 로드
      loadNoticeBoardCSS();

      // 공지사항 JS 로드
      loadNoticeBoardJS();

      // 페이지 제목 업데이트
      updatePageTitle(
        "공지사항",
        "Troy 플랫폼의 중요한 소식과 업데이트를 확인하세요"
      );

      // 컴포넌트 초기화
      setTimeout(() => {
        if (window.initNoticeBoardComponent) {
          window.initNoticeBoardComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("공지사항 로드 중 오류:", error);
    alert("공지사항을 불러오는 중 오류가 발생했습니다.");
  }
}

// 공지사항 CSS 로드
function loadNoticeBoardCSS() {
  if (
    !document.querySelector('link[href="../css/notice-board-component.css"]')
  ) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/notice-board-component.css";
    document.head.appendChild(link);
  }
}

// 공지사항 JS 로드
function loadNoticeBoardJS() {
  if (
    !document.querySelector('script[src="../js/notice-board-component.js"]')
  ) {
    const script = document.createElement("script");
    script.src = "../js/notice-board-component.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 서비스 소개 CSS 로드
function loadServiceInfoCSS() {
  const existingLink = document.querySelector(
    'link[href*="service-intro.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/service-intro.css";
    document.head.appendChild(link);
  }
}

// 서비스 소개 JS 로드
function loadServiceInfoJS() {
  const existingScript = document.querySelector(
    'script[src*="service-intro.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/service-intro.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 회원사 가입승인 컴포넌트 로드
async function loadMemberApproval() {
  try {
    // 회원사 가입승인 HTML 로드
    const response = await fetch("../html/components/member-approval.html");
    if (!response.ok) {
      throw new Error("회원사 가입승인 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    // 메인 콘텐츠 컨테이너에 삽입
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // 회원사 가입승인 CSS 로드
      loadMemberApprovalCSS();

      // 회원사 가입승인 JS 로드
      loadMemberApprovalJS();

      // 컴포넌트 초기화
      setTimeout(() => {
        if (window.initMemberApprovalComponent) {
          window.initMemberApprovalComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("회원사 가입승인 로드 중 오류:", error);
    alert("회원사 가입승인을 불러오는 중 오류가 발생했습니다.");
  }
}

// 회원사 가입승인 CSS 로드
function loadMemberApprovalCSS() {
  const existingLink = document.querySelector(
    'link[href*="member-approval.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/member-approval.css";
    document.head.appendChild(link);
  }
}

// 회원사 가입승인 JS 로드
function loadMemberApprovalJS() {
  const existingScript = document.querySelector(
    'script[src*="member-approval.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/member-approval.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 파트너사 관리 컴포넌트 로드
async function loadPartnerManagement() {
  try {
    // 파트너사 관리 HTML 로드
    const response = await fetch("../html/components/partner-management.html");
    if (!response.ok) {
      throw new Error("파트너사 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    // 메인 콘텐츠 컨테이너에 삽입
    const mainContentContainer = document.getElementById(
      "main-content-container"
    );
    if (mainContentContainer) {
      mainContentContainer.innerHTML = htmlContent;

      // 파트너사 관리 CSS 로드
      loadPartnerManagementCSS();

      // 파트너사 관리 JS 로드
      loadPartnerManagementJS();

      // 컴포넌트 초기화
      setTimeout(() => {
        if (window.initPartnerManagementComponent) {
          window.initPartnerManagementComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("파트너사 관리 로드 중 오류:", error);
    alert("파트너사 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 파트너사 관리 CSS 로드
function loadPartnerManagementCSS() {
  const existingLink = document.querySelector(
    'link[href*="partner-management.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/partner-management.css";
    document.head.appendChild(link);
  }
}

// 파트너사 관리 JS 로드
function loadPartnerManagementJS() {
  const existingScript = document.querySelector(
    'script[src*="partner-management.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/partner-management.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 대행사 관리 컴포넌트 로드
async function loadAgencyManagement() {
  try {
    // 대행사 관리 HTML 로드
    const response = await fetch("../html/components/agency-management.html");
    if (!response.ok) {
      throw new Error("대행사 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    // 메인 콘텐츠 컨테이너에 삽입
    const mainContentContainer = document.getElementById(
      "main-content-container"
    );
    if (mainContentContainer) {
      mainContentContainer.innerHTML = htmlContent;

      // 대행사 관리 CSS 로드
      loadAgencyManagementCSS();

      // 대행사 관리 JS 로드
      loadAgencyManagementJS();

      // 컴포넌트 초기화
      setTimeout(() => {
        if (window.initAgencyManagementComponent) {
          window.initAgencyManagementComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("대행사 관리 로드 중 오류:", error);
    alert("대행사 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 대행사 관리 CSS 로드
function loadAgencyManagementCSS() {
  const existingLink = document.querySelector(
    'link[href*="agency-management.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/agency-management.css";
    document.head.appendChild(link);
  }
}

// 대행사 관리 JS 로드
function loadAgencyManagementJS() {
  const existingScript = document.querySelector(
    'script[src*="agency-management.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/agency-management.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 고객사 관리 컴포넌트 로드
async function loadCustomerManagement() {
  try {
    // 고객사 관리 HTML 로드
    const response = await fetch("../html/components/customer-management.html");
    if (!response.ok) {
      throw new Error("고객사 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    // 메인 콘텐츠 컨테이너에 삽입
    const mainContentContainer = document.getElementById(
      "main-content-container"
    );
    if (mainContentContainer) {
      mainContentContainer.innerHTML = htmlContent;

      // 고객사 관리 CSS 로드
      loadCustomerManagementCSS();

      // 고객사 관리 JS 로드
      loadCustomerManagementJS();

      // 컴포넌트 초기화
      setTimeout(() => {
        if (window.initCustomerManagementComponent) {
          window.initCustomerManagementComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("고객사 관리 로드 중 오류:", error);
    alert("고객사 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 고객사 캠페인 현황 로드
async function loadCustomerCampaign() {
  try {
    const response = await fetch("../html/components/customer-campaign.html");
    if (!response.ok) {
      throw new Error("고객 캠페인 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (!document.querySelector('link[href*="customer-campaign.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/customer-campaign.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="customer-campaign.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/customer-campaign.js";
        script.defer = true;
        script.onload = () =>
          window.initCustomerCampaign && window.initCustomerCampaign();
        document.head.appendChild(script);
      } else {
        window.initCustomerCampaign && window.initCustomerCampaign();
      }

      updatePageTitle("캠페인 현황", "고객 캠페인 현황을 확인하세요");
    }
  } catch (error) {
    console.error("고객 캠페인 로드 중 오류:", error);
    alert("고객 캠페인 화면을 불러오는 중 오류가 발생했습니다.");
  }
}

// 고객사 스케줄 관리 로드
async function loadCustomerScheduleManagement() {
  try {
    const response = await fetch(
      "../html/components/customer-schedule-management.html"
    );
    if (!response.ok) {
      throw new Error("고객 스케줄 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (
        !document.querySelector(
          'link[href*="customer-schedule-management.css"]'
        )
      ) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/customer-schedule-management.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="customer-schedule-management.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/customer-schedule-management.js";
        script.defer = true;
        script.onload = () =>
          window.initCustomerScheduleManagement &&
          window.initCustomerScheduleManagement();
        document.head.appendChild(script);
      } else {
        window.initCustomerScheduleManagement &&
          window.initCustomerScheduleManagement();
      }

      updatePageTitle(
        "스케줄 관리",
        "내 캠페인 일정을 한눈에 확인하고 관리하세요"
      );
    }
  } catch (error) {
    console.error("고객 스케줄 관리 로드 중 오류:", error);
    alert("고객 스케줄 관리 화면을 불러오는 중 오류가 발생했습니다.");
  }
}

// 고객사 관리 CSS 로드
function loadCustomerManagementCSS() {
  const existingLink = document.querySelector(
    'link[href*="customer-management.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/customer-management.css";
    document.head.appendChild(link);
  }
}

// 고객사 관리 JS 로드
function loadCustomerManagementJS() {
  const existingScript = document.querySelector(
    'script[src*="customer-management.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/customer-management.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 스케줄 관리 컴포넌트 로드
async function loadScheduleManagement() {
  try {
    const response = await fetch("../html/components/schedule-management.html");
    if (!response.ok) {
      throw new Error("스케줄 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      loadScheduleManagementCSS();
      loadScheduleManagementJS();

      setTimeout(() => {
        if (window.initScheduleManagementComponent) {
          window.initScheduleManagementComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("스케줄 관리 로드 중 오류:", error);
    alert("스케줄 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 캠페인 관리 컴포넌트 로드 (대행사)
async function loadCampaignManagement() {
  try {
    const response = await fetch("../html/components/campaign-management.html");
    if (!response.ok) {
      throw new Error("캠페인 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (
        !document.querySelector('link[href="../css/campaign-management.css"]')
      ) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/campaign-management.css";
        document.head.appendChild(link);
      }

      // JS 로드
      if (
        !document.querySelector(
          'script[src="../js/components/campaign-management.js"]'
        )
      ) {
        const script = document.createElement("script");
        script.src = "../js/components/campaign-management.js";
        script.defer = true;
        document.head.appendChild(script);
      }

      // 초기화 함수 호출 (있을 경우)
      setTimeout(() => {
        if (window.initCampaignManagementComponent) {
          window.initCampaignManagementComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("캠페인 관리 로드 중 오류:", error);
    alert("캠페인 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

function loadScheduleManagementCSS() {
  const existingLink = document.querySelector(
    'link[href*="schedule-management.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/schedule-management.css";
    document.head.appendChild(link);
  }
}

function loadScheduleManagementJS() {
  const existingScript = document.querySelector(
    'script[src*="schedule-management.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/schedule-management.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 캠페인 관리 컴포넌트 로드
async function loadCampaignApproval() {
  try {
    const response = await fetch("../html/components/campaign-approval.html");
    if (!response.ok) {
      throw new Error("캠페인 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContentContainer = document.getElementById(
      "main-content-container"
    );
    if (mainContentContainer) {
      mainContentContainer.innerHTML = htmlContent;

      loadCampaignApprovalCSS();
      loadCampaignApprovalJS();

      setTimeout(() => {
        if (window.initCampaignApprovalComponent) {
          window.initCampaignApprovalComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("캠페인 관리 로드 중 오류:", error);
    alert("캠페인 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 전역 함수로 노출
window.loadCampaignApproval = loadCampaignApproval;

function loadCampaignApprovalCSS() {
  const existingLink = document.querySelector(
    'link[href*="campaign-approval.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/campaign-approval.css";
    document.head.appendChild(link);
  }
}

function loadCampaignApprovalJS() {
  const existingScript = document.querySelector(
    'script[src*="campaign-approval.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/campaign-approval.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 완료 마감 관리 컴포넌트 로드
async function loadCompletionManagement() {
  try {
    const response = await fetch(
      "../html/components/completion-management.html"
    );
    if (!response.ok) {
      throw new Error("완료 마감 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContentContainer = document.getElementById(
      "main-content-container"
    );
    if (mainContentContainer) {
      mainContentContainer.innerHTML = htmlContent;

      loadCompletionManagementCSS();
      loadCompletionManagementJS();

      setTimeout(() => {
        if (window.initCompletionManagementComponent) {
          window.initCompletionManagementComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("완료 마감 관리 로드 중 오류:", error);
    alert("완료 마감 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

function loadCompletionManagementCSS() {
  const existingLink = document.querySelector(
    'link[href*="completion-management.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/completion-management.css";
    document.head.appendChild(link);
  }
}

function loadCompletionManagementJS() {
  const existingScript = document.querySelector(
    'script[src*="completion-management.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/completion-management.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 결제내역 관리 컴포넌트 로드
async function loadPaymentHistory() {
  try {
    const response = await fetch("../html/components/payment-history.html");
    if (!response.ok) {
      throw new Error("결제내역 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContentContainer = document.getElementById(
      "main-content-container"
    );
    if (mainContentContainer) {
      mainContentContainer.innerHTML = htmlContent;

      loadPaymentHistoryCSS();
      loadPaymentHistoryJS();

      setTimeout(() => {
        if (window.initPaymentHistoryComponent) {
          window.initPaymentHistoryComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("결제내역 관리 로드 중 오류:", error);
    alert("결제내역 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 대행사 스케줄 관리 로드 (페이지 유지, 본문만 교체)
async function loadAgencyScheduleManagement() {
  try {
    const response = await fetch(
      "../html/components/agency-schedule-management.html"
    );
    if (!response.ok) {
      throw new Error("스케줄 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      const existingLink = document.querySelector(
        'link[href*="agency-schedule-management.css"]'
      );
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/agency-schedule-management.css";
        document.head.appendChild(link);
      }

      // JS 로드
      const existingScript = document.querySelector(
        'script[src*="agency-schedule-management.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/agency-schedule-management.js";
        script.defer = true;
        script.onload = () => {
          if (window.initAgencyScheduleManagement) {
            window.initAgencyScheduleManagement();
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.initAgencyScheduleManagement) {
          window.initAgencyScheduleManagement();
        }
      }
    }
  } catch (error) {
    console.error("스케줄 관리 로드 중 오류:", error);
    alert("스케줄 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 대행사 1:1 문의 로드 (페이지 유지, 본문만 교체)
async function loadAgencyOneToOne() {
  try {
    const response = await fetch("../html/components/agency-one-to-one.html");
    if (!response.ok) {
      throw new Error("1:1 문의 컴포넌트를 로드할 수 없습니다.");
    }
    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (!document.querySelector('link[href*="agency-one-to-one.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/agency-one-to-one.css";
        document.head.appendChild(link);
      }

      // JS 로드
      const existingScript = document.querySelector(
        'script[src*="agency-one-to-one.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/agency-one-to-one.js";
        script.defer = true;
        script.onload = () =>
          window.initAgencyOneToOne && window.initAgencyOneToOne();
        document.head.appendChild(script);
      } else {
        window.initAgencyOneToOne && window.initAgencyOneToOne();
      }
    }
  } catch (error) {
    console.error("1:1 문의 로드 중 오류:", error);
    alert("1:1 문의를 불러오는 중 오류가 발생했습니다.");
  }
}

// 대행사 결제내역 로드 (페이지 유지, 본문만 교체)
async function loadAgencyPaymentHistory() {
  try {
    const response = await fetch(
      "../html/components/agency-payment-history.html"
    );
    if (!response.ok) {
      throw new Error("결제내역 컴포넌트를 로드할 수 없습니다.");
    }
    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (!document.querySelector('link[href*="agency-payment-history.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/agency-payment-history.css";
        document.head.appendChild(link);
      }

      // JS 로드
      const existingScript = document.querySelector(
        'script[src*="agency-payment-history.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/agency-payment-history.js";
        script.defer = true;
        script.onload = () =>
          window.initAgencyPaymentHistory && window.initAgencyPaymentHistory();
        document.head.appendChild(script);
      } else {
        window.initAgencyPaymentHistory && window.initAgencyPaymentHistory();
      }
    }
  } catch (error) {
    console.error("결제내역 로드 중 오류:", error);
    alert("결제내역을 불러오는 중 오류가 발생했습니다.");
  }
}

// 대행사 나의 정보 로드 (페이지 유지, 본문만 교체)
async function loadAgencyMyInfo() {
  try {
    const response = await fetch("../html/components/agency-my-info.html");
    if (!response.ok) {
      throw new Error("나의 정보 컴포넌트를 로드할 수 없습니다.");
    }
    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;
      // 저장된 계좌 정보 반영
      loadBankInfo("agency");

      // CSS 로드
      if (!document.querySelector('link[href*="agency-my-info.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/agency-my-info.css";
        document.head.appendChild(link);
      }

      // JS 로드
      const existingScript = document.querySelector(
        'script[src*="agency-my-info.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/agency-my-info.js";
        script.defer = true;
        script.onload = () =>
          window.initAgencyMyInfo && window.initAgencyMyInfo();
        document.head.appendChild(script);
      } else {
        window.initAgencyMyInfo && window.initAgencyMyInfo();
      }
    }
  } catch (error) {
    console.error("나의 정보 로드 중 오류:", error);
    alert("나의 정보를 불러오는 중 오류가 발생했습니다.");
  }
}

// 파트너 캠페인 관리 로드 (페이지 유지, 본문만 교체)
async function loadPartnerCampaignManagement() {
  try {
    const response = await fetch(
      "../html/components/partner-campaign-management.html"
    );
    if (!response.ok) {
      throw new Error("파트너 캠페인 관리 컴포넌트를 로드할 수 없습니다.");
    }
    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // 공통 패딩 강제 적용
      ensureMainContentPadding();

      // CSS 로드 - 대행사 캠페인 관리 CSS 사용
      if (!document.querySelector('link[href*="campaign-management.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/campaign-management.css";
        document.head.appendChild(link);
      }

      // JS 로드
      const existingScript = document.querySelector(
        'script[src*="partner-campaign-management.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/partner-campaign-management.js";
        script.defer = true;
        script.onload = () =>
          window.initPartnerCampaignManagement &&
          window.initPartnerCampaignManagement();
        document.head.appendChild(script);
      } else {
        window.initPartnerCampaignManagement &&
          window.initPartnerCampaignManagement();
      }
    }
  } catch (error) {
    console.error("파트너 캠페인 관리 로드 중 오류:", error);
    alert("파트너 캠페인 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

function loadPaymentHistoryCSS() {
  const existingLink = document.querySelector(
    'link[href*="payment-history.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/payment-history.css";
    document.head.appendChild(link);
  }
}

function loadPaymentHistoryJS() {
  const existingScript = document.querySelector(
    'script[src*="payment-history.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/payment-history.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 1:1 문의 처리 컴포넌트 로드
async function loadSupportBoard() {
  try {
    const response = await fetch("../html/components/support-board.html");
    if (!response.ok) {
      throw new Error("1:1 문의 처리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      loadSupportBoardCSS();
      loadSupportBoardJS();

      setTimeout(() => {
        if (window.initSupportBoardComponent) {
          window.initSupportBoardComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("1:1 문의 처리 로드 중 오류:", error);
    alert("1:1 문의 처리를 불러오는 중 오류가 발생했습니다.");
  }
}

function loadSupportBoardCSS() {
  const existingLink = document.querySelector(
    'link[href*="support-board.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/support-board.css";
    document.head.appendChild(link);
  }
}

function loadSupportBoardJS() {
  const existingScript = document.querySelector(
    'script[src*="support-board.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/support-board.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 파트너사 정산 컴포넌트 로드
async function loadPartnerSettlement() {
  try {
    const response = await fetch("../html/components/partner-settlement.html");
    if (!response.ok) {
      throw new Error("파트너사 정산 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      loadPartnerSettlementCSS();
      loadPartnerSettlementJS();

      setTimeout(() => {
        if (window.initPartnerSettlementComponent) {
          window.initPartnerSettlementComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("파트너사 정산 로드 중 오류:", error);
    alert("파트너사 정산을 불러오는 중 오류가 발생했습니다.");
  }
}

function loadPartnerSettlementCSS() {
  const existingLink = document.querySelector(
    'link[href*="partner-settlement.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/partner-settlement.css";
    document.head.appendChild(link);
  }
}

function loadPartnerSettlementJS() {
  const existingScript = document.querySelector(
    'script[src*="partner-settlement.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/partner-settlement.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 매출 내역 컴포넌트 로드
async function loadRevenueHistory() {
  try {
    const response = await fetch("../html/components/revenue-history.html");
    if (!response.ok) {
      throw new Error("매출 내역 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();

    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      loadRevenueHistoryCSS();
      loadRevenueHistoryJS();

      setTimeout(() => {
        if (window.initRevenueHistoryComponent) {
          window.initRevenueHistoryComponent();
        }
      }, 100);
    }
  } catch (error) {
    console.error("매출 내역 로드 중 오류:", error);
    alert("매출 내역을 불러오는 중 오류가 발생했습니다.");
  }
}

function loadRevenueHistoryCSS() {
  const existingLink = document.querySelector(
    'link[href*="revenue-history.css"]'
  );
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../css/revenue-history.css";
    document.head.appendChild(link);
  }
}

function loadRevenueHistoryJS() {
  const existingScript = document.querySelector(
    'script[src*="revenue-history.js"]'
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "../js/components/revenue-history.js";
    script.defer = true;
    document.head.appendChild(script);
  }
}

// 파트너 1:1 문의 컴포넌트 로드
async function loadPartnerSupport() {
  try {
    const response = await fetch("../html/components/partner-support.html");
    if (!response.ok) {
      throw new Error("파트너 1:1 문의 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (!document.querySelector('link[href*="partner-support.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/partner-support.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="partner-support.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/partner-support.js";
        script.defer = true;
        script.onload = () => {
          if (window.initPartnerSupport) {
            window.initPartnerSupport();
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.initPartnerSupport) {
          window.initPartnerSupport();
        }
      }
    }
  } catch (error) {
    console.error("파트너 1:1 문의 로드 중 오류:", error);
    alert("파트너 1:1 문의를 불러오는 중 오류가 발생했습니다.");
  }
}

// 파트너 나의 정보 컴포넌트 로드
async function loadPartnerMyInfo() {
  try {
    const response = await fetch("../html/components/partner-my-info.html");
    if (!response.ok) {
      throw new Error("파트너 나의 정보 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;
      // 저장된 계좌 정보 반영
      loadBankInfo("partner");

      // CSS 로드
      if (!document.querySelector('link[href*="partner-my-info.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/partner-my-info.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="partner-my-info.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/partner-my-info.js";
        script.defer = true;
        script.onload = () => {
          if (window.initPartnerMyInfo) {
            window.initPartnerMyInfo();
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.initPartnerMyInfo) {
          window.initPartnerMyInfo();
        }
      }
    }
  } catch (error) {
    console.error("파트너 나의 정보 로드 중 오류:", error);
    alert("파트너 나의 정보를 불러오는 중 오류가 발생했습니다.");
  }
}

// 파트너 결제내역 컴포넌트 로드
async function loadPartnerPaymentHistory() {
  try {
    const response = await fetch(
      "../html/components/partner-payment-history.html"
    );
    if (!response.ok) {
      throw new Error("파트너 결제내역 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (
        !document.querySelector('link[href*="partner-payment-history.css"]')
      ) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/partner-payment-history.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="partner-payment-history.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/partner-payment-history.js";
        script.defer = true;
        script.onload = () => {
          if (window.initPartnerPaymentHistory) {
            window.initPartnerPaymentHistory();
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.initPartnerPaymentHistory) {
          window.initPartnerPaymentHistory();
        }
      }
    }
  } catch (error) {
    console.error("파트너 결제내역 로드 중 오류:", error);
    alert("파트너 결제내역을 불러오는 중 오류가 발생했습니다.");
  }
}

// 파트너 결제 정산(별개) 컴포넌트 로드
async function loadPartnerPaymentSettlement() {
  try {
    const response = await fetch(
      "../html/components/partner-payment-settlement.html"
    );
    if (!response.ok) {
      throw new Error("파트너 결제 정산 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (
        !document.querySelector('link[href*="partner-payment-settlement.css"]')
      ) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/partner-payment-settlement.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="partner-payment-settlement.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/partner-payment-settlement.js";
        script.defer = true;
        script.onload = () => {
          if (window.initPartnerSettlement) {
            window.initPartnerSettlement();
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.initPartnerSettlement) {
          window.initPartnerSettlement();
        }
      }
    }
  } catch (error) {
    console.error("파트너 결제 정산 로드 중 오류:", error);
    alert("파트너 결제 정산을 불러오는 중 오류가 발생했습니다.");
  }
}

// 파트너 클라이언트 관리 로드
async function loadPartnerClientManagement() {
  try {
    const response = await fetch(
      "../html/components/partner-client-management.html"
    );
    if (!response.ok) {
      throw new Error("파트너 클라이언트 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (
        !document.querySelector('link[href*="partner-client-management.css"]')
      ) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/partner-client-management.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="partner-client-management.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/partner-client-management.js";
        script.defer = true;
        script.onload = () => {
          if (window.initPartnerClientManagement) {
            window.initPartnerClientManagement();
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.initPartnerClientManagement) {
          window.initPartnerClientManagement();
        }
      }
    }
  } catch (error) {
    console.error("파트너 클라이언트 관리 로드 중 오류:", error);
    alert("파트너 클라이언트 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 파트너십 현황 로드
async function loadPartnershipStatus() {
  try {
    const response = await fetch("../html/components/partnership-status.html");
    if (!response.ok) {
      throw new Error("파트너십 현황 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (!document.querySelector('link[href*="partnership-status.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/partnership-status.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="partnership-status.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/partnership-status.js";
        script.defer = true;
        script.onload = () => {
          if (window.initPartnershipStatus) {
            window.initPartnershipStatus();
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.initPartnershipStatus) {
          window.initPartnershipStatus();
        }
      }
    }
  } catch (error) {
    console.error("파트너십 현황 로드 중 오류:", error);
    alert("파트너십 현황을 불러오는 중 오류가 발생했습니다.");
  }
}

// 파트너 스케줄 관리 로드
async function loadPartnerScheduleManagement() {
  try {
    const response = await fetch(
      "../html/components/partner-schedule-management.html"
    );
    if (!response.ok) {
      throw new Error("파트너 스케줄 관리 컴포넌트를 로드할 수 없습니다.");
    }

    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;

      // CSS 로드
      if (
        !document.querySelector('link[href*="partner-schedule-management.css"]')
      ) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/partner-schedule-management.css";
        document.head.appendChild(link);
      }

      // JS 로드 및 초기화
      const existingScript = document.querySelector(
        'script[src*="partner-schedule-management.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/partner-schedule-management.js";
        script.defer = true;
        script.onload = () => {
          if (window.initPartnerScheduleManagement) {
            window.initPartnerScheduleManagement();
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.initPartnerScheduleManagement) {
          window.initPartnerScheduleManagement();
        }
      }
    }
  } catch (error) {
    console.error("파트너 스케줄 관리 로드 중 오류:", error);
    alert("파트너 스케줄 관리를 불러오는 중 오류가 발생했습니다.");
  }
}

// 메인 콘텐츠 숨기기
function hideMainContent() {
  const elementsToHide = [
    ".stats-grid",
    ".search-section",
    ".campaign-list",
    ".dashboard-content",
  ];

  elementsToHide.forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = "none";
    }
  });
}

// 메인 콘텐츠 표시
function showMainContent() {
  const elementsToShow = [
    ".stats-grid",
    ".search-section",
    ".campaign-list",
    ".dashboard-content",
  ];

  elementsToShow.forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = "";
    }
  });
}

// 페이지 제목 업데이트
function updatePageTitle(title, subtitle) {
  const pageTitle = document.querySelector(".page-title");
  const pageSubtitle = document.querySelector(".page-subtitle");

  if (pageTitle) pageTitle.textContent = title;
  if (pageSubtitle) pageSubtitle.textContent = subtitle;
}

// 대시보드로 돌아가기
function goToDashboard() {
  // 메인 콘텐츠 표시
  showMainContent();

  // 페이지 제목 복원
  const userRole = getCurrentUserRole();
  const roleNames = {
    admin: "관리자 대시보드",
    agency: "대행사 대시보드",
    partner: "파트너사 대시보드",
    client: "고객사 대시보드",
  };

  const defaultSubtitles = {
    admin: "캠페인 현황을 한눈에 확인하고 관리하세요",
    agency: "캠페인 현황을 한눈에 확인하고 관리하세요",
    partner: "파트너사 대시보드에서 업무를 관리하세요",
    client: "고객사 대시보드에서 캠페인을 확인하세요",
  };

  updatePageTitle(
    roleNames[userRole] || "대시보드",
    defaultSubtitles[userRole] || "대시보드에 오신 것을 환영합니다"
  );
}

// 역할 기반 메뉴 표시/숨김
function toggleRoleBasedMenus() {
  const userRole = getCurrentUserRole();

  // 관리자 전용 메뉴
  const adminMenus = document.querySelectorAll('[data-role="admin"]');
  adminMenus.forEach((menu) => {
    menu.style.display = userRole === "admin" ? "block" : "none";
  });

  // 대행사 전용 메뉴
  const agencyMenus = document.querySelectorAll('[data-role="agency"]');
  agencyMenus.forEach((menu) => {
    menu.style.display = userRole === "agency" ? "block" : "none";
  });

  // 파트너사 전용 메뉴
  const partnerMenus = document.querySelectorAll('[data-role="partner"]');
  partnerMenus.forEach((menu) => {
    menu.style.display = userRole === "partner" ? "block" : "none";
  });

  // 고객사 전용 메뉴
  const clientMenus = document.querySelectorAll('[data-role="client"]');
  clientMenus.forEach((menu) => {
    menu.style.display = userRole === "client" ? "block" : "none";
  });
}

// 고객 1:1 문의 로더
async function loadCustomerOneToOne() {
  try {
    const response = await fetch("../html/components/customer-one-to-one.html");
    if (!response.ok) {
      throw new Error("고객 1:1 문의 컴포넌트를 로드할 수 없습니다.");
    }
    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;
      if (!document.querySelector('link[href*="customer-one-to-one.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/customer-one-to-one.css";
        document.head.appendChild(link);
      }
      const existingScript = document.querySelector(
        'script[src*="customer-one-to-one.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/customer-one-to-one.js";
        script.defer = true;
        script.onload = () =>
          window.initCustomerOneToOne && window.initCustomerOneToOne();
        document.head.appendChild(script);
      } else {
        window.initCustomerOneToOne && window.initCustomerOneToOne();
      }
      updatePageTitle(
        "1:1 문의",
        "궁금한 사항을 문의하고 빠른 답변을 받아보세요"
      );
    }
  } catch (error) {
    console.error("고객 1:1 문의 로드 중 오류:", error);
    alert("고객 1:1 문의 화면을 불러오는 중 오류가 발생했습니다.");
  }
}

// 고객 결제 내역 로더
async function loadCustomerPaymentHistory() {
  try {
    const response = await fetch(
      "../html/components/customer-payment-history.html"
    );
    if (!response.ok) {
      throw new Error("고객 결제 내역 컴포넌트를 로드할 수 없습니다.");
    }
    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;
      if (
        !document.querySelector('link[href*="customer-payment-history.css"]')
      ) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/customer-payment-history.css";
        document.head.appendChild(link);
      }
      const existingScript = document.querySelector(
        'script[src*="customer-payment-history.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/customer-payment-history.js";
        script.defer = true;
        script.onload = () =>
          window.initCustomerPaymentHistory &&
          window.initCustomerPaymentHistory();
        document.head.appendChild(script);
      } else {
        window.initCustomerPaymentHistory &&
          window.initCustomerPaymentHistory();
      }
      updatePageTitle("결제 내역", "캠페인 결제 내역을 확인하고 관리하세요");
    }
  } catch (error) {
    console.error("고객 결제 내역 로드 중 오류:", error);
    alert("고객 결제 내역 화면을 불러오는 중 오류가 발생했습니다.");
  }
}

// 고객 나의 정보 로더
async function loadCustomerMyInfo() {
  try {
    const response = await fetch("../html/components/customer-my-info.html");
    if (!response.ok) {
      throw new Error("고객 나의 정보 컴포넌트를 로드할 수 없습니다.");
    }
    const htmlContent = await response.text();
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;
      // 저장된 계좌 정보 반영
      loadBankInfo("customer");
      if (!document.querySelector('link[href*="customer-my-info.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/customer-my-info.css";
        document.head.appendChild(link);
      }
      const existingScript = document.querySelector(
        'script[src*="customer-my-info.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "../js/components/customer-my-info.js";
        script.defer = true;
        script.onload = () =>
          window.initCustomerMyInfo && window.initCustomerMyInfo();
        document.head.appendChild(script);
      } else {
        window.initCustomerMyInfo && window.initCustomerMyInfo();
      }
      updatePageTitle("나의 정보", "계정 정보를 확인하고 수정하세요");
    }
  } catch (error) {
    console.error("고객 나의 정보 로드 중 오류:", error);
    alert("고객 나의 정보 화면을 불러오는 중 오류가 발생했습니다.");
  }
}

// 대시보드 초기화
function initDashboard() {
  // 역할 기반 메뉴 설정
  toggleRoleBasedMenus();

  // 사용자 역할에 따른 초기 설정
  const userRole = getCurrentUserRole();
  console.log("현재 사용자 역할:", userRole);
}

// 서비스 소개 페이지 로드 함수
async function loadServiceInfo() {
  try {
    console.log("서비스 소개 페이지 로드 시작");

    // HTML 파일 로드
    const response = await fetch("../html/components/service-intro.html");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const htmlContent = await response.text();

    // 메인 콘텐츠 영역에 삽입
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;
      console.log("서비스 소개 HTML 로드 및 삽입 완료");

      // CSS 파일 로드
      const existingLink = document.querySelector(
        'link[href*="service-intro.css"]'
      );
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/service-intro.css";
        document.head.appendChild(link);
        console.log("서비스 소개 CSS 로드 완료");
      }

      // 페이지 제목 업데이트
      if (window.updatePageTitle) {
        window.updatePageTitle(
          "서비스 소개",
          "TROY의 다양한 서비스를 소개합니다."
        );
      }
    } else {
      console.error("메인 콘텐츠 영역(.main-content)을 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error("서비스 소개 페이지 로드 중 오류:", error);
    alert("서비스 소개 페이지를 불러오는 중 오류가 발생했습니다.");
  }
}

// 사이드바 메뉴 클릭 이벤트 리스너
function setupSidebarMenuListeners() {
  // 서비스 소개 메뉴 클릭 이벤트
  const serviceIntroMenu = document.querySelector(
    '[data-menu="service-intro"]'
  );
  if (serviceIntroMenu) {
    serviceIntroMenu.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("서비스 소개 메뉴 클릭됨");
      loadServiceInfo();
    });
  }

  // 다른 메뉴들도 필요에 따라 추가할 수 있습니다
  const campaignMenu = document.querySelector('[data-menu="campaign"]');
  if (campaignMenu) {
    campaignMenu.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("캠페인 관리 메뉴 클릭됨");
      // 캠페인 관리 페이지 로드 로직
    });
  }

  const paymentMenu = document.querySelector('[data-menu="payment"]');
  if (paymentMenu) {
    paymentMenu.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("결제내역 메뉴 클릭됨");
      // 결제내역 페이지 로드 로직
    });
  }
}

// DOM 로드 완료 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  initDashboard();
  enforceApprovalGate();
  setupSidebarMenuListeners();
});

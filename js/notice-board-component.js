/**
 * 파일: js/notice-board-component.js
 * 목적: 공지사항 컴포넌트의 상호작용 제어 (검색/필터/페이지네이션/상세보기)
 *       모든 대시보드에서 공통으로 사용
 */

// 현재 사용자 역할 확인
function getCurrentUserRole() {
  // 현재 페이지 경로를 기반으로 역할 판단
  const currentPath = window.location.pathname;

  // 디버깅을 위한 콘솔 로그
  console.log("=== 사용자 역할 디버깅 ===");
  console.log("현재 경로:", currentPath);

  let role = "user"; // 기본값을 일반 사용자로 설정

  if (currentPath.includes("admin-dashboard")) {
    role = "admin";
  } else if (currentPath.includes("partner-dashboard")) {
    role = "partner";
  } else if (currentPath.includes("customer-dashboard")) {
    role = "customer";
  } else if (currentPath.includes("agency-dashboard")) {
    role = "agency";
  } else {
    // URL 파라미터나 localStorage에서 역할 정보 가져오기 (fallback)
    const urlParams = new URLSearchParams(window.location.search);
    role = urlParams.get("role") || localStorage.getItem("userRole") || "user";
  }

  console.log(
    "URL 파라미터 role:",
    new URLSearchParams(window.location.search).get("role")
  );
  console.log("localStorage userRole:", localStorage.getItem("userRole"));
  console.log("최종 사용자 역할:", role);
  console.log("=========================");

  return role;
}

// 관리자 권한 확인 함수
function isAdmin() {
  const userRole = getCurrentUserRole();
  return userRole === "admin" || userRole === "ADMIN";
}

// 권한이 필요한 작업인지 확인
function requiresAdminPermission(action) {
  const adminActions = ["create", "update", "delete", "edit"];
  return adminActions.includes(action);
}

// API 요청 전 권한 체크
function checkPermission(action) {
  if (requiresAdminPermission(action) && !isAdmin()) {
    alert("관리자 권한이 필요합니다.");
    return false;
  }
  return true;
}

// 관리자 컨트롤 표시/숨김
function toggleAdminControls() {
  const adminControls = document.getElementById("adminControls");
  const isAdminUser = isAdmin();

  console.log("=== 관리자 컨트롤 확인 ===");
  console.log("관리자 여부:", isAdminUser);
  console.log("adminControls 요소:", adminControls);

  if (adminControls) {
    if (isAdminUser) {
      adminControls.style.display = "flex";
      adminControls.style.visibility = "visible";
      adminControls.style.opacity = "1";
      console.log("✅ 관리자 - 버튼 표시됨");
    } else {
      adminControls.style.display = "none";
      adminControls.style.visibility = "hidden";
      adminControls.style.opacity = "0";
      console.log("❌ 관리자 아님 - 버튼 강제 숨김");
    }
  } else {
    console.log("❌ adminControls 요소를 찾을 수 없습니다!");
  }
  console.log("=========================");
}

// 조회수 가져오기 함수
function getViewCount(noticeId) {
  const viewCountKey = `notice_view_count_${noticeId}`;
  return parseInt(localStorage.getItem(viewCountKey) || "0");
}

// 조회수 증가 함수
async function incrementViewCount(noticeId) {
  try {
    // 로컬 스토리지에서 조회수 관리
    const viewCountKey = `notice_view_count_${noticeId}`;
    const currentCount = parseInt(localStorage.getItem(viewCountKey) || "0");
    const newCount = currentCount + 1;

    // 로컬 스토리지에 저장
    localStorage.setItem(viewCountKey, newCount.toString());

    // 화면의 조회수 업데이트
    const noticeItem = document.querySelector(
      `[onclick*="openNoticeDetail('${noticeId}')"]`
    );
    if (noticeItem) {
      const viewsElement = noticeItem.querySelector(".notice-views");
      if (viewsElement) {
        viewsElement.textContent = `조회 ${newCount}`;
      }
    }

    // API 호출 (서버에 조회수 업데이트)
    const token = localStorage.getItem("troy_token");
    if (token) {
      await fetch(`/api/notices/${noticeId}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error("조회수 증가 실패:", error);
  }
}

// 공지사항 상세보기 (모달 방식)
function openNoticeDetail(id) {
  try {
    // 조회수 증가
    incrementViewCount(id);

    const items = document.querySelectorAll(".notice-item");
    let target = null;
    for (const item of items) {
      const handler = item.getAttribute("onclick") || "";
      if (
        handler.includes(`openNoticeDetail(${id})`) ||
        handler.includes(`openNoticeDetail('${id}')`) ||
        handler.includes(`openNoticeDetail(\"${id}\")`)
      ) {
        target = item;
        break;
      }
    }

    const title = (
      target?.querySelector(".notice-title")?.textContent || ""
    ).trim();
    const content = (
      target?.querySelector(".notice-preview")?.textContent || ""
    ).trim();
    const date = (
      target?.querySelector(".notice-date")?.textContent || ""
    ).trim();
    const views = getViewCount(id);
    const tags = target?.querySelectorAll(".notice-tags .tag") || [];

    // 기존 모달이 있다면 제거
    const existingModal = document.getElementById("noticeDetailModal");
    if (existingModal) {
      existingModal.remove();
    }

    // 모달 생성
    const modal = document.createElement("div");
    modal.id = "noticeDetailModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 32px; border-radius: 12px; max-width: 900px; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <h2 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 700;">공지사항</h2>
          <button onclick="closeNoticeDetailModal()" style="background: #6b7280; color: white; border: none; border-radius: 8px; padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px;">
            ← 목록으로
          </button>
        </div>
        
        <div class="modal-body" style="background-color: white;">
          <h1 style="color: #1f2937; font-size: 32px; font-weight: 700; margin-bottom: 20px; line-height: 1.3;">
            ${title}
          </h1>
          
          <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
            ${Array.from(tags)
              .map((tag) => tag.outerHTML)
              .join("")}
          </div>
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #374151; font-size: 18px; line-height: 1.7; margin: 0; white-space: pre-wrap;">
              ${content}
            </p>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; color: #6b7280; font-size: 16px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <span>등록일: ${date}</span>
            <span>조회수: ${views}</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 모달 외부 클릭 시 닫기
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeNoticeDetailModal();
      }
    });
  } catch (e) {
    console.error("openNoticeDetail (Modal) error", e);
    alert("공지사항을 불러올 수 없습니다.");
  }
}

// 화면 전환 함수들
function showNoticeDetail() {
  const listView = document.getElementById("notice-list-view");
  const detailView = document.getElementById("notice-detail-view");

  if (listView && detailView) {
    listView.style.display = "none";
    detailView.style.display = "block";
  }
}

function showNoticeList() {
  const listView = document.getElementById("notice-list-view");
  const detailView = document.getElementById("notice-detail-view");

  if (listView && detailView) {
    listView.style.display = "block";
    detailView.style.display = "none";
  }
}

function closeNoticeDetailModal() {
  const modal = document.getElementById("noticeDetailModal");
  if (modal) {
    modal.remove();
  }
}

// 검색어 및 카테고리 필터 적용
function applyFilters() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const categoryFilter = document.getElementById("categoryFilter").value;

  console.log("검색어:", searchTerm, "카테고리:", categoryFilter);

  // 실제 구현에서는 서버에 필터 요청을 보내거나 클라이언트에서 필터링
  // 여기서는 간단한 로그만 출력
}

// 검색 필터 초기화
function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "all";
}

// 페이지네이션 버튼 이벤트 처리
function initPagination() {
  document.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      if (!this.disabled && !this.classList.contains("active")) {
        document.querySelector(".page-btn.active").classList.remove("active");
        this.classList.add("active");
      }
    });
  });
}

// 관리자 전용 기능들
function showAddNoticeModal() {
  // 권한 체크
  if (!checkPermission("create")) {
    return;
  }

  // 공지사항 등록 모달 생성
  const modal = document.createElement("div");
  modal.id = "addNoticeModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 3% auto; padding: 24px; border-radius: 8px; max-width: 800px; max-height: 85vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
        <h3 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 600;">새 공지사항 등록</h3>
        <span class="close" onclick="closeAddNoticeModal()" style="font-size: 24px; cursor: pointer; color: #6b7280; font-weight: bold;">&times;</span>
      </div>
      
      <form id="addNoticeForm">
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">제목</label>
          <input type="text" id="addTitle" placeholder="공지사항 제목을 입력하세요" required 
                 style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">카테고리</label>
          <select id="addCategory" required 
                  style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
            <option value="">카테고리를 선택하세요</option>
            <option value="system">시스템</option>
            <option value="service">서비스</option>
            <option value="update">업데이트</option>
            <option value="event">이벤트</option>
            <option value="maintenance">점검</option>
          </select>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">대상</label>
          <select id="addAudience" required 
                  style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
            <option value="">대상을 선택하세요</option>
            <option value="all">전체</option>
            <option value="advertiser">광고주</option>
            <option value="agency">대행사</option>
            <option value="partner">파트너사</option>
          </select>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: #374151; cursor: pointer;">
            <input type="checkbox" id="addIsImportant" style="width: 18px; height: 18px; cursor: pointer;">
            <span>🚨 중요 공지사항으로 설정</span>
          </label>
          <p style="margin: 4px 0 0 26px; font-size: 12px; color: #6b7280;">중요 공지사항으로 설정하면 상단 배너에 표시됩니다.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">내용</label>
          <textarea id="addContent" placeholder="공지사항 내용을 입력하세요" rows="8" required 
                    style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;"></textarea>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" onclick="closeAddNoticeModal()" 
                  style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            취소
          </button>
          <button type="submit" 
                  style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            등록
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // 폼 제출 이벤트 리스너
  document.getElementById("addNoticeForm").onsubmit = async (e) => {
    e.preventDefault();
    await saveNewNotice();
  };
}

// 새 공지사항 저장
async function saveNewNotice() {
  // 권한 체크
  if (!checkPermission("create")) {
    return;
  }

  const data = {
    title: document.getElementById("addTitle").value,
    content: document.getElementById("addContent").value,
    category: document.getElementById("addCategory").value,
    target_audience: document.getElementById("addAudience").value,
    is_important: document.getElementById("addIsImportant").checked,
  };

  try {
    const token = localStorage.getItem("troy_token");
    const response = await fetch("/api/admin/notices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "공지사항 등록에 실패했습니다.");
    }

    alert("공지사항이 등록되었습니다!");
    closeAddNoticeModal();

    // 중요 공지사항인 경우 상단 배너 업데이트
    if (data.is_important) {
      updateImportantNoticeBanner(data);
    }

    // 현재 페이지 재로딩 (첫 페이지로 이동해서 최신순 노출이 자연스러우면 1페이지 로드)
    await loadNoticesForPage(1);

    // 관리 모달이 열려있다면 목록 새로고침
    const managementModal = document.getElementById("noticeManagementModal");
    if (managementModal) {
      loadManagementNotices();
    }
  } catch (e) {
    console.error("saveNewNotice error", e);
    alert(e.message || "공지사항 등록에 실패했습니다.");
  }
}

// 공지사항 등록 모달 닫기
function closeAddNoticeModal() {
  const modal = document.getElementById("addNoticeModal");
  if (modal) {
    modal.remove();
  }
}

function showNoticeManagement() {
  // 공지사항 관리 모달 생성
  const modal = document.createElement("div");
  modal.id = "noticeManagementModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 20px; border-radius: 8px; max-width: 1200px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
        <h3 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">공지사항 관리</h3>
        <span class="close" onclick="closeNoticeManagementModal()" style="font-size: 28px; cursor: pointer; color: #6b7280; font-weight: bold;">&times;</span>
      </div>
      
      <!-- 관리 버튼들 -->
      <div class="management-buttons" style="display: flex; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <button class="btn btn-primary" onclick="showAddNoticeModal()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-plus"></i> 새 공지사항 등록
        </button>
        <button class="btn btn-secondary" onclick="showEditNoticeModal()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-edit"></i> 공지사항 수정
        </button>
        <button class="btn btn-danger" onclick="showDeleteNoticeModal()" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-trash"></i> 공지사항 삭제
        </button>
      </div>
      
      <!-- 공지사항 목록 -->
      <div class="notice-management-list" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: white;">
        <h4 style="margin: 0 0 16px 0; color: #374151; font-size: 18px; font-weight: 600;">등록된 공지사항 목록</h4>
        <div id="managementNoticeList" style="max-height: 400px; overflow-y: auto;">
          공지사항을 불러오는 중...
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 공지사항 목록 로드
  loadManagementNotices();
}

// 공지사항 관리용 목록 로드
async function loadManagementNotices() {
  const noticeList = document.getElementById("managementNoticeList");
  if (!noticeList) {
    console.error("managementNoticeList 요소를 찾을 수 없습니다.");
    return;
  }

  // 하드코딩된 공지사항 데이터 사용 (실제로는 API에서 가져와야 함)
  const notices = [
    {
      id: 1,
      title: "시스템 정기 점검 안내 (2025.08.30)",
      content:
        "더 나은 서비스 제공을 위해 시스템 정기 점검을 실시합니다. 점검 시간 동안 서비스 이용이 제한될 수 있으니 참고해 주시기 바랍니다.",
      category: "system",
      target_audience: "all",
      is_important: true,
      created_at: "2025-08-27T10:00:00Z",
      is_active: true,
    },
    {
      id: 2,
      title: "캠페인 등록 기능 개선 안내",
      content:
        "사용자 편의성 향상을 위해 캠페인 등록 프로세스를 개선했습니다. 더욱 직관적이고 빠른 캠페인 등록이 가능합니다.",
      category: "service",
      target_audience: "all",
      is_important: false,
      created_at: "2025-08-26T14:30:00Z",
      is_active: true,
    },
    {
      id: 3,
      title: "Troy 플랫폼 2.0 업데이트 완료",
      content:
        "Troy 플랫폼 2.0이 출시되었습니다. 새로운 대시보드, 향상된 분석 기능, 개선된 사용자 경험을 제공합니다.",
      category: "update",
      target_audience: "all",
      is_important: false,
      created_at: "2025-08-25T09:15:00Z",
      is_active: true,
    },
    {
      id: 4,
      title: "인플루언서 매칭 서비스 오픈",
      content:
        "새로운 인플루언서 매칭 서비스가 오픈되었습니다. AI 기반 추천으로 최적의 인플루언서를 찾아보세요.",
      category: "service",
      target_audience: "all",
      is_important: false,
      created_at: "2025-08-24T16:45:00Z",
      is_active: true,
    },
    {
      id: 5,
      title: "새로운 파트너사 등록 오픈",
      content:
        "Troy 플랫폼과 함께할 새로운 파트너사를 모집합니다. 다양한 혜택과 지원을 제공합니다.",
      category: "event",
      target_audience: "partner",
      is_important: false,
      created_at: "2025-08-23T11:20:00Z",
      is_active: true,
    },
  ];

  if (notices.length === 0) {
    noticeList.innerHTML =
      "<p style='text-align: center; color: #6b7280; padding: 20px;'>등록된 공지사항이 없습니다.</p>";
    return;
  }

  noticeList.innerHTML = notices
    .map(
      (notice) => `
      <div class="management-notice-item" data-notice-id="${
        notice.id
      }" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; background: white; transition: all 0.2s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h5 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600; flex: 1;">${
            notice.title
          }</h5>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${
              notice.is_important
                ? '<span style="padding: 2px 8px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 12px; font-weight: 500;">중요</span>'
                : ""
            }
            <span style="padding: 2px 8px; background: #f3f4f6; color: #6b7280; border-radius: 4px; font-size: 12px;">${getCategoryLabel(
              notice.category
            )}</span>
          </div>
        </div>
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.4;">${notice.content.substring(
          0,
          150
        )}${notice.content.length > 150 ? "..." : ""}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af;">
          <span>대상: ${getAudienceLabel(notice.target_audience)}</span>
          <span>등록일: ${new Date(
            notice.created_at
          ).toLocaleDateString()}</span>
        </div>
      </div>
    `
    )
    .join("");
}

// 대상 라벨 변환 함수
function getAudienceLabel(audience) {
  const labels = {
    all: "전체",
    advertiser: "광고주",
    agency: "대행사",
    partner: "파트너사",
  };
  return labels[audience] || audience;
}

// 공지사항 수정 모달 표시
function showEditNoticeModal() {
  // 권한 체크
  if (!checkPermission("update")) {
    return;
  }

  // 기존 모달이 남아있다면 제거하여 항상 새로 열리도록 처리
  const existing = document.getElementById("editNoticeModal");
  if (existing) existing.remove();

  // 먼저 공지사항 목록을 표시하여 수정할 공지사항을 선택할 수 있도록 함
  const modal = document.createElement("div");
  modal.id = "editNoticeModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 3% auto; padding: 24px; border-radius: 8px; max-width: 1000px; max-height: 85vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
        <h3 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 600;">공지사항 수정</h3>
        <span class="close" onclick="closeEditNoticeModal()" style="font-size: 24px; cursor: pointer; color: #6b7280; font-weight: bold;">&times;</span>
      </div>
      
      <div id="editNoticeSelectionArea">
        <p style="margin-bottom: 16px; color: #6b7280; font-size: 16px;">수정할 공지사항을 선택하세요:</p>
        <div id="editNoticeList" style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f8fafc;">
          공지사항을 불러오는 중...
        </div>
      </div>
      
      <div id="editNoticeFormArea" style="display: none;">
        <form id="editNoticeForm">
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">제목</label>
            <input type="text" id="editTitle" placeholder="공지사항 제목을 입력하세요" required 
                   style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">카테고리</label>
            <select id="editCategory" required 
                    style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
              <option value="">카테고리를 선택하세요</option>
              <option value="system">시스템</option>
              <option value="service">서비스</option>
              <option value="update">업데이트</option>
              <option value="event">이벤트</option>
              <option value="maintenance">점검</option>
            </select>
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">대상</label>
            <select id="editAudience" required 
                    style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
              <option value="">대상을 선택하세요</option>
              <option value="all">전체</option>
              <option value="advertiser">광고주</option>
              <option value="agency">대행사</option>
              <option value="partner">파트너사</option>
            </select>
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">내용</label>
            <textarea id="editContent" placeholder="공지사항 내용을 입력하세요" rows="8" required 
                      style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;"></textarea>
          </div>
          
          <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="editImportant" style="width: 18px; height: 18px;">
            <label for="editImportant" style="font-weight: 500; color: #374151; cursor: pointer;">중요 공지로 설정</label>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button type="button" onclick="closeEditNoticeModal()" 
                    style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
              취소
            </button>
            <button type="submit" 
                    style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
              수정
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 공지사항 목록 로드
  loadEditNotices();

  // 폼 제출 이벤트 리스너
  document.getElementById("editNoticeForm").onsubmit = async (e) => {
    e.preventDefault();
    await updateNotice();
  };

  // 열릴 때 항상 초기 상태로 (선택화면 노출, 폼 숨김, 선택 초기화)
  const selection = document.getElementById("editNoticeSelectionArea");
  const form = document.getElementById("editNoticeFormArea");
  if (selection && form) {
    selection.style.display = "block";
    form.style.display = "none";
  }
  window.selectedNoticeId = null;
}

// 수정용 공지사항 목록 로드
async function loadEditNotices() {
  const noticeList = document.getElementById("editNoticeList");
  if (!noticeList) {
    console.error("editNoticeList 요소를 찾을 수 없습니다.");
    return;
  }

  noticeList.innerHTML = "불러오는 중...";
  try {
    const token = localStorage.getItem("troy_token");
    const endpoint = token
      ? `/api/admin/notices?page=1&limit=50`
      : `/api/admin/notices/public?page=1&limit=50&audience=all`;
    const res = await fetch(endpoint, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error("공지사항을 불러올 수 없습니다.");
    const result = await res.json();
    const notices = result.notices || [];

    if (notices.length === 0) {
      noticeList.innerHTML =
        "<p style='text-align: center; color: #6b7280; padding: 20px;'>등록된 공지사항이 없습니다.</p>";
      return;
    }

    noticeList.innerHTML = notices
      .map((notice) => {
        const title = encodeURIComponent(notice.title || "");
        const content = encodeURIComponent(notice.content || "");
        const category = encodeURIComponent(notice.category || "");
        const audience = encodeURIComponent(notice.target_audience || "");
        const important = !!notice.is_important;
        return `
      <div class="edit-notice-item" data-notice-id="${notice.id}"
           data-title="${title}"
           data-content="${content}"
           data-category="${category}"
           data-audience="${audience}"
           data-important="${important}"
           style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s ease; background: white;">
        <h5 style="margin: 0 0 4px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
          ${notice.is_important ? "🚨 " : ""}${notice.title || ""}
        </h5>
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.4;">${(
          notice.content || ""
        ).substring(0, 100)}${
          (notice.content || "").length > 100 ? "..." : ""
        }</p>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="padding: 2px 6px; background: #f3f4f6; color: #6b7280; border-radius: 4px; font-size: 12px;">${getCategoryLabel(
            notice.category
          )}</span>
          ${
            notice.is_important
              ? '<span style="padding: 2px 6px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 12px;">중요</span>'
              : ""
          }
        </div>
      </div>`;
      })
      .join("");

    // 이벤트 위임으로 클릭 처리 (인코딩/인용부호 이슈 방지)
    if (!noticeList.dataset.boundClick) {
      noticeList.addEventListener("click", function (e) {
        const item = e.target.closest(".edit-notice-item");
        if (!item) return;
        const id = item.getAttribute("data-notice-id");
        const title = decodeURIComponent(item.getAttribute("data-title") || "");
        const content = decodeURIComponent(
          item.getAttribute("data-content") || ""
        );
        const category = decodeURIComponent(
          item.getAttribute("data-category") || ""
        );
        const audience = decodeURIComponent(
          item.getAttribute("data-audience") || ""
        );
        const isImportant = item.getAttribute("data-important") === "true";
        selectNoticeForEdit(
          id,
          title,
          content,
          category,
          audience,
          isImportant
        );
      });
      noticeList.dataset.boundClick = "1";
    }
  } catch (e) {
    console.error("loadEditNotices error", e);
    noticeList.innerHTML =
      "<p style='text-align: center; color: #ef4444; padding: 20px;'>공지사항을 불러오지 못했습니다.</p>";
  }
}

// 수정할 공지사항 선택
function selectNoticeForEdit(
  id,
  title,
  content,
  category,
  audience,
  isImportant
) {
  // 선택된 공지사항 하이라이트
  document.querySelectorAll(".edit-notice-item").forEach((item) => {
    item.style.backgroundColor = "white";
    item.style.borderColor = "#e5e7eb";
  });

  const selectedItem = document.querySelector(`[data-notice-id="${id}"]`);
  if (selectedItem) {
    selectedItem.style.backgroundColor = "#dbeafe";
    selectedItem.style.borderColor = "#3b82f6";
  }

  // 폼에 데이터 채우기
  document.getElementById("editTitle").value = title;
  document.getElementById("editContent").value = content;
  document.getElementById("editCategory").value = category;
  document.getElementById("editAudience").value = audience;
  document.getElementById("editImportant").checked = isImportant;

  // 현재 선택된 공지사항 ID 저장
  window.selectedNoticeId = id;

  // 수정 폼 표시
  document.getElementById("editNoticeSelectionArea").style.display = "none";
  document.getElementById("editNoticeFormArea").style.display = "block";
}

// 공지사항 수정
async function updateNotice() {
  // 권한 체크
  if (!checkPermission("update")) {
    return;
  }

  if (!window.selectedNoticeId) {
    alert("수정할 공지사항을 선택해주세요.");
    return;
  }

  const data = {
    title: document.getElementById("editTitle").value,
    content: document.getElementById("editContent").value,
    category: document.getElementById("editCategory").value,
    target_audience: document.getElementById("editAudience").value,
    is_important: document.getElementById("editImportant").checked,
  };

  try {
    const token = localStorage.getItem("troy_token");
    const res = await fetch(`/api/admin/notices/${window.selectedNoticeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "공지사항 수정에 실패했습니다.");
    }

    alert("공지사항이 수정되었습니다!");

    // 중요 공지사항인 경우 상단 배너 업데이트
    if (data.is_important) {
      updateImportantNoticeBanner(data);
    } else {
      // 중요 공지사항이 아닌 경우 기존 배너 제거
      const container = document.getElementById("important-notice-container");
      if (container) {
        container.innerHTML = "";
      }
      localStorage.removeItem("troy_important_notice");
    }

    // 메인 목록 갱신
    await loadNoticesForPage(window.currentPage || 1);

    // 수정 선택 화면으로 복귀하여 계속 수정 가능
    const selection = document.getElementById("editNoticeSelectionArea");
    const form = document.getElementById("editNoticeFormArea");
    if (selection && form) {
      selection.style.display = "block";
      form.style.display = "none";
      window.selectedNoticeId = null;
      await loadEditNotices();
    }

    // 관리 모달 목록도 갱신
    const managementModal = document.getElementById("noticeManagementModal");
    if (managementModal) {
      loadManagementNotices();
    }
  } catch (e) {
    console.error("updateNotice error", e);
    alert(e.message || "공지사항 수정에 실패했습니다.");
  }
}

// 공지사항 수정 모달 닫기
function closeEditNoticeModal() {
  const modal = document.getElementById("editNoticeModal");
  if (modal) {
    modal.remove();
  }
  window.selectedNoticeId = null;
}

// 공지사항 삭제 모달 표시
function showDeleteNoticeModal() {
  // 권한 체크
  if (!checkPermission("delete")) {
    return;
  }

  const modal = document.createElement("div");
  modal.id = "deleteNoticeModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 3% auto; padding: 24px; border-radius: 8px; max-width: 800px; max-height: 85vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
        <h3 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 600;">공지사항 삭제</h3>
        <span class="close" onclick="closeDeleteNoticeModal()" style="font-size: 24px; cursor: pointer; color: #6b7280; font-weight: bold;">&times;</span>
      </div>
      
      <div id="deleteNoticeSelectionArea">
        <p style="margin-bottom: 16px; color: #6b7280; font-size: 16px;">삭제할 공지사항을 선택하세요:</p>
        <div id="deleteNoticeList" style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f8fafc;">
          공지사항을 불러오는 중...
        </div>
      </div>
      
      <div id="deleteConfirmArea" style="display: none; text-align: center; padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-top: 20px;">
        <div style="color: #dc2626; font-size: 18px; font-weight: 600; margin-bottom: 16px;">
          ⚠️ 정말로 이 공지사항을 삭제하시겠습니까?
        </div>
        <p id="deleteNoticeTitle" style="color: #374151; font-size: 16px; margin-bottom: 20px; font-weight: 500;"></p>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">삭제된 공지사항은 복구할 수 없습니다.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button type="button" onclick="closeDeleteNoticeModal()" 
                  style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            취소
          </button>
          <button type="button" onclick="confirmDeleteNotice()" 
                  style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            삭제
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 공지사항 목록 로드
  loadDeleteNotices();
}

// 삭제용 공지사항 목록 로드
async function loadDeleteNotices() {
  const noticeList = document.getElementById("deleteNoticeList");
  if (!noticeList) {
    console.error("deleteNoticeList 요소를 찾을 수 없습니다.");
    return;
  }

  noticeList.innerHTML = "불러오는 중...";
  try {
    const token = localStorage.getItem("troy_token");
    const endpoint = token
      ? `/api/admin/notices?page=1&limit=50`
      : `/api/admin/notices/public?page=1&limit=50&audience=all`;
    const res = await fetch(endpoint, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error("공지사항을 불러올 수 없습니다.");
    const result = await res.json();
    const notices = result.notices || [];

    if (notices.length === 0) {
      noticeList.innerHTML =
        "<p style='text-align: center; color: #6b7280; padding: 20px;'>등록된 공지사항이 없습니다.</p>";
      return;
    }

    noticeList.innerHTML = notices
      .map(
        (notice) => `
      <div class="delete-notice-item" data-notice-id="${notice.id}" 
           style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s ease; background: white;" 
           onmouseover="this.style.backgroundColor='#fef2f2'; this.style.borderColor='#ef4444';" 
           onmouseout="this.style.backgroundColor='white'; this.style.borderColor='#e5e7eb';"
           data-title="${encodeURIComponent(notice.title || "")}">
        <h5 style="margin: 0 0 4px 0; color: #1f2937; font-size: 16px; font-weight: 600;">${
          notice.title
        }</h5>
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.4;">${(
          notice.content || ""
        ).substring(0, 100)}${
          (notice.content || "").length > 100 ? "..." : ""
        }</p>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="padding: 2px 6px; background: #f3f4f6; color: #6b7280; border-radius: 4px; font-size: 12px;">${getCategoryLabel(
            notice.category
          )}</span>
          ${
            notice.is_important
              ? '<span style="padding: 2px 6px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 12px;">중요</span>'
              : ""
          }
        </div>
      </div>
    `
      )
      .join("");

    // 삭제 리스트 클릭 이벤트 위임
    if (!noticeList.dataset.boundClick) {
      noticeList.addEventListener("click", function (e) {
        const item = e.target.closest(".delete-notice-item");
        if (!item) return;
        const id = item.getAttribute("data-notice-id");
        const title = decodeURIComponent(item.getAttribute("data-title") || "");
        selectNoticeForDelete(id, title);
      });
      noticeList.dataset.boundClick = "1";
    }
  } catch (e) {
    console.error("loadDeleteNotices error", e);
    noticeList.innerHTML =
      "<p style='text-align: center; color: #ef4444; padding: 20px;'>공지사항을 불러오지 못했습니다.</p>";
  }
}

// 삭제할 공지사항 선택
function selectNoticeForDelete(id, title) {
  // 선택된 공지사항 하이라이트
  document.querySelectorAll(".delete-notice-item").forEach((item) => {
    item.style.backgroundColor = "white";
    item.style.borderColor = "#e5e7eb";
  });

  const selectedItem = document.querySelector(`[data-notice-id="${id}"]`);
  if (selectedItem) {
    selectedItem.style.backgroundColor = "#fef2f2";
    selectedItem.style.borderColor = "#ef4444";
  }

  // 현재 선택된 공지사항 ID와 제목 저장
  window.selectedNoticeId = id;
  window.selectedNoticeTitle = title;

  // 삭제할 공지사항 제목 표시
  document.getElementById("deleteNoticeTitle").textContent = `"${title}"`;

  // 삭제 확인 영역 표시
  document.getElementById("deleteNoticeSelectionArea").style.display = "none";
  document.getElementById("deleteConfirmArea").style.display = "block";
}

// 공지사항 삭제 확인
async function confirmDeleteNotice() {
  // 권한 체크
  if (!checkPermission("delete")) {
    return;
  }

  if (!window.selectedNoticeId) {
    alert("삭제할 공지사항을 선택해주세요.");
    return;
  }

  try {
    const token = localStorage.getItem("troy_token");
    if (!token) throw new Error("관리자 인증이 필요합니다.");
    const res = await fetch(`/api/admin/notices/${window.selectedNoticeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "공지사항 삭제에 실패했습니다.");
    }

    alert("공지사항이 삭제되었습니다!");
    closeDeleteNoticeModal();

    // 중요 공지사항 배너 제거 (삭제된 공지사항이 중요 공지사항이었을 수 있음)
    const container = document.getElementById("important-notice-container");
    if (container) {
      container.innerHTML = "";
    }
    localStorage.removeItem("troy_important_notice");

    // 목록/페이지 새로고침
    await loadNoticesForPage(window.currentPage || 1);

    // 관리 모달이 열려있다면 목록 새로고침
    const managementModal = document.getElementById("noticeManagementModal");
    if (managementModal) {
      loadManagementNotices();
    }
  } catch (e) {
    console.error("confirmDeleteNotice error", e);
    alert(e.message || "공지사항 삭제에 실패했습니다.");
  }
}

// 공지사항 삭제 모달 닫기
function closeDeleteNoticeModal() {
  const modal = document.getElementById("deleteNoticeModal");
  if (modal) {
    modal.remove();
  }
  window.selectedNoticeId = null;
  window.selectedNoticeTitle = null;
}

// 공지사항 관리 모달 닫기
function closeNoticeManagementModal() {
  const modal = document.getElementById("noticeManagementModal");
  if (modal) {
    modal.remove();
  }
}

// 컴포넌트 초기화
function initNoticeBoardComponent() {
  console.log("initNoticeBoardComponent 함수 호출됨!");

  // 기본적으로 대행사 역할로 설정 (관리자가 아닌 경우)
  if (!localStorage.getItem("userRole")) {
    localStorage.setItem("userRole", "agency");
    console.log("기본 역할을 대행사로 설정했습니다.");
  }

  // 관리자 컨트롤 표시/숨김
  toggleAdminControls();

  // 중요 공지사항 로드
  loadImportantNotice();

  // 페이지네이션 초기화
  initPagination();

  // 검색 입력창 엔터키 이벤트
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        applyFilters();
      }
    });
  }

  // 카테고리 필터 변경 이벤트
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", applyFilters);
  }

  // 페이지네이션 초기화
  initPagination();

  // 첫 번째 페이지 공지사항 로드
  loadNoticesForPage(1);

  // 관리자 권한 확인 및 버튼 표시
  checkAdminPermissions();
}

// DOM 로드 완료 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  initNoticeBoardComponent();
});

// 페이지네이션 기능
let currentPage = 1;
let totalPages = 1;
let totalNotices = 0;
const PAGE_SIZE = 6; // 페이지당 공지 개수

// 전역 변수로 설정 (다른 스크립트에서 접근 가능)
window.currentPage = currentPage;

// 페이지네이션 초기화
function initPagination() {
  const pagination = document.querySelector(".pagination");
  if (!pagination) return;

  // 페이지 버튼 이벤트 리스너 추가
  const pageButtons = pagination.querySelectorAll(".page-btn");
  pageButtons.forEach((btn, index) => {
    btn.addEventListener("click", function () {
      if (btn.disabled) return;

      if (index === 0) {
        // 이전 버튼
        if (currentPage > 1) {
          goToPage(currentPage - 1);
        }
      } else if (index === pageButtons.length - 1) {
        // 다음 버튼
        if (currentPage < totalPages) {
          goToPage(currentPage + 1);
        }
      } else {
        // 페이지 번호 버튼
        // 실제 페이지 번호는 버튼의 텍스트 내용에서 파싱
        const targetPage = parseInt(btn.textContent, 10);
        if (!isNaN(targetPage)) {
          goToPage(targetPage);
        }
      }
    });
  });

  updatePaginationInfo();
}

// 페이지 이동
function goToPage(page) {
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  window.currentPage = currentPage; // 전역 변수 업데이트
  updatePaginationButtons();
  updatePaginationInfo();

  // 실제로는 여기서 해당 페이지의 공지사항을 로드
  loadNoticesForPage(page);
}

// 페이지네이션 버튼 상태 업데이트
function updatePaginationButtons() {
  const pagination = document.querySelector(".pagination");
  if (!pagination) return;

  const pageButtons = pagination.querySelectorAll(".page-btn");

  // 이전 버튼
  pageButtons[0].disabled = currentPage === 1;

  // 다음 버튼
  pageButtons[pageButtons.length - 1].disabled = currentPage === totalPages;

  // 페이지 번호 버튼들
  for (let i = 1; i < pageButtons.length - 1; i++) {
    const btn = pageButtons[i];
    const pageNum = parseInt(btn.textContent, 10);
    btn.classList.toggle("active", pageNum === currentPage);
    btn.disabled = pageNum === currentPage;
  }
}

// 페이지네이션 정보 업데이트
function updatePaginationInfo() {
  const paginationInfo = document.querySelector(".pagination-info");
  if (!paginationInfo) return;

  const startItem = totalNotices === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalNotices);

  paginationInfo.textContent = `총 ${totalNotices}개의 공지사항 (${startItem}-${endItem} / ${totalNotices})`;
}

// 총 페이지 수에 맞게 페이지네이션 버튼을 렌더링
function renderPagination() {
  const pagination = document.querySelector(".pagination");
  if (!pagination) return;

  // 기존 버튼 제거 후 재생성: Prev, page numbers, Next
  pagination.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.textContent = "‹";
  pagination.appendChild(prevBtn);

  for (let page = 1; page <= totalPages; page++) {
    const btn = document.createElement("button");
    btn.className = "page-btn";
    btn.textContent = String(page);
    if (page === currentPage) {
      btn.classList.add("active");
      btn.disabled = true;
    }
    pagination.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.textContent = "›";
  pagination.appendChild(nextBtn);
}

// 해당 페이지의 공지사항 로드 (실제 API 호출)
async function loadNoticesForPage(page) {
  console.log(`페이지 ${page}의 공지사항을 로드합니다.`);

  const noticeList = document.querySelector(".notice-list");
  if (noticeList) {
    noticeList.style.opacity = "0.5";
  }

  try {
    // 실제 API 호출
    const response = await fetch(
      `/api/admin/notices/public?page=${page}&limit=${PAGE_SIZE}&audience=all`
    );

    if (!response.ok) {
      throw new Error("공지사항을 불러올 수 없습니다.");
    }

    const result = await response.json();
    const allNotices = result.notices || [];

    // 중요 공지사항 제외 (is_important가 true인 공지사항 필터링)
    const notices = allNotices.filter((notice) => !notice.is_important);

    const pagination = result.pagination || {};

    // 페이지네이션 정보 업데이트 (중요 공지사항 제외한 개수로 조정)
    totalPages = pagination.totalPages || 1;
    totalNotices = notices.length; // 중요 공지사항 제외한 실제 개수
    currentPage = pagination.currentPage || 1;
    window.currentPage = currentPage; // 전역 변수 업데이트

    // 페이지네이션 버튼 렌더링 및 이벤트 재바인딩
    renderPagination();
    initPagination();

    // 공지사항 목록 업데이트 - 카테고리를 제목 오른쪽(헤더 우측)으로 이동
    if (noticeList && notices.length > 0) {
      // 기존 공지사항 아이템들 제거 (새로 로드된 것만)
      const existingItems = noticeList.querySelectorAll(
        '.notice-item[data-loaded="true"]'
      );
      existingItems.forEach((item) => item.remove());

      // 새로운 공지사항 아이템들 추가
      const newItems = notices
        .map(
          (notice) => `
         <div class="notice-item ${notice.is_important ? "important" : ""} ${
            !notice.is_active ? "inactive" : ""
          }" onclick="openNoticeDetail('${notice.id}')" data-loaded="true">
           <div class="notice-content">
             <div class="notice-header">
               <h3 class="notice-title ${
                 notice.is_important ? "important" : ""
               }">${notice.title}
                 <span class="tag ${notice.category}">${getCategoryLabel(
            notice.category
          )}</span>
               </h3>
               <div class="notice-meta">
                 ${
                   notice.is_important
                     ? '<span class="tag important">중요</span>'
                     : ""
                 }
                 <span class="notice-date">${new Date(
                   notice.created_at
                 ).toLocaleDateString()}</span>
                 <span class="notice-views">조회 ${getViewCount(
                   notice.id
                 )}</span>
               </div>
             </div>
             <p class="notice-preview">${notice.content}</p>
           </div>
         </div>
       `
        )
        .join("");

      noticeList.insertAdjacentHTML("beforeend", newItems);
    } else if (noticeList) {
      // 기존 아이템들 제거하고 빈 메시지 표시
      noticeList.innerHTML = "<p>등록된 공지사항이 없습니다.</p>";
    }

    // 페이지네이션 버튼 업데이트
    updatePaginationButtons();
    updatePaginationInfo();

    // 공지사항 로드 후 관리자 컨트롤 표시/숨김 처리
    toggleAdminControls();
  } catch (error) {
    console.error("공지사항 로드 실패:", error);
    if (noticeList) {
      noticeList.innerHTML =
        '<p style="color: #ef4444;">공지사항을 불러올 수 없습니다.</p>';
    }
  } finally {
    if (noticeList) {
      noticeList.style.opacity = "1";
    }
  }
}

// 카테고리 라벨 변환 함수
function getCategoryLabel(category) {
  const labels = {
    system: "시스템",
    service: "서비스",
    update: "업데이트",
    event: "이벤트",
    maintenance: "점검",
  };
  return labels[category] || category;
}

// 관리자 권한 확인 및 버튼 표시
function checkAdminPermissions() {
  const userRole = getCurrentUserRole();
  const adminControls = document.getElementById("adminControls");

  if (adminControls) {
    if (userRole === "admin") {
      adminControls.style.display = "block";
    } else {
      adminControls.style.display = "none";
    }
  }
}

// 테스트용 역할 설정 함수
function setUserRole(role) {
  localStorage.setItem("userRole", role);
  console.log(`사용자 역할이 ${role}로 설정되었습니다.`);

  // 즉시 반영
  setTimeout(() => {
    toggleAdminControls();
  }, 100);

  // 추가로 1초 후에도 한번 더 확인
  setTimeout(() => {
    toggleAdminControls();
  }, 1000);
}

// 중요 공지사항 배너 업데이트
function updateImportantNoticeBanner(noticeData) {
  const container = document.getElementById("important-notice-container");
  if (!container) return;

  const currentDate = new Date().toISOString().split("T")[0].replace(/-/g, ".");

  container.innerHTML = `
    <div class="important-notice-banner" onclick="openImportantNoticeModal('${
      noticeData.id || Date.now()
    }')" style="cursor: pointer;">
      <div class="banner-content">
        <div class="banner-icon">🚨</div>
        <div class="banner-text">
          <div class="banner-title">${noticeData.title}</div>
          <div class="banner-desc">${noticeData.content.substring(0, 100)}${
    noticeData.content.length > 100 ? "..." : ""
  }</div>
        </div>
        <div class="banner-date">${currentDate}</div>
      </div>
    </div>
  `;

  // 로컬 스토리지에 저장
  const importantNotice = {
    title: noticeData.title,
    content: noticeData.content,
    date: currentDate,
    id: noticeData.id || Date.now(),
    updated: new Date().toISOString(),
  };
  localStorage.setItem(
    "troy_important_notice",
    JSON.stringify(importantNotice)
  );
}

// 중요 공지사항 모달 열기
function openImportantNoticeModal(noticeId) {
  // 조회수 증가
  incrementViewCount(noticeId);

  // 로컬 스토리지에서 중요 공지사항 정보 가져오기
  const saved = localStorage.getItem("troy_important_notice");
  if (!saved) {
    alert("중요 공지사항 정보를 찾을 수 없습니다.");
    return;
  }

  try {
    const importantNotice = JSON.parse(saved);

    // 모달 생성
    const modal = document.createElement("div");
    modal.id = "importantNoticeModal";
    modal.className = "modal";
    modal.style.cssText =
      "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

    modal.innerHTML = `
      <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 32px; border-radius: 12px; max-width: 800px; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">🚨</span>
            <h3 style="margin: 0; color: #1f2937; font-size: 22px; font-weight: 700;">중요 공지사항</h3>
          </div>
          <span class="close" onclick="closeImportantNoticeModal()" style="font-size: 28px; cursor: pointer; color: #6b7280; font-weight: bold;">&times;</span>
        </div>
        
        <div class="modal-body" style="background-color: #FFFFFF !important;">
          <h2 style="color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 24px; line-height: 1.3; background-color: #FFFFFF !important;">
            ${importantNotice.title}
          </h2>
          
          <div style="background: #FFFFFF; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #374151; font-size: 18px; line-height: 1.7; margin: 0; background-color: #FFFFFF !important;">
              ${importantNotice.content}
            </p>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; color: #6b7280; font-size: 16px; border-top: 1px solid #e5e7eb; padding-top: 20px; background-color: #FFFFFF !important;">
            <span>등록일: ${importantNotice.date}</span>
            <span>조회수: ${getViewCount(noticeId)}</span>
          </div>
        </div>
        
        <div class="modal-footer" style="margin-top: 20px; text-align: right;">
          <button onclick="closeImportantNoticeModal()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            닫기
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 모달 외부 클릭 시 닫기
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeImportantNoticeModal();
      }
    });
  } catch (error) {
    console.error("중요 공지사항 모달 열기 실패:", error);
    alert("중요 공지사항을 불러올 수 없습니다.");
  }
}

// 중요 공지사항 모달 닫기
function closeImportantNoticeModal() {
  const modal = document.getElementById("importantNoticeModal");
  if (modal) {
    modal.remove();
  }
}

// 중요 공지사항 로드 (페이지 로드 시)
function loadImportantNotice() {
  const saved = localStorage.getItem("troy_important_notice");
  if (saved) {
    try {
      const importantNotice = JSON.parse(saved);
      const container = document.getElementById("important-notice-container");
      if (container) {
        container.innerHTML = `
          <div class="important-notice-banner" onclick="openImportantNoticeModal('${
            importantNotice.id || Date.now()
          }')" style="cursor: pointer;">
            <div class="banner-content">
              <div class="banner-icon">🚨</div>
              <div class="banner-text">
                <div class="banner-title">${importantNotice.title}</div>
                <div class="banner-desc">${importantNotice.content.substring(
                  0,
                  100
                )}${importantNotice.content.length > 100 ? "..." : ""}</div>
              </div>
              <div class="banner-date">${importantNotice.date}</div>
            </div>
          </div>
        `;
      }
    } catch (e) {
      console.error("중요 공지사항 로드 실패:", e);
    }
  }
}

// 동적으로 로드된 경우를 위한 초기화 함수
window.initNoticeBoardComponent = initNoticeBoardComponent;
window.loadNoticesForPage = loadNoticesForPage;
window.setUserRole = setUserRole; // 테스트용 함수를 전역으로 노출
window.openNoticeDetail = openNoticeDetail;
window.closeNoticeDetailModal = closeNoticeDetailModal;
window.showNoticeDetail = showNoticeDetail;
window.showNoticeList = showNoticeList;
window.openImportantNoticeModal = openImportantNoticeModal;
window.closeImportantNoticeModal = closeImportantNoticeModal;

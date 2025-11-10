/**
 * 알림 센터 컴포넌트
 * 목적: 관리자 페이지에서 알림을 관리하고 표시
 */

let currentNotificationPage = 1;
let currentNotificationFilter = "all";
let totalNotificationPages = 1;
let cachedAdminNotifications = [];

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

function adminHeaders() {
  const token = getAdminToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// 알림 센터 초기화
function initNotificationCenter() {
  loadNotifications();
  setupNotificationFilters();
  setupNotificationEventListeners();
}

// 알림 목록 로드 (실제 API)
async function loadNotifications() {
  try {
    // 한 번에 100개까지 로드 후 클라이언트에서 필터/페이지 처리
    const res = await fetch(`/api/admin/notifications?page=1&limit=100`, {
      headers: adminHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("notifications fetch failed");
    const data = await res.json();
    const apiList = Array.isArray(data.notifications)
      ? data.notifications
      : Array.isArray(data.items)
      ? data.items
      : [];

    // 캐시 저장
    cachedAdminNotifications = apiList;

    // 필요 시 로컬 생성 알림과 병합 (최신 우선)
    const merged = [...globalNotifications, ...apiList];

    // 필터 → 페이지네이션
    const filtered = filterNotificationsByType(
      merged,
      currentNotificationFilter
    );
    const pageSize = 10;
    const paginated = paginateNotifications(
      filtered,
      currentNotificationPage,
      pageSize
    );

    renderNotifications(paginated);
    renderNotificationPagination({
      currentPage: currentNotificationPage,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      hasNext: currentNotificationPage < Math.ceil(filtered.length / pageSize),
      hasPrev: currentNotificationPage > 1,
    });
  } catch (error) {
    console.error("알림 로드 오류:", error);
    showNotification("알림을 불러오는데 실패했습니다.", "error");
  }
}

// 전역 알림 저장소
let globalNotifications = [];

// 캠페인 상태 변화 알림 생성 함수들
function createCampaignRegistrationNotification(campaignData) {
  const notification = {
    id: `campaign_reg_${Date.now()}`,
    title: "새 캠페인 등록",
    message: `${campaignData.user_name}(${campaignData.company})님이 '${campaignData.campaign_name}' 캠페인을 등록했습니다.`,
    type: "campaign_registration",
    user_name: campaignData.user_name,
    company: campaignData.company,
    user_type: campaignData.user_type,
    campaign_name: campaignData.campaign_name,
    campaign_id: campaignData.campaign_id,
    campaign_data: campaignData,
    is_read: false,
    priority: "high",
    created_at: new Date().toISOString(),
  };

  addNotification(notification);
  return notification;
}

function createPaymentConfirmationNotification(campaignData) {
  const notification = {
    id: `payment_conf_${Date.now()}`,
    title: "입금 확인 완료",
    message: `${campaignData.user_name}(${campaignData.company})님의 '${campaignData.campaign_name}' 캠페인 입금이 확인되었습니다. 승인 대기 중입니다.`,
    type: "payment_confirmation",
    user_name: campaignData.user_name,
    company: campaignData.company,
    user_type: campaignData.user_type,
    campaign_name: campaignData.campaign_name,
    campaign_id: campaignData.campaign_id,
    amount: campaignData.amount,
    campaign_data: campaignData,
    is_read: false,
    priority: "high",
    created_at: new Date().toISOString(),
  };

  addNotification(notification);
  return notification;
}

function createApprovalCompletionNotification(campaignData) {
  const notification = {
    id: `approval_comp_${Date.now()}`,
    title: "캠페인 승인 완료",
    message: `${campaignData.user_name}(${campaignData.company})님의 '${campaignData.campaign_name}' 캠페인이 승인되었습니다.`,
    type: "approval_completion",
    user_name: campaignData.user_name,
    company: campaignData.company,
    user_type: campaignData.user_type,
    campaign_name: campaignData.campaign_name,
    campaign_id: campaignData.campaign_id,
    campaign_data: campaignData,
    is_read: false,
    priority: "normal",
    created_at: new Date().toISOString(),
  };

  addNotification(notification);
  return notification;
}

// 알림 추가 함수
function addNotification(notification) {
  globalNotifications.unshift(notification); // 최신 알림을 맨 앞에 추가

  // 알림 목록이 너무 길어지면 오래된 것 제거 (최대 100개)
  if (globalNotifications.length > 100) {
    globalNotifications = globalNotifications.slice(0, 100);
  }

  // 실시간으로 알림 목록 업데이트
  if (document.querySelector(".notification-center")) {
    loadNotifications();
  }

  // 브라우저 알림 표시 (권한이 있는 경우)
  showBrowserNotification(notification);
}

// 브라우저 알림 표시
function showBrowserNotification(notification) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(notification.title, {
      body: notification.message,
      icon: "/favicon.ico",
      tag: notification.id,
    });
  }
}

// 브라우저 알림 권한 요청
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// 샘플 알림 데이터 생성
function getSampleNotifications() {
  // 기존 샘플 데이터와 전역 알림 데이터를 합침
  const sampleData = [
    {
      id: "1",
      title: "계좌이체 요청",
      message:
        "김철수(ABC마케팅)님이 '여름 프로모션' 캠페인 계좌이체를 요청했습니다.",
      type: "payment_request",
      user_name: "김철수",
      company: "ABC마케팅",
      user_type: "광고주",
      amount: 500000,
      campaign_name: "여름 프로모션",
      is_read: false,
      priority: "high",
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5분 전
    },
    {
      id: "2",
      title: "계좌이체 완료",
      message:
        "이영희(XYZ대행사)님이 '신제품 런칭' 캠페인 계좌이체를 완료했습니다.",
      type: "payment_completed",
      user_name: "이영희",
      company: "XYZ대행사",
      user_type: "대행사",
      amount: 1200000,
      campaign_name: "신제품 런칭",
      is_read: false,
      priority: "normal",
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15분 전
    },
    {
      id: "3",
      title: "1:1 문의 등록",
      message: "박민수(DEF파트너사)님이 '정산 관련 문의'를 등록했습니다.",
      type: "inquiry",
      user_name: "박민수",
      company: "DEF파트너사",
      user_type: "파트너사",
      inquiry_type: "정산 관련",
      is_read: true,
      priority: "high",
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30분 전
    },
    {
      id: "3-1",
      title: "캠페인 문의 등록",
      message:
        "김영희(ABC광고주)님이 '여름 프로모션' 캠페인에 대해 문의를 등록했습니다.",
      type: "campaign_inquiry",
      user_name: "김영희",
      company: "ABC광고주",
      user_type: "광고주",
      campaign_name: "여름 프로모션",
      campaign_id: "CAMP001",
      inquiry_content:
        "캠페인 일정 변경이 가능한지 문의드립니다. 원래 7월 15일 시작 예정이었는데 7월 20일로 연기하고 싶습니다.",
      is_read: false,
      priority: "high",
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20분 전
    },
    {
      id: "3-2",
      title: "캠페인 문의 등록",
      message:
        "이준호(XYZ파트너사)님이 '신제품 런칭' 캠페인에 대해 문의를 등록했습니다.",
      type: "campaign_inquiry",
      user_name: "이준호",
      company: "XYZ파트너사",
      user_type: "파트너사",
      campaign_name: "신제품 런칭",
      campaign_id: "CAMP002",
      inquiry_content:
        "캠페인 예산을 20% 증가시켜서 더 많은 타겟팅을 하고 싶습니다. 가능한지 확인 부탁드립니다.",
      is_read: false,
      priority: "normal",
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45분 전
    },
    {
      id: "4",
      title: "캠페인 완료",
      message:
        "최지영(GHI광고주)님의 '블랙프라이데이' 캠페인이 완료되었습니다.",
      type: "campaign_completed",
      user_name: "최지영",
      company: "GHI광고주",
      user_type: "광고주",
      campaign_name: "블랙프라이데이",
      completion_rate: 100,
      is_read: false,
      priority: "normal",
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1시간 전
    },
    {
      id: "5",
      title: "캠페인 승인 요청",
      message:
        "정수현(JKL대행사)님이 '봄맞이 이벤트' 캠페인 승인을 요청했습니다.",
      type: "campaign_approval",
      user_name: "정수현",
      company: "JKL대행사",
      user_type: "대행사",
      campaign_name: "봄맞이 이벤트",
      is_read: true,
      priority: "normal",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
    },
    {
      id: "6",
      title: "진행률 업데이트",
      message:
        "한소영(MNO파트너사)님의 '크리스마스 이벤트' 캠페인 진행률이 75%입니다.",
      type: "progress_update",
      user_name: "한소영",
      company: "MNO파트너사",
      user_type: "파트너사",
      campaign_name: "크리스마스 이벤트",
      progress_rate: 75,
      is_read: false,
      priority: "low",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3시간 전
    },
    {
      id: "7",
      title: "회원가입 요청",
      message: "신규 파트너사 'VWX마케팅'이 가입을 요청했습니다.",
      type: "member_signup",
      user_name: "VWX마케팅",
      company: "VWX마케팅",
      user_type: "파트너사",
      is_read: true,
      priority: "normal",
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6시간 전
    },
    {
      id: "8",
      title: "정산 완료",
      message: "PQR광고주의 12월 정산이 완료되었습니다. 정산 금액: 2,500,000원",
      type: "settlement_completed",
      user_name: "PQR광고주",
      company: "PQR광고주",
      user_type: "광고주",
      amount: 2500000,
      is_read: false,
      priority: "normal",
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12시간 전
    },
    {
      id: "9",
      title: "진행률 경고",
      message: "STU대행사의 '신년 프로모션' 캠페인 진행률이 20%로 낮습니다.",
      type: "progress_warning",
      user_name: "STU대행사",
      company: "STU대행사",
      user_type: "대행사",
      campaign_name: "신년 프로모션",
      progress_rate: 20,
      is_read: false,
      priority: "high",
      created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // 18시간 전
    },
    {
      id: "10",
      title: "계좌이체 완료",
      message: "YZA광고주님이 '신제품 런칭' 캠페인 계좌이체를 완료했습니다.",
      type: "payment_completed",
      user_name: "YZA광고주",
      company: "YZA광고주",
      user_type: "광고주",
      amount: 800000,
      campaign_name: "신제품 런칭",
      is_read: false,
      priority: "normal",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
    },
    {
      id: "11",
      title: "캠페인 수정 요청",
      message: "BCD대행사에서 '봄맞이 이벤트' 캠페인 수정을 요청했습니다.",
      type: "campaign_modification",
      user_name: "BCD대행사",
      company: "BCD대행사",
      user_type: "대행사",
      campaign_name: "봄맞이 이벤트",
      is_read: true,
      priority: "normal",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
    },
    {
      id: "12",
      title: "원고 수신",
      message: "GHI광고주님이 '블랙프라이데이' 캠페인의 원고를 수신했습니다.",
      type: "manuscript_received",
      user_name: "GHI광고주",
      company: "GHI광고주",
      user_type: "광고주",
      campaign_name: "블랙프라이데이",
      campaign_id: "CAMP003",
      is_read: false,
      priority: "normal",
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1시간 전
    },
    {
      id: "13",
      title: "원고 요청",
      message: "JKL대행사가 '봄맞이 이벤트' 캠페인의 원고를 요청했습니다.",
      type: "manuscript_requested",
      user_name: "JKL대행사",
      company: "JKL대행사",
      user_type: "대행사",
      campaign_name: "봄맞이 이벤트",
      campaign_id: "CAMP004",
      is_read: false,
      priority: "normal",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
    },
    {
      id: "14",
      title: "원고 업데이트",
      message:
        "MNO파트너사가 '크리스마스 이벤트' 캠페인의 원고를 업데이트했습니다.",
      type: "manuscript_updated",
      user_name: "MNO파트너사",
      company: "MNO파트너사",
      user_type: "파트너사",
      campaign_name: "크리스마스 이벤트",
      campaign_id: "CAMP005",
      is_read: false,
      priority: "normal",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3시간 전
    },
  ];

  // 전역 알림 데이터와 샘플 데이터를 합쳐서 반환
  return [...globalNotifications, ...sampleData];
}

// 알림 타입별 필터링
function filterNotificationsByType(notifications, filterType) {
  if (filterType === "all") {
    return notifications;
  }

  // 카테고리별 필터링
  const categoryFilters = {
    payment: ["payment_request", "payment_completed", "payment_confirmation"],
    campaign: [
      "campaign_completed",
      "campaign_approval",
      "campaign_modification",
      "campaign_inquiry",
      "campaign_registration",
      "approval_completion",
    ],
    progress: ["progress_update", "progress_warning"],
    inquiry: ["inquiry", "campaign_inquiry"],
    member: ["member_signup"],
    settlement: ["settlement_completed"],
    manuscript: [
      "manuscript_received",
      "manuscript_requested",
      "manuscript_updated",
    ],
  };

  if (categoryFilters[filterType]) {
    return notifications.filter((notification) =>
      categoryFilters[filterType].includes(notification.type)
    );
  }

  return notifications.filter(
    (notification) => notification.type === filterType
  );
}

// 알림 페이지네이션
function paginateNotifications(notifications, page, limit) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return notifications.slice(startIndex, endIndex);
}

// 알림 목록 렌더링
function renderNotifications(notifications) {
  const notificationList = document.getElementById("notificationList");
  if (!notificationList) return;

  if (notifications.length === 0) {
    notificationList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
        <p style="color: #6b7280; font-size: 16px;">알림이 없습니다.</p>
      </div>
    `;
    return;
  }

  const notificationsHTML = notifications
    .map(
      (notification) => `
    <div class="notification-item ${notification.is_read ? "" : "unread"} ${
        notification.priority || "normal"
      }" 
         onclick="openNotificationDetail('${notification.id}')">
      <div class="notification-icon ${notification.type}">
        <i class="fas ${getNotificationIcon(notification.type)}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-header">
          <h4 class="notification-title">${notification.title}</h4>
          ${
            notification.priority === "high"
              ? '<span class="priority-badge high">긴급</span>'
              : ""
          }
          ${
            notification.priority === "low"
              ? '<span class="priority-badge low">낮음</span>'
              : ""
          }
        </div>
        <p class="notification-message">${notification.message}</p>
        <div class="notification-meta">
          <div class="notification-user-info">
            ${
              notification.user_name
                ? `<span class="user-name">${notification.user_name}</span>`
                : ""
            }
            ${
              notification.company
                ? `<span class="company-name">(${notification.company})</span>`
                : ""
            }
            ${
              notification.user_type
                ? `<span class="user-type">${notification.user_type}</span>`
                : ""
            }
          </div>
          <div class="notification-details">
            <span class="notification-type">${getNotificationTypeLabel(
              notification.type
            )}</span>
            <span class="notification-time">
              <i class="fas fa-clock"></i>
              ${formatTimeAgo(notification.created_at)}
            </span>
          </div>
        </div>
        ${
          !notification.is_read
            ? `
        <div class="notification-actions-item">
          <button class="btn-notification btn-mark-read" 
                  onclick="event.stopPropagation(); markAsRead('${notification.id}')">
            <i class="fas fa-check"></i> 읽음 처리
          </button>
        </div>
        `
            : ""
        }
      </div>
    </div>
  `
    )
    .join("");

  notificationList.innerHTML = notificationsHTML;
}

// 알림 타입별 아이콘 반환
function getNotificationIcon(type) {
  const icons = {
    payment_request: "fa-university",
    payment_completed: "fa-check-circle",
    payment_confirmation: "fa-money-bill-wave",
    campaign_completed: "fa-flag-checkered",
    campaign_approval: "fa-clipboard-check",
    campaign_modification: "fa-edit",
    campaign_inquiry: "fa-comments",
    campaign_registration: "fa-plus-circle",
    approval_completion: "fa-check-double",
    progress_update: "fa-chart-line",
    progress_warning: "fa-exclamation-circle",
    inquiry: "fa-question-circle",
    member_signup: "fa-user-plus",
    settlement_completed: "fa-coins",
    manuscript_received: "fa-file-alt",
    manuscript_requested: "fa-file-signature",
    manuscript_updated: "fa-file-import",
  };
  return icons[type] || "fa-bell";
}

// 알림 타입별 라벨 반환
function getNotificationTypeLabel(type) {
  const labels = {
    payment_request: "계좌이체요청",
    payment_completed: "계좌이체완료",
    payment_confirmation: "입금확인완료",
    campaign_completed: "캠페인완료",
    campaign_approval: "캠페인승인",
    campaign_modification: "캠페인수정",
    campaign_inquiry: "캠페인문의",
    campaign_registration: "캠페인등록",
    approval_completion: "승인완료",
    progress_update: "진행률업데이트",
    progress_warning: "진행률경고",
    inquiry: "문의",
    member_signup: "회원가입",
    settlement_completed: "정산완료",
    manuscript_received: "원고수신",
    manuscript_requested: "원고요청",
    manuscript_updated: "원고업데이트",
  };
  return labels[type] || "알림";
}

// 시간 포맷팅 (몇 분 전, 몇 시간 전 등)
function formatTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "방금 전";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}일 전`;

  return date.toLocaleDateString("ko-KR");
}

// 알림 필터 설정
function setupNotificationFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // 모든 버튼에서 active 클래스 제거
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      // 클릭한 버튼에 active 클래스 추가
      button.classList.add("active");

      // 필터 업데이트
      currentNotificationFilter = button.dataset.type;
      currentNotificationPage = 1;
      loadNotifications();
    });
  });
}

// 알림 이벤트 리스너 설정
function setupNotificationEventListeners() {
  // 새로고침 버튼
  const refreshBtn = document.querySelector(
    '[onclick="refreshNotifications()"]'
  );
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadNotifications();
    });
  }
}

// 알림 상세보기 (실제 API)
async function openNotificationDetail(notificationId) {
  try {
    let notification = null;
    try {
      const res = await fetch(`/api/admin/notifications/${notificationId}`, {
        headers: adminHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const row = Array.isArray(data.notification)
          ? data.notification[0]
          : data.notification || data;
        notification = row || null;
      }
    } catch (_) {}

    // Fallback: 캐시/샘플에서 찾기
    if (!notification) {
      const sampleNotifications = getSampleNotifications();
      notification = sampleNotifications.find((n) => n.id === notificationId);
    }

    if (notification) {
      // 캠페인 관련 알림인 경우 캠페인 상세 페이지로 이동
      if (isCampaignRelatedNotification(notification)) {
        navigateToCampaignDetail(notification);
        return;
      }

      // 캠페인 문의인 경우 특별한 모달 표시
      if (notification.type === "campaign_inquiry") {
        showCampaignInquiryModal(notification);
      } else {
        const modal = document.getElementById("notificationModal");
        const title = document.getElementById("notificationModalTitle");
        const content = document.getElementById("notificationModalContent");

        title.textContent = notification.title;
        content.innerHTML = `
          <div class="notification-detail">
            <h4 class="notification-title">${notification.title}</h4>
            <p class="notification-message">${notification.message}</p>
            <div class="notification-meta">
              <span class="notification-type">${getNotificationTypeLabel(
                notification.type
              )}</span>
              <span class="notification-time">
                <i class="fas fa-clock"></i>
                ${formatTimeAgo(notification.created_at)}
              </span>
            </div>
            ${
              notification.campaign_data
                ? `
              <div class="notification-actions">
                <button class="btn btn-primary" onclick="navigateToCampaignDetail('${notification.id}')">
                  <i class="fas fa-external-link-alt"></i> 캠페인 상세보기
                </button>
              </div>
            `
                : ""
            }
          </div>
        `;

        modal.style.display = "flex";
      }

      // 읽음 처리
      if (!notification.is_read) {
        await markAsRead(notificationId);
      }
    } else {
      showNotification("알림을 찾을 수 없습니다.", "error");
    }
  } catch (error) {
    console.error("알림 상세보기 오류:", error);
    showNotification("알림을 불러오는데 실패했습니다.", "error");
  }
}

// 캠페인 관련 알림인지 확인
function isCampaignRelatedNotification(notification) {
  const campaignTypes = [
    "campaign_registration",
    "payment_confirmation",
    "approval_completion",
    "campaign_completed",
    "campaign_approval",
    "campaign_modification",
    "campaign_inquiry",
  ];
  return campaignTypes.includes(notification.type);
}

// 캠페인 상세 페이지로 이동
function navigateToCampaignDetail(notification) {
  if (typeof notification === "string") {
    // notificationId로 알림 찾기
    const sampleNotifications = getSampleNotifications();
    notification = sampleNotifications.find((n) => n.id === notification);
  }

  if (!notification) {
    showNotification("알림을 찾을 수 없습니다.", "error");
    return;
  }

  // 캠페인 데이터가 있으면 캠페인 상세보기 모달 표시
  if (notification.campaign_data) {
    showCampaignDetailModal(notification.campaign_data);
  } else if (notification.campaign_id) {
    // 캠페인 ID만 있는 경우 해당 캠페인 정보로 모달 표시
    const campaignData = {
      name: notification.campaign_name,
      company: notification.company,
      type: "캠페인",
      startDay: 1,
      endDay: 7,
      status: notification.type === "approval_completion" ? "진행중" : "예정",
      budget: notification.amount || 1000000,
      target: 10000,
      category:
        notification.user_type === "광고주"
          ? "customer"
          : notification.user_type === "대행사"
          ? "agency"
          : "partner",
      deliveryAddress: {
        recipient: notification.user_name,
        phone: "010-0000-0000",
        address: "서울특별시",
        detailAddress: notification.company,
        zipCode: "00000",
        memo: "알림에서 이동",
      },
    };
    showCampaignDetailModal(campaignData);
  } else {
    showNotification("캠페인 정보를 찾을 수 없습니다.", "error");
  }
}

// 캠페인 문의 모달 표시
function showCampaignInquiryModal(notification) {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById("campaignInquiryModal");
  if (existingModal) {
    existingModal.remove();
  }

  // 캠페인 문의 모달 생성
  const modalHTML = `
    <div id="campaignInquiryModal" class="campaign-inquiry-modal">
      <div class="campaign-inquiry-modal-content">
        <div class="campaign-inquiry-header">
          <h3>캠페인 문의 상세</h3>
          <button class="close-btn" onclick="closeCampaignInquiryModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="campaign-inquiry-body">
          <div class="inquiry-info">
            <div class="info-row">
              <label>문의자</label>
              <span>${notification.user_name} (${notification.company})</span>
            </div>
            <div class="info-row">
              <label>사용자 유형</label>
              <span class="user-type-badge">${notification.user_type}</span>
            </div>
            <div class="info-row">
              <label>캠페인명</label>
              <span>${notification.campaign_name}</span>
            </div>
            <div class="info-row">
              <label>캠페인 ID</label>
              <span class="campaign-id">${notification.campaign_id}</span>
            </div>
            <div class="info-row">
              <label>문의 시간</label>
              <span>${formatTimeAgo(notification.created_at)}</span>
            </div>
          </div>
          
          <div class="inquiry-content">
            <label>문의 내용</label>
            <div class="inquiry-text">${notification.inquiry_content}</div>
          </div>
          
          <div class="inquiry-response">
            <label>답변</label>
            <textarea id="inquiryResponse" placeholder="문의에 대한 답변을 입력하세요..." rows="4"></textarea>
          </div>
        </div>
        
        <div class="campaign-inquiry-footer">
          <button class="btn-secondary" onclick="closeCampaignInquiryModal()">취소</button>
          <button class="btn-primary" onclick="submitInquiryResponse('${
            notification.id
          }')">답변 전송</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// 캠페인 문의 모달 닫기
function closeCampaignInquiryModal() {
  const modal = document.getElementById("campaignInquiryModal");
  if (modal) {
    modal.remove();
  }
}

// 문의 답변 전송
function submitInquiryResponse(notificationId) {
  const responseText = document.getElementById("inquiryResponse").value;

  if (!responseText.trim()) {
    showNotification("답변을 입력해주세요.", "error");
    return;
  }

  // 답변 전송 로직 (실제로는 API 호출)
  console.log("문의 답변 전송:", {
    notificationId,
    response: responseText,
  });

  showNotification("답변이 전송되었습니다.", "success");
  closeCampaignInquiryModal();

  // 알림 목록 새로고침
  loadNotifications();
}

// 알림 모달 닫기
function closeNotificationModal() {
  const modal = document.getElementById("notificationModal");
  modal.style.display = "none";
}

// 읽음 처리 및 모달 닫기
async function markAsReadAndClose() {
  const notificationId = getCurrentNotificationId();
  if (notificationId) {
    await markAsRead(notificationId);
  }
  closeNotificationModal();
}

// 현재 알림 ID 가져오기 (모달에서)
function getCurrentNotificationId() {
  // 모달에서 현재 알림 ID를 가져오는 로직
  // 실제 구현에서는 모달에 데이터를 저장하거나 다른 방법 사용
  return null;
}

// 개별 알림 읽음 처리 (실제 API)
async function markAsRead(notificationId) {
  try {
    await fetch(`/api/admin/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: adminHeaders(),
    });

    // UI 업데이트
    const notificationItem = document.querySelector(
      `[onclick*="${notificationId}"]`
    );
    if (notificationItem) {
      notificationItem.classList.remove("unread");
      const actionsItem = notificationItem.querySelector(
        ".notification-actions-item"
      );
      if (actionsItem) actionsItem.remove();
    }

    updateNotificationCount();
    showNotification("읽음 처리되었습니다.", "success");
  } catch (error) {
    console.error("읽음 처리 오류:", error);
    showNotification("읽음 처리에 실패했습니다.", "error");
  }
}

// 모든 알림 읽음 처리 (실제 API)
async function markAllAsRead() {
  try {
    await fetch(`/api/admin/notifications/read-all`, {
      method: "PUT",
      headers: adminHeaders(),
    });

    document.querySelectorAll(".notification-item.unread").forEach((item) => {
      item.classList.remove("unread");
      const actionsItem = item.querySelector(".notification-actions-item");
      if (actionsItem) actionsItem.remove();
    });

    showNotification("모든 알림을 읽음 처리했습니다.", "success");
    updateNotificationCount();
  } catch (error) {
    console.error("전체 읽음 처리 오류:", error);
    showNotification("읽음 처리에 실패했습니다.", "error");
  }
}

// 알림 새로고침
function refreshNotifications() {
  loadNotifications();
}

// 알림 페이지네이션 렌더링
function renderNotificationPagination(pagination) {
  const paginationContainer = document.getElementById("notificationPagination");
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
      <button class="page-btn" onclick="changeNotificationPage(${
        currentPage - 1
      })">
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
              onclick="changeNotificationPage(${i})">
        ${i}
      </button>
    `;
  }

  // 다음 버튼
  if (hasNext) {
    paginationHTML += `
      <button class="page-btn" onclick="changeNotificationPage(${
        currentPage + 1
      })">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
  }

  paginationHTML += "</div>";
  paginationContainer.innerHTML = paginationHTML;
}

// 알림 페이지 변경
function changeNotificationPage(page) {
  currentNotificationPage = page;
  loadNotifications();
}

// 알림 카운트 업데이트 (헤더의 벨 아이콘 등)
function updateNotificationCount() {
  // 헤더의 알림 카운트 업데이트 로직
  // 실제 구현에서는 헤더 컴포넌트와 연동
}

// 알림 표시 (토스트 메시지)
function showNotification(message, type = "info") {
  // 토스트 메시지 표시 로직
  console.log(`${type.toUpperCase()}: ${message}`);
}

// 테스트용 알림 생성 함수
function createTestNotifications() {
  // 캠페인 등록 알림 테스트
  createCampaignRegistrationNotification({
    user_name: "김마케팅",
    company: "ABC마케팅",
    user_type: "고객사",
    campaign_name: "신제품 런칭 캠페인",
    campaign_id: "CAMP-TEST-001",
    amount: 5000000,
    type: "제품형",
    status: "pending",
  });

  // 입금 확인 알림 테스트
  setTimeout(() => {
    createPaymentConfirmationNotification({
      user_name: "이대행사",
      company: "XYZ대행사",
      user_type: "대행사",
      campaign_name: "브랜드 인지도 캠페인",
      campaign_id: "CAMP-TEST-002",
      amount: 3000000,
      type: "브랜드형",
      status: "payment_confirmed",
    });
  }, 2000);

  // 승인 완료 알림 테스트
  setTimeout(() => {
    createApprovalCompletionNotification({
      user_name: "박파트너",
      company: "DEF파트너사",
      user_type: "파트너사",
      campaign_name: "이벤트 마케팅 캠페인",
      campaign_id: "CAMP-TEST-003",
      amount: 2000000,
      type: "이벤트형",
      status: "approved",
    });
  }, 4000);
}

// 전역 함수 등록
window.createCampaignRegistrationNotification =
  createCampaignRegistrationNotification;
window.createPaymentConfirmationNotification =
  createPaymentConfirmationNotification;
window.createApprovalCompletionNotification =
  createApprovalCompletionNotification;
window.addNotification = addNotification;
window.navigateToCampaignDetail = navigateToCampaignDetail;
window.requestNotificationPermission = requestNotificationPermission;
window.createTestNotifications = createTestNotifications;

// DOM 로드 완료 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  // 알림 센터가 로드된 경우에만 초기화
  if (document.querySelector(".notification-center")) {
    initNotificationCenter();
    // 브라우저 알림 권한 요청
    requestNotificationPermission();
  }
});

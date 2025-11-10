// 고객 캠페인 관리 JavaScript (독립 실행용)

// 현재 사용자 역할 확인
function getCurrentUserRole() {
  const path = (window.location.pathname || "").toLowerCase();
  if (path.includes("admin")) return "admin";
  if (path.includes("agency")) return "agency";
  if (path.includes("partner")) return "partner";
  if (path.includes("customer")) return "customer";
  const urlParams = new URLSearchParams(window.location.search);
  const fromQuery = urlParams.get("role");
  if (fromQuery) return fromQuery;
  return localStorage.getItem("userRole") || "agency";
}

// 토큰 가져오기 함수 (역할별로 분기)
function getToken() {
  const role = getCurrentUserRole();
  try {
    if (typeof getRoleSessionToken === "function") {
      const t = getRoleSessionToken(role);
      if (t && t.trim() !== "") return t;
    }
    // 현재 창 저장소 우선
    let t =
      sessionStorage.getItem(`troy_token_${role}`) ||
      localStorage.getItem(`troy_token_${role}`) ||
      sessionStorage.getItem("troy_token") ||
      localStorage.getItem("troy_token");
    if (t && t.trim() !== "") return t;
    // 부모 창 저장소 (same-origin 가정)
    try {
      if (window.parent && window.parent !== window) {
        t =
          window.parent.sessionStorage.getItem(`troy_token_${role}`) ||
          window.parent.localStorage.getItem(`troy_token_${role}`) ||
          window.parent.sessionStorage.getItem("troy_token") ||
          window.parent.localStorage.getItem("troy_token");
      }
    } catch (_) {}
    if (t && t.trim() !== "") return t;
    return "";
  } catch (_) {
    return "";
  }
}

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

// 캠페인 상세보기 관련 함수들
function showCampaignDetail(campaignId) {
  const modal = document.getElementById("campaignDetailModal");
  if (modal) {
    modal.style.display = "block";

    // 모달에 캠페인 ID 설정
    modal.setAttribute("data-campaign-id", campaignId);

    // 해당 캠페인의 NEW 인디케이터만 제거
    const campaignDetailBtn = document.querySelector(
      `[data-campaign-id="${campaignId}"]`
    );
    if (campaignDetailBtn) {
      const newIndicator = campaignDetailBtn.querySelector(
        ".campaign-new-indicator"
      );
      if (newIndicator) {
        newIndicator.style.display = "none";
        newIndicator.style.visibility = "hidden";

        // 로컬 스토리지에 해당 캠페인의 읽음 상태 저장
        const readCampaigns = JSON.parse(
          localStorage.getItem("readCampaigns") || "[]"
        );
        if (!readCampaigns.includes(campaignId)) {
          readCampaigns.push(campaignId);
          localStorage.setItem("readCampaigns", JSON.stringify(readCampaigns));
        }
      }
    }

    // 해당 캠페인과 관련된 업데이트만 읽음 처리
    const updateItems = document.querySelectorAll(
      `[data-campaign-id="${campaignId}"] .update-item.new`
    );
    updateItems.forEach((item) => {
      const updateId = item.getAttribute("data-update-id");
      if (updateId) {
        markAsRead("update", updateId);
      }
    });

    // 문의 목록 로드
    setTimeout(() => {
      loadInquiries();
    }, 100);
  }
}

function hideCampaignDetail() {
  const modal = document.getElementById("campaignDetailModal");
  if (modal) modal.style.display = "none";
}

function downloadManuscriptGuide() {
  // 원고가이드 엑셀 파일 다운로드
  const link = document.createElement("a");
  link.href = "/files/manuscript-guide.xlsx";
  link.download = "원고가이드.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  alert("원고가이드가 다운로드됩니다.");
}

function copyEmailAddress() {
  const emailAddress = "twin8style@naver.com";

  // 클립보드 API 사용
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(emailAddress)
      .then(() => {
        showCopySuccess();
      })
      .catch(() => {
        fallbackCopyTextToClipboard(emailAddress);
      });
  } else {
    // fallback for older browsers
    fallbackCopyTextToClipboard(emailAddress);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful) {
      showCopySuccess();
    } else {
      showCopyError();
    }
  } catch (err) {
    showCopyError();
  }

  document.body.removeChild(textArea);
}

function showCopySuccess() {
  // 기존 알림 제거
  const existingNotification = document.querySelector(".copy-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // 성공 알림 표시
  const notification = document.createElement("div");
  notification.className = "copy-notification success";
  notification.innerHTML = "📧 이메일 주소가 복사되었습니다!";
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;

  // 애니메이션 CSS 추가
  if (!document.querySelector("#copy-notification-styles")) {
    const style = document.createElement("style");
    style.id = "copy-notification-styles";
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // 3초 후 자동 제거
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function showCopyError() {
  alert(
    "이메일 주소 복사에 실패했습니다. 수동으로 복사해주세요: twin8style@naver.com"
  );
}

function saveReturnAddress() {
  const name = document.getElementById("returnName").value;
  const phone = document.getElementById("returnPhone").value;
  const address = document.getElementById("returnAddress").value;

  if (!name || !phone || !address) {
    alert("모든 필수 정보를 입력해주세요.");
    return;
  }

  alert("반송 주소가 저장되었습니다.");
}

// 문의 아이템 펼치기/접기 기능
function toggleInquiry(element) {
  const content = element.querySelector(".inquiry-content");
  const answer = element.querySelector(".answer-content");
  const isExpanded = element.classList.contains("expanded");

  if (isExpanded) {
    // 접기
    element.classList.remove("expanded");
    if (content) content.style.display = "none";
    if (answer) answer.style.display = "none";
  } else {
    // 펼치기
    element.classList.add("expanded");
    if (content) content.style.display = "block";
    if (answer) answer.style.display = "block";
  }
}

// NEW 알림 관리 기능
function markAsRead(type, id) {
  if (type === "update") {
    const updateItem = document.querySelector(`[data-update-id="${id}"]`);
    if (updateItem) {
      updateItem.classList.remove("new");
      const newBadge = updateItem.querySelector(".new-badge");
      if (newBadge) {
        newBadge.remove();
      }
    }
  } else if (type === "inquiry") {
    const inquiryItem = document.querySelector(`[data-inquiry-id="${id}"]`);
    if (inquiryItem) {
      inquiryItem.classList.remove("new");
      const newBadge = inquiryItem.querySelector(".new-badge");
      if (newBadge) {
        newBadge.remove();
      }
    }
  }

  // 로컬 스토리지에 읽음 상태 저장
  const readItems = JSON.parse(localStorage.getItem("readItems") || "[]");
  if (!readItems.includes(id)) {
    readItems.push(id);
    localStorage.setItem("readItems", JSON.stringify(readItems));
  }

  // 캠페인 대시보드의 NEW 알림 업데이트
  updateCampaignNewIndicator();
}

// 캠페인 대시보드의 NEW 인디케이터 업데이트
function updateCampaignNewIndicator() {
  const readCampaigns = JSON.parse(
    localStorage.getItem("readCampaigns") || "[]"
  );
  const newIndicators = document.querySelectorAll(".campaign-new-indicator");

  newIndicators.forEach((indicator) => {
    const campaignDetailBtn = indicator.closest("[data-campaign-id]");
    if (campaignDetailBtn) {
      const campaignId = campaignDetailBtn.getAttribute("data-campaign-id");

      // 해당 캠페인이 읽음 상태가 아닌 경우에만 NEW 표시
      if (!readCampaigns.includes(campaignId)) {
        indicator.style.display = "block";
        indicator.style.visibility = "visible";
      } else {
        indicator.style.display = "none";
        indicator.style.visibility = "hidden";
      }
    }
  });
}

// 문의 목록 로드 함수
async function loadInquiries() {
  const modal = document.querySelector(".customer-detail-modal");
  if (!modal) {
    console.error("모달을 찾을 수 없습니다.");
    return;
  }

  const campaignId = modal.getAttribute("data-campaign-id");
  if (!campaignId) {
    console.error("캠페인 ID를 찾을 수 없습니다.");
    return;
  }

  const token = getToken();
  if (!token) {
    console.error("토큰을 찾을 수 없습니다.");
    return;
  }

  try {
    console.log("=== 문의 목록 로드 시작 ===");
    console.log("캠페인 ID:", campaignId);

    const response = await fetch(
      `/api/auth/campaigns/${campaignId}/inquiries`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();
    console.log("문의 목록 로드 결과:", result);

    if (response.ok && result.success) {
      displayInquiries(result.data || []);
    } else {
      console.error("문의 목록 로드 실패:", result);
    }
  } catch (error) {
    console.error("문의 목록 로드 중 오류:", error);
  }
}

// 문의 목록 표시 함수
function displayInquiries(inquiries) {
  const inquiryList = document.querySelector(".inquiry-list");
  if (!inquiryList) {
    console.error("inquiry-list 요소를 찾을 수 없습니다.");
    return;
  }

  if (!inquiries || inquiries.length === 0) {
    inquiryList.innerHTML = `
      <div style="text-align: center; color: #6b7280; padding: 20px;">
        등록된 문의가 없습니다.
      </div>
    `;
    return;
  }

  const inquiriesHtml = inquiries
    .map((inquiry) => {
      // 문의자 이름 표시 (user_type에 따라 다르게 처리)
      let inquirerName = "알 수 없음";
      if (inquiry.inquirer) {
        if (inquiry.inquirer.user_type === "advertiser") {
          inquirerName = inquiry.inquirer.username || "광고주";
        } else if (inquiry.inquirer.user_type === "agency") {
          inquirerName = inquiry.inquirer.username || "대행사";
        } else if (inquiry.inquirer.user_type === "partner") {
          inquirerName = inquiry.inquirer.username || "파트너사";
        } else {
          inquirerName = inquiry.inquirer.username || "사용자";
        }
      }

      const statusClass =
        inquiry.status === "open"
          ? "pending"
          : inquiry.status === "answered"
          ? "answered"
          : "closed";
      const statusText =
        inquiry.status === "open"
          ? "답변대기"
          : inquiry.status === "answered"
          ? "답변완료"
          : "종료";

      const createdDate = new Date(inquiry.created_at).toLocaleDateString(
        "ko-KR",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      return `
      <div class="inquiry-item" data-inquiry-id="${
        inquiry.id
      }" onclick="toggleInquiry(this)">
        <div class="inquiry-header">
          <span class="inquiry-title">Q. ${inquiry.title}</span>
          <span class="inquiry-date">${createdDate}</span>
          <span class="inquiry-status ${statusClass}">${statusText}</span>
          <span class="expand-icon">▼</span>
        </div>
         <div class="inquiry-content" style="display: none;">
           <div class="inquiry-question" style="margin-bottom: 12px;">
             <strong>문의 내용:</strong><br>
             ${inquiry.content}
           </div>
           ${
             inquiry.admin_response
               ? `
             <div class="admin-response" style="margin-top: 12px; padding: 12px; background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 6px 6px 0;">
               <div style="font-weight: 600; color: #0c4a6e; margin-bottom: 4px;">관리자 답변:</div>
               <div style="color: #0c4a6e; line-height: 1.5;">${
                 inquiry.admin_response
               }</div>
               ${
                 inquiry.responded_at
                   ? `
                 <div style="font-size: 11px; color: #0369a1; margin-top: 8px;">
                   답변일: ${new Date(inquiry.responded_at).toLocaleDateString(
                     "ko-KR",
                     {
                       year: "numeric",
                       month: "2-digit",
                       day: "2-digit",
                       hour: "2-digit",
                       minute: "2-digit",
                     }
                   )}
                 </div>
               `
                   : ""
               }
             </div>
           `
               : `
             <div class="no-response" style="margin-top: 12px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; color: #6b7280;">
               아직 관리자 답변이 없습니다.
             </div>
           `
           }
         </div>
      </div>
    `;
    })
    .join("");

  inquiryList.innerHTML = inquiriesHtml;
}

// 새 문의 등록 시 NEW 상태 추가
async function submitInquiry() {
  const titleInput = document.getElementById("inquiryTitle");
  const contentInput = document.getElementById("inquiryContent");
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    alert("제목과 내용을 모두 입력해주세요.");
    return;
  }

  // 캠페인 ID 가져오기
  const modal = document.querySelector(".customer-detail-modal");
  if (!modal) {
    alert("캠페인 정보를 찾을 수 없습니다.");
    return;
  }

  const campaignId = modal.getAttribute("data-campaign-id");
  if (!campaignId) {
    alert("캠페인 ID를 찾을 수 없습니다.");
    return;
  }

  // 토큰 가져오기
  const token = getToken();
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    console.log("=== 문의 저장 시작 ===");
    console.log("캠페인 ID:", campaignId);
    console.log("문의 데이터:", { title, content });

    // API 호출
    const response = await fetch(
      `/api/auth/campaigns/${campaignId}/inquiries`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title,
          content: content,
        }),
      }
    );

    const result = await response.json();
    console.log("API 응답:", result);

    if (response.ok && result.success) {
      // 성공 시 UI 업데이트
      const inquiryList = document.querySelector(".inquiry-list");
      const currentDate = new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const inquiryId = result.data.id;

      // 새 문의 아이템 생성 (NEW 상태로)
      const inquiryItem = document.createElement("div");
      inquiryItem.className = "inquiry-item new";
      inquiryItem.setAttribute("data-inquiry-id", inquiryId);
      inquiryItem.innerHTML = `
        <div class="inquiry-header">
          <span class="inquiry-title">Q. ${title}</span>
          <span class="inquiry-date">${currentDate}</span>
          <span class="inquiry-status pending">답변대기</span>
          <span class="new-badge">NEW</span>
          <span class="expand-icon">▼</span>
        </div>
        <div class="inquiry-content" style="display: none;">
          ${content}
        </div>
      `;

      // 클릭 이벤트 추가
      inquiryItem.onclick = function () {
        toggleInquiry(this);
      };

      // 맨 위에 추가
      inquiryList.insertBefore(inquiryItem, inquiryList.firstChild);

      // 입력 필드 초기화
      titleInput.value = "";
      contentInput.value = "";

      alert("문의가 등록되었습니다. 빠른 시일 내에 답변드리겠습니다.");

      // 문의 목록 다시 로드
      await loadInquiries();

      // 캠페인 대시보드 NEW 인디케이터 업데이트
      updateCampaignNewIndicator();
    } else {
      console.error("문의 저장 실패:", result);
      alert("문의 저장에 실패했습니다: " + (result.error || "알 수 없는 오류"));
    }
  } catch (error) {
    console.error("문의 저장 중 오류:", error);
    alert("문의 저장 중 오류가 발생했습니다: " + error.message);
  }
}

// 페이지 로드 시 읽음 상태 확인
function initializeReadStatus() {
  const readItems = JSON.parse(localStorage.getItem("readItems") || "[]");

  // 읽은 업데이트 아이템들의 NEW 상태 제거
  readItems.forEach((id) => {
    const updateItem = document.querySelector(`[data-update-id="${id}"]`);
    if (updateItem) {
      updateItem.classList.remove("new");
      const newBadge = updateItem.querySelector(".new-badge");
      if (newBadge) {
        newBadge.remove();
      }
    }
  });

  // 캠페인 대시보드 NEW 인디케이터 업데이트
  setTimeout(() => {
    updateCampaignNewIndicator();
  }, 100);
}

// 초기화 함수
function initCustomerCampaign() {
  const searchInput = document.querySelector(".search-input");
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        applySearch();
      }
    });
  }

  // 읽음 상태 초기화
  initializeReadStatus();

  // 모달 외부 클릭 시 닫기
  const modal = document.getElementById("campaignDetailModal");
  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        hideCampaignDetail();
      }
    });
  }
}

// 요청사항 관련 함수들
function saveCampaignRequest() {
  const requestText = document.getElementById("campaignRequest").value.trim();

  if (!requestText) {
    alert("요청사항을 입력해주세요.");
    return;
  }

  // 현재 캠페인 ID 가져오기 (실제로는 모달이 열릴 때 설정된 캠페인 ID 사용)
  const currentCampaignId = getCurrentCampaignId();

  if (!currentCampaignId) {
    alert("캠페인 정보를 찾을 수 없습니다.");
    return;
  }

  // 로컬 스토리지에 요청사항 저장
  const campaignRequests = JSON.parse(
    localStorage.getItem("campaignRequests") || "{}"
  );
  campaignRequests[currentCampaignId] = {
    request: requestText,
    timestamp: new Date().toISOString(),
    status: "pending",
  };

  localStorage.setItem("campaignRequests", JSON.stringify(campaignRequests));

  // 성공 메시지 표시
  showNotification("요청사항이 저장되었습니다.", "success");

  // Supabase에 저장 시도 (선택사항)
  saveRequestToSupabase(currentCampaignId, requestText);
}

function getCurrentCampaignId() {
  // 모달이 열릴 때 설정된 캠페인 ID를 반환
  // 실제로는 showCampaignDetail 함수에서 전역 변수로 설정하거나
  // 모달의 data 속성에서 가져와야 함
  return window.currentCampaignId || "CU202406149371330A9310"; // 임시 기본값
}

function loadCampaignRequest(campaignId) {
  const campaignRequests = JSON.parse(
    localStorage.getItem("campaignRequests") || "{}"
  );
  const request = campaignRequests[campaignId];

  if (request) {
    document.getElementById("campaignRequest").value = request.request;
  } else {
    document.getElementById("campaignRequest").value = "";
  }
}

async function saveRequestToSupabase(campaignId, requestText) {
  try {
    if (window.supabase) {
      const {
        data: { user },
      } = await window.supabase.auth.getUser();
      if (!user) {
        console.log("로그인이 필요합니다. 로컬에만 저장됩니다.");
        return;
      }

      // campaigns 테이블의 requirements 필드 업데이트
      const { error } = await window.supabase
        .from("campaigns")
        .update({
          requirements: {
            ...getExistingRequirements(campaignId),
            customer_request: requestText,
            request_updated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("campaign_code", campaignId);

      if (error) {
        console.error("Supabase 요청사항 저장 오류:", error);
      } else {
        console.log("요청사항이 Supabase에 저장되었습니다.");
      }
    }
  } catch (error) {
    console.error("요청사항 저장 오류:", error);
  }
}

function getExistingRequirements(campaignId) {
  // 기존 requirements 데이터를 가져오는 함수
  // 실제로는 캠페인 데이터에서 가져와야 함
  return {};
}

function showNotification(message, type = "info") {
  // 간단한 알림 표시 함수
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    background: ${
      type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#3b82f6"
    };
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// showCampaignDetail 함수 수정하여 요청사항 로드
const originalShowCampaignDetail = showCampaignDetail;
showCampaignDetail = function (campaignId) {
  // 기존 함수 실행
  originalShowCampaignDetail(campaignId);

  // 현재 캠페인 ID 설정
  window.currentCampaignId = campaignId;

  // 요청사항 로드
  setTimeout(() => {
    loadCampaignRequest(campaignId);
  }, 100);
};

// 캠페인 요청사항 저장
async function saveCampaignRequest() {
  try {
    const campaignId = window.currentCampaignId;
    if (!campaignId) {
      showNotification("캠페인을 선택해주세요.", "error");
      return;
    }

    const requestTextarea = document.getElementById("campaignRequest");
    if (!requestTextarea) {
      showNotification("요청사항 입력란을 찾을 수 없습니다.", "error");
      return;
    }

    const request = requestTextarea.value.trim();
    if (!request) {
      showNotification("요청사항을 입력해주세요.", "error");
      return;
    }

    // 토큰 가져오기
    const token = getToken();
    if (!token) {
      showNotification("로그인이 필요합니다.", "error");
      return;
    }

    // API 호출
    const response = await fetch(
      `/api/auth/campaigns/${encodeURIComponent(campaignId)}/request`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ request }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      showNotification("요청사항이 성공적으로 저장되었습니다.", "success");
      // 입력란 초기화
      requestTextarea.value = "";
    } else {
      throw new Error("요청사항 저장에 실패했습니다.");
    }
  } catch (error) {
    console.error("요청사항 저장 오류:", error);
    showNotification(
      error.message || "요청사항 저장 중 오류가 발생했습니다.",
      "error"
    );
  }
}

// 캠페인 요청사항 로드
async function loadCampaignRequest(campaignId) {
  try {
    const token = getToken();
    if (!token) return;

    const response = await fetch(`/api/auth/my-campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return;

    const data = await response.json();
    if (!data.success || !data.campaigns) return;

    const campaign = data.campaigns.find(
      (c) => c.id === campaignId || c.campaign_code === campaignId
    );
    if (!campaign) return;

    const requestTextarea = document.getElementById("campaignRequest");
    if (requestTextarea && campaign.requirements?.agency_request) {
      requestTextarea.value = campaign.requirements.agency_request;
    }
  } catch (error) {
    console.error("요청사항 로드 오류:", error);
  }
}

// 원고 업로드 관련 함수 (대행사 코드 참고)
let selectedManuscriptFile = null;
const MANUSCRIPT_MAX_SIZE = 20 * 1024 * 1024; // 20MB
const MANUSCRIPT_ALLOWED_EXTS = ["pdf", "docx", "hwp", "txt"];

function setSelectedManuscriptFile(file) {
  const statusEl = document.getElementById("manuscriptUploadStatus");
  const lastFileEl = document.getElementById("manuscriptLastFile");
  if (!file) {
    if (statusEl) statusEl.textContent = "";
    if (lastFileEl) lastFileEl.textContent = "선택된 파일이 없습니다.";
    selectedManuscriptFile = null;
    window.selectedManuscriptFile = null;
    return;
  }
  const name = file.name || "";
  const size = file.size || 0;
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (!MANUSCRIPT_ALLOWED_EXTS.includes(ext)) {
    if (statusEl) statusEl.textContent = "";
    if (lastFileEl)
      lastFileEl.textContent =
        "허용되지 않는 형식입니다. (pdf, docx, hwp, txt)";
    selectedManuscriptFile = null;
    window.selectedManuscriptFile = null;
    return;
  }
  if (size > MANUSCRIPT_MAX_SIZE) {
    if (statusEl) statusEl.textContent = "";
    if (lastFileEl) lastFileEl.textContent = "파일 크기가 20MB를 초과합니다.";
    selectedManuscriptFile = null;
    window.selectedManuscriptFile = null;
    return;
  }
  selectedManuscriptFile = file;
  window.selectedManuscriptFile = file;
  const sizeKB = (size / 1024).toFixed(1);
  if (lastFileEl)
    lastFileEl.textContent = `선택된 파일: ${name} (${sizeKB} KB)`;
}

window.onManuscriptInputChange = function (event) {
  try {
    const input =
      event && event.target
        ? event.target
        : document.getElementById("manuscriptFile");
    if (input && input.files && input.files.length > 0) {
      setSelectedManuscriptFile(input.files[0]);
    } else {
      setSelectedManuscriptFile(null);
    }
  } catch (_) {}
};

window.saveManuscriptToServer = async function () {
  try {
    const statusEl = document.getElementById("manuscriptUploadStatus");
    const lastFileEl = document.getElementById("manuscriptLastFile");
    const campaignId = window.currentCampaignId || "";
    if (!selectedManuscriptFile) {
      if (lastFileEl) lastFileEl.textContent = "선택된 파일이 없습니다.";
      return;
    }
    if (!campaignId) {
      if (lastFileEl) lastFileEl.textContent = "캠페인 정보가 없습니다.";
      return;
    }
    if (statusEl) {
      statusEl.textContent = "업로드 중...";
      statusEl.style.cssText =
        "color:#3b82f6;font-weight:600;text-align:center;display:block;margin-top:8px;padding:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;";
    }
    const token = getToken();
    const form = new FormData();
    form.append("file", selectedManuscriptFile);
    form.append("campaign_id", String(campaignId));
    const res = await fetch(
      `/api/auth/campaigns/${encodeURIComponent(campaignId)}/manuscripts`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      if (statusEl) {
        statusEl.textContent = "업로드 실패";
        statusEl.style.cssText =
          "color:#ef4444;font-weight:600;text-align:center;display:block;margin-top:8px;padding:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;";
      }
      return;
    }
    if (statusEl) {
      statusEl.textContent = "업로드 완료";
      statusEl.style.cssText =
        "color:#10b981;font-weight:600;text-align:center;display:block;margin-top:8px;padding:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;";
    }
    const f = selectedManuscriptFile;
    const sizeKB = (f.size / 1024).toFixed(1);
    if (lastFileEl) lastFileEl.textContent = `저장됨: ${f.name} (${sizeKB} KB)`;
  } catch (_) {
    const statusEl = document.getElementById("manuscriptUploadStatus");
    if (statusEl) {
      statusEl.textContent = "업로드 중 오류";
      statusEl.style.cssText =
        "color:#ef4444;font-weight:600;text-align:center;display:block;margin-top:8px;padding:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;";
    }
  }
};

// 전역 함수 등록
window.getToken = getToken;
window.applySearch = applySearch;
window.resetSearch = resetSearch;
window.initCustomerCampaign = initCustomerCampaign;
window.showCampaignDetail = showCampaignDetail;
window.hideCampaignDetail = hideCampaignDetail;
window.downloadManuscriptGuide = downloadManuscriptGuide;
window.copyEmailAddress = copyEmailAddress;
window.saveReturnAddress = saveReturnAddress;
window.submitInquiry = submitInquiry;
window.toggleInquiry = toggleInquiry;
window.markAsRead = markAsRead;
window.initializeReadStatus = initializeReadStatus;
window.updateCampaignNewIndicator = updateCampaignNewIndicator;
window.saveCampaignRequest = saveCampaignRequest;

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  console.log("고객 캠페인 현황 페이지 초기화");
  initCustomerCampaign();
});

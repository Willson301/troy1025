let selectedFiles = [];
let currentInquiryType = "general";

function selectInquiryType(type) {
  currentInquiryType = type;
  document
    .querySelectorAll(".inquiry-type-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`[data-type="${type}"]`)?.classList.add("active");
  const sel = document.getElementById("inquiryType");
  if (sel) sel.value = type;
}

function updateFileList() {
  const fileList = document.getElementById("fileList");
  if (!fileList) return;
  fileList.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.innerHTML = `<div class="file-info"><span class="file-name">${
      file.name
    }</span><span class="file-size">${(file.size / 1024 / 1024).toFixed(
      2
    )}MB</span></div><button type="button" class="remove-file-btn" onclick="removeFile(${index})">×</button>`;
    fileList.appendChild(item);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
}

async function submitInquiry(event) {
  event.preventDefault();

  const title = document.getElementById("subject").value.trim();
  const content = document.getElementById("message").value.trim();
  const category = document.getElementById("inquiryType").value;

  if (!title || !content) {
    showNotification("제목과 내용을 입력해주세요.", "error");
    return;
  }

  try {
    const token = localStorage.getItem("troy_token");
    if (!token) {
      showNotification("로그인이 필요합니다.", "error");
      return;
    }

    const response = await fetch("/api/auth/tickets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        content,
        category,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "문의 등록에 실패했습니다.");
    }

    showNotification(
      "문의가 성공적으로 제출되었습니다. 빠른 시일 내에 답변드리겠습니다.",
      "success"
    );
    resetForm();
    loadMyInquiries(); // 문의 내역 새로고침
  } catch (error) {
    console.error("Submit inquiry error:", error);
    showNotification(
      error.message || "문의 등록 중 오류가 발생했습니다.",
      "error"
    );
  }
}

function resetForm() {
  document.getElementById("inquiryForm").reset();
  selectedFiles = [];
  updateFileList();
  selectInquiryType("general");
}

// 나의 문의 내역 로드
async function loadMyInquiries() {
  try {
    const token = localStorage.getItem("troy_token");
    if (!token) {
      document.getElementById("inquiryHistory").innerHTML =
        '<div class="no-data">로그인이 필요합니다.</div>';
      return;
    }

    console.log("Loading my inquiries...");
    const response = await fetch("/api/auth/tickets/my", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      // 404 에러인 경우 빈 배열로 처리
      if (response.status === 404) {
        console.log("User profile not found, showing empty list");
        displayMyInquiries([]);
        return;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "문의 내역을 불러올 수 없습니다.");
    }

    const data = await response.json();
    console.log("Received data:", data);
    displayMyInquiries(data.tickets);
  } catch (error) {
    console.error("Load my inquiries error:", error);
    document.getElementById("inquiryHistory").innerHTML =
      '<div class="error">문의 내역을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</div>';
  }
}

// 나의 문의 내역 표시
function displayMyInquiries(tickets) {
  const container = document.getElementById("inquiryHistory");

  if (!tickets || tickets.length === 0) {
    container.innerHTML = '<div class="no-data">등록된 문의가 없습니다.</div>';
    return;
  }

  const inquiriesHTML = tickets
    .map(
      (ticket) => `
    <div class="inquiry-item">
      <div class="inquiry-header">
        <div class="inquiry-info">
          <h4>${ticket.title}</h4>
          <div class="inquiry-meta">
            <span class="inquiry-type">${getCategoryText(
              ticket.category
            )}</span>
            <span class="inquiry-date">${formatDate(ticket.created_at)}</span>
            <span class="inquiry-status ${getStatusClass(
              ticket.status
            )}">${getStatusText(ticket.status)}</span>
            ${
              ticket.hasReply
                ? `<span class="reply-badge">답변 ${ticket.replyCount}개</span>`
                : ""
            }
          </div>
        </div>
      </div>
      <div class="inquiry-content">
        <p>${ticket.content.substring(0, 100)}${
        ticket.content.length > 100 ? "..." : ""
      }</p>
      </div>
      <div class="inquiry-actions">
        <button class="action-btn" onclick="viewInquiryDetail('${ticket.id}')">
          상세보기
        </button>
      </div>
    </div>
  `
    )
    .join("");

  container.innerHTML = inquiriesHTML;
}

// 문의 상세보기
async function viewInquiryDetail(ticketId) {
  try {
    const token = localStorage.getItem("troy_token");
    if (!token) {
      showNotification("로그인이 필요합니다.", "error");
      return;
    }

    const response = await fetch(`/api/auth/tickets/my/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || "문의 상세 정보를 불러올 수 없습니다."
      );
    }

    const data = await response.json();
    const ticket = data.ticket;

    // 모달 생성 및 표시
    showInquiryDetailModal(ticket);
  } catch (error) {
    console.error("View inquiry detail error:", error);
    showNotification("문의 상세 정보를 불러올 수 없습니다.", "error");
  }
}

// 문의 상세 모달 표시
function showInquiryDetailModal(ticket) {
  const modalHTML = `
    <div id="inquiryDetailModal" class="modal" style="display: block;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>문의 상세</h2>
          <span class="close" onclick="closeInquiryDetailModal()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="inquiry-detail">
            <div class="detail-header">
              <h3>${ticket.title}</h3>
              <div class="detail-meta">
                <span class="status ${getStatusClass(
                  ticket.status
                )}">${getStatusText(ticket.status)}</span>
                <span class="category">${getCategoryText(
                  ticket.category
                )}</span>
              </div>
            </div>
            
            <div class="detail-info">
              <div class="info-row">
                <label>문의일:</label>
                <span>${formatDate(ticket.created_at)}</span>
              </div>
            </div>

            <div class="detail-content">
              <h4>문의 내용</h4>
              <div class="content-text">${ticket.content}</div>
            </div>

            <div class="detail-comments">
              <h4>답변 내역</h4>
              <div class="comments-list">
                ${
                  ticket.comments && ticket.comments.length > 0
                    ? ticket.comments
                        .map(
                          (comment) => `
                    <div class="comment-item">
                      <div class="comment-header">
                        <span class="comment-author">${
                          comment.author.username
                        } (${getUserTypeText(comment.author.userType)})</span>
                        <span class="comment-date">${formatDate(
                          comment.createdAt
                        )}</span>
                      </div>
                      <div class="comment-content">${comment.content}</div>
                    </div>
                  `
                        )
                        .join("")
                    : '<div class="no-comments">아직 답변이 없습니다.</div>'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 기존 모달이 있다면 제거
  const existingModal = document.getElementById("inquiryDetailModal");
  if (existingModal) {
    existingModal.remove();
  }

  // 새 모달 추가
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// 문의 상세 모달 닫기
function closeInquiryDetailModal() {
  const modal = document.getElementById("inquiryDetailModal");
  if (modal) {
    modal.remove();
  }
}

// 유틸리티 함수들
function getCategoryText(category) {
  const categoryMap = {
    general: "일반 문의",
    technical: "기술 문의",
    campaign: "캠페인 문의",
    billing: "결제 문의",
  };
  return categoryMap[category] || category;
}

function getStatusText(status) {
  const statusMap = {
    open: "답변대기",
    pending: "처리중",
    resolved: "답변완료",
    closed: "종료됨",
  };
  return statusMap[status] || status;
}

function getStatusClass(status) {
  const classMap = {
    open: "progress",
    pending: "progress",
    resolved: "completed",
    closed: "completed",
  };
  return classMap[status] || "progress";
}

function getUserTypeText(userType) {
  const typeMap = {
    advertiser: "광고주",
    agency: "대행사",
    partner: "파트너사",
    admin: "관리자",
  };
  return typeMap[userType] || userType;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showNotification(message, type = "info") {
  const div = document.createElement("div");
  div.textContent = message;
  div.style.cssText =
    "position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;color:#fff;font-weight:500;z-index:10000";
  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };
  div.style.backgroundColor = colors[type] || colors.info;
  document.body.appendChild(div);
  setTimeout(() => {
    document.body.removeChild(div);
  }, 3000);
}

function initAgencyOneToOne() {
  document
    .getElementById("fileInput")
    ?.addEventListener("change", function (e) {
      const files = Array.from(e.target.files);
      files.forEach((file) => {
        if (file.size > 10 * 1024 * 1024) {
          alert("파일 크기는 10MB를 초과할 수 없습니다.");
          return;
        }
        selectedFiles.push(file);
      });
      updateFileList();
    });
  selectInquiryType("general");

  // 나의 문의 내역 로드
  loadMyInquiries();
}

window.initAgencyOneToOne = initAgencyOneToOne;

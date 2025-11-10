let selectedFiles = [];
let currentInquiryType = "general";

// 문의 유형 선택
function selectInquiryType(type) {
  currentInquiryType = type;

  // 모든 버튼 비활성화
  document.querySelectorAll(".inquiry-type-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // 선택된 버튼 활성화
  document.querySelector(`[data-type="${type}"]`).classList.add("active");

  // 폼의 문의 유형 업데이트
  document.getElementById("inquiryType").value = type;
}

// 파일 업로드 처리
document.getElementById("fileInput").addEventListener("change", function (e) {
  const files = Array.from(e.target.files);
  files.forEach((file) => {
    if (file.size > 10 * 1024 * 1024) {
      // 10MB 제한
      alert("파일 크기는 10MB를 초과할 수 없습니다.");
      return;
    }
    selectedFiles.push(file);
  });
  updateFileList();
});

// 파일 목록 업데이트
function updateFileList() {
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.innerHTML = `
                    <div class="file-info">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(2)}MB</span>
                    </div>
                    <button type="button" class="remove-file-btn" onclick="removeFile(${index})">×</button>
                `;
    fileList.appendChild(fileItem);
  });
}

// 파일 제거
function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
}

// 문의 제출
function submitInquiry(event) {
  event.preventDefault();

  const formData = new FormData();
  formData.append("type", document.getElementById("inquiryType").value);
  formData.append("priority", document.getElementById("priority").value);
  formData.append("clientName", document.getElementById("clientName").value);
  formData.append("contactName", document.getElementById("contactName").value);
  formData.append("email", document.getElementById("email").value);
  formData.append("phone", document.getElementById("phone").value);
  formData.append("subject", document.getElementById("subject").value);
  formData.append("message", document.getElementById("message").value);

  // 파일 추가
  selectedFiles.forEach((file) => {
    formData.append("attachments", file);
  });

  // 실제 구현에서는 서버로 전송
  console.log("문의 제출:", Object.fromEntries(formData));

  showNotification(
    "문의가 성공적으로 제출되었습니다. 빠른 시일 내에 답변드리겠습니다.",
    "success"
  );
  resetForm();
}

// 폼 초기화
function resetForm() {
  document.getElementById("inquiryForm").reset();
  selectedFiles = [];
  updateFileList();
  selectInquiryType("general");
}

// 문의 상세보기
function viewInquiryDetail(id) {
  alert(`문의 상세보기 (ID: ${id})`);
}

// 알림 표시
function showNotification(message, type = "info") {
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
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;

  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  notification.style.backgroundColor = colors[type] || colors.info;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 기타 함수들
function goToHome() {
  window.location.href = "agency-dashboard.html";
}

function showCampaignCreate() {
  window.location.href = "campaign-create.html";
}

function showNoticeBoard() {
  alert("공지사항 기능은 준비 중입니다.");
}

function showServiceInfo() {
  alert("서비스 소개 기능은 준비 중입니다.");
}

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  selectInquiryType("general");
});

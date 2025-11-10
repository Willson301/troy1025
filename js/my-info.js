document.addEventListener("DOMContentLoaded", function () {
  // 사용자 정보 로드
  loadUserInfo();

  document.querySelector(".btn-charge")?.addEventListener("click", function () {
    document.getElementById("depositModal").style.display = "flex";
  });
  document
    .querySelector(".modal-close")
    ?.addEventListener("click", function () {
      document.getElementById("depositModal").style.display = "none";
    });
  document
    .getElementById("depositModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) this.style.display = "none";
    });
  document
    .querySelector(".modal-close-account")
    ?.addEventListener("click", function () {
      document.getElementById("accountModal").style.display = "none";
    });
  document
    .getElementById("accountModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) this.style.display = "none";
    });

  document.querySelectorAll(".amount-option").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".amount-option")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      const input = document.getElementById("customAmount");
      if (input) input.value = this.dataset.amount;
      updateTotalAmount();
    });
  });

  document
    .getElementById("customAmount")
    ?.addEventListener("input", updateTotalAmount);
  document
    .getElementById("taxInvoiceCheck")
    ?.addEventListener("change", updateTotalAmount);
  document.getElementById("confirmBtn")?.addEventListener("click", function () {
    document.getElementById("depositModal").style.display = "none";
    document.getElementById("accountModal").style.display = "flex";
    document.getElementById("finalAmount").textContent =
      document.getElementById("totalAmount").textContent;
    document.getElementById("depositAmount").textContent =
      document.getElementById("totalAmount").textContent;
  });

  document
    .getElementById("copyAllInfo")
    ?.addEventListener("click", function () {
      const finalAmount = document.getElementById("finalAmount").textContent;
      const bank = document.getElementById("bankName").value;
      const account = document.getElementById("accountNumber").value;
      const holder = document.getElementById("accountHolder").value;
      const text = `입금은행: ${bank}\n계좌번호: ${account}\n예금주: ${holder}\n입금금액: ${finalAmount}`;
      navigator.clipboard
        .writeText(text)
        .then(() => alert("정보가 복사되었습니다."));
    });

  document
    .querySelector(".back-btn-step")
    ?.addEventListener("click", function () {
      document.getElementById("accountModal").style.display = "none";
      document.getElementById("depositModal").style.display = "flex";
    });

  document
    .querySelector(".complete-btn")
    ?.addEventListener("click", function () {
      document.getElementById("accountModal").style.display = "none";
      alert("입금 확인이 완료되었습니다.");
    });
});

function updateTotalAmount() {
  const base =
    parseInt(document.getElementById("customAmount")?.value || "0", 10) || 0;
  const checked = document.getElementById("taxInvoiceCheck")?.checked;
  const tax = checked ? Math.round(base * 0.1) : 0;
  const total = base + tax;
  const taxRow = document.getElementById("taxRow");
  if (taxRow) taxRow.style.display = checked ? "flex" : "none";
  const baseEl = document.getElementById("baseAmount");
  const taxEl = document.getElementById("taxAmount");
  const totalEl = document.getElementById("totalAmount");
  if (baseEl) baseEl.textContent = `${base.toLocaleString()}원`;
  if (taxEl) taxEl.textContent = `${tax.toLocaleString()}원`;
  if (totalEl) totalEl.textContent = `${total.toLocaleString()}원`;
}

// ===== 인라인에서 분리된 스크립트 =====

function goToHome() {
  window.location.href = "agency-dashboard.html";
}

function showCampaignCreate() {
  window.location.href = "campaign-create.html";
}

function showServiceInfo() {
  alert("서비스 소개 기능은 준비 중입니다.");
}

function showNoticeBoard() {
  window.location.href = "notice-board.html";
}

function saveTaxInfo() {
  alert("세금계산서 정보 저장 기능은 준비 중입니다.");
}

// 모달 관련 함수들
function showUserInfoModal() {
  document.getElementById("userInfoModal").style.display = "flex";
}

function closeUserInfoModal() {
  document.getElementById("userInfoModal").style.display = "none";
}

// 모달 외부 클릭 시 닫기
document.addEventListener("click", function (e) {
  const modal = document.getElementById("userInfoModal");
  if (e.target === modal) {
    closeUserInfoModal();
  }

  const businessModal = document.getElementById("businessLicenseModal");
  if (e.target === businessModal) {
    closeBusinessLicenseModal();
  }
});

// 사용자 정보 로드 함수
async function loadUserInfo() {
  try {
    // 현재 로그인한 사용자 ID 가져오기
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("사용자 인증 오류:", authError);
      return;
    }

    // Supabase에서 사용자 정보 조회
    const result = await window.userAPI.getUserInfo(user.id);

    if (result.success && result.data) {
      const userInfo = result.data;

      // 법인/상호명 업데이트
      const companyNameElement = document.querySelector(".info-value");
      if (companyNameElement) {
        companyNameElement.textContent =
          userInfo.company_name || userInfo.agency_name;
      }

      // 사업자번호 업데이트
      const businessNumberElements = document.querySelectorAll(".info-value");
      if (businessNumberElements.length > 1) {
        businessNumberElements[1].textContent = userInfo.business_number;
      }

      // 회원코드 업데이트 (사용자 ID의 일부 사용)
      const memberCodeElements = document.querySelectorAll(".info-value");
      if (memberCodeElements.length > 3) {
        const memberCode = `CU${user.id.slice(-6).toUpperCase()}`;
        memberCodeElements[3].textContent = memberCode;
      }

      // 가입일 업데이트
      const joinDateElement = document.querySelector(".code-value");
      if (joinDateElement) {
        joinDateElement.textContent = new Date(
          userInfo.created_at
        ).toLocaleString("ko-KR");
      }

      // 담당자 정보 업데이트
      const managerNameInput = document.querySelector(
        '.form-input[placeholder*="성함"]'
      );
      if (managerNameInput) {
        managerNameInput.value = userInfo.manager_name;
      }

      const emailInput = document.querySelector(
        '.form-input[placeholder*="이메일"]'
      );
      if (emailInput) {
        emailInput.value = userInfo.email;
      }

      const phoneInput = document.querySelector(
        '.form-input[placeholder*="연락처"]'
      );
      if (phoneInput) {
        phoneInput.value = userInfo.phone;
      }

      // 사용자 정보를 전역 변수에 저장 (사업자등록증 모달에서 사용)
      window.currentUserInfo = userInfo;
    } else {
      console.error("사용자 정보 조회 실패:", result.error);
    }
  } catch (error) {
    console.error("사용자 정보 로드 오류:", error);
  }
}

// 사업자등록증 관련 함수들
async function showBusinessLicense() {
  try {
    if (window.currentUserInfo && window.currentUserInfo.businessLicense) {
      const businessLicenseData = {
        fileName: window.currentUserInfo.businessLicense.file_name,
        fileType: window.currentUserInfo.businessLicense.file_type,
        uploadDate: new Date(
          window.currentUserInfo.businessLicense.upload_date
        ).toLocaleString("ko-KR"),
        fileSize: formatFileSize(
          window.currentUserInfo.businessLicense.file_size
        ),
      };

      displayBusinessLicense(businessLicenseData);
      document.getElementById("businessLicenseModal").style.display = "flex";
    } else {
      alert("사업자등록증 정보를 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error("사업자등록증 조회 오류:", error);
    alert("사업자등록증 정보를 불러오는 중 오류가 발생했습니다.");
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function displayBusinessLicense(data) {
  const content = document.getElementById("business-license-content");

  if (data.fileType === "application/pdf") {
    // PDF 파일인 경우
    content.innerHTML = `
      <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; background: #f9fafb;">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">${data.fileName}</div>
          <div style="font-size: 14px; color: #6b7280;">업로드일: ${data.uploadDate} | 크기: ${data.fileSize}</div>
        </div>
        <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 40px; text-align: center;">
          <div style="font-size: 48px; color: #ef4444; margin-bottom: 16px;">📄</div>
          <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">PDF 파일</div>
          <div style="font-size: 14px; color: #6b7280;">사업자등록증을 확인하려면 다운로드 버튼을 클릭하세요</div>
        </div>
      </div>
    `;
  } else if (data.fileType.startsWith("image/")) {
    // 이미지 파일인 경우
    content.innerHTML = `
      <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; background: #f9fafb;">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">${data.fileName}</div>
          <div style="font-size: 14px; color: #6b7280;">업로드일: ${data.uploadDate} | 크기: ${data.fileSize}</div>
        </div>
        <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 20px; text-align: center;">
          <div style="font-size: 48px; color: #10b981; margin-bottom: 16px;">🖼️</div>
          <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">이미지 파일</div>
          <div style="font-size: 14px; color: #6b7280;">사업자등록증 이미지를 확인하려면 다운로드 버튼을 클릭하세요</div>
        </div>
      </div>
    `;
  }
}

function closeBusinessLicenseModal() {
  document.getElementById("businessLicenseModal").style.display = "none";
}

async function downloadBusinessLicense() {
  try {
    // 현재 로그인한 사용자 ID 가져오기
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("사용자 인증이 필요합니다.");
      return;
    }

    // Supabase에서 다운로드 URL 생성
    const result = await window.userAPI.getBusinessLicenseDownloadUrl(user.id);

    if (result.success && result.data) {
      // 다운로드 링크 생성
      const link = document.createElement("a");
      link.href = result.data.signedUrl;
      link.download = window.currentUserInfo.businessLicense.file_name;
      link.click();
    } else {
      alert("파일 다운로드에 실패했습니다: " + result.error);
    }
  } catch (error) {
    console.error("파일 다운로드 오류:", error);
    alert("파일 다운로드 중 오류가 발생했습니다.");
  }
}

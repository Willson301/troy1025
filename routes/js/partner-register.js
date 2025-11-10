// 파일 업로드 관련 변수
let partnerBusinessLicenseFile = null;

// 파일 업로드 기능
function initPartnerFileUpload() {
  const uploadArea = document.getElementById("partner-business-license-upload");
  const fileInput = document.getElementById("partner-business-license");
  const fileInfo = document.getElementById("partner-business-license-info");
  const fileName = document.getElementById("partner-business-license-name");
  const fileSize = document.getElementById("partner-business-license-size");
  const removeBtn = document.getElementById("remove-partner-business-license");

  if (!uploadArea || !fileInput || !fileInfo) return;

  // 클릭으로 파일 선택
  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // 드래그 앤 드롭
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  });

  // 파일 선택
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // 파일 제거
  removeBtn.addEventListener("click", () => {
    partnerBusinessLicenseFile = null;
    fileInput.value = "";
    uploadArea.style.display = "block";
    fileInfo.style.display = "none";
  });

  function handleFileSelect(file) {
    // 파일 타입 검증
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("PDF, JPG, PNG 파일만 업로드 가능합니다.");
      return;
    }

    // 파일 크기 검증 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("파일 크기는 10MB를 초과할 수 없습니다.");
      return;
    }

    partnerBusinessLicenseFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    uploadArea.style.display = "none";
    fileInfo.style.display = "flex";
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// 페이지 로드 시 파일 업로드 초기화
document.addEventListener("DOMContentLoaded", initPartnerFileUpload);

function autoHyphenPhone(value) {
  const v = value.replace(/[^0-9]/g, "");
  if (v.startsWith("02")) {
    if (v.length <= 2) return v;
    if (v.length <= 5) return v.replace(/(\d{2})(\d{0,3})/, "$1-$2");
    return v.replace(/(\d{2})(\d{3,4})(\d{0,4}).*/, "$1-$2-$3");
  }
  if (v.length <= 3) return v;
  if (v.length <= 7) return v.replace(/(\d{3})(\d{0,4})/, "$1-$2");
  return v.replace(/(\d{3})(\d{3,4})(\d{0,4}).*/, "$1-$2-$3");
}

// 사업자번호 자동 하이픈 추가 함수
function autoHyphenBizno(value) {
  const v = value.replace(/[^0-9]/g, "");
  if (v.length <= 3) return v;
  if (v.length <= 5) return v.replace(/(\d{3})(\d{0,2})/, "$1-$2");
  return v.replace(/(\d{3})(\d{2})(\d{0,5})/, "$1-$2-$3");
}

const partnerPhoneInput = document.getElementById("partnerPhone");
if (partnerPhoneInput) {
  partnerPhoneInput.addEventListener("input", (e) => {
    e.target.value = autoHyphenPhone(e.target.value);
  });
}

const businessNumberInput = document.getElementById("businessNumber");
if (businessNumberInput) {
  businessNumberInput.addEventListener("input", (e) => {
    e.target.value = autoHyphenBizno(e.target.value);
  });
}

document
  .getElementById("partner-register-form")
  .addEventListener("submit", async function (e) {
    console.log("파트너 회원가입 폼 제출됨");
    e.preventDefault();

    const pw = document.getElementById("partnerPw").value;
    const pw2 = document.getElementById("partnerPw2").value;
    const code = document.getElementById("partnerCode").value;

    console.log("파트너 코드:", code);
    console.log("파트너 비밀번호 확인:", pw, pw2);

    if (!code) {
      alert("초대코드를 입력해주세요.");
      return;
    }
    if (pw !== pw2) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 사업자등록증 파일 검증
    if (!partnerBusinessLicenseFile) {
      alert("사업자등록증을 업로드해주세요.");
      return;
    }

    const userData = {
      username: document.getElementById("partnerId").value,
      password: pw,
      partner_code: code,
      business_name: document.getElementById("businessName").value,
      business_number: document.getElementById("businessNumber").value,
      manager_name: document.getElementById("partnerName").value,
      phone: document.getElementById("partnerPhone").value,
      email: document.getElementById("partnerEmail").value,
      messenger_id: document.getElementById("partnerMessenger").value,
      business_license: partnerBusinessLicenseFile, // 파일 객체 추가
    };

    const result = await window.authAPI.signupPartner(userData);
    if (result.success) {
      // 가입 성공 후 사업자등록증 파일을 사용자별 IndexedDB에 저장
      try {
        const userId = result?.data?.user?.id || "";
        if (userId && partnerBusinessLicenseFile) {
          await saveBusinessLicenseToIDB(
            userId,
            partnerBusinessLicenseFile,
            "partner"
          );
          const meta = {
            fileName: partnerBusinessLicenseFile.name,
            fileSize: partnerBusinessLicenseFile.size,
            fileType: partnerBusinessLicenseFile.type,
            uploadDate: new Date().toLocaleString("ko-KR"),
          };
          localStorage.setItem(
            `troy_business_license_meta_${userId}`,
            JSON.stringify(meta)
          );
        }
      } catch (_) {}
      // 사용자 정보를 localStorage에 저장 (사용자별)
      try {
        const userId = result?.data?.user?.id || "";
        if (userId) {
          // 역할별 userId 저장 (다른 역할의 userId와 분리)
          localStorage.setItem("troy_user_id_partner", userId);
          // 레거시 호환을 위해 troy_user_id도 저장 (현재 역할용)
          localStorage.setItem("troy_user_id", userId);
          const profile = {
            companyName: document.getElementById("businessName").value || "",
            businessNumber:
              document.getElementById("businessNumber").value || "",
            managerName: document.getElementById("partnerName").value || "",
            phone: document.getElementById("partnerPhone").value || "",
            email: document.getElementById("partnerEmail").value || "",
          };
          localStorage.setItem(
            `troy_profile_${userId}`,
            JSON.stringify(profile)
          );
          // 가입일 저장
          localStorage.setItem(
            `troy_join_date_${userId}`,
            new Date().toLocaleString("ko-KR")
          );
          // 회원코드 초기화 (존재하지 않으면 생성)
          const mcKey = `troy_member_code_${userId}`;
          if (!localStorage.getItem(mcKey)) {
            const idPart =
              userId.replace(/-/g, "").slice(-6).toUpperCase() ||
              Date.now().toString().slice(-6);
            localStorage.setItem(mcKey, `PT${idPart}`);
          }
        }
      } catch (_) {}
      try {
        const businessName =
          document.getElementById("businessName").value || "";
        if (businessName) {
          localStorage.setItem("troy_company_name", businessName);
        }
      } catch (_) {}
      const userInfo = {
        userType: "partner",
        companyName: userData.business_name,
        businessNumber: userData.business_number,
        managerName: userData.manager_name,
        phone: userData.phone,
        email: userData.email,
        messengerId: userData.messenger_id,
        // 메타 정보는 legacy 호환용으로 유지(실제 파일은 IndexedDB에 저장)
        businessLicense: partnerBusinessLicenseFile
          ? {
              fileName: partnerBusinessLicenseFile.name,
              fileSize: partnerBusinessLicenseFile.size,
              fileType: partnerBusinessLicenseFile.type,
              uploadDate: new Date().toLocaleString("ko-KR"),
            }
          : null,
        joinDate: new Date().toLocaleString("ko-KR"),
        memberCode: "PT" + Date.now().toString().slice(-6),
      };

      // 역할별 userInfo 저장 (다른 역할과 분리)
      localStorage.setItem("userInfo_partner", JSON.stringify(userInfo));
      // 레거시 호환을 위해 userInfo도 저장 (현재 역할용)
      localStorage.setItem("userInfo", JSON.stringify(userInfo));

      alert("가입이 완료되었습니다.");
      window.location.href = "/index.html";
    } else {
      alert("가입 실패: " + (result.error || "오류"));
    }
  });

// =========================
// IndexedDB: 사업자등록증 저장/조회
// =========================
function openFilesDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("troy_files", 2); // 버전 2로 증가
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // 기존 objectStore 제거 (버전 업그레이드)
      if (db.objectStoreNames.contains("business_licenses")) {
        db.deleteObjectStore("business_licenses");
      }
      // 새로운 objectStore 생성 (역할별 키 사용)
      const store = db.createObjectStore("business_licenses", {
        keyPath: ["userId", "role"],
      });
      store.createIndex("userId", "userId", { unique: false });
      store.createIndex("role", "role", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveBusinessLicenseToIDB(userId, file, role) {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("business_licenses", "readwrite");
    const store = tx.objectStore("business_licenses");
    const data = {
      userId,
      role,
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: Date.now(),
    };
    const req = store.put(data);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function getBusinessLicenseFromIDB(userId, role) {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("business_licenses", "readonly");
    const store = tx.objectStore("business_licenses");
    const req = store.get([userId, role]);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

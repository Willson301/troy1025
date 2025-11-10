// 페이지 로드 확인
console.log("register.js 파일이 로드되었습니다.");

// 폼 요소 확인 및 입력 하이픈 유틸/바인딩
const form = document.getElementById("register-form");
console.log("폼 요소:", form);

// 파일 업로드 관련 변수
let businessLicenseFile = null;

// 파일 업로드 기능
function initFileUpload() {
  const uploadArea = document.getElementById("business-license-upload");
  const fileInput = document.getElementById("business-license");
  const fileInfo = document.getElementById("business-license-info");
  const fileName = document.getElementById("business-license-name");
  const fileSize = document.getElementById("business-license-size");
  const removeBtn = document.getElementById("remove-business-license");

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
    businessLicenseFile = null;
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

    businessLicenseFile = file;
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
document.addEventListener("DOMContentLoaded", initFileUpload);

function autoHyphenBizno(value) {
  const v = value.replace(/[^0-9]/g, "");
  if (v.length <= 3) return v;
  if (v.length <= 5) return v.replace(/(\d{3})(\d{1,2})/, "$1-$2");
  return v.replace(/(\d{3})(\d{2})(\d{0,5}).*/, "$1-$2-$3");
}

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

const bizInput = document.getElementById("bizId");
if (bizInput) {
  bizInput.addEventListener("input", (e) => {
    const formatted = autoHyphenBizno(e.target.value);
    e.target.value = formatted;
  });
}

const phoneInput = document.getElementById("phone");
if (phoneInput) {
  phoneInput.addEventListener("input", (e) => {
    const formatted = autoHyphenPhone(e.target.value);
    e.target.value = formatted;
  });
}

if (form) {
  form.addEventListener("submit", async function (e) {
    console.log("회원가입 폼 제출됨");
    e.preventDefault();

    const pw = document.getElementById("pw").value;
    const pw2 = document.getElementById("pw2").value;

    console.log("비밀번호 확인:", pw, pw2);

    if (pw !== pw2) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 사업자등록증 파일 검증
    if (!businessLicenseFile) {
      alert("사업자등록증을 업로드해주세요.");
      return;
    }

    const userData = {
      username: document.getElementById("username").value, // 사용자가 입력한 아이디 사용
      password: pw,
      business_number: document.getElementById("bizId").value,
      company_name: document.getElementById("company").value,
      manager_name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      product_url: document.getElementById("url").value,
      business_license: businessLicenseFile, // 파일 객체 추가
    };

    const result = await window.authAPI.signupAdvertiser(userData);
    if (result.success) {
      // 가입 성공 후 사업자등록증 파일을 사용자별 IndexedDB에 저장
      try {
        const userId = result?.data?.user?.id || result?.userId || "";
        if (userId && businessLicenseFile) {
          await saveBusinessLicenseToIDB(
            userId,
            businessLicenseFile,
            "customer"
          );
          const meta = {
            fileName: businessLicenseFile.name,
            fileSize: businessLicenseFile.size,
            fileType: businessLicenseFile.type,
            uploadDate: new Date().toLocaleString("ko-KR"),
          };
          localStorage.setItem(
            `troy_business_license_meta_${userId}`,
            JSON.stringify(meta)
          );
        }
      } catch (_) {}
      // 가입 성공 후 사용자별 정보 저장
      try {
        const userId = result?.data?.user?.id || result?.userId || "";
        if (userId) {
          // 역할별 userId 저장 (다른 역할의 userId와 분리)
          localStorage.setItem("troy_user_id_customer", userId);
          // 레거시 호환을 위해 troy_user_id도 저장 (현재 역할용)
          localStorage.setItem("troy_user_id", userId);

          // 사용자별 프로필 저장
          const profile = {
            companyName: document.getElementById("company").value || "",
            businessNumber: document.getElementById("bizId").value || "",
            managerName: document.getElementById("name").value || "",
            phone: document.getElementById("phone").value || "",
            email: document.getElementById("email").value || "",
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
            localStorage.setItem(mcKey, `AD${idPart}`);
          }
        }
      } catch (_) {}

      // 역할별 userInfo 저장 (역할별 세션 분리)
      const userInfo = {
        userType: "advertiser",
        companyName: userData.company_name,
        businessNumber: userData.business_number,
        managerName: userData.manager_name,
        phone: userData.phone,
        email: userData.email,
        businessLicense: businessLicenseFile
          ? {
              fileName: businessLicenseFile.name,
              fileSize: businessLicenseFile.size,
              fileType: businessLicenseFile.type,
              uploadDate: new Date().toLocaleString("ko-KR"),
            }
          : null,
        joinDate: new Date().toLocaleString("ko-KR"),
        memberCode: "AD" + Date.now().toString().slice(-6),
      };
      // 역할별 userInfo 저장 (다른 역할과 분리)
      localStorage.setItem("userInfo_customer", JSON.stringify(userInfo));
      // 레거시 호환을 위해 userInfo도 저장 (현재 역할용)
      localStorage.setItem("userInfo", JSON.stringify(userInfo));

      // Supabase에 사업자등록증 파일 업로드
      if (businessLicenseFile && window.userAPI) {
        const uploadResult = await window.userAPI.uploadBusinessLicense(
          result.userId || result?.data?.user?.id,
          businessLicenseFile
        );
        if (!uploadResult.success) {
          console.error("사업자등록증 업로드 실패:", uploadResult.error);
        }
      }

      alert("가입이 완료되었습니다.");
      window.location.href = "/index.html";
    } else {
      alert("가입 실패: " + (result.error || "오류"));
    }
  });
} else {
  console.error("register-form을 찾을 수 없습니다!");
}

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

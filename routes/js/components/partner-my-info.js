// 파트너 나의 정보 전용 스크립트
function saveTaxInfo() {
  alert("세금계산서 정보 저장 기능은 준비 중입니다.");
}

// 사용자 정보 로드 함수 (서버 우선, 사용자별 로컬스토리지 보조)
async function loadPartnerUserInfo() {
  try {
    const role =
      typeof getCurrentUserRole === "function"
        ? getCurrentUserRole()
        : "partner";
    // 역할별 토큰 우선 조회 (현재 역할의 토큰만 사용)
    const token =
      typeof getRoleSessionToken === "function"
        ? getRoleSessionToken(role)
        : sessionStorage.getItem(`troy_token_${role}`) ||
          sessionStorage.getItem("troy_token") ||
          "";
    // 역할별 userId 우선 조회 (현재 역할의 userId만 사용)
    const userId = (
      localStorage.getItem(`troy_user_id_${role}`) ||
      localStorage.getItem("troy_user_id") ||
      ""
    ).trim();

    let companyName = "";
    let businessNumber = "";
    let managerName = "";
    let email = "";
    let phone = "";

    // 서버 프로필 조회
    if (token) {
      try {
        const res = await fetch("/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const u = data?.user || {};
          companyName = u.company_name || companyName;
          businessNumber = u.business_number || businessNumber;
          managerName = u.manager_name || managerName;
          email = u.email || email;
          phone = u.phone || phone;
        }
      } catch (_) {}
    }

    // 사용자별 로컬 프로필 보조 (가입 시 저장값 등) - 파트너사 역할에 맞게
    try {
      const localProfileKey = userId ? `troy_profile_${userId}` : "";
      const rawLocal = localProfileKey
        ? localStorage.getItem(localProfileKey)
        : null;
      // 역할별 userInfo 우선 조회 (현재 역할의 userInfo만 사용)
      const legacy =
        localStorage.getItem(`userInfo_${role}`) ||
        localStorage.getItem("userInfo"); // 이전 버전 호환
      const parsed = rawLocal
        ? JSON.parse(rawLocal)
        : legacy
        ? JSON.parse(legacy)
        : null;
      if (parsed) {
        // 파트너사 역할 필드명 우선 조회: business_name
        companyName = parsed.companyName || parsed.business_name || companyName;
        businessNumber =
          parsed.businessNumber || parsed.business_number || businessNumber;
        managerName = parsed.managerName || managerName;
        email = parsed.email || email;
        phone = parsed.phone || phone;
      }
      // 마이그레이션: legacy를 사용자별로 저장 (역할별로 분리)
      if (!rawLocal && legacy && userId) {
        const legacyParsed = JSON.parse(legacy);
        // 파트너사 역할인 경우만 저장
        if (legacyParsed.userType === "partner") {
          localStorage.setItem(localProfileKey, legacy);
        }
      }
    } catch (_) {}

    // 회원코드: 사용자별 고정 코드 생성/복원
    let memberCode = "";
    try {
      const mcKey = userId ? `troy_member_code_${userId}` : "";
      memberCode = mcKey ? localStorage.getItem(mcKey) || "" : "";
      if (!memberCode) {
        const abbrev = "PT"; // 파트너
        const idPart =
          (userId || "").replace(/-/g, "").slice(-6).toUpperCase() ||
          Date.now().toString().slice(-6);
        memberCode = `${abbrev}${idPart}`;
        if (mcKey) localStorage.setItem(mcKey, memberCode);
      }
    } catch (_) {}

    // DOM 반영
    const companyNameInput = document.getElementById("partner-company-name");
    if (companyNameInput) companyNameInput.value = companyName || "";

    const businessNumberInput = document.getElementById(
      "partner-business-number"
    );
    if (businessNumberInput) businessNumberInput.value = businessNumber || "";

    const memberCodeElements = document.querySelectorAll(".info-value");
    if (memberCodeElements.length > 0)
      memberCodeElements[0].textContent = memberCode || "";

    const joinDateElement = document.querySelector(".code-value");
    if (joinDateElement) {
      // 가입일은 저장된 값이 없으면 표시 생략
      const savedJoin =
        localStorage.getItem(userId ? `troy_join_date_${userId}` : "") || "";
      if (savedJoin) joinDateElement.textContent = savedJoin;
    }

    const managerNameInput = document.querySelector(
      '.form-input[placeholder*="성함"]'
    );
    if (managerNameInput) managerNameInput.value = managerName || "";

    const emailInput = document.querySelector(
      '.form-input[placeholder*="이메일"]'
    );
    if (emailInput) emailInput.value = email || "";

    const phoneInput = document.querySelector(
      '.form-input[placeholder*="연락처"]'
    );
    if (phoneInput) phoneInput.value = phone || "";
  } catch (_) {}
}

// 사업자등록증 관련 함수들
function showBusinessLicense() {
  try {
    const role =
      typeof getCurrentUserRole === "function"
        ? getCurrentUserRole()
        : "partner";
    // 역할별 userId 우선 조회 (현재 역할의 userId만 사용)
    const userId = (
      localStorage.getItem(`troy_user_id_${role}`) ||
      localStorage.getItem("troy_user_id") ||
      ""
    ).trim();
    if (!userId) {
      alert("로그인 정보가 없습니다. 다시 로그인 후 시도해주세요.");
      return;
    }

    // 메타 정보: 사용자별 키 우선, legacy(userInfo) 보조
    let meta = null;
    try {
      const raw = localStorage.getItem(`troy_business_license_meta_${userId}`);
      if (raw) meta = JSON.parse(raw);
    } catch (_) {}

    if (!meta) {
      try {
        const legacy = JSON.parse(localStorage.getItem("userInfo") || "null");
        if (legacy && legacy.businessLicense) meta = legacy.businessLicense;
      } catch (_) {}
    }

    if (!meta) {
      alert("사업자등록증 정보를 찾을 수 없습니다.");
      return;
    }

    const businessLicenseData = {
      fileName: meta.fileName,
      fileType: meta.fileType,
      uploadDate: meta.uploadDate,
      fileSize: formatFileSize(meta.fileSize || 0),
    };
    // 다운로드 시 사용할 사용자 식별자 및 역할 저장
    window.__currentBusinessLicenseUserId = userId;
    window.__currentBusinessLicenseRole = role;

    displayBusinessLicense(businessLicenseData);
    document.getElementById("businessLicenseModal").style.display = "flex";
  } catch (e) {
    alert("사업자등록증 정보를 여는 중 오류가 발생했습니다.");
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

function downloadBusinessLicense() {
  (async () => {
    try {
      const userId = window.__currentBusinessLicenseUserId || "";
      const role = window.__currentBusinessLicenseRole || "";
      if (!userId || !role) {
        alert("다운로드 대상 정보를 찾을 수 없습니다.");
        return;
      }
      const rec = await getBusinessLicenseFromIDB(userId, role);
      if (!rec || !rec.blob) {
        alert(
          "저장된 사업자등록증 파일이 없습니다. 신규 가입 후 다시 시도해주세요."
        );
        return;
      }
      const blob = rec.blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = rec.name || "사업자등록증";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
    }
  })();
}

function initPartnerMyInfo() {
  // 사용자 정보 로드
  loadPartnerUserInfo();
}

// 전역 노출
window.initPartnerMyInfo = initPartnerMyInfo;

// =========================
// IndexedDB 접근: 파트너 등록증 조회용
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

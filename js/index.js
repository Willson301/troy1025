// 로그인 버튼 클릭 시
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, setting up event listeners");

  const loginBtn = document.querySelector("#loginBtn");
  console.log("Login button found:", loginBtn);

  if (loginBtn) {
    loginBtn.addEventListener("click", async function () {
      console.log("Login button clicked");
      const usernameInput =
        document.getElementById("username") || document.getElementById("bizId");
      const passwordInput = document.getElementById("password");

      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!username || !password) {
        alert("아이디(사업자번호)와 비밀번호를 입력해주세요.");
        return;
      }

      try {
        const result = await window.authAPI.login(username, password);
        if (!result.success) {
          alert("로그인 실패: " + (result.error || "오류"));
          return;
        }

        const userId = result.data.user.id;
        const userType = result.data.user.userType;
        const token = result.data.token;

        // 역할별 세션 분리 저장
        localStorage.setItem("userRole", userType);
        // 역할별 userId 저장 (다른 역할의 userId와 분리)
        if (userId) localStorage.setItem(`troy_user_id_${userType}`, userId);
        // 레거시 호환을 위해 troy_user_id도 저장 (현재 역할용)
        if (userId) localStorage.setItem("troy_user_id", userId);
        // 역할별 토큰 저장
        sessionStorage.setItem(`troy_token_${userType}`, token);
        // 레거시 호환을 위해 troy_token도 저장 (현재 역할용)
        sessionStorage.setItem("troy_token", token);

        // 레거시 계좌정보 키 정리(타 계정 값 표시 방지)
        try {
          ["partner", "agency", "customer", "advertiser"].forEach((r) => {
            localStorage.removeItem(`troy_bank_${r}`);
          });
        } catch (_) {}

        // 프로필에서 회사명(사업자명) 확보 후 로컬 저장 (UI 표시용)
        try {
          const res = await fetch("/api/auth/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            let companyName = (data?.user?.company_name || "").trim();
            const isLikelyCode =
              /^([A-Z]{1,3})\d{4,}$/.test(companyName) ||
              companyName.toUpperCase().startsWith("PC");

            // 사용자별 로컬 프로필에서 상호명 보강
            try {
              const localProfileKey = userId ? `troy_profile_${userId}` : "";
              const rawLocal = localProfileKey
                ? localStorage.getItem(localProfileKey)
                : null;
              if (rawLocal) {
                const parsed = JSON.parse(rawLocal);
                const localName = (
                  parsed.companyName ||
                  parsed.business_name ||
                  ""
                ).trim();
                if (localName)
                  companyName = isLikelyCode
                    ? localName
                    : companyName || localName;
              }
            } catch (_) {}

            // 과거 저장값과 비교해 코드 형태면 덮어쓰기
            if (!companyName || isLikelyCode) {
              const fallback = (
                localStorage.getItem(`troy_company_name_${userType}`) ||
                localStorage.getItem("troy_company_name") ||
                ""
              ).trim();
              if (fallback) companyName = fallback;
            }

            // 역할별 회사명 저장 (다른 역할과 분리)
            if (companyName) {
              localStorage.setItem(
                `troy_company_name_${userType}`,
                companyName
              );
              // 레거시 호환을 위해 troy_company_name도 저장 (현재 역할용)
              localStorage.setItem("troy_company_name", companyName);
            }

            // 로그인 시 역할별 userInfo 저장 (다른 역할과 분리)
            try {
              const userInfo = {
                userType: userType,
                companyName:
                  companyName ||
                  data?.user?.company_name ||
                  data?.user?.agency_name ||
                  data?.user?.business_name ||
                  "",
                businessNumber: data?.user?.business_number || "",
                managerName: data?.user?.manager_name || "",
                phone: data?.user?.phone || "",
                email: data?.user?.email || "",
                joinDate: data?.user?.created_at
                  ? new Date(data.user.created_at).toLocaleString("ko-KR")
                  : "",
              };
              // 역할별 userInfo 저장 키 결정
              const roleKey = userType === "advertiser" ? "customer" : userType;
              localStorage.setItem(
                `userInfo_${roleKey}`,
                JSON.stringify(userInfo)
              );
              // 레거시 호환을 위해 userInfo도 저장 (현재 역할용)
              localStorage.setItem("userInfo", JSON.stringify(userInfo));
            } catch (_) {}
          }
        } catch (_) {}

        if (userType === "admin") {
          window.location.replace("html/admin-dashboard.html");
        } else if (userType === "advertiser") {
          window.location.replace("html/customer-dashboard.html");
        } else if (userType === "agency") {
          window.location.replace("html/agency-dashboard.html");
        } else if (userType === "partner") {
          window.location.replace("html/partner-dashboard.html");
        } else {
          window.location.replace("html/customer-dashboard.html");
        }
      } catch (e) {
        alert("로그인 중 오류: " + e.message);
      }
    });
  }

  // 회원가입 링크 클릭 시
  const signupLink = document.querySelector("#signup-link");
  console.log("Signup link found:", signupLink);
  if (signupLink) {
    signupLink.addEventListener("click", function (e) {
      console.log("Signup link clicked");
      e.preventDefault();
      window.location.href = "html/register-select.html";
    });
  }

  // 비밀번호 찾기 링크 클릭 시
  const passwordFindLink = document.querySelector("#password-find-link");
  console.log("Password find link found:", passwordFindLink);
  if (passwordFindLink) {
    passwordFindLink.addEventListener("click", function (e) {
      console.log("Password find link clicked");
      e.preventDefault();
      window.location.href = "html/password-find.html";
    });
  }
});

(function () {
  const form = document.querySelector(".form");
  const idInput = document.getElementById("bizId");
  const pwInput = document.getElementById("password");

  function routeByRole(userId, password) {
    if (userId === "admin" && password === "1234") {
      // 관리자 토큰 저장 (역할별 세션 분리)
      localStorage.setItem("userRole", "admin");
      sessionStorage.setItem("troy_token_admin", "admin_temp_token");
      sessionStorage.setItem("troy_token", "admin_temp_token"); // 레거시 호환
      window.location.replace("admin-dashboard.html");
    } else if (userId === "agency" && password === "1234") {
      // 대행사 토큰 저장 (역할별 세션 분리)
      localStorage.setItem("userRole", "agency");
      sessionStorage.setItem("troy_token_agency", "agency_temp_token");
      sessionStorage.setItem("troy_token", "agency_temp_token"); // 레거시 호환
      window.location.replace("agency-dashboard.html");
    } else if (userId === "customer" && password === "1234") {
      // 고객사 토큰 저장 (역할별 세션 분리)
      localStorage.setItem("userRole", "customer");
      sessionStorage.setItem("troy_token_customer", "customer_temp_token");
      sessionStorage.setItem("troy_token", "customer_temp_token"); // 레거시 호환
      window.location.replace("customer-dashboard.html");
    } else if (userId === "partner" && password === "1234") {
      // 파트너사 토큰 저장 (역할별 세션 분리)
      localStorage.setItem("userRole", "partner");
      sessionStorage.setItem("troy_token_partner", "partner_temp_token");
      sessionStorage.setItem("troy_token", "partner_temp_token"); // 레거시 호환
      window.location.replace("partner-dashboard.html");
    } else {
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    routeByRole((idInput.value || "").trim(), (pwInput.value || "").trim());
  }

  // 폼 제출 이벤트 (엔터키 지원)
  form.addEventListener("submit", handleSubmit);

  // 로그인 버튼 클릭 이벤트
  document.querySelector(".btn").addEventListener("click", handleSubmit);

  // 엔터키 이벤트 추가
  idInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      pwInput.focus();
    }
  });

  pwInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      handleSubmit();
    }
  });
})();

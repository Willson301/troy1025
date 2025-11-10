// 비밀번호 재설정 JavaScript

document.addEventListener("DOMContentLoaded", function () {
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const toggleNewPasswordBtn = document.getElementById("toggleNewPassword");
  const toggleConfirmPasswordBtn = document.getElementById(
    "toggleConfirmPassword"
  );
  const passwordStrengthDiv = document.getElementById("passwordStrength");
  const passwordMatchDiv = document.getElementById("passwordMatch");
  const submitBtn = document.getElementById("submitResetBtn");
  const resetForm = document.getElementById("resetPasswordForm");

  // 비밀번호 표시/숨김 토글
  toggleNewPasswordBtn.addEventListener("click", function () {
    const type =
      newPasswordInput.getAttribute("type") === "password"
        ? "text"
        : "password";
    newPasswordInput.setAttribute("type", type);

    if (type === "password") {
      this.textContent = "보기";
      this.style.background = "white";
      this.style.color = "var(--accent)";
    } else {
      this.textContent = "숨기기";
      this.style.background = "var(--accent)";
      this.style.color = "white";
    }
  });

  toggleConfirmPasswordBtn.addEventListener("click", function () {
    const type =
      confirmPasswordInput.getAttribute("type") === "password"
        ? "text"
        : "password";
    confirmPasswordInput.setAttribute("type", type);

    if (type === "password") {
      this.textContent = "보기";
      this.style.background = "white";
      this.style.color = "var(--accent)";
    } else {
      this.textContent = "숨기기";
      this.style.background = "var(--accent)";
      this.style.color = "white";
    }
  });

  // 비밀번호 강도 검사
  function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];

    // 길이 검사
    if (password.length >= 8 && password.length <= 20) {
      strength += 1;
    } else {
      feedback.push("8자 이상 20자 이하로 입력해주세요");
    }

    // 영문 대소문자 검사
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      strength += 1;
    } else if (/[a-zA-Z]/.test(password)) {
      feedback.push("영문 대소문자를 모두 포함해주세요");
    }

    // 숫자 검사
    if (/\d/.test(password)) {
      strength += 1;
    } else {
      feedback.push("숫자를 포함해주세요");
    }

    // 특수문자 검사
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength += 1;
    } else {
      feedback.push("특수문자를 포함해주세요");
    }

    // 연속된 문자/숫자 검사
    if (
      /(.)\1{2,}/.test(password) ||
      /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
        password
      )
    ) {
      feedback.push("연속된 문자나 숫자는 사용할 수 없습니다");
    }

    return { strength, feedback };
  }

  // 비밀번호 강도 표시
  newPasswordInput.addEventListener("input", function () {
    const password = this.value;
    const { strength, feedback } = checkPasswordStrength(password);

    if (password.length === 0) {
      passwordStrengthDiv.textContent = "";
      passwordStrengthDiv.style.color = "";
      return;
    }

    if (strength >= 3 && feedback.length === 0) {
      passwordStrengthDiv.textContent = "✅ 안전한 비밀번호입니다";
      passwordStrengthDiv.style.color = "#10b981";
    } else if (strength >= 2) {
      passwordStrengthDiv.textContent = "⚠️ 보통 수준의 비밀번호입니다";
      passwordStrengthDiv.style.color = "#f59e0b";
    } else {
      passwordStrengthDiv.textContent = "❌ 약한 비밀번호입니다";
      passwordStrengthDiv.style.color = "#ef4444";
    }

    // 피드백 표시
    if (feedback.length > 0) {
      passwordStrengthDiv.textContent += " (" + feedback.join(", ") + ")";
    }

    // 비밀번호 확인 검사
    checkPasswordMatch();
  });

  // 비밀번호 일치 검사
  function checkPasswordMatch() {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (confirmPassword.length === 0) {
      passwordMatchDiv.textContent = "";
      passwordMatchDiv.style.color = "";
      return;
    }

    if (newPassword === confirmPassword) {
      passwordMatchDiv.textContent = "✅ 비밀번호가 일치합니다";
      passwordMatchDiv.style.color = "#10b981";
    } else {
      passwordMatchDiv.textContent = "❌ 비밀번호가 일치하지 않습니다";
      passwordMatchDiv.style.color = "#ef4444";
    }
  }

  confirmPasswordInput.addEventListener("input", checkPasswordMatch);

  // 페이지 로드 시 토큰 확인
  document.addEventListener("DOMContentLoaded", function () {
    const resetToken = localStorage.getItem("passwordResetToken");
    if (!resetToken) {
      alert("유효하지 않은 접근입니다. 비밀번호 찾기부터 다시 시작해주세요.");
      window.location.href = "/html/password-find.html";
      return;
    }
  });

  // 폼 제출 처리
  resetForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const resetToken = localStorage.getItem("passwordResetToken");

    // 토큰 확인
    if (!resetToken) {
      alert("유효하지 않은 접근입니다. 비밀번호 찾기부터 다시 시작해주세요.");
      window.location.href = "/html/password-find.html";
      return;
    }

    // 유효성 검사
    if (!newPassword || !confirmPassword) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    const { strength, feedback } = checkPasswordStrength(newPassword);
    if (strength < 3 || feedback.length > 0) {
      alert("비밀번호 규칙을 확인해주세요.\n\n" + feedback.join("\n"));
      return;
    }

    // 비밀번호 재설정 처리
    submitBtn.disabled = true;
    submitBtn.textContent = "처리 중...";
    submitBtn.style.opacity = "0.6";

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resetToken: resetToken,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "비밀번호 재설정에 실패했습니다.");
        submitBtn.disabled = false;
        submitBtn.textContent = "비밀번호 재설정";
        submitBtn.style.opacity = "1";
        return;
      }

      // 성공 시 토큰 제거하고 로그인 페이지로 이동
      localStorage.removeItem("passwordResetToken");
      alert(
        "비밀번호가 성공적으로 재설정되었습니다.\n로그인 페이지로 이동합니다."
      );
      window.location.href = "/";
    } catch (error) {
      console.error("비밀번호 재설정 오류:", error);
      alert("비밀번호 재설정 중 오류가 발생했습니다.");
      submitBtn.disabled = false;
      submitBtn.textContent = "비밀번호 재설정";
      submitBtn.style.opacity = "1";
    }
  });

  // Enter 키로 다음 필드로 이동
  newPasswordInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmPasswordInput.focus();
    }
  });

  confirmPasswordInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitBtn.click();
    }
  });
});

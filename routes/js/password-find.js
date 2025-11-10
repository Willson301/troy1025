let verificationCode = "";
let timer = null;
let timeLeft = 300; // 5분
let resendTimer = null;
let resendTimeLeft = 30; // 재발송 대기 시간 30초
let resetToken = null; // 비밀번호 재설정용 토큰

// 휴대폰 번호 자동 하이픈 추가
document.getElementById("phoneNumber").addEventListener("input", function (e) {
  let value = e.target.value.replace(/[^0-9]/g, "");
  if (value.length >= 3) {
    value = value.slice(0, 3) + "-" + value.slice(3);
  }
  if (value.length >= 8) {
    value = value.slice(0, 8) + "-" + value.slice(8);
  }
  e.target.value = value.slice(0, 13);
});

// 인증번호 발송 버튼
document
  .getElementById("sendVerificationBtn")
  .addEventListener("click", async function () {
    const phoneNumber = document.getElementById("phoneNumber").value;

    if (!phoneNumber) {
      alert("휴대폰 번호를 입력해주세요.");
      return;
    }

    // 휴대폰 번호 형식 검증 (010-0000-0000)
    const phoneRegex = /^01[0-9]-\d{4}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      alert("올바른 휴대폰 번호 형식을 입력해주세요. (예: 010-1234-5678)");
      return;
    }

    // API 호출하여 인증번호 발송
    try {
      const response = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "인증번호 발송에 실패했습니다.");
        return;
      }

      // 개발 환경에서만 인증번호 표시
      if (result.verificationCode) {
        alert(
          "인증번호가 " +
            phoneNumber +
            "로 발송되었습니다.\n\n인증번호: " +
            result.verificationCode
        );
      } else {
        alert("인증번호가 " + phoneNumber + "로 발송되었습니다.");
      }

      // 인증 섹션 표시
      document.getElementById("verificationSection").style.display = "block";

      // 타이머 시작
      startTimer();

      // 인증번호 발송 버튼 비활성화 및 재발송 타이머 시작
      this.disabled = true;
      this.textContent = "재발송 (30)";
      this.style.opacity = "0.6";
      startResendTimer();
    } catch (error) {
      console.error("인증번호 발송 오류:", error);
      alert("인증번호 발송 중 오류가 발생했습니다.");
    }
  });

// 인증번호 확인 버튼
document
  .getElementById("verifyCodeBtn")
  .addEventListener("click", async function () {
    const inputCode = document.getElementById("verificationCode").value;
    const phoneNumber = document.getElementById("phoneNumber").value;

    if (!inputCode) {
      alert("인증번호를 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          code: inputCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "인증에 실패했습니다.");
        return;
      }

      // 인증 성공
      alert("인증이 완료되었습니다.");
      resetToken = result.resetToken; // 재설정 토큰 저장

      document.getElementById("resetPasswordBtn").disabled = false;
      document.getElementById("resetPasswordBtn").style.opacity = "1";

      // 타이머 정지
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      document.getElementById("timer").textContent = "";

      // 인증번호 입력 필드 비활성화
      document.getElementById("verificationCode").disabled = true;
      this.disabled = true;
      this.textContent = "인증완료";
      this.style.background = "var(--accent)";
      this.style.color = "white";
    } catch (error) {
      console.error("인증번호 확인 오류:", error);
      alert("인증 중 오류가 발생했습니다.");
    }
  });

// 타이머 함수
function startTimer() {
  timeLeft = 300; // 5분
  updateTimer();
  timer = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById(
    "timer"
  ).textContent = `인증번호 유효시간: ${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;

  if (timeLeft <= 0) {
    clearInterval(timer);
    timer = null;
    document.getElementById("timer").textContent = "인증번호가 만료되었습니다.";
    document.getElementById("verificationCode").disabled = true;
    document.getElementById("verifyCodeBtn").disabled = true;
    verificationCode = "";
  }
  timeLeft--;
}

// 재발송 타이머 함수
function startResendTimer() {
  resendTimeLeft = 30;
  updateResendTimer();
  resendTimer = setInterval(updateResendTimer, 1000);
}

function updateResendTimer() {
  const sendBtn = document.getElementById("sendVerificationBtn");
  sendBtn.textContent = `재발송 (${resendTimeLeft})`;

  if (resendTimeLeft <= 0) {
    clearInterval(resendTimer);
    resendTimer = null;
    sendBtn.disabled = false;
    sendBtn.textContent = "재발송";
    sendBtn.style.opacity = "1";
  }
  resendTimeLeft--;
}

// 비밀번호 재설정 폼 제출
document
  .getElementById("forgotPasswordForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    if (!resetToken) {
      alert("먼저 휴대폰 인증을 완료해주세요.");
      return;
    }

    // 재설정 토큰을 localStorage에 저장하고 재설정 페이지로 이동
    localStorage.setItem("passwordResetToken", resetToken);
    window.location.href = "/html/reset-password.html";
  });

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
});

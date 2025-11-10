function goBackToMain() {
  // 관리자 대시보드 메인으로 돌아가기
  if (typeof loadMainContent === "function") {
    loadMainContent();
  } else {
    history.back();
  }
}

function openPayment(id) {
  alert(`${id} 상세 보기`);
}

function approvePayment(id) {
  if (confirm(`${id} 결제를 승인하시겠습니까?`)) {
    alert("승인되었습니다.");
  }
}

function rejectPayment(id) {
  if (confirm(`${id} 결제를 반려하시겠습니까?`)) {
    alert("반려되었습니다.");
  }
}

// 결제내역 관리 컴포넌트 초기화
function initPaymentHistoryComponent() {
  console.log("결제내역 관리 컴포넌트 초기화");

  // 통계 카드 클릭 이벤트
  const statCards = document.querySelectorAll(
    'div[style*="background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;"]'
  );

  statCards.forEach((card, index) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", function () {
      const statTypes = ["승인 대기", "오늘 승인", "총 승인 금액", "반려"];
      console.log(`${statTypes[index]} 클릭됨`);
      // 실제 구현에서는 여기서 해당 통계에 맞는 필터링 수행
    });
  });
}

// 전역 등록
window.goBackToMain = goBackToMain;
window.openPayment = openPayment;
window.approvePayment = approvePayment;
window.rejectPayment = rejectPayment;
window.initPaymentHistoryComponent = initPaymentHistoryComponent;

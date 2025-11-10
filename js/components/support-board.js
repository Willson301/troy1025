function replySupport(id) {
  alert(`${id} 문의에 답변합니다.`);
}

function completeSupport(id) {
  if (confirm(`${id} 문의를 완료 처리하시겠습니까?`)) {
    alert("완료 처리되었습니다.");
  }
}

function viewSupportDetail(id) {
  alert(`${id} 문의 상세를 확인합니다.`);
}

function archiveSupport(id) {
  if (confirm(`${id} 문의를 보관하시겠습니까?`)) {
    alert("보관 처리되었습니다.");
  }
}

// 1:1 문의 처리 컴포넌트 초기화
function initSupportBoardComponent() {
  console.log("1:1 문의 처리 컴포넌트 초기화");

  // 문의 카드 클릭 이벤트
  const supportCards = document.querySelectorAll(".support-card");

  supportCards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", function (e) {
      // 버튼 클릭 시에는 카드 클릭 이벤트 방지
      if (e.target.classList.contains("btn")) {
        return;
      }

      const title = this.querySelector(".support-title").textContent;
      console.log(`문의 카드 클릭: ${title}`);
      // 실제 구현에서는 여기서 문의 상세 모달 열기
    });
  });
}

// 전역 등록
window.replySupport = replySupport;
window.completeSupport = completeSupport;
window.viewSupportDetail = viewSupportDetail;
window.archiveSupport = archiveSupport;
window.initSupportBoardComponent = initSupportBoardComponent;

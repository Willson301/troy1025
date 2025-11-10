// 서비스 소개 페이지 로드
async function loadServiceIntroPage() {
  try {
    console.log("서비스 소개 페이지 로드 시작");

    // HTML 파일 로드
    const response = await fetch("../html/components/service-intro.html");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const htmlContent = await response.text();

    // 메인 콘텐츠 영역에 삽입
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = htmlContent;
      console.log("서비스 소개 HTML 로드 및 삽입 완료");

      // CSS 파일 로드 (dashboard-common.js에서 이미 처리하지만, 혹시 몰라 여기에 추가)
      const existingLink = document.querySelector(
        'link[href*="service-intro.css"]'
      );
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "../css/service-intro.css";
        document.head.appendChild(link);
        console.log("서비스 소개 CSS 로드 완료");
      }

      // 페이지 제목 업데이트 (dashboard-common.js에서 처리)
      if (window.updatePageTitle) {
        window.updatePageTitle(
          "서비스 소개",
          "TROY의 다양한 서비스를 소개합니다."
        );
      }
    } else {
      console.error("메인 콘텐츠 영역(.main-content)을 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error("서비스 소개 페이지 로드 중 오류:", error);
    alert("서비스 소개 페이지를 불러오는 중 오류가 발생했습니다.");
  }
}

// 전역 스코프에 함수 노출
window.initServiceIntroComponent = loadServiceIntroPage;

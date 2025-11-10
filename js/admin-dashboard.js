// 캠페인 데이터 초기화 및 통계 계산
function updateStatistics() {
  const campaigns = document.querySelectorAll(".campaign-item");
  const stats = {
    total: campaigns.length,
    scheduled: 0,
    applying: 0,
    progress: 0,
    completed: 0,
  };

  campaigns.forEach((campaign) => {
    const status = campaign.getAttribute("data-status");
    if (stats.hasOwnProperty(status)) {
      stats[status]++;
    }
  });

  // 통계 카드 업데이트
  document.getElementById("total-count").textContent = stats.total;
  document.getElementById("scheduled-count").textContent = stats.scheduled;
  document.getElementById("applying-count").textContent = stats.applying;
  document.getElementById("progress-count").textContent = stats.progress;
  document.getElementById("completed-count").textContent = stats.completed;

  // 진행률 업데이트
  updateProgressBars(stats);
}

// 진행률 바 업데이트
function updateProgressBars(stats) {
  const total = stats.total || 1; // 0으로 나누기 방지

  // 전체 캠페인 진행률
  const totalProgress = Math.round((stats.completed / total) * 100);
  updateProgressItem("전체 캠페인", totalProgress, stats.completed, total);

  // 예정 캠페인 진행률
  const scheduledProgress = Math.round((stats.scheduled / total) * 100);
  updateProgressItem("예정 캠페인", scheduledProgress, stats.scheduled, total);

  // 신청 캠페인 진행률
  const applyingProgress = Math.round((stats.applying / total) * 100);
  updateProgressItem("신청 캠페인", applyingProgress, stats.applying, total);
}

// 개별 진행률 아이템 업데이트
function updateProgressItem(label, percentage, current, total) {
  const progressItems = document.querySelectorAll(".progress-item");

  progressItems.forEach((item) => {
    const progressLabel = item.querySelector(".progress-label");
    if (progressLabel.textContent === label) {
      // 퍼센트 업데이트
      const percentageElement = item.querySelector(".progress-percentage");
      percentageElement.textContent = percentage + "%";

      // 진행률 바 업데이트
      const progressFill = item.querySelector(".progress-fill");
      progressFill.style.width = percentage + "%";

      // 상세 정보 업데이트
      const progressDetails = item.querySelector(".progress-details");
      if (label === "전체 캠페인") {
        progressDetails.innerHTML = `<span>진행 중: ${current}</span><span>종료: ${
          total - current
        }</span>`;
      } else {
        progressDetails.innerHTML = `<span>진행 중: ${current}</span><span>전체: ${total}</span>`;
      }
    }
  });
}

// 필터링 기능
function filterCampaigns(status) {
  const campaigns = document.querySelectorAll(".campaign-item");

  campaigns.forEach((campaign) => {
    if (status === "all" || campaign.getAttribute("data-status") === status) {
      campaign.classList.remove("hidden");
    } else {
      campaign.classList.add("hidden");
    }
  });

  // 활성 상태 카드 표시
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.classList.remove("active");
  });
  document.querySelector(`[data-status="${status}"]`).classList.add("active");
}

// 검색 기능
function searchCampaigns(query) {
  const campaigns = document.querySelectorAll(".campaign-item");

  campaigns.forEach((campaign) => {
    const title = campaign.querySelector("h3").textContent.toLowerCase();
    const id = campaign.querySelector(".campaign-id").textContent.toLowerCase();

    if (
      title.includes(query.toLowerCase()) ||
      id.includes(query.toLowerCase())
    ) {
      campaign.classList.remove("hidden");
    } else {
      campaign.classList.add("hidden");
    }
  });
}

// TROY 로고 클릭 시 홈으로 이동 (로그인 상태 유지)
function goToHome() {
  // 관리자 대시보드에서 TROY 로고 클릭 시 캠페인 관리 화면으로 이동
  if (typeof loadCampaignApproval === "function") {
    console.log("TROY 로고 클릭: 캠페인 관리 화면으로 이동");
    loadCampaignApproval();
  }
}

// 전역 함수로 노출
window.goToHome = goToHome;

// 서비스 소개 모달
function showServiceInfo() {
  const modal = document.getElementById("serviceModal");
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

function hideServiceInfo() {
  const modal = document.getElementById("serviceModal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

function switchService(serviceName) {
  // 탭 활성화 상태 변경
  document.querySelectorAll(".service-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  event.target.classList.add("active");

  // 콘텐츠 섹션 변경
  document.querySelectorAll(".service-content-section").forEach((section) => {
    section.style.display = "none";
  });
  document.getElementById(serviceName).style.display = "block";
}

// 나의 정보 인라인 뷰
function showMyInfo() {
  // 메인 콘텐츠 숨기기
  document.querySelector(".stats-grid").style.display = "none";
  document.querySelector(".search-section").style.display = "none";
  document.querySelector(".campaign-list").style.display = "none";

  // 나의 정보 섹션 표시
  document.getElementById("myInfoSection").style.display = "block";

  // 페이지 제목 변경
  document.querySelector(".page-title").textContent = "관리자 계정 정보";
  document.querySelector(".page-subtitle").textContent =
    "관리자 계정 정보를 확인하고 관리하세요";
}

function hideMyInfo() {
  // 메인 콘텐츠 표시
  document.querySelector(".stats-grid").style.display = "grid";
  document.querySelector(".search-section").style.display = "block";
  document.querySelector(".campaign-list").style.display = "block";

  // 나의 정보 섹션 숨기기
  document.getElementById("myInfoSection").style.display = "none";

  // 페이지 제목 복원
  document.querySelector(".page-title").textContent = "관리자 대시보드";
  document.querySelector(".page-subtitle").textContent =
    "캠페인 현황을 한눈에 확인하고 관리하세요";
}

// 모달 외부 클릭 시 닫기
window.onclick = function (event) {
  const serviceModal = document.getElementById("serviceModal");
  if (event.target == serviceModal) {
    hideServiceInfo();
  }
};

// 이벤트 리스너
document.addEventListener("DOMContentLoaded", function () {
  // 통계 초기화
  updateStatistics();

  // 통계 카드 클릭 이벤트
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.addEventListener("click", function () {
      const status = this.getAttribute("data-status");
      filterCampaigns(status);
    });
  });

  // 검색 기능
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");

  searchBtn.addEventListener("click", function () {
    searchCampaigns(searchInput.value);
  });

  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      searchCampaigns(this.value);
    }
  });

  resetBtn.addEventListener("click", function () {
    searchInput.value = "";
    filterCampaigns("all");
  });

  // 로그아웃
  document.querySelector(".logout").addEventListener("click", function () {
    window.location.href = "/";
  });

  // 액션 버튼들 (결과보기만)
  document.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      alert("캠페인 결과를 확인합니다.");
    });
  });

  // 메뉴 아이템 클릭
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", function () {
      document
        .querySelectorAll(".menu-item")
        .forEach((i) => i.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // 새 캠페인 등록 버튼
  document
    .querySelector(".new-campaign-btn")
    .addEventListener("click", function () {
      alert("새로운 캠페인 등록 기능은 준비 중입니다.");
    });

  // 기본으로 전체 보기
  filterCampaigns("all");
});

// 파트너사 코드 발급 UI 로더
async function loadPartnerCodeIssuer() {
  console.log("loadPartnerCodeIssuer 함수 호출됨");
  const container = document.getElementById("main-content-container");
  console.log("container:", container);
  if (!container) {
    console.error("main-content-container를 찾을 수 없습니다!");
    return;
  }

  container.innerHTML = `
    <div class="partner-code-issuer">
      <div class="page-header">
        <div class="header-content">
          <h2 class="page-title">
            파트너사 코드 발급
          </h2>
          <p class="page-subtitle">파트너 가입을 위한 고유 코드를 생성하고 관리합니다</p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-number" id="total-codes">-</div>
            <div class="stat-label">총 발급 코드</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="used-codes">-</div>
            <div class="stat-label">사용된 코드</div>
          </div>
        </div>
      </div>

      <div class="code-generator-section">
        <div class="section-header">
          <h3 class="section-title">
            새 코드 생성
          </h3>
        </div>
        
        <div class="generator-card">
          <div class="code-display-area">
            <div class="code-label">생성된 파트너 코드</div>
            <div class="code-input-group">
              <input 
                id="partner-code-input" 
                class="code-input" 
                placeholder="코드를 생성해주세요" 
                readonly 
              />
              <button id="generate-code-btn" class="btn-primary">
                코드 생성
              </button>
              <button id="copy-code-btn" class="btn-secondary">
                복사
              </button>
            </div>
          </div>
          
          <div class="memo-section">
            <div class="memo-label">메모 (선택사항)</div>
            <div class="memo-input-group">
              <input 
                id="memo-input" 
                class="memo-input" 
                placeholder="코드에 대한 설명이나 용도를 입력하세요" 
              />
              <button id="save-code-btn" class="btn-success">
                코드 발급
              </button>
            </div>
          </div>
          
          <div class="help-text">
            <span>발급된 코드는 파트너 회원가입 시 "파트너 코드" 입력란에 사용됩니다</span>
          </div>
        </div>
      </div>

      <div class="code-list-section">
        <div class="section-header">
          <h3 class="section-title">
            발급된 코드 목록
          </h3>
          <div class="list-controls">
            <select id="status-filter" class="filter-select">
              <option value="all">전체</option>
              <option value="unused">미사용</option>
              <option value="used">사용됨</option>
            </select>
          </div>
        </div>
        
        <div class="code-list-card">
          <div id="issued-code-list" class="code-list">
            <div class="loading-state">
              <span>코드 목록을 불러오는 중...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const codeInput = document.getElementById("partner-code-input");
  const listEl = document.getElementById("issued-code-list");

  function generateCode() {
    // 파트너사 코드 생성: PC + 날짜 + 순번
    // 예: PC0927001 (PC + 0927 + 001)
    const prefix = "PC";

    // 기존 발급된 코드에서 오늘 날짜의 최대 순번 찾기
    const existingCodes = JSON.parse(
      localStorage.getItem("troy_partner_codes") || "[]"
    );

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateString = month + day;

    let maxSequence = 0;
    const todayPattern = new RegExp(`^PC${dateString}(\\d{3})$`);

    existingCodes.forEach((item) => {
      const match = item.code.match(todayPattern);
      if (match) {
        const sequence = parseInt(match[1]);
        if (sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });

    const sequence = String(maxSequence + 1).padStart(3, "0"); // 3자리로 패딩

    return `${prefix}${dateString}${sequence}`;
  }

  async function renderList() {
    try {
      // 토큰 확인
      const token = localStorage.getItem("troy_token");
      if (!token) {
        console.log("토큰이 없어서 로컬 스토리지를 사용합니다.");
        throw new Error("No token");
      }

      // Supabase에서 코드 목록 조회
      const response = await fetch("/api/admin/partner-codes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.codes || [];

        if (!data.length) {
          listEl.innerHTML = `
            <div class="empty-state">
              <span>아직 발급된 코드가 없습니다</span>
            </div>
          `;
          return;
        }

        listEl.innerHTML = data
          .map(
            (item) => `
            <div class="code-item">
              <div class="code-info">
                <div class="code-value">${item.code}</div>
                <div class="code-meta">
                  <span>${item.memo || "메모 없음"}</span>
                  <span>•</span>
                  <span>${new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div class="code-status">
                <span class="status-badge ${
                  item.is_used ? "status-used" : "status-unused"
                }">
                  ${item.is_used ? "사용됨" : "사용가능"}
                </span>
                <div class="code-actions">
                  <button class="btn-small btn-copy" onclick="copyToClipboard('${
                    item.code
                  }')">
                    복사
                  </button>
                  ${
                    !item.is_used
                      ? `<button class="btn-small btn-delete" onclick="deleteCode('${item.id}')">삭제</button>`
                      : ""
                  }
                </div>
              </div>
            </div>
          `
          )
          .join("");
      } else if (response.status === 401 || response.status === 403) {
        console.log("인증 실패 - 로컬 스토리지를 사용합니다.");
        throw new Error("Auth failed");
      } else {
        console.log("API 호출 실패 - 로컬 스토리지를 사용합니다.");
        throw new Error("API failed");
      }
    } catch (error) {
      console.log("로컬 스토리지에서 코드 목록을 로드합니다.");
      // 로컬 스토리지 사용
      const data = JSON.parse(
        localStorage.getItem("troy_partner_codes") || "[]"
      );
      if (!data.length) {
        listEl.innerHTML = `
          <div class="empty-state">
            <span>아직 발급된 코드가 없습니다</span>
          </div>
        `;
        return;
      }
      listEl.innerHTML = data
        .slice()
        .reverse()
        .map(
          (item) => `
          <div class="code-item">
            <div class="code-info">
              <div class="code-value">${item.code}</div>
              <div class="code-meta">
                <span>${item.memo || "메모 없음"}</span>
                <span>•</span>
                <span>${new Date(item.ts).toLocaleDateString()}</span>
              </div>
            </div>
            <div class="code-status">
              <span class="status-badge ${
                item.is_used ? "status-used" : "status-unused"
              }">
                ${item.is_used ? "사용됨" : "사용가능"}
              </span>
              <div class="code-actions">
                <button class="btn-small btn-copy" onclick="copyToClipboard('${
                  item.code
                }')">
                  복사
                </button>
                ${
                  !item.is_used
                    ? `<button class="btn-small btn-delete" onclick="deleteCode('${item.id}')">삭제</button>`
                    : ""
                }
              </div>
            </div>
          </div>
        `
        )
        .join("");
    }
  }

  document.getElementById("generate-code-btn").onclick = () => {
    const code = generateCode();
    codeInput.value = code;
  };

  document.getElementById("copy-code-btn").onclick = async () => {
    if (!codeInput.value)
      return showMessage("먼저 코드를 생성하세요.", "error");
    try {
      await navigator.clipboard.writeText(codeInput.value);
      showMessage("코드가 클립보드에 복사되었습니다.", "success");
    } catch {
      showMessage("복사에 실패했습니다.", "error");
    }
  };

  document.getElementById("save-code-btn").onclick = async () => {
    if (!codeInput.value)
      return showMessage("먼저 코드를 생성하세요.", "error");

    const memo = document.getElementById("memo-input").value.trim();
    const token = localStorage.getItem("troy_token");

    try {
      // 토큰이 있으면 Supabase에 저장 시도
      if (token) {
        const response = await fetch("/api/admin/partner-codes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: codeInput.value,
            memo: memo || null,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          // 로컬 스토리지에도 저장 (백업용)
          const data = JSON.parse(
            localStorage.getItem("troy_partner_codes") || "[]"
          );
          data.push({
            code: codeInput.value,
            memo,
            ts: Date.now(),
            id: result.code.id, // Supabase ID 추가
            is_used: false, // 사용 상태 추가
          });
          localStorage.setItem("troy_partner_codes", JSON.stringify(data));

          showMessage("코드가 성공적으로 발급되었습니다.", "success");
          await renderList();
          updateStats();

          // 입력 필드 초기화
          codeInput.value = "";
          document.getElementById("memo-input").value = "";
          return;
        } else if (response.status === 401 || response.status === 403) {
          console.log("인증 실패 - 로컬에만 저장합니다.");
        } else {
          console.log("API 저장 실패 - 로컬에만 저장합니다.");
        }
      }

      // 토큰이 없거나 API 저장 실패 시 로컬에만 저장
      const data = JSON.parse(
        localStorage.getItem("troy_partner_codes") || "[]"
      );
      const newId =
        "local_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      data.push({
        code: codeInput.value,
        memo,
        ts: Date.now(),
        id: newId, // 고유한 로컬 ID
        is_used: false, // 사용 상태 추가
      });
      localStorage.setItem("troy_partner_codes", JSON.stringify(data));

      showMessage("코드가 로컬에 저장되었습니다.", "success");
      await renderList();
      updateStats();

      // 입력 필드 초기화
      codeInput.value = "";
      document.getElementById("memo-input").value = "";
    } catch (error) {
      console.error("Code save error:", error);
      showMessage("저장 실패: " + error.message, "error");
    }
  };

  // 통계 업데이트 함수
  async function updateStats() {
    try {
      const token = localStorage.getItem("troy_token");
      if (token) {
        const response = await fetch("/api/admin/partner-codes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const result = await response.json();
          const codes = result.codes || [];
          const totalCodes = codes.length;
          const usedCodes = codes.filter((c) => c.is_used).length;

          document.getElementById("total-codes").textContent = totalCodes;
          document.getElementById("used-codes").textContent = usedCodes;
          return;
        }
      }

      // 로컬 스토리지에서 통계 계산
      const data = JSON.parse(
        localStorage.getItem("troy_partner_codes") || "[]"
      );
      document.getElementById("total-codes").textContent = data.length;
      document.getElementById("used-codes").textContent = "0";
    } catch (error) {
      console.error("Stats update error:", error);
    }
  }

  // 메시지 표시 함수
  function showMessage(text, type) {
    const existing = document.querySelector(".message");
    if (existing) existing.remove();

    const message = document.createElement("div");
    message.className = `message message-${type}`;
    message.textContent = text;

    const container = document.querySelector(".partner-code-issuer");
    container.insertBefore(message, container.firstChild);

    setTimeout(() => message.remove(), 3000);
  }

  // 클립보드 복사 함수
  window.copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      showMessage("코드가 복사되었습니다.", "success");
    } catch {
      showMessage("복사에 실패했습니다.", "error");
    }
  };

  // 코드 삭제 함수
  window.deleteCode = async (codeId) => {
    console.log("삭제 시도:", codeId);

    if (!confirm("이 코드를 삭제하시겠습니까?")) return;

    try {
      const token = localStorage.getItem("troy_token");
      if (token) {
        const response = await fetch(`/api/admin/partner-codes/${codeId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          showMessage("코드가 삭제되었습니다.", "success");
          await renderList();
          updateStats();
          return;
        }
      }

      // 로컬 스토리지에서 삭제
      const data = JSON.parse(
        localStorage.getItem("troy_partner_codes") || "[]"
      );

      console.log("현재 데이터:", data);
      console.log("삭제할 ID:", codeId);

      // ID로 삭제
      const filtered = data.filter((item) => {
        console.log(
          "비교:",
          item.id,
          "vs",
          codeId,
          "결과:",
          item.id !== codeId
        );
        return item.id !== codeId;
      });

      console.log("삭제 전 개수:", data.length);
      console.log("삭제 후 개수:", filtered.length);

      if (filtered.length < data.length) {
        localStorage.setItem("troy_partner_codes", JSON.stringify(filtered));
        showMessage("코드가 삭제되었습니다.", "success");
        await renderList();
        updateStats();
      } else {
        showMessage("삭제할 코드를 찾을 수 없습니다.", "error");
      }
    } catch (error) {
      console.error("삭제 오류:", error);
      showMessage("삭제에 실패했습니다.", "error");
    }
  };

  // 필터 기능
  document.getElementById("status-filter").onchange = async () => {
    await renderList();
  };

  await renderList();
  await updateStats();
}

// 공지사항 관리 UI 로더
async function loadNoticeBoard() {
  console.log("loadNoticeBoard 함수 호출됨");
  const container = document.getElementById("main-content-container");
  console.log("container:", container);
  if (!container) {
    console.error("main-content-container를 찾을 수 없습니다!");
    return;
  }

  // 기존 공지사항 컴포넌트를 로드
  try {
    const response = await fetch("/html/notice-board-component.html");
    const html = await response.text();
    container.innerHTML = html;

    // 공지사항 컴포넌트 JS 파일 로드
    if (
      !document.querySelector('script[src="/js/notice-board-component.js"]')
    ) {
      const script = document.createElement("script");
      script.src = "/js/notice-board-component.js";
      script.onload = () => {
        console.log("notice-board-component.js 로드 완료");
        // 관리자 권한 설정
        localStorage.setItem("userRole", "admin");
        // 관리자 토큰 설정 (임시)
        if (!localStorage.getItem("troy_token")) {
          localStorage.setItem("troy_token", "admin_temp_token");
        }

        // 컴포넌트 초기화
        if (window.initNoticeBoardComponent) {
          console.log("initNoticeBoardComponent 함수 호출 시도");
          window.initNoticeBoardComponent();
        } else {
          console.error("initNoticeBoardComponent 함수를 찾을 수 없습니다!");
        }
      };
      document.head.appendChild(script);
    } else {
      // 이미 로드된 경우
      localStorage.setItem("userRole", "admin");
      // 관리자 토큰 설정 (임시)
      if (!localStorage.getItem("troy_token")) {
        localStorage.setItem("troy_token", "admin_temp_token");
      }
      if (window.initNoticeBoardComponent) {
        window.initNoticeBoardComponent();
      }
    }
  } catch (error) {
    console.error("Failed to load notice board component:", error);
    container.innerHTML = `
      <div class="notice-board-manager">
        <h2 class="page-title">공지사항 관리</h2>
        <p class="page-subtitle">공지사항을 생성, 수정, 삭제할 수 있습니다.</p>
        <button class="btn btn-primary" onclick="showAddNoticeModal()" style="margin-bottom: 20px;">
          공지사항 등록
        </button>
        <div id="noticeList">
          공지사항을 불러오는 중...
        </div>
      </div>
    `;
  }
}

// 관리자 전용 등록 버튼 추가
function addAdminNoticeButton() {
  // 검색 섹션을 찾아서 등록 버튼 추가
  const searchSection = document.querySelector(".search-section");
  if (searchSection) {
    const adminButton = document.createElement("button");
    adminButton.className = "btn btn-primary";
    adminButton.textContent = "공지사항 등록";
    adminButton.onclick = showAddNoticeModal;
    adminButton.style.cssText =
      "margin-left: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;";

    searchSection.appendChild(adminButton);
  } else {
    // 검색 섹션이 없으면 페이지 상단에 등록 버튼 추가
    const container = document.querySelector(".notice-board-component");
    if (container) {
      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = "margin-bottom: 20px; text-align: right;";
      headerDiv.innerHTML = `
        <button class="btn btn-primary" onclick="showAddNoticeModal()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
          공지사항 등록
        </button>
      `;
      container.insertBefore(headerDiv, container.firstChild);
    }
  }
}

// 공지사항 등록 모달 표시
function showAddNoticeModal() {
  const modal = document.createElement("div");
  modal.id = "addNoticeModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 5% auto; padding: 20px; border-radius: 8px; max-width: 800px; max-height: 80vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
        <h3>새 공지사항 등록</h3>
        <span class="close" onclick="closeAddNoticeModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
      </div>
      <form id="addNoticeForm">
        <div style="margin-bottom: 16px;">
          <label class="label" for="addTitle" style="display: block; margin-bottom: 4px; font-weight: 500;">제목</label>
          <input class="input" id="addTitle" placeholder="공지사항 제목" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;" />
        </div>
        
        <div style="margin-bottom: 16px;">
          <label class="label" for="addCategory" style="display: block; margin-bottom: 4px; font-weight: 500;">카테고리</label>
          <select class="input" id="addCategory" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
            <option value="">카테고리를 선택하세요</option>
            <option value="system">시스템</option>
            <option value="service">서비스</option>
            <option value="update">업데이트</option>
            <option value="event">이벤트</option>
            <option value="maintenance">점검</option>
          </select>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label class="label" for="addAudience" style="display: block; margin-bottom: 4px; font-weight: 500;">대상</label>
          <select class="input" id="addAudience" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
            <option value="">대상을 선택하세요</option>
            <option value="all">전체</option>
            <option value="advertiser">광고주</option>
            <option value="agency">대행사</option>
            <option value="partner">파트너사</option>
          </select>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label class="label" for="addContent" style="display: block; margin-bottom: 4px; font-weight: 500;">내용</label>
          <textarea class="input" id="addContent" placeholder="공지사항 내용" rows="10" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;"></textarea>
        </div>
        
        <div style="margin-bottom: 16px; display: flex; gap: 16px; align-items: center;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="addImportant" />
            <span>중요 공지</span>
          </label>
        </div>
        
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button" class="btn" onclick="closeAddNoticeModal()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">취소</button>
          <button type="submit" class="btn" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">등록</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // 폼 제출 이벤트 리스너
  document.getElementById("addNoticeForm").onsubmit = async (e) => {
    e.preventDefault();
    await saveNewNotice();
  };
}

// 공지사항 등록 모달 닫기
function closeAddNoticeModal() {
  const modal = document.getElementById("addNoticeModal");
  if (modal) {
    modal.remove();
  }
}

// 새 공지사항 저장
async function saveNewNotice() {
  const data = {
    title: document.getElementById("addTitle").value,
    content: document.getElementById("addContent").value,
    category: document.getElementById("addCategory").value,
    target_audience: document.getElementById("addAudience").value,
    is_important: document.getElementById("addImportant").checked,
  };

  try {
    const response = await fetch("/api/admin/notices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("troy_token")}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "공지사항 등록에 실패했습니다.");
    }

    const result = await response.json();
    alert(result.message);

    closeAddNoticeModal();

    // 공지사항 목록 새로고침 (공지사항 컴포넌트가 로드되어 있다면)
    if (window.loadNoticesForPage) {
      window.loadNoticesForPage(window.currentPage || 1);
    }
  } catch (error) {
    console.error("Save notice error:", error);
    alert("등록 실패: " + error.message);
  }
}

// 1:1문의 관리 페이지 로드 (카드 형태)
async function loadSupportBoard() {
  console.log("loadSupportBoard 함수 호출됨!");
  const container = document.querySelector(".main-content");
  if (!container) {
    console.error("main-content 컨테이너를 찾을 수 없습니다!");
    return;
  }

  try {
    // 1:1문의 관리 HTML 생성 (카드 형태)
    const supportBoardHTML = `
      <div class="support-board-container">
        <div class="page-header">
          <h1>1:1문의 관리</h1>
          <p>사용자들의 문의사항을 확인하고 답변하세요.</p>
        </div>

        <!-- 필터 및 검색 -->
        <div class="filter-section">
          <div class="filter-group">
            <label for="statusFilter">상태 필터:</label>
            <select id="statusFilter" onchange="filterTickets()">
              <option value="all">전체</option>
              <option value="open">대기중</option>
              <option value="pending">처리중</option>
              <option value="resolved">해결됨</option>
              <option value="closed">종료됨</option>
            </select>
          </div>
          <div class="filter-group">
            <button class="btn btn-primary" onclick="refreshTickets()">새로고침</button>
          </div>
        </div>

        <!-- 1:1문의 테이블 -->
        <div class="tickets-list">
          <div class="tickets-header">
            <div>번호</div>
            <div>제목</div>
            <div>문의자</div>
            <div>카테고리</div>
            <div>상태</div>
            <div>접수일</div>
            <div>담당자</div>
            <div>액션</div>
          </div>
          <div id="ticketsList">
            <div class="loading">로딩 중...</div>
          </div>
        </div>

        <!-- 페이지네이션 -->
        <div class="pagination" id="ticketsPagination"></div>
      </div>

      <!-- 1:1문의 상세 모달 -->
      <div id="ticketDetailModal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>1:1문의 상세</h2>
            <span class="close" onclick="closeTicketDetailModal()">&times;</span>
          </div>
          <div class="modal-body" id="ticketDetailContent">
            <!-- 상세 내용이 여기에 로드됩니다 -->
          </div>
        </div>
      </div>
    `;

    container.innerHTML = supportBoardHTML;

    // CSS 파일 로드
    loadSupportBoardTableCSS();

    // 관리자 토큰 설정 (강제로 새로 설정)
    localStorage.setItem("troy_token", "admin_token_" + Date.now());
    console.log("관리자 토큰 설정됨:", localStorage.getItem("troy_token"));

    // 1:1문의 목록 로드
    await loadTickets();
  } catch (error) {
    console.error("1:1문의 관리 로드 실패:", error);
    container.innerHTML =
      '<p style="color: #ef4444;">1:1문의 관리 페이지를 불러올 수 없습니다.</p>';
  }
}

// 1:1문의 테이블 CSS 로드
function loadSupportBoardTableCSS() {
  if (!document.querySelector('link[href*="support-board-table.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/support-board-table.css";
    document.head.appendChild(link);
  }
}

// 1:1문의 목록 로드
async function loadTickets(page = 1) {
  try {
    const statusFilter =
      document.getElementById("statusFilter")?.value || "all";
    const token = localStorage.getItem("troy_token");

    if (!token) {
      document.getElementById("ticketsList").innerHTML =
        '<div class="error">로그인이 필요합니다.</div>';
      return;
    }

    const response = await fetch(
      `/api/admin/tickets?page=${page}&status=${statusFilter}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("문의 목록을 불러올 수 없습니다.");
    }

    const data = await response.json();
    displayTickets(data.tickets);
    displayTicketsPagination(data.pagination);
  } catch (error) {
    console.error("Load tickets error:", error);
    document.getElementById("ticketsList").innerHTML =
      '<div class="error">문의 목록을 불러올 수 없습니다.</div>';
  }
}

// 1:1문의 테이블 형태로 표시
function displayTickets(tickets) {
  const container = document.getElementById("ticketsList");

  if (!tickets || tickets.length === 0) {
    container.innerHTML = '<div class="no-data">등록된 문의가 없습니다.</div>';
    return;
  }

  const ticketsHTML = tickets
    .map((ticket, index) => {
      // 상태에 따른 클래스 결정
      let statusClass = "status-badge";
      let statusText = getStatusText(ticket.status);
      const categoryText = getCategoryText(ticket.category);
      const userTypeText = getUserTypeText(ticket.createdBy.userType);
      const formattedDate = formatDate(ticket.createdAt);

      switch (ticket.status) {
        case "open":
          statusClass += " blue";
          break;
        case "pending":
          statusClass += " orange";
          break;
        case "resolved":
          statusClass += " green";
          break;
        case "closed":
          statusClass += " red";
          break;
        default:
          statusClass += " blue";
      }

      return `
        <div class="ticket-item" onclick="openTicketDetail('${ticket.id}')">
          <div class="ticket-number">${index + 1}</div>
          <div class="ticket-title">
            <div class="title-content">
              <span class="title-text">${ticket.title}</span>
              <span class="content-preview">${ticket.content.substring(0, 50)}${
        ticket.content.length > 50 ? "..." : ""
      }</span>
            </div>
          </div>
          <div class="ticket-user">
            <div class="user-info">
              <span class="username">${ticket.createdBy.username}</span>
              <span class="user-type">(${userTypeText})</span>
            </div>
          </div>
          <div class="ticket-category">${categoryText}</div>
          <div class="ticket-status">
            <span class="${statusClass}">${statusText}</span>
          </div>
          <div class="ticket-date">${formattedDate}</div>
          <div class="ticket-assignee">
            ${ticket.assignee ? ticket.assignee.username : "-"}
          </div>
          <div class="ticket-actions" onclick="event.stopPropagation()">
            <button class="action-btn" onclick="openTicketDetail('${
              ticket.id
            }')">
              답변
            </button>
            <button class="delete-btn" onclick="updateTicketStatus('${
              ticket.id
            }', '${ticket.status === "resolved" ? "closed" : "resolved"}')">
              ${ticket.status === "resolved" ? "종료" : "완료"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = ticketsHTML;
}

// 1:1문의 상세보기
async function openTicketDetail(ticketId) {
  try {
    const token = localStorage.getItem("troy_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    const response = await fetch(`/api/admin/tickets/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("문의 상세 정보를 불러올 수 없습니다.");
    }

    const data = await response.json();
    const ticket = data.ticket;

    // 모달 표시
    showTicketDetailModal(ticket);
  } catch (error) {
    console.error("Open ticket detail error:", error);
    alert("문의 상세 정보를 불러올 수 없습니다.");
  }
}

// 1:1문의 상세 모달 표시
function showTicketDetailModal(ticket) {
  const modalContent = `
    <div class="ticket-detail-modal">
      <!-- 문의 헤더 -->
      <div class="ticket-detail-header">
        <div class="ticket-title-section">
          <h2 class="ticket-detail-title">${ticket.title}</h2>
          <div class="ticket-badges">
            <span class="status-badge status-${ticket.status}">${getStatusText(
    ticket.status
  )}</span>
            <span class="category-badge">${getCategoryText(
              ticket.category
            )}</span>
          </div>
        </div>
      </div>

      <!-- 문의 정보 -->
      <div class="ticket-info-grid">
        <div class="info-item">
          <div class="info-label">문의자</div>
          <div class="info-value">${
            ticket.createdBy.username
          } (${getUserTypeText(ticket.createdBy.userType)})</div>
        </div>
        <div class="info-item">
          <div class="info-label">문의일</div>
          <div class="info-value">${formatDate(ticket.createdAt)}</div>
        </div>
        ${
          ticket.assignee
            ? `
        <div class="info-item">
          <div class="info-label">담당자</div>
          <div class="info-value">${
            ticket.assignee.username
          } (${getUserTypeText(ticket.assignee.userType)})</div>
        </div>
        `
            : ""
        }
        <div class="info-item">
          <div class="info-label">상태 변경</div>
          <div class="info-value">
            <select id="statusSelect" class="status-select" onchange="updateTicketStatus('${
              ticket.id
            }', this.value)">
              <option value="open" ${
                ticket.status === "open" ? "selected" : ""
              }>대기중</option>
              <option value="pending" ${
                ticket.status === "pending" ? "selected" : ""
              }>처리중</option>
              <option value="resolved" ${
                ticket.status === "resolved" ? "selected" : ""
              }>해결됨</option>
              <option value="closed" ${
                ticket.status === "closed" ? "selected" : ""
              }>종료됨</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 문의 내용 -->
      <div class="ticket-content-section">
        <h3 class="section-title">문의 내용</h3>
        <div class="content-box">
          <p class="ticket-content-text">${ticket.content}</p>
        </div>
      </div>

      <!-- 답변 내역 -->
      <div class="comments-section">
        <h3 class="section-title">답변 내역</h3>
        <div class="comments-container">
          ${
            ticket.comments && ticket.comments.length > 0
              ? ticket.comments
                  .map(
                    (comment) => `
                <div class="comment-card">
                  <div class="comment-header">
                    <div class="comment-author">
                      <span class="author-name">${
                        comment.author.username
                      }</span>
                      <span class="author-role">(${getUserTypeText(
                        comment.author.userType
                      )})</span>
                    </div>
                    <div class="comment-date">${formatDate(
                      comment.createdAt
                    )}</div>
                  </div>
                  <div class="comment-body">
                    <p>${comment.content}</p>
                  </div>
                </div>
              `
                  )
                  .join("")
              : '<div class="no-comments">아직 답변이 없습니다.</div>'
          }
        </div>
      </div>

      <!-- 답변 추가 -->
      <div class="add-reply-section">
        <h3 class="section-title">답변 추가</h3>
        <div class="reply-form">
          <textarea 
            id="replyContent" 
            class="reply-textarea" 
            placeholder="답변 내용을 입력하세요..." 
            rows="4"
          ></textarea>
          <div class="reply-actions">
            <button class="btn btn-primary reply-submit-btn" onclick="addTicketReply('${
              ticket.id
            }')">
              답변 등록
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("ticketDetailContent").innerHTML = modalContent;
  document.getElementById("ticketDetailModal").style.display = "block";
}

// 1:1문의 상태 업데이트
async function updateTicketStatus(ticketId, status) {
  try {
    const token = localStorage.getItem("troy_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    const response = await fetch(`/api/admin/tickets/${ticketId}/status`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("상태 업데이트에 실패했습니다.");
    }

    alert("상태가 업데이트되었습니다.");
    // 목록 새로고침
    await loadTickets();
  } catch (error) {
    console.error("Update ticket status error:", error);
    alert("상태 업데이트 중 오류가 발생했습니다.");
  }
}

// 1:1문의 답변 추가
async function addTicketReply(ticketId) {
  try {
    const content = document.getElementById("replyContent").value.trim();
    if (!content) {
      alert("답변 내용을 입력해주세요.");
      return;
    }

    const token = localStorage.getItem("troy_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    const response = await fetch(`/api/admin/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error("답변 등록에 실패했습니다.");
    }

    alert("답변이 등록되었습니다.");
    document.getElementById("replyContent").value = "";

    // 모달 새로고침
    await openTicketDetail(ticketId);
  } catch (error) {
    console.error("Add ticket reply error:", error);
    alert("답변 등록 중 오류가 발생했습니다.");
  }
}

// 1:1문의 상세 모달 닫기
function closeTicketDetailModal() {
  document.getElementById("ticketDetailModal").style.display = "none";
}

// 필터링
function filterTickets() {
  loadTickets(1);
}

// 새로고침
function refreshTickets() {
  loadTickets(1);
}

// 페이지네이션 표시
function displayTicketsPagination(pagination) {
  const container = document.getElementById("ticketsPagination");

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let paginationHTML = "";

  // 이전 페이지
  if (pagination.currentPage > 1) {
    paginationHTML += `<button onclick="loadTickets(${
      pagination.currentPage - 1
    })">이전</button>`;
  }

  // 페이지 번호
  for (let i = 1; i <= pagination.totalPages; i++) {
    if (i === pagination.currentPage) {
      paginationHTML += `<button class="active">${i}</button>`;
    } else {
      paginationHTML += `<button onclick="loadTickets(${i})">${i}</button>`;
    }
  }

  // 다음 페이지
  if (pagination.currentPage < pagination.totalPages) {
    paginationHTML += `<button onclick="loadTickets(${
      pagination.currentPage + 1
    })">다음</button>`;
  }

  container.innerHTML = paginationHTML;
}

// 유틸리티 함수들
function getStatusText(status) {
  const statusMap = {
    open: "긴급",
    pending: "일반",
    resolved: "완료",
    closed: "완료",
  };
  return statusMap[status] || status;
}

function getCategoryText(category) {
  const categoryMap = {
    general: "일반 문의",
    technical: "기술 지원",
    campaign: "캠페인 관련",
    billing: "정산 관련",
  };
  return categoryMap[category] || category;
}

function getUserTypeText(userType) {
  const typeMap = {
    advertiser: "광고주",
    agency: "대행사",
    partner: "파트너사",
    admin: "관리자",
  };
  return typeMap[userType] || userType;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

window.loadSupportBoard = loadSupportBoard;
window.openTicketDetail = openTicketDetail;
window.updateTicketStatus = updateTicketStatus;
window.addTicketReply = addTicketReply;
window.filterTickets = filterTickets;
window.refreshTickets = refreshTickets;

// 관리자 결제내역 로더
async function loadAdminPaymentsComponent() {
  const container = document.getElementById("main-content-container");
  if (!container) return;
  try {
    const resp = await fetch("/html/components/admin-payments.html");
    const html = await resp.text();
    container.innerHTML = html;

    // CSS는 admin-dashboard.css에 포함됨
    // JS 로드
    if (!document.querySelector('script[src*="admin-payments.js"]')) {
      const s = document.createElement("script");
      s.src = "/js/components/admin-payments.js";
      s.defer = true;
      s.onload = () => window.initAdminPayments && window.initAdminPayments();
      document.head.appendChild(s);
    } else {
      window.initAdminPayments && window.initAdminPayments();
    }
  } catch (e) {
    console.error("결제내역 컴포넌트 로드 실패", e);
    container.innerHTML =
      '<div class="error">결제내역을 불러올 수 없습니다.</div>';
  }
}

window.loadAdminPaymentsComponent = loadAdminPaymentsComponent;

// ===== 새로운 관리자 기능들 =====

// 알림 센터 로드
function loadNotificationCenter() {
  const mainContent = document.querySelector(".main-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <h1>알림 센터</h1>
      <p>시스템 알림을 확인하고 관리하세요</p>
    </div>
    <div id="notificationCenterContainer"></div>
  `;

  // 알림 센터 컴포넌트 로드
  fetch("../html/components/notification-center.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("notificationCenterContainer").innerHTML = html;
      // 알림 센터 JavaScript 초기화
      if (typeof initNotificationCenter === "function") {
        initNotificationCenter();
      }
    })
    .catch((error) => {
      console.error("알림 센터 로드 오류:", error);
      document.getElementById("notificationCenterContainer").innerHTML =
        '<div class="error">알림 센터를 불러올 수 없습니다.</div>';
    });
}

// 결제 관리 로드
function loadPaymentManagement() {
  const mainContent = document.querySelector(".main-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <h1>결제 관리</h1>
      <p>결제 상태를 관리하고 승인 처리하세요</p>
    </div>
    <div id="paymentManagementContainer"></div>
  `;

  // 관리자 토큰 보장 (임시 토큰 허용)
  try {
    const hasAdminToken =
      localStorage.getItem("troy_token_admin") ||
      sessionStorage.getItem("troy_token_admin") ||
      localStorage.getItem("troy_token") ||
      sessionStorage.getItem("troy_token");
    if (!hasAdminToken) {
      localStorage.setItem("troy_token", "admin_temp_token");
    }
  } catch (_) {}

  // 결제 관리 컴포넌트 로드
  fetch("../html/components/payment-management.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("paymentManagementContainer").innerHTML = html;
      // 결제 관리 JavaScript 초기화
      if (typeof initPaymentManagement === "function") {
        initPaymentManagement();
      }
    })
    .catch((error) => {
      console.error("결제 관리 로드 오류:", error);
      document.getElementById("paymentManagementContainer").innerHTML =
        '<div class="error">결제 관리를 불러올 수 없습니다.</div>';
    });
}

// 캠페인 진행률 추적 로드
function loadCampaignProgressTracker() {
  const mainContent = document.querySelector(".main-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <h1>캠페인 진행률 추적</h1>
      <p>캠페인 진행률을 관리하고 알림과 연동하세요</p>
    </div>
    <div id="campaignProgressTrackerContainer"></div>
  `;

  // 캠페인 진행률 추적 컴포넌트 로드
  fetch("../html/components/campaign-progress-tracker.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("campaignProgressTrackerContainer").innerHTML =
        html;
      // 캠페인 진행률 추적 JavaScript 초기화
      if (typeof initCampaignProgressTracker === "function") {
        initCampaignProgressTracker();
      }
    })
    .catch((error) => {
      console.error("캠페인 진행률 추적 로드 오류:", error);
      document.getElementById("campaignProgressTrackerContainer").innerHTML =
        '<div class="error">캠페인 진행률 추적을 불러올 수 없습니다.</div>';
    });
}

// 전역 함수로 등록
window.loadNotificationCenter = loadNotificationCenter;
window.loadPaymentManagement = loadPaymentManagement;
window.loadCampaignProgressTracker = loadCampaignProgressTracker;

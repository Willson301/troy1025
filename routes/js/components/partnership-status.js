// Supabase 클라이언트 초기화
let supabase;
try {
  if (window.SUPABASE_URL && window.SUPABASE_KEY) {
    supabase = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_KEY
    );
  }
} catch (_) {}

// 파트너십 데이터 (Supabase에서 로드)
let partnershipData = [];
let currentPage = 1;
let totalPages = 1;
let totalCount = 0;
const itemsPerPage = 12; // 카드 형태로 표시하므로 더 많은 항목

// 현재 파트너 ID 가져오기
function getCurrentPartnerId() {
  try {
    // Supabase auth에서 현재 사용자 ID 가져오기
    if (window.supabase && window.supabase.auth) {
      const {
        data: { user },
      } = window.supabase.auth.getUser();
      if (user) return user.id;
    }
    // fallback: localStorage에서 가져오기
    const partnerId = localStorage.getItem("partner_id");
    if (partnerId && partnerId.trim()) return partnerId.trim();
  } catch (_) {}
  return null; // 실제 사용자 ID가 없으면 null 반환
}

// Supabase에서 파트너십 데이터 로드
async function loadPartnershipDataFromSupabase(page = 1, filters = {}) {
  try {
    if (!supabase) {
      console.log("Supabase 클라이언트가 초기화되지 않음. 빈 데이터 사용");
      partnershipData = [];
      return;
    }

    const currentUserId = getCurrentPartnerId();
    if (!currentUserId) {
      console.log("현재 사용자 ID를 가져올 수 없음. 빈 데이터 사용");
      partnershipData = [];
      return;
    }

    // 페이지네이션 계산
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // 파트너십 현황은 파트너가 관리하는 클라이언트들을 보여줌
    // 현재는 user_profiles에서 파트너 타입 사용자를 조회
    let query = supabase
      .from("user_profiles")
      .select(
        `
        id,
        user_id,
        full_name,
        email,
        phone,
        company_name,
        business_number,
        user_type,
        created_at,
        updated_at
      `,
        { count: "exact" }
      )
      .eq("user_type", "customer") // 파트너가 관리하는 고객들
      .order("created_at", { ascending: false })
      .range(from, to);

    // 필터 적용
    if (filters.searchTerm) {
      query = query.or(
        `full_name.ilike.%${filters.searchTerm}%,company_name.ilike.%${filters.searchTerm}%`
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // 페이지네이션 정보 업데이트
    totalCount = count || 0;
    totalPages = Math.ceil(totalCount / itemsPerPage);
    currentPage = page;

    // Supabase 데이터를 프론트엔드 형식으로 변환
    partnershipData = (data || []).map((client, index) => {
      return {
        id: client.id,
        userId: client.user_id,
        name: client.full_name || "고객",
        companyName: client.company_name || "회사명",
        email: client.email || "",
        phone: client.phone || "",
        businessNumber: client.business_number || "",
        userType: client.user_type,
        createdAt: client.created_at,
        // 임시 데이터 (실제로는 별도 테이블에서 계산해야 함)
        campaignCount: Math.floor(Math.random() * 20) + 5,
        completedCount: Math.floor(Math.random() * 15) + 3,
        progressRate: Math.floor(Math.random() * 40) + 60, // 60-100%
        revenueRate: Math.floor(Math.random() * 30) + 70, // 70-100%
        tier: index % 3 === 0 ? "VIP" : index % 2 === 0 ? "GOLD" : "SILVER",
      };
    });

    console.log(
      `Supabase에서 파트너십 데이터 로드 완료: 페이지 ${page}/${totalPages}, 총 ${totalCount}개 중 ${partnershipData.length}개`
    );

    // 통계 업데이트
    await updatePartnershipStatistics();
  } catch (error) {
    console.error("파트너십 데이터 로드 실패:", error);
    partnershipData = [];
    totalCount = 0;
    totalPages = 1;
    currentPage = 1;
  }
}

// 파트너십 통계 업데이트
async function updatePartnershipStatistics() {
  try {
    if (!supabase) {
      console.log(
        "Supabase 클라이언트가 초기화되지 않음. 통계 업데이트 건너뜀"
      );
      return;
    }

    const currentUserId = getCurrentPartnerId();
    if (!currentUserId) {
      console.log("현재 사용자 ID를 가져올 수 없음. 통계 업데이트 건너뜀");
      return;
    }

    // 거래처 수 (고객 수)
    const { data: clientsData, error: clientsError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_type", "customer");

    if (clientsError) throw clientsError;

    // 총 캠페인 수 (고객들이 생성한 캠페인)
    const { data: campaignsData, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id, status")
      .in("created_by", clientsData?.map((c) => c.id) || []);

    if (campaignsError) throw campaignsError;

    const totalCampaigns = campaignsData?.length || 0;
    const progressCampaigns =
      campaignsData?.filter((c) => ["approved", "active"].includes(c.status))
        .length || 0;
    const completedCampaigns =
      campaignsData?.filter((c) => c.status === "completed").length || 0;

    // DOM 업데이트
    const totalCountElement = document.getElementById("total-count");
    const scheduledCountElement = document.getElementById("scheduled-count");
    const progressCountElement = document.getElementById("progress-count");
    const completedCountElement = document.getElementById("completed-count");

    if (totalCountElement) {
      totalCountElement.textContent = clientsData?.length || 0;
    }
    if (scheduledCountElement) {
      scheduledCountElement.textContent = totalCampaigns;
    }
    if (progressCountElement) {
      progressCountElement.textContent = progressCampaigns;
    }
    if (completedCountElement) {
      completedCountElement.textContent = completedCampaigns;
    }

    console.log("파트너십 통계 업데이트 완료:", {
      clients: clientsData?.length || 0,
      totalCampaigns,
      progressCampaigns,
      completedCampaigns,
    });
  } catch (error) {
    console.error("파트너십 통계 업데이트 실패:", error);
  }
}

// 검색 및 필터링
async function applyFilters() {
  const searchTerm = document.querySelector(".search-input")?.value.trim();

  const filters = {
    searchTerm: searchTerm || null,
  };

  // 첫 페이지로 리셋하고 필터 적용하여 데이터 로드
  currentPage = 1;
  await loadPartnershipDataFromSupabase(1, filters);
  updatePartnershipCards(partnershipData);
  updatePagination();
}

// 필터 초기화
async function resetFilters() {
  const input = document.querySelector(".search-input");
  if (input) input.value = "";

  // 필터 초기화 후 첫 페이지 데이터 로드
  currentPage = 1;
  await loadPartnershipDataFromSupabase(1, {});
  updatePartnershipCards(partnershipData);
  updatePagination();
}

// 파트너십 카드 업데이트
function updatePartnershipCards(data) {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  // 기존 카드들 제거
  mainContent.innerHTML = "";

  // 새로운 카드들 생성
  data.forEach((client, index) => {
    const card = createPartnershipCard(client, index);
    mainContent.appendChild(card);
  });
}

// 파트너십 카드 생성
function createPartnershipCard(client, index) {
  const card = document.createElement("div");
  card.className = "partnership-card";
  card.setAttribute("data-client-id", client.id);

  const tierColors = {
    VIP: { bg: "#fef3c7", color: "#92400e" },
    GOLD: { bg: "#fef3c7", color: "#92400e" },
    SILVER: { bg: "#f1f5f9", color: "#475569" },
  };

  const tierColor = tierColors[client.tier] || tierColors.SILVER;

  card.innerHTML = `
    <div style="
      background: white;
      border: 2px solid #255ffe;
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transition: transform 0.3s ease;
      flex: 1;
      min-height: 200px;
      display: flex;
      flex-direction: column;
    ">
      <div style="margin-bottom: 10px; flex: 1">
        <h3 style="
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        ">
          ${index + 1}. ${client.companyName}
        </h3>
        <div style="font-size: 9px; color: #64748b; margin-bottom: 6px">
          ${client.userId ? client.userId.substring(0, 12) + "..." : "ID 없음"}
        </div>
        <div style="margin-bottom: 6px">
          <span style="
            font-size: 8px;
            padding: 2px 6px;
            border-radius: 4px;
            background: ${tierColor.bg};
            color: ${tierColor.color};
          ">${client.tier}</span>
        </div>
        <div style="font-size: 11px; color: #475569; line-height: 1.3">
          <div>${client.name}</div>
          <div>${client.phone || "전화번호 없음"}</div>
        </div>
      </div>
      <div style="margin-bottom: 10px">
        <div style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        ">
          <span style="font-size: 10px; color: #64748b; font-weight: 600">수익률</span>
          <span style="font-size: 10px; color: #255ffe; font-weight: 700">${
            client.revenueRate
          }%</span>
        </div>
        <div style="
          background: #f1f5f9;
          height: 5px;
          border-radius: 3px;
          overflow: hidden;
        ">
          <div style="
            background: linear-gradient(90deg, #255ffe 0%, #1d4ed8 100%);
            height: 100%;
            width: ${client.revenueRate}%;
          "></div>
        </div>
        <div style="font-size: 8px; color: #64748b; margin-top: 2px">
          ${client.completedCount}/${client.campaignCount} 완료
        </div>
      </div>
      <div style="display: flex; gap: 6px">
        <button style="
          flex: 1;
          padding: 6px 2px;
          background: #f8fafc;
          border: 1px solid #255ffe;
          border-radius: 6px;
          color: #255ffe;
          font-weight: 600;
          font-size: 9px;
          cursor: pointer;
        " onclick="viewClientRevenue('${client.id}')">
          수익 보기
        </button>
        <button style="
          flex: 1;
          padding: 6px 2px;
          background: #255ffe;
          border: 1px solid #255ffe;
          border-radius: 6px;
          color: white;
          font-weight: 600;
          font-size: 9px;
          cursor: pointer;
        " onclick="viewClientDetail('${client.id}')">
          상세보기
        </button>
      </div>
    </div>
  `;

  return card;
}

// 페이지네이션 업데이트
function updatePagination() {
  const paginationContainer = document.querySelector(".pagination");
  if (!paginationContainer) return;

  // 페이지네이션 HTML 생성
  let paginationHTML = "";

  // 이전 페이지 버튼
  if (currentPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(${
      currentPage - 1
    })">이전</button>`;
  }

  // 페이지 번호들
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage ? "active" : "";
    paginationHTML += `<button class="pagination-btn ${isActive}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  // 다음 페이지 버튼
  if (currentPage < totalPages) {
    paginationHTML += `<button class="pagination-btn" onclick="goToPage(${
      currentPage + 1
    })">다음</button>`;
  }

  paginationContainer.innerHTML = paginationHTML;

  // 페이지 정보 업데이트
  const pageInfo = document.querySelector(".page-info");
  if (pageInfo) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalCount);
    pageInfo.textContent = `${startItem}-${endItem} / 총 ${totalCount}개`;
  }
}

// 페이지 이동 함수
async function goToPage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;

  const searchTerm = document.querySelector(".search-input")?.value.trim();

  const filters = {
    searchTerm: searchTerm || null,
  };

  await loadPartnershipDataFromSupabase(page, filters);
  updatePartnershipCards(partnershipData);
  updatePagination();

  // 페이지 상단으로 스크롤
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 클라이언트 수익 보기
function viewClientRevenue(clientId) {
  console.log("클라이언트 수익 보기:", clientId);
  alert(`클라이언트 ${clientId}의 수익 정보를 보여줍니다.`);
}

// 클라이언트 상세보기
function viewClientDetail(clientId) {
  console.log("클라이언트 상세보기:", clientId);
  alert(`클라이언트 ${clientId}의 상세 정보를 보여줍니다.`);
}

// 초대코드 발급하기
function goToClientManagement() {
  showPartnerInviteCodeModal();
}

// 파트너사 초대코드 발급 모달 표시
function showPartnerInviteCodeModal() {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById("partnerInviteCodeModal");
  if (existingModal) {
    existingModal.remove();
  }

  // 모달 생성
  const modal = document.createElement("div");
  modal.id = "partnerInviteCodeModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 5% auto; padding: 32px; border-radius: 16px; width: 95%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 700;">하위 파트너사 초대코드 발급</h2>
        <span class="close" onclick="closePartnerInviteCodeModal()" style="font-size: 28px; cursor: pointer; color: #6b7280; font-weight: bold;">&times;</span>
      </div>
      
      <div class="modal-body">
        <!-- 코드 생성 섹션 -->
        <div class="code-generator-section" style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">새 초대코드 생성</h3>
          
          <div class="code-display-area" style="margin-bottom: 20px;">
            <div style="margin-bottom: 8px; color: #374151; font-weight: 600;">생성된 초대코드</div>
            <div style="display: flex; gap: 12px; align-items: center;">
              <input 
                id="partner-invite-code-input" 
                style="flex: 1; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; font-weight: 600; background: white;" 
                placeholder="코드를 생성해주세요" 
                readonly 
              />
              <button id="generate-partner-code-btn" style="padding: 12px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                코드 생성
              </button>
              <button id="copy-partner-code-btn" style="padding: 12px 20px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                복사
              </button>
            </div>
          </div>
          
          <div class="memo-section">
            <div style="margin-bottom: 8px; color: #374151; font-weight: 600;">메모 (선택사항)</div>
            <div style="display: flex; gap: 12px; align-items: center;">
              <input 
                id="partner-memo-input" 
                style="flex: 1; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;" 
                placeholder="코드에 대한 설명이나 용도를 입력하세요" 
              />
              <button id="save-partner-code-btn" style="padding: 12px 20px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                코드 발급
              </button>
            </div>
          </div>
          
          <div style="margin-top: 16px; padding: 12px; background: #dbeafe; border-radius: 8px; color: #1e40af; font-size: 14px;">
            💡 발급된 코드는 하위 파트너사 회원가입 시 "파트너 코드" 입력란에 사용됩니다
          </div>
        </div>

        <!-- 발급된 코드 목록 -->
        <div class="code-list-section">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">발급된 초대코드 목록</h3>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <select id="partner-status-filter" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white;">
                <option value="all">전체</option>
                <option value="unused">미사용</option>
                <option value="used">사용됨</option>
              </select>
            </div>
            <div style="display: flex; gap: 8px; font-size: 14px; color: #6b7280;">
              <span>총 <strong id="total-partner-codes">0</strong>개</span>
              <span>사용됨 <strong id="used-partner-codes">0</strong>개</span>
            </div>
          </div>
          
          <div id="partner-issued-code-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
            <div style="padding: 20px; text-align: center; color: #6b7280;">
              코드 목록을 불러오는 중...
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <button onclick="closePartnerInviteCodeModal()" style="padding: 12px 24px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
          닫기
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 이벤트 바인딩
  bindPartnerInviteCodeModalEvents();

  // 초기 데이터 로드
  loadPartnerInviteCodeStats();
  loadPartnerInviteCodeList();
}

// 파트너사 초대코드 모달 이벤트 바인딩
function bindPartnerInviteCodeModalEvents() {
  // 코드 생성 버튼
  document
    .getElementById("generate-partner-code-btn")
    .addEventListener("click", generatePartnerInviteCode);

  // 코드 복사 버튼
  document
    .getElementById("copy-partner-code-btn")
    .addEventListener("click", copyPartnerInviteCode);

  // 코드 발급 버튼
  document
    .getElementById("save-partner-code-btn")
    .addEventListener("click", savePartnerInviteCode);

  // 필터 변경
  document
    .getElementById("partner-status-filter")
    .addEventListener("change", loadPartnerInviteCodeList);

  // 모달 외부 클릭 시 닫기
  const modal = document.getElementById("partnerInviteCodeModal");
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closePartnerInviteCodeModal();
    }
  });
}

// 파트너사 초대코드 생성
function generatePartnerInviteCode() {
  const codeInput = document.getElementById("partner-invite-code-input");

  // 파트너사 초대코드 생성: PI + 날짜 + 순번
  const prefix = "PI";

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateString = month + day;

  // 기존 발급된 코드에서 오늘 날짜의 최대 순번 찾기
  const existingCodes = JSON.parse(
    localStorage.getItem("troy_partner_invite_codes") || "[]"
  );

  let maxSequence = 0;
  const todayPattern = new RegExp(`^PI${dateString}(\\d{3})$`);

  existingCodes.forEach((item) => {
    const match = item.code.match(todayPattern);
    if (match) {
      const sequence = parseInt(match[1]);
      if (sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  });

  const sequence = String(maxSequence + 1).padStart(3, "0");
  const generatedCode = `${prefix}${dateString}${sequence}`;

  codeInput.value = generatedCode;
}

// 파트너사 초대코드 복사
function copyPartnerInviteCode() {
  const codeInput = document.getElementById("partner-invite-code-input");
  if (!codeInput.value) {
    alert("먼저 코드를 생성해주세요.");
    return;
  }

  navigator.clipboard
    .writeText(codeInput.value)
    .then(() => {
      alert("코드가 클립보드에 복사되었습니다.");
    })
    .catch(() => {
      alert("코드 복사에 실패했습니다.");
    });
}

// 파트너사 초대코드 저장
async function savePartnerInviteCode() {
  const codeInput = document.getElementById("partner-invite-code-input");
  const memoInput = document.getElementById("partner-memo-input");

  if (!codeInput.value) {
    alert("먼저 코드를 생성해주세요.");
    return;
  }

  // 현재 사용자 ID 가져오기
  const currentUserId = getCurrentPartnerUserId();
  if (!currentUserId) {
    alert("사용자 정보를 가져올 수 없습니다. 다시 로그인해주세요.");
    return;
  }

  try {
    const response = await fetch("/api/partner-invite-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        code: codeInput.value,
        memo: memoInput.value || null,
        created_by: "partner",
        created_by_user_id: currentUserId,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      alert("초대코드가 성공적으로 발급되었습니다.");

      // 입력 필드 초기화
      codeInput.value = "";
      memoInput.value = "";

      // 목록 새로고침
      await loadPartnerInviteCodeList();
      await loadPartnerInviteCodeStats();
    } else {
      const error = await response.json();
      alert(`코드 발급에 실패했습니다: ${error.error}`);
    }
  } catch (error) {
    console.error("코드 발급 오류:", error);
    alert("코드 발급 중 오류가 발생했습니다.");
  }
}

// 파트너사 초대코드 통계 로드
async function loadPartnerInviteCodeStats() {
  try {
    const currentUserId = getCurrentPartnerUserId();
    const response = await fetch(
      `/api/partner-invite-codes/stats?created_by_user_id=${currentUserId}`
    );
    if (response.ok) {
      const stats = await response.json();
      document.getElementById("total-partner-codes").textContent =
        stats.total || 0;
      document.getElementById("used-partner-codes").textContent =
        stats.used || 0;
    }
  } catch (error) {
    console.error("통계 로드 오류:", error);
  }
}

// 파트너사 초대코드 목록 로드
async function loadPartnerInviteCodeList() {
  const listEl = document.getElementById("partner-issued-code-list");
  const statusFilter = document.getElementById("partner-status-filter").value;
  const currentUserId = getCurrentPartnerUserId();

  listEl.innerHTML =
    '<div style="padding: 20px; text-align: center; color: #6b7280;">코드 목록을 불러오는 중...</div>';

  try {
    const response = await fetch(
      `/api/partner-invite-codes?status=${statusFilter}&created_by_user_id=${currentUserId}`
    );
    if (response.ok) {
      const codes = await response.json();
      renderPartnerInviteCodeList(codes);
    } else {
      listEl.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #ef4444;">코드 목록을 불러올 수 없습니다.</div>';
    }
  } catch (error) {
    console.error("코드 목록 로드 오류:", error);
    listEl.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #ef4444;">코드 목록을 불러올 수 없습니다.</div>';
  }
}

// 파트너사 초대코드 목록 렌더링
function renderPartnerInviteCodeList(codes) {
  const listEl = document.getElementById("partner-issued-code-list");

  if (codes.length === 0) {
    listEl.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #6b7280;">발급된 코드가 없습니다.</div>';
    return;
  }

  const codesHTML = codes
    .map(
      (code) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f3f4f6;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${
            code.code
          }</div>
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
            ${new Date(code.created_at).toLocaleDateString("ko-KR")}
            <span style="margin-left: 12px; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${
              code.is_used ? "#fef3c7" : "#dbeafe"
            }; color: ${code.is_used ? "#92400e" : "#1e40af"};">
              ${code.is_used ? "사용됨" : "미사용"}
            </span>
          </div>
          ${
            code.memo
              ? `<div style="font-size: 14px; color: #6b7280;">${code.memo}</div>`
              : ""
          }
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="copyToClipboard('${
            code.code
          }')" style="padding: 6px 12px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            복사
          </button>
          ${
            !code.is_used
              ? `<button onclick="deletePartnerInviteCode('${code.id}')" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            삭제
          </button>`
              : ""
          }
        </div>
      </div>
    `
    )
    .join("");

  listEl.innerHTML = codesHTML;
}

// 파트너사 초대코드 삭제
async function deletePartnerInviteCode(codeId) {
  if (!confirm("이 코드를 삭제하시겠습니까?")) {
    return;
  }

  try {
    const response = await fetch(`/api/partner-invite-codes/${codeId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert("코드가 삭제되었습니다.");
      await loadPartnerInviteCodeList();
      await loadPartnerInviteCodeStats();
    } else {
      alert("코드 삭제에 실패했습니다.");
    }
  } catch (error) {
    console.error("코드 삭제 오류:", error);
    alert("코드 삭제 중 오류가 발생했습니다.");
  }
}

// 파트너사 초대코드 모달 닫기
function closePartnerInviteCodeModal() {
  const modal = document.getElementById("partnerInviteCodeModal");
  if (modal) {
    modal.remove();
  }
}

// 현재 파트너사 사용자 ID 가져오기 (임시 구현)
function getCurrentPartnerUserId() {
  return localStorage.getItem("current_user_id") || "partner-mock-001";
}

// 인증 토큰 가져오기 (임시 구현)
function getAuthToken() {
  return localStorage.getItem("auth_token") || "mock-token";
}

// 클립보드 복사 함수
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      alert("코드가 클립보드에 복사되었습니다.");
    })
    .catch(() => {
      alert("코드 복사에 실패했습니다.");
    });
}

// 이벤트 바인딩
function bindPartnershipStatusEvents() {
  const searchBtn = document.querySelector(".search-btn");
  const resetBtn = document.querySelector(".reset-btn");
  const searchInput = document.querySelector(".search-input");

  searchBtn?.addEventListener("click", applyFilters);
  resetBtn?.addEventListener("click", resetFilters);

  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        applyFilters();
      }
    });
  }
}

// 파트너십 현황 초기화
async function initPartnershipStatus() {
  try {
    // Supabase에서 파트너십 데이터 로드 (첫 페이지)
    await loadPartnershipDataFromSupabase(1, {});

    // 파트너십 카드 업데이트
    updatePartnershipCards(partnershipData);

    // 페이지네이션 업데이트
    updatePagination();

    // 이벤트 리스너 설정
    bindPartnershipStatusEvents();

    console.log("파트너십 현황 컴포넌트 초기화 완료");
  } catch (error) {
    console.error("파트너십 현황 초기화 실패:", error);
  }
}

// 전역 함수로 등록
window.initPartnershipStatus = initPartnershipStatus;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.goToPage = goToPage;
window.viewClientRevenue = viewClientRevenue;
window.viewClientDetail = viewClientDetail;
window.goToClientManagement = goToClientManagement;

// 기존 함수들도 유지
window.onSearch = applyFilters;
window.onReset = resetFilters;

// DOM 로드 시 이벤트 바인딩
document.addEventListener("DOMContentLoaded", bindPartnershipStatusEvents);

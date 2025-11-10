// TROY 로고 클릭 시 홈으로 이동 (로그인 상태 유지)
function goToHome() {
  // 파트너사 대시보드에서 TROY 로고 클릭 시 캠페인 관리 화면으로 이동
  if (typeof loadPartnerCampaignManagement === "function") {
    loadPartnerCampaignManagement();
  }
}

// 공지사항 페이지로 이동
function showNoticeBoard() {
  window.location.href = "notice-board.html";
}

// 서비스 소개 페이지로 이동
function showServiceInfo() {
  window.location.href = "service-info.html";
}

// 파트너사 계층 구조 관리 기능
async function loadPartnerHierarchy() {
  console.log("파트너사 계층 구조 관리 기능 로드");
  const container = document.getElementById("main-content-container");
  if (!container) {
    console.error("main-content-container를 찾을 수 없습니다!");
    return;
  }

  container.innerHTML = `
    <div class="partner-hierarchy" style="padding: 24px; background: #f9fafb; min-height: 100vh;">
      <!-- 헤더 섹션 -->
      <div class="page-header" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827; margin-bottom: 4px;">하위 파트너사 관리</h2>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">내가 초대한 하위 파트너사들을 관리하고 모니터링합니다</p>
        </div>
        
        <!-- 통계 카드 -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
            <div style="display: flex; align-items: center;">
              <div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="color: white; font-size: 16px;">👥</span>
              </div>
              <div>
                <div style="font-size: 20px; font-weight: 600; color: #111827;" id="total-sub-partners">-</div>
                <div style="font-size: 12px; color: #6b7280;">총 하위 파트너사</div>
              </div>
            </div>
          </div>
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
            <div style="display: flex; align-items: center;">
              <div style="width: 32px; height: 32px; background: #10b981; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="color: white; font-size: 16px;">✓</span>
              </div>
              <div>
                <div style="font-size: 20px; font-weight: 600; color: #111827;" id="active-sub-partners">-</div>
                <div style="font-size: 12px; color: #6b7280;">활성 파트너사</div>
              </div>
            </div>
          </div>
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
            <div style="display: flex; align-items: center;">
              <div style="width: 32px; height: 32px; background: #f59e0b; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="color: white; font-size: 16px;">+</span>
              </div>
              <div>
                <div style="font-size: 20px; font-weight: 600; color: #111827;">0</div>
                <div style="font-size: 12px; color: #6b7280;">이번 달 신규</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 메인 컨텐츠 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- 하위 파트너사 목록 -->
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px;">하위 파트너사 목록</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">초대한 파트너사들의 현황을 확인하세요</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <select id="partner-status-filter" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; font-size: 14px; color: #374151;">
                <option value="all">전체</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
              <button onclick="loadSubPartnerList()" style="padding: 6px 12px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                새로고침
              </button>
            </div>
          </div>
          
          <div id="sub-partner-list" style="max-height: 400px; overflow-y: auto;">
            <div style="padding: 40px; text-align: center; color: #6b7280;">
              <div style="font-size: 32px; margin-bottom: 12px;">⏳</div>
              <div>하위 파트너사 목록을 불러오는 중...</div>
            </div>
          </div>
        </div>

        <!-- 계층 구조 트리 -->
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px;">파트너사 계층 구조</h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">파트너사 간의 관계를 시각적으로 확인하세요</p>
          </div>
          
          <div id="partner-tree" style="max-height: 400px; overflow-y: auto; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
            <div style="padding: 40px; text-align: center; color: #6b7280;">
              <div style="font-size: 32px; margin-bottom: 12px;">🌳</div>
              <div>계층 구조를 불러오는 중...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 액션 버튼들 -->
      <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
        <button onclick="exportPartnerData()" style="background: #10b981; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 14px;">
          데이터 내보내기
        </button>
        <button onclick="showPartnerAnalytics()" style="background: #8b5cf6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 14px;">
          분석 리포트
        </button>
      </div>
    </div>
  `;

  // 이벤트 바인딩
  bindPartnerHierarchyEvents();

  // 초기 데이터 로드
  await loadPartnerHierarchyStats();
  await loadSubPartnerList();
  await loadPartnerTree();
}

// 파트너사 계층 구조 이벤트 바인딩
function bindPartnerHierarchyEvents() {
  // 필터 변경
  document
    .getElementById("partner-status-filter")
    .addEventListener("change", loadSubPartnerList);
}

// 파트너사 계층 구조 통계 로드
async function loadPartnerHierarchyStats() {
  try {
    const currentUserId = getCurrentPartnerUserId();
    const response = await fetch(
      `/api/admin/partner-hierarchy/stats?parent_partner_id=${currentUserId}`
    );
    if (response.ok) {
      const stats = await response.json();
      document.getElementById("total-sub-partners").textContent =
        stats.total || 0;
      document.getElementById("active-sub-partners").textContent =
        stats.active || 0;
    } else {
      // 빈 데이터로 설정
      document.getElementById("total-sub-partners").textContent = "0";
      document.getElementById("active-sub-partners").textContent = "0";
    }
  } catch (error) {
    console.error("계층 구조 통계 로드 오류:", error);
    // 빈 데이터로 설정
    document.getElementById("total-sub-partners").textContent = "0";
    document.getElementById("active-sub-partners").textContent = "0";
  }
}

// 하위 파트너사 목록 로드
async function loadSubPartnerList() {
  const listEl = document.getElementById("sub-partner-list");
  const statusFilter = document.getElementById("partner-status-filter").value;
  const currentUserId = getCurrentPartnerUserId();

  listEl.innerHTML = `
    <div style="padding: 20px; text-align: center; color: #6b7280;">
      <div style="font-size: 24px; margin-bottom: 8px;">⏳</div>
      <div>하위 파트너사 목록을 불러오는 중...</div>
    </div>
  `;

  try {
    const response = await fetch(
      `/api/admin/partner-hierarchy/children?parent_partner_id=${currentUserId}&status=${statusFilter}`
    );
    if (response.ok) {
      const partners = await response.json();
      renderSubPartnerList(partners);
    } else {
      // 빈 목록 렌더링
      renderSubPartnerList([]);
    }
  } catch (error) {
    console.error("하위 파트너사 목록 로드 오류:", error);
    // 빈 목록 렌더링
    renderSubPartnerList([]);
  }
}

// 하위 파트너사 목록 렌더링
function renderSubPartnerList(partners) {
  const listEl = document.getElementById("sub-partner-list");

  if (partners.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: #6b7280;">
        <div style="font-size: 32px; margin-bottom: 16px;">👥</div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #374151;">하위 파트너사가 없습니다</h3>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">아직 초대한 파트너사가 없습니다.</p>
      </div>
    `;
    return;
  }

  const partnersHTML = partners
    .map(
      (partner, index) => `
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: white; font-weight: 600; font-size: 16px;">
          ${(partner.manager_name || "P")[0].toUpperCase()}
        </div>
        <div style="flex: 1;">
          <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px;">${
            partner.manager_name || "이름 없음"
          }</div>
          <div style="font-size: 14px; color: #6b7280;">
            ${partner.email || "이메일 없음"} • ${
        partner.phone || "전화번호 없음"
      }
          </div>
        </div>
        <div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          활성
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f3f4f6;">
        <div style="font-size: 12px; color: #6b7280;">
          가입일: ${new Date(partner.created_at).toLocaleDateString(
            "ko-KR"
          )} • ID: ${partner.id.slice(-8)}
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="viewPartnerDetail('${
            partner.id
          }')" style="background: #3b82f6; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            상세보기
          </button>
          <button onclick="contactPartner('${
            partner.id
          }')" style="background: #10b981; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            연락하기
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  listEl.innerHTML = partnersHTML;
}

// 파트너사 계층 구조 트리 로드
async function loadPartnerTree() {
  const treeEl = document.getElementById("partner-tree");
  const currentUserId = getCurrentPartnerUserId();

  treeEl.innerHTML = `
    <div style="padding: 20px; text-align: center; color: #6b7280;">
      <div style="font-size: 24px; margin-bottom: 8px;">🌳</div>
      <div>계층 구조를 불러오는 중...</div>
    </div>
  `;

  try {
    const response = await fetch(
      `/api/admin/partner-hierarchy/tree?root_partner_id=${currentUserId}`
    );
    if (response.ok) {
      const treeData = await response.json();
      renderPartnerTree(treeData);
    } else {
      // 빈 트리 렌더링
      const emptyTreeData = {
        id: currentUserId,
        manager_name: "나",
        email: "",
        children: [],
      };
      renderPartnerTree(emptyTreeData);
    }
  } catch (error) {
    console.error("계층 구조 로드 오류:", error);
    // 빈 트리 렌더링
    const emptyTreeData = {
      id: currentUserId,
      manager_name: "나",
      email: "",
      children: [],
    };
    renderPartnerTree(emptyTreeData);
  }
}

// 파트너사 계층 구조 트리 렌더링
function renderPartnerTree(treeData) {
  const treeEl = document.getElementById("partner-tree");

  if (!treeData || !treeData.children || treeData.children.length === 0) {
    treeEl.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: #6b7280;">
        <div style="font-size: 32px; margin-bottom: 16px;">🌳</div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #374151;">하위 파트너사가 없습니다</h3>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">아직 초대한 파트너사가 없습니다.</p>
      </div>
    `;
    return;
  }

  const treeHTML = `
    <div style="position: relative;">
      <!-- 루트 노드 -->
      <div style="display: flex; justify-content: center; margin-bottom: 20px;">
        <div style="background: #3b82f6; color: white; padding: 12px 20px; border-radius: 6px; position: relative;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">
              ${(treeData.manager_name || "나")[0].toUpperCase()}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600;">${
                treeData.manager_name || "나"
              }</div>
              <div style="font-size: 10px; opacity: 0.8;">상위 파트너사</div>
            </div>
          </div>
          <!-- 연결선 -->
          ${
            treeData.children.length > 0
              ? `
            <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 1px; height: 10px; background: #9ca3af;"></div>
          `
              : ""
          }
        </div>
      </div>
      
      <!-- 하위 노드들 -->
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px;">
        ${treeData.children
          .map((child, index) => renderTreeNode(child, 1, index))
          .join("")}
      </div>
    </div>
  `;

  treeEl.innerHTML = treeHTML;
}

// 트리 노드 렌더링 (재귀)
function renderTreeNode(node, level, index) {
  const hasChildren = node.children && node.children.length > 0;
  const colors = ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#6b7280"];
  const color = colors[index % colors.length];

  return `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
      <!-- 연결선 (상위에서) -->
      <div style="width: 1px; height: 12px; background: #9ca3af; margin-bottom: 6px;"></div>
      
      <!-- 노드 -->
      <div style="background: ${color}; color: white; padding: 8px 16px; border-radius: 4px; min-width: 150px; text-align: center; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px;">
          <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px;">
            ${(node.manager_name || "P")[0].toUpperCase()}
          </div>
          <div>
            <div style="font-size: 12px; font-weight: 600;">${
              node.manager_name || "이름 없음"
            }</div>
            <div style="font-size: 8px; opacity: 0.8;">하위 파트너사</div>
          </div>
        </div>
        ${
          node.email
            ? `<div style="font-size: 9px; opacity: 0.8; margin-top: 2px;">${node.email}</div>`
            : ""
        }
        
        <!-- 연결선 (하위로) -->
        ${
          hasChildren
            ? `
          <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 1px; height: 8px; background: #9ca3af;"></div>
        `
            : ""
        }
      </div>
      
      <!-- 하위 노드들 -->
      ${
        hasChildren
          ? `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 16px;">
          ${node.children
            .map((child, childIndex) =>
              renderTreeNode(child, level + 1, childIndex)
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  `;
}

// 파트너사 상세보기
function viewPartnerDetail(partnerId) {
  const modal = document.createElement("div");
  modal.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;";

  modal.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">파트너사 상세 정보</h3>
      <div style="margin-bottom: 16px;">
        <strong>파트너 ID:</strong> ${partnerId}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>상태:</strong> <span style="color: #10b981;">활성</span>
      </div>
      <div style="margin-bottom: 16px;">
        <strong>가입일:</strong> 2024-01-15
      </div>
      <div style="margin-bottom: 16px;">
        <strong>총 캠페인:</strong> 12개
      </div>
      <div style="margin-bottom: 16px;">
        <strong>월 매출:</strong> 2,500,000원
      </div>
      <div style="text-align: right;">
        <button onclick="this.closest('.modal').remove()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          닫기
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 파트너사 연락하기
function contactPartner(partnerId) {
  const modal = document.createElement("div");
  modal.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;";

  modal.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 24px; max-width: 400px; width: 90%;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">파트너사 연락하기</h3>
      <div style="margin-bottom: 16px;">
        <strong>이메일:</strong> partner${partnerId.slice(-4)}@example.com
      </div>
      <div style="margin-bottom: 16px;">
        <strong>전화번호:</strong> 010-1234-${partnerId.slice(-4)}
      </div>
      <div style="margin-bottom: 16px;">
        <strong>카카오톡:</strong> partner_${partnerId.slice(-4)}
      </div>
      <div style="text-align: right;">
        <button onclick="this.closest('.modal').remove()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          닫기
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 파트너 데이터 내보내기
function exportPartnerData() {
  // 임의의 CSV 데이터 생성
  const csvData = [
    ["파트너 ID", "이름", "이메일", "전화번호", "가입일", "상태"],
    [
      "P001",
      "김파트너",
      "partner1@example.com",
      "010-1111-2222",
      "2024-01-15",
      "활성",
    ],
    [
      "P002",
      "이파트너",
      "partner2@example.com",
      "010-3333-4444",
      "2024-02-20",
      "활성",
    ],
    [
      "P003",
      "박파트너",
      "partner3@example.com",
      "010-5555-6666",
      "2024-03-10",
      "비활성",
    ],
  ];

  const csvContent = csvData.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "partner_data.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert("파트너 데이터가 CSV 파일로 다운로드되었습니다.");
}

// 파트너 분석 리포트
async function showPartnerAnalytics() {
  const modal = document.createElement("div");
  modal.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;";

  // 먼저 로딩 모달 표시
  modal.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">파트너 분석 리포트</h3>
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 24px; margin-bottom: 12px;">⏳</div>
        <div style="color: #6b7280;">데이터를 불러오는 중...</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  // 실제 데이터 로드
  const currentUserId = getCurrentPartnerUserId();

  try {
    // 통계 데이터 가져오기
    const statsResponse = await fetch(
      `/api/admin/partner-hierarchy/stats?parent_partner_id=${currentUserId}`
    );
    const stats = statsResponse.ok
      ? await statsResponse.json()
      : { total: 0, active: 0 };

    // 캠페인 데이터 가져오기
    const token = getPartnerToken();
    let campaignCount = 0;
    let totalRevenue = 0;

    if (token) {
      try {
        const campaignsResponse = await fetch("/api/auth/my-campaigns", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (campaignsResponse.ok) {
          const campaignsData = await campaignsResponse.json();
          if (campaignsData.success && campaignsData.campaigns) {
            campaignCount = campaignsData.campaigns.length;
            // 매출 계산 (간단히 캠페인 수 * 500000으로 임시 계산)
            totalRevenue = campaignCount * 500000;
          }
        }
      } catch (e) {
        console.error("캠페인 데이터 로드 오류:", e);
      }
    }

    // 하위 파트너사 목록 가져오기 (최근 활동용)
    const partnersResponse = await fetch(
      `/api/admin/partner-hierarchy/children?parent_partner_id=${currentUserId}`
    );
    const partners = partnersResponse.ok ? await partnersResponse.json() : [];

    // 모달 내용 업데이트
    modal.innerHTML = `
      <div style="background: white; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">파트너 분석 리포트</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
            <div style="font-size: 24px; font-weight: 600; color: #3b82f6;">${
              stats.total || 0
            }</div>
            <div style="font-size: 14px; color: #6b7280;">총 하위 파트너사</div>
          </div>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
            <div style="font-size: 24px; font-weight: 600; color: #10b981;">${
              stats.active || 0
            }</div>
            <div style="font-size: 14px; color: #6b7280;">활성 파트너사</div>
          </div>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
            <div style="font-size: 24px; font-weight: 600; color: #f59e0b;">${campaignCount}</div>
            <div style="font-size: 14px; color: #6b7280;">총 캠페인 수</div>
          </div>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
            <div style="font-size: 24px; font-weight: 600; color: #8b5cf6;">${totalRevenue.toLocaleString()}원</div>
            <div style="font-size: 14px; color: #6b7280;">월 총 매출</div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">최근 활동</h4>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px;">
            ${
              partners.length > 0
                ? partners
                    .slice(0, 3)
                    .map(
                      (partner) =>
                        `<div style="font-size: 14px; margin-bottom: 8px;">• ${
                          partner.manager_name || "파트너"
                        }: 하위 파트너사 가입 (${new Date(
                          partner.created_at
                        ).toLocaleDateString("ko-KR")})</div>`
                    )
                    .join("")
                : '<div style="font-size: 14px; color: #6b7280;">최근 활동이 없습니다.</div>'
            }
          </div>
        </div>
        
        <div style="text-align: right;">
          <button onclick="this.closest('.modal').remove()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            닫기
          </button>
        </div>
      </div>
    `;

    // 새로 추가된 닫기 버튼에 이벤트 리스너 다시 바인딩
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (error) {
    console.error("파트너 분석 리포트 로드 오류:", error);
    modal.innerHTML = `
      <div style="background: white; border-radius: 8px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">파트너 분석 리포트</h3>
        <div style="text-align: center; padding: 40px; color: #ef4444;">
          <div style="font-size: 24px; margin-bottom: 12px;">❌</div>
          <div>데이터를 불러오는 중 오류가 발생했습니다.</div>
        </div>
        <div style="text-align: right;">
          <button onclick="this.closest('.modal').remove()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            닫기
          </button>
        </div>
      </div>
    `;
  }
}

// 파트너 토큰 가져오기 (초대코드 발급 모달에서 사용)
function getPartnerToken() {
  try {
    if (typeof getRoleSessionToken === "function") {
      const t = getRoleSessionToken("partner");
      if (t && t.trim() !== "") return t;
    }
  } catch (_) {}
  try {
    let t =
      sessionStorage.getItem("troy_token_partner") ||
      localStorage.getItem("troy_token_partner") ||
      localStorage.getItem("troy_token");
    if (t && t.trim() !== "") return t;
  } catch (_) {}
  return "";
}

// 파트너 관리 설정
function showPartnerSettings() {
  const modal = document.createElement("div");
  modal.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;";

  modal.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">파트너 관리 설정</h3>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">알림 설정</label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" checked style="margin: 0;">
          <span style="font-size: 14px;">새 파트너 가입 알림</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
          <input type="checkbox" checked style="margin: 0;">
          <span style="font-size: 14px;">캠페인 활동 알림</span>
        </div>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">자동 승인</label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" style="margin: 0;">
          <span style="font-size: 14px;">파트너 가입 자동 승인</span>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">월 리포트 발송</label>
        <select style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; width: 100%;">
          <option>매월 1일</option>
          <option>매월 15일</option>
          <option>매월 마지막 날</option>
        </select>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button onclick="this.closest('.modal').remove()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          취소
        </button>
        <button onclick="alert('설정이 저장되었습니다.'); this.closest('.modal').remove();" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          저장
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 현재 파트너사 사용자 ID 가져오기
function getCurrentPartnerUserId() {
  try {
    if (typeof getRoleSessionToken === "function") {
      const token = getRoleSessionToken("partner");
      if (token) {
        // 토큰에서 사용자 ID 추출
        const userId = localStorage.getItem("troy_user_id_partner");
        if (userId) return userId;
      }
    }
  } catch (_) {}

  // 대체 방법: localStorage에서 직접 가져오기
  const userId =
    localStorage.getItem("troy_user_id_partner") ||
    localStorage.getItem("troy_user_id");
  if (userId) return userId;

  return null; // ID를 찾지 못한 경우
}

// 초대코드 발급 모달 표시
async function showPartnerInviteCodeModal() {
  const modal = document.createElement("div");
  modal.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;";

  // API에서 초대코드 가져오기
  let inviteCode = "발급 중...";
  let isLoading = true;

  try {
    const currentUserId = getCurrentPartnerUserId();
    const response = await fetch(
      `/api/auth/generate-invite-code?partner_id=${currentUserId}`
    );
    if (response.ok) {
      const data = await response.json();
      inviteCode = data.invite_code || "코드 없음";
    } else {
      inviteCode = "발급 실패";
    }
  } catch (error) {
    console.error("초대코드 발급 오류:", error);
    inviteCode = "발급 실패";
  } finally {
    isLoading = false;
  }

  modal.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">하위 파트너사 초대코드 발급</h3>
      
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">초대코드</label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input 
            type="text" 
            id="inviteCodeInput" 
            value="${inviteCode}" 
            readonly 
            style="flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; font-size: 16px; font-weight: 600; letter-spacing: 2px; font-family: monospace;"
          />
          <button 
            onclick="copyInviteCode()" 
            style="background: #3b82f6; color: white; padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;"
          >
            복사
          </button>
        </div>
      </div>
      
      <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: start; gap: 8px;">
          <span style="font-size: 20px;">⚠️</span>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">주의사항</div>
            <div style="font-size: 14px; color: #78350f; line-height: 1.6;">
              • 이 초대코드는 하위 파트너사 가입 시 한 번만 사용할 수 있습니다.<br>
              • 초대코드는 발급 후 30일간 유효합니다.<br>
              • 보안을 위해 초대코드를 타인에게 공유하지 마세요.
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: right;">
        <button onclick="this.closest('.modal').remove()" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
          닫기
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 초대코드 복사 함수
function copyInviteCode() {
  const input = document.getElementById("inviteCodeInput");
  if (input) {
    input.select();
    document.execCommand("copy");
    alert("초대코드가 클립보드에 복사되었습니다.");
  }
}

// 이벤트 리스너
document.addEventListener("DOMContentLoaded", function () {
  // 로그아웃 기능
  document.querySelector(".logout").addEventListener("click", function () {
    window.location.href = "/";
  });

  // 메뉴 아이템 클릭 이벤트
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", function () {
      document
        .querySelectorAll(".menu-item")
        .forEach((i) => i.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // 액션 버튼 클릭 이벤트
  document.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      alert("이 기능은 준비 중입니다.");
    });
  });

  // 채팅 상담 버튼
  document.querySelector(".chat-button").addEventListener("click", function () {
    alert("채팅 상담 기능은 준비 중입니다.");
  });
});

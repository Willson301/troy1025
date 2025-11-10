/**
 * 캠페인 진행률 추적 컴포넌트
 * 목적: 캠페인 진행률을 관리하고 알림과 연동
 */

let currentProgressPage = 1;
let currentProgressFilters = {
  campaign: "all",
  range: "all",
};
let totalProgressPages = 1;
let campaigns = [];
let lastFetchedProgress = [];
let campaignById = new Map();
let campaignByCode = new Map();

// 캠페인 진행률 추적 초기화
async function initCampaignProgressTracker() {
  try {
    await loadCampaigns();
  } catch (_) {}
  await loadProgressData();
  await loadProgressStats();
  setupProgressEventListeners();
}

// 공통 GET
function getAdminToken() {
  return (
    sessionStorage.getItem("troy_token_admin") ||
    localStorage.getItem("troy_token_admin") ||
    sessionStorage.getItem("troy_token") ||
    localStorage.getItem("troy_token") ||
    ""
  );
}

function adminHeaders(extra = {}) {
  const t = getAdminToken();
  return t ? { Authorization: `Bearer ${t}`, ...extra } : { ...extra };
}

async function apiGet(url) {
  const res = await fetch(url, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// 캠페인 목록 로드 (가능하면 API 데이터에서 추출, 없으면 샘플)
async function loadCampaigns() {
  try {
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "200");
      const list = await apiGet(`/api/admin/campaigns?${params.toString()}`);
      const data = list?.campaigns || [];
      const items = Array.isArray(data) ? data : data.items || [];
      // 캠페인 목록에서 메타 구성
      const map = new Map();
      items.forEach((it) => {
        const id = String(it.id || it.campaign_id || "");
        if (!id) return;
        if (!map.has(id)) {
          map.set(id, {
            id,
            title: it.title || "캠페인",
            campaign_code: it.campaign_code || "",
            user_type: it.user_type || "agency",
            status: it.status || "active",
            created_at: it.created_at || new Date().toISOString(),
          });
        }
      });
      campaigns = Array.from(map.values());
      if (!campaigns.length) campaigns = getSampleCampaigns();
    } catch (_) {
      // API 실패 시 샘플 사용
      campaigns = getSampleCampaigns();
    }
    // 맵 구성
    campaignById = new Map();
    campaignByCode = new Map();
    (campaigns || []).forEach((c) => {
      if (c.id) campaignById.set(String(c.id), c);
      if (c.campaign_code) campaignByCode.set(String(c.campaign_code), c);
    });
    updateCampaignSelects();
  } catch (error) {
    console.error("캠페인 목록 로드 오류:", error);
  }
}

// 샘플 캠페인 데이터 생성
function getSampleCampaigns() {
  return [
    {
      id: "1",
      title: "여름 프로모션 캠페인",
      campaign_code: generateCampaignCodeByUserType("agency", "2024-06-01"),
      user_type: "agency",
      status: "active",
      created_at: "2024-06-01T00:00:00Z",
    },
    {
      id: "2",
      title: "신제품 런칭 캠페인",
      campaign_code: generateCampaignCodeByUserType("customer", "2024-06-15"),
      user_type: "customer",
      status: "active",
      created_at: "2024-06-15T00:00:00Z",
    },
    {
      id: "3",
      title: "블랙프라이데이 이벤트",
      campaign_code: generateCampaignCodeByUserType("partner", "2024-07-01"),
      user_type: "partner",
      status: "active",
      created_at: "2024-07-01T00:00:00Z",
    },
    {
      id: "4",
      title: "크리스마스 이벤트",
      campaign_code: generateCampaignCodeByUserType("agency", "2024-08-01"),
      user_type: "agency",
      status: "completed",
      created_at: "2024-08-01T00:00:00Z",
    },
    {
      id: "5",
      title: "신년 프로모션",
      campaign_code: generateCampaignCodeByUserType("customer", "2024-09-01"),
      user_type: "customer",
      status: "active",
      created_at: "2024-09-01T00:00:00Z",
    },
    {
      id: "6",
      title: "봄맞이 이벤트",
      campaign_code: generateCampaignCodeByUserType("partner", "2024-10-01"),
      user_type: "partner",
      status: "pending",
      created_at: "2024-10-01T00:00:00Z",
    },
    {
      id: "7",
      title: "여름 휴가 특가",
      campaign_code: generateCampaignCodeByUserType("agency", "2024-11-01"),
      user_type: "agency",
      status: "active",
      created_at: "2024-11-01T00:00:00Z",
    },
    {
      id: "8",
      title: "가을 할인 이벤트",
      campaign_code: generateCampaignCodeByUserType("customer", "2024-12-01"),
      user_type: "customer",
      status: "completed",
      created_at: "2024-12-01T00:00:00Z",
    },
  ];
}

// 사용자 유형에 따른 캠페인 코드 생성
function generateCampaignCodeByUserType(userType, dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateCode = month + day;

  const prefixes = {
    agency: "AC",
    customer: "BC",
    partner: "PC",
  };

  const prefix = prefixes[userType] || "AC";
  return `${prefix}-${dateCode}`;
}

// 캠페인 사용자 유형 라벨 반환
function getCampaignUserTypeLabel(userType) {
  const labels = {
    agency: "대행사",
    customer: "고객사",
    partner: "파트너사",
  };
  return labels[userType] || "대행사";
}

// 캠페인 선택 옵션 업데이트
function updateCampaignSelects() {
  const campaignFilter = document.getElementById("campaignFilter");
  const selectedCampaign = document.getElementById("selectedCampaign");

  const options = campaigns
    .map(
      (campaign) => `
    <option value="${campaign.id}">${campaign.title} (${campaign.campaign_code})</option>
  `
    )
    .join("");

  if (campaignFilter) {
    campaignFilter.innerHTML =
      '<option value="all">전체 캠페인</option>' + options;
  }

  if (selectedCampaign) {
    selectedCampaign.innerHTML =
      '<option value="">캠페인을 선택하세요</option>' + options;
  }
}

// 진행률 데이터 로드 (API 연동)
async function loadProgressData() {
  try {
    const progressListBody = document.getElementById("progressListBody");
    if (progressListBody) progressListBody.innerHTML = "로딩중...";

    // API 시도
    let allProgressData;
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "1000");
      const data = await apiGet(
        `/api/admin/campaign-progress?${params.toString()}`
      );
      allProgressData = Array.isArray(data) ? data : data.items || [];
    } catch (_) {
      // 실패 시 기존 샘플/로컬 결합
      const sampleProgressData = getSampleProgressData();
      const localProgressData = JSON.parse(
        localStorage.getItem("troy_progress_data") || "[]"
      );
      allProgressData = [...localProgressData, ...sampleProgressData];
    }

    // 캠페인 메타 결합
    const withMeta = (allProgressData || []).map((p) => {
      const cid = p.campaign_id ? String(p.campaign_id) : "";
      const ccode = p.campaign_code ? String(p.campaign_code) : "";
      const meta =
        (cid && campaignById.get(cid)) ||
        (ccode && campaignByCode.get(ccode)) ||
        null;
      return { ...p, _campaign: meta };
    });

    // 실제 캠페인과 매칭되는 데이터만 사용
    const onlyLinked = withMeta.filter((p) => !!p._campaign);

    // 캠페인에 진행 데이터가 하나도 없는 경우에도 기본 행을 생성해 표시
    const presentIds = new Set(
      onlyLinked.map((p) => String(p._campaign?.id || p.campaign_id || ""))
    );
    const synthesized = (campaigns || [])
      .filter((c) => !presentIds.has(String(c.id)))
      .map((c) => ({
        id: `seed_${c.id}`,
        campaign_id: c.id,
        campaign_code: c.campaign_code || "",
        progress_percentage:
          String(c.status).toLowerCase() === "completed" ? 100 : 0,
        status_message: "",
        updated_at: c.updated_at || c.created_at || new Date().toISOString(),
        _campaign: c,
      }));

    const merged = [...onlyLinked, ...synthesized];

    // 동일 캠페인에 대해 최신(updated_at) 1건만 유지하여 중복 행 방지
    const latestByCampaign = new Map();
    for (const item of merged) {
      const key = String(
        item._campaign?.id || item.campaign_id || item.campaign_code || ""
      );
      if (!key) continue;
      const prev = latestByCampaign.get(key);
      const curTs = new Date(item.updated_at || 0).getTime();
      const prevTs = new Date(prev?.updated_at || 0).getTime();
      if (!prev || curTs >= prevTs) {
        latestByCampaign.set(key, item);
      }
    }
    const deduped = Array.from(latestByCampaign.values());

    const filteredData = filterProgressData(deduped);
    const paginatedData = filteredData; // 전체 표시

    lastFetchedProgress = paginatedData;
    renderProgressData(paginatedData);
    const pag = document.getElementById("progressPagination");
    if (pag) pag.innerHTML = "";
  } catch (error) {
    console.error("진행률 데이터 로드 오류:", error);
    const progressListBody = document.getElementById("progressListBody");
    if (progressListBody)
      progressListBody.innerHTML = "데이터를 불러오지 못했습니다.";
    showNotification("진행률 데이터를 불러오는데 실패했습니다.", "error");
  }
}

// 샘플 진행률 데이터 생성
function getSampleProgressData() {
  return [
    {
      id: "1",
      campaign_id: "1",
      progress_percentage: 75,
      status_message: "크리에이티브 제작 완료, 광고 집행 중",
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
      next_milestone_date: "2024-12-25",
    },
    {
      id: "2",
      campaign_id: "2",
      progress_percentage: 30,
      status_message: "초기 기획 단계, 타겟 분석 완료",
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4시간 전
      next_milestone_date: "2024-12-30",
    },
    {
      id: "3",
      campaign_id: "3",
      progress_percentage: 90,
      status_message: "최종 단계, 성과 분석 중",
      updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6시간 전
      next_milestone_date: "2024-12-20",
    },
    {
      id: "4",
      campaign_id: "4",
      progress_percentage: 100,
      status_message: "캠페인 완료, 최종 보고서 작성 중",
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 전
      next_milestone_date: null,
    },
    {
      id: "5",
      campaign_id: "5",
      progress_percentage: 15,
      status_message: "초기 설정 단계, 계약서 검토 중",
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
      next_milestone_date: "2025-01-15",
    },
    {
      id: "6",
      campaign_id: "6",
      progress_percentage: 0,
      status_message: "대기 중, 승인 대기 상태",
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
      next_milestone_date: "2025-02-01",
    },
    {
      id: "7",
      campaign_id: "7",
      progress_percentage: 45,
      status_message: "중간 단계, A/B 테스트 진행 중",
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
      next_milestone_date: "2025-01-10",
    },
    {
      id: "8",
      campaign_id: "8",
      progress_percentage: 100,
      status_message: "완료, 성과 분석 보고서 제출됨",
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 전
      next_milestone_date: null,
    },
    {
      id: "9",
      campaign_id: "1",
      progress_percentage: 60,
      status_message: "이전 업데이트: 크리에이티브 검토 완료",
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10일 전
      next_milestone_date: "2024-12-20",
    },
    {
      id: "10",
      campaign_id: "2",
      progress_percentage: 20,
      status_message: "이전 업데이트: 예산 승인 완료",
      updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12일 전
      next_milestone_date: "2024-12-28",
    },
  ];
}

// 진행률 데이터 필터링
function filterProgressData(progressData) {
  let filtered = progressData;

  // 캠페인 필터
  if (currentProgressFilters.campaign !== "all") {
    filtered = filtered.filter(
      (item) => item.campaign_id === currentProgressFilters.campaign
    );
  }

  // 진행률 범위 필터
  if (currentProgressFilters.range !== "all") {
    const [min, max] = currentProgressFilters.range.split("-").map(Number);
    filtered = filtered.filter((item) => {
      const percentage = item.progress_percentage;
      return percentage >= min && percentage <= max;
    });
  }

  return filtered;
}

// 진행률 데이터 페이지네이션
function paginateProgressData(progressData, page, limit) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return progressData.slice(startIndex, endIndex);
}

// 진행률 통계 로드 (API 우선)
async function loadProgressStats() {
  try {
    try {
      const stats = await apiGet("/api/admin/campaign-progress/stats");
      updateProgressStats(stats || {});
      return;
    } catch (_) {}

    // API 실패 시 현재 데이터로 계산
    const sampleProgressData = getSampleProgressData();
    const localProgressData = JSON.parse(
      localStorage.getItem("troy_progress_data") || "[]"
    );
    const allProgressData = lastFetchedProgress.length
      ? lastFetchedProgress
      : [...localProgressData, ...sampleProgressData];
    const stats = calculateProgressStats(allProgressData);
    updateProgressStats(stats);
  } catch (error) {
    console.error("진행률 통계 로드 오류:", error);
  }
}

// 진행률 통계 계산
function calculateProgressStats(progressData) {
  const activeCampaigns = progressData.filter(
    (item) => item.progress_percentage > 0 && item.progress_percentage < 100
  ).length;
  const completedCampaigns = progressData.filter(
    (item) => item.progress_percentage === 100
  ).length;
  const totalProgress = progressData.reduce(
    (sum, item) => sum + item.progress_percentage,
    0
  );
  const averageProgress =
    progressData.length > 0
      ? Math.round(totalProgress / progressData.length)
      : 0;

  return {
    active: activeCampaigns,
    completed: completedCampaigns,
    average: averageProgress,
  };
}

// 진행률 데이터 렌더링
function renderProgressData(progressData) {
  const progressListBody = document.getElementById("progressListBody");
  if (!progressListBody) return;

  if (progressData.length === 0) {
    progressListBody.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <i class="fas fa-chart-line" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
        <p style="color: #6b7280; font-size: 16px;">진행률 데이터가 없습니다.</p>
      </div>
    `;
    return;
  }

  const progressHTML = progressData
    .map((progress) => {
      const campaign =
        progress._campaign ||
        campaigns.find(
          (c) =>
            String(c.id) === String(progress.campaign_id) ||
            String(c.campaign_code) === String(progress.campaign_code)
        );
      const progressClass = getProgressClass(progress.progress_percentage);

      const userTypeLabel = getCampaignUserTypeLabel(campaign?.user_type);

      return `
      <div class="progress-item">
        <div class="progress-cell campaign-info">
          <div>
            <div class="campaign-title">${
              campaign?.title || "알 수 없는 캠페인"
            }</div>
            <div class="campaign-code-container">
              <span class="campaign-code">${
                campaign?.campaign_code || "N/A"
              }</span>
              <span class="user-type-badge ${
                campaign?.user_type || "agency"
              }">${userTypeLabel}</span>
            </div>
          </div>
        </div>
        <div class="progress-cell">
          <div class="progress-bar-container">
            <div class="progress-bar ${progressClass}" style="width: ${
        progress.progress_percentage
      }%"></div>
          </div>
          <span class="progress-percentage">${
            progress.progress_percentage
          }%</span>
        </div>
        
        <div class="progress-cell">
          ${formatDate(progress.updated_at)}
        </div>
        <div class="progress-cell progress-actions-cell">
          <button class="btn-progress btn-detail" onclick="openProgressDetail('${
            progress.id
          }')">
            <i class="fas fa-eye"></i> 상세
          </button>
          <button class="btn-progress btn-edit" onclick="editProgressFromList('${
            progress.id
          }')">
            <i class="fas fa-edit"></i> 수정
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  progressListBody.innerHTML = progressHTML;
}

// 진행률 클래스 반환
function getProgressClass(percentage) {
  if (percentage < 25) return "low";
  if (percentage < 75) return "medium";
  return "high";
}

// 진행률 통계 업데이트
function updateProgressStats(stats) {
  const activeCampaigns = document.getElementById("activeCampaigns");
  const averageProgress = document.getElementById("averageProgress");
  const completedCampaigns = document.getElementById("completedCampaigns");

  if (activeCampaigns) activeCampaigns.textContent = stats.active || 0;
  if (averageProgress) averageProgress.textContent = `${stats.average || 0}%`;
  if (completedCampaigns) completedCampaigns.textContent = stats.completed || 0;
}

// 진행률 필터링
function filterProgress() {
  const campaignFilter = document.getElementById("campaignFilter");
  const rangeFilter = document.getElementById("progressRangeFilter");

  currentProgressFilters = {
    campaign: campaignFilter ? campaignFilter.value : "all",
    range: rangeFilter ? rangeFilter.value : "all",
  };

  currentProgressPage = 1;
  loadProgressData();
}

// 진행률 업데이트 모달 표시
function showProgressUpdateModal() {
  const modal = document.getElementById("progressUpdateModal");
  modal.style.display = "flex";

  // 폼 초기화
  document.getElementById("selectedCampaign").value = "";
  document.getElementById("progressPercentage").value = 0;
  document.getElementById("progressSlider").value = 0;
  document.getElementById("statusMessage").value = "";
  document.getElementById("nextMilestoneDate").value = "";
}

// 진행률 업데이트 모달 닫기
function closeProgressUpdateModal() {
  const modal = document.getElementById("progressUpdateModal");
  modal.style.display = "none";
}

// 슬라이더에서 진행률 업데이트
function updateProgressFromSlider() {
  const slider = document.getElementById("progressSlider");
  const percentage = document.getElementById("progressPercentage");

  if (slider && percentage) {
    percentage.value = slider.value;
  }
}

// 진행률 업데이트 저장
async function saveProgressUpdate() {
  const campaignId = document.getElementById("selectedCampaign").value;
  const percentage = parseInt(
    document.getElementById("progressPercentage").value
  );
  const statusMessage = document.getElementById("statusMessage").value;
  const nextMilestoneDate = document.getElementById("nextMilestoneDate").value;

  if (!campaignId) {
    showNotification("캠페인을 선택해주세요.", "warning");
    return;
  }

  if (percentage < 0 || percentage > 100) {
    showNotification("진행률은 0-100 사이의 값이어야 합니다.", "warning");
    return;
  }

  try {
    // 샘플 데이터에서는 로컬에서 처리
    const campaign = campaigns.find((c) => c.id === campaignId);

    // 새로운 진행률 항목 생성
    const newProgressId = Date.now().toString();
    const newProgress = {
      id: newProgressId,
      campaign_id: campaignId,
      progress_percentage: percentage,
      status_message: statusMessage || "진행률 업데이트됨",
      updated_at: new Date().toISOString(),
      next_milestone_date: nextMilestoneDate || null,
    };

    // 로컬 스토리지에 저장 (실제로는 서버에 전송)
    const existingProgress = JSON.parse(
      localStorage.getItem("troy_progress_data") || "[]"
    );
    existingProgress.unshift(newProgress);
    localStorage.setItem(
      "troy_progress_data",
      JSON.stringify(existingProgress)
    );

    showNotification("진행률이 업데이트되었습니다.", "success");
    loadProgressData();
    loadProgressStats();
    closeProgressUpdateModal();

    // 알림 생성 (샘플)
    showNotification(
      `캠페인 ${
        campaign?.title || campaignId
      }의 진행률이 ${percentage}%로 업데이트되었습니다.`,
      "info"
    );
  } catch (error) {
    console.error("진행률 업데이트 오류:", error);
    showNotification("진행률 업데이트에 실패했습니다.", "error");
  }
}

// 진행률 상세보기
async function openProgressDetail(progressId) {
  try {
    // 모든 데이터에서 진행률 찾기
    const sampleProgressData = getSampleProgressData();
    const localProgressData = JSON.parse(
      localStorage.getItem("troy_progress_data") || "[]"
    );
    const allProgressData = [...localProgressData, ...sampleProgressData];
    const progress = allProgressData.find((item) => item.id === progressId);

    if (progress) {
      const campaign = campaigns.find((c) => c.id === progress.campaign_id);
      const modal = document.getElementById("progressDetailModal");
      const content = document.getElementById("progressDetailContent");

      const userTypeLabel = getCampaignUserTypeLabel(campaign?.user_type);

      content.innerHTML = `
        <div class="progress-detail">
          <div class="detail-row">
            <span class="detail-label">캠페인:</span>
            <span class="detail-value">${
              campaign?.title || "알 수 없는 캠페인"
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">사용자 유형:</span>
            <span class="detail-value">
              <span class="user-type-badge ${
                campaign?.user_type || "agency"
              }">${userTypeLabel}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">캠페인 코드:</span>
            <span class="detail-value">${
              campaign?.campaign_code || "N/A"
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">진행률:</span>
            <span class="detail-value">
              <div class="progress-bar-container" style="width: 200px; display: inline-block;">
                <div class="progress-bar ${getProgressClass(
                  progress.progress_percentage
                )}" 
                     style="width: ${progress.progress_percentage}%"></div>
              </div>
              <span style="margin-left: 8px;">${
                progress.progress_percentage
              }%</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">상태 메시지:</span>
            <span class="detail-value">${
              progress.status_message || "상태 메시지 없음"
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">업데이트일:</span>
            <span class="detail-value">${formatDate(progress.updated_at)}</span>
          </div>
          ${
            progress.next_milestone_date
              ? `
          <div class="detail-row">
            <span class="detail-label">다음 마일스톤:</span>
            <span class="detail-value">${formatDate(
              progress.next_milestone_date
            )}</span>
          </div>
          `
              : ""
          }
        </div>
      `;

      modal.style.display = "flex";
    } else {
      showNotification("진행률 정보를 찾을 수 없습니다.", "error");
    }
  } catch (error) {
    console.error("진행률 상세보기 오류:", error);
    showNotification("진행률 정보를 불러오는데 실패했습니다.", "error");
  }
}

// 진행률 상세보기 모달 닫기
function closeProgressDetailModal() {
  const modal = document.getElementById("progressDetailModal");
  modal.style.display = "none";
}

// 진행률 수정
function editProgress() {
  // 현재 상세보기 모달의 진행률 ID를 가져와서 수정 모달 열기
  closeProgressDetailModal();
  showProgressUpdateModal();
}

// 목록에서 진행률 수정
function editProgressFromList(progressId) {
  // 진행률 ID를 기반으로 수정 모달 열기
  showProgressUpdateModal();
}

// 진행률 새로고침
function refreshProgress() {
  loadProgressData();
  loadProgressStats();
}

// 진행률 페이지네이션 렌더링
function renderProgressPagination(pagination) {
  const paginationContainer = document.getElementById("progressPagination");
  if (!paginationContainer) return;

  const { currentPage, totalPages, hasNext, hasPrev } = pagination;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let paginationHTML = '<div class="pagination">';

  // 이전 버튼
  if (hasPrev) {
    paginationHTML += `
      <button class="page-btn" onclick="changeProgressPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
  }

  // 페이지 번호들
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="page-btn ${i === currentPage ? "active" : ""}" 
              onclick="changeProgressPage(${i})">
        ${i}
      </button>
    `;
  }

  // 다음 버튼
  if (hasNext) {
    paginationHTML += `
      <button class="page-btn" onclick="changeProgressPage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
  }

  paginationHTML += "</div>";
  paginationContainer.innerHTML = paginationHTML;
}

// 진행률 페이지 변경
function changeProgressPage(page) {
  currentProgressPage = page;
  loadProgressData();
}

// 진행률 이벤트 리스너 설정
function setupProgressEventListeners() {
  // 진행률 입력 필드와 슬라이더 동기화
  const percentageInput = document.getElementById("progressPercentage");
  const slider = document.getElementById("progressSlider");

  if (percentageInput && slider) {
    percentageInput.addEventListener("input", () => {
      slider.value = percentageInput.value;
    });
  }
}

// 날짜 포맷팅
function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ko-KR");
}

// 알림 생성 헬퍼 함수
async function createNotification(notificationData) {
  try {
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notificationData),
    });
  } catch (error) {
    console.error("알림 생성 오류:", error);
  }
}

// 알림 표시 (토스트 메시지)
function showNotification(message, type = "info") {
  // 토스트 메시지 표시 로직
  console.log(`${type.toUpperCase()}: ${message}`);
}

// DOM 로드 완료 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  // 캠페인 진행률 추적 컴포넌트가 로드된 경우에만 초기화
  if (document.querySelector(".campaign-progress-tracker")) {
    initCampaignProgressTracker();
  }
});

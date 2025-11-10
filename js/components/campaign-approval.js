// 실제 데이터 저장소 (관리자 API에서 로드)
let adminCampaigns = [];
let advertiserNameById = {};
let agencyNameById = {};
let partnerNameById = {};

function getAdminToken() {
  try {
    return (
      sessionStorage.getItem("troy_token_admin") ||
      localStorage.getItem("troy_token_admin") ||
      localStorage.getItem("troy_token") ||
      "admin_temp_token"
    );
  } catch (_) {
    return "admin_temp_token";
  }
}

function adminHeaders() {
  const token = getAdminToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function mapTypeLabel(type) {
  const t = (type || "").toString().toLowerCase();
  if (t === "product") return "제품형";
  if (t === "traffic") return "유입형";
  if (t === "content") return "콘텐츠형";
  return type || "-";
}

function makeCustomerLabel(row) {
  try {
    const businessName =
      row?.__business_name ||
      row?.advertiser_company_name ||
      row?.agency_name ||
      row?.company_name ||
      row?.business_name ||
      row?.businessName ||
      row?.store_name ||
      row?.storeName ||
      row?.office_name ||
      row?.officeName;
    const nickname =
      row?.created_by_nickname ||
      row?.owner_nickname ||
      row?.user_nickname ||
      row?.requirements?.nickname ||
      row?.customer_nickname;
    return businessName || nickname || "고객사";
  } catch (_) {
    return "고객사";
  }
}

function mapApiToRow(c) {
  const est = c?.requirements?.estimate || {};
  const amount = c?.budget ?? est?.totalAmount ?? 0;
  function computeCompanyType() {
    try {
      if (c?.advertiser_id && advertiserNameById[c.advertiser_id])
        return "customer";
      if (
        c?.partner_id &&
        (partnerNameById[c.partner_id] || String(c.partner_id).length)
      )
        return "partner";
      if (c?.created_by && agencyNameById[c.created_by]) return "agency";
    } catch (_) {}
    return "customer"; // 기본값
  }
  return {
    id: c?.campaign_code || c?.id,
    date: (function () {
      try {
        const d = new Date(c?.created_at);
        const pad = (n) => String(n).padStart(2, "0");
        return (
          d.getFullYear() +
          "-" +
          pad(d.getMonth() + 1) +
          "-" +
          pad(d.getDate()) +
          " " +
          pad(d.getHours()) +
          ":" +
          pad(d.getMinutes())
        );
      } catch (_) {
        return "-";
      }
    })(),
    name: `${c?.brand_name || ""} ${
      c?.product_title || c?.title || "-"
    }`.trim(),
    code: c?.campaign_code || "-",
    customer: makeCustomerLabel(c),
    amount: Number(amount) || 0,
    type: mapTypeLabel(c?.campaign_type),
    status: (c?.status || "pending").toLowerCase(),
    companyType: computeCompanyType(),
    schedule:
      c?.start_date && c?.end_date
        ? {
            startDate: String(c.start_date).slice(0, 10),
            endDate: String(c.end_date).slice(0, 10),
          }
        : null,
    _origin: c,
  };
}

async function fetchAdminCampaigns() {
  try {
    // 병렬로 고객사/대행사 맵과 캠페인 목록을 가져와 사업장명 매핑
    const [custRes, agenRes, partRes, campRes] = await Promise.all([
      fetch(`/api/admin/customers`, {
        headers: adminHeaders(),
        cache: "no-store",
      }),
      fetch(`/api/admin/agencies`, {
        headers: adminHeaders(),
        cache: "no-store",
      }),
      fetch(`/api/admin/partners`, {
        headers: adminHeaders(),
        cache: "no-store",
      }),
      fetch(`/api/admin/campaigns?page=1&limit=200`, {
        headers: adminHeaders(),
        cache: "no-store",
      }),
    ]);

    const [custJson, agenJson, partJson, campJson] = await Promise.all([
      custRes.ok ? custRes.json() : Promise.resolve({ items: [] }),
      agenRes.ok ? agenRes.json() : Promise.resolve({ items: [] }),
      partRes.ok ? partRes.json() : Promise.resolve({ items: [] }),
      campRes.json(),
    ]);

    advertiserNameById = {};
    (custJson.items || []).forEach((it) => {
      if (it?.id) advertiserNameById[it.id] = it.company_name;
    });
    agencyNameById = {};
    (agenJson.items || []).forEach((it) => {
      if (it?.id) agencyNameById[it.id] = it.agency_name;
    });
    partnerNameById = {};
    (partJson.items || partJson.codes || partJson || []).forEach((it) => {
      if (it?.id)
        partnerNameById[it.id] = it.name || it.manager_name || "파트너사";
    });

    const list = Array.isArray(campJson.campaigns) ? campJson.campaigns : [];
    // 원본 캠페인에 사업장명 힌트를 주입
    const decorated = list.map((c) => ({
      ...c,
      __business_name:
        (c && c.advertiser_id && advertiserNameById[c.advertiser_id]) ||
        (c && c.created_by && agencyNameById[c.created_by]) ||
        null,
    }));
    adminCampaigns = decorated.map(mapApiToRow);

    // 각 캠페인에 제품 반송 주소 데이터 추가 (NEW 배지 확인용)
    console.log("=== 캠페인 목록에 제품 반송 주소 데이터 추가 시작 ===");
    const enrichedCampaigns = await Promise.all(
      adminCampaigns.map(async (campaign) => {
        try {
          return await enrichCampaignWithReturnAddress(campaign);
        } catch (error) {
          console.error(
            `캠페인 ${campaign.id} 반송 주소 데이터 추가 실패:`,
            error
          );
          return campaign;
        }
      })
    );
    adminCampaigns = enrichedCampaigns;
    console.log("=== 캠페인 목록에 제품 반송 주소 데이터 추가 완료 ===");
  } catch (e) {
    console.error("/api/admin/campaigns error", e);
    adminCampaigns = [];
  }
}

function openDetail(id) {
  const campaign = (adminCampaigns || []).find(
    (c) => String(c.id) === String(id)
  );
  if (!campaign) {
    alert("캠페인 정보를 찾을 수 없습니다.");
    return;
  }

  // NEW 배지 제거: 읽은 시간 기록
  markCampaignAsRead(campaign.id);

  showCampaignDetailModal(campaign);
}

function openSchedule(id) {
  const campaign = (adminCampaigns || []).find(
    (c) => String(c.id) === String(id)
  );
  if (!campaign) {
    alert("캠페인 정보를 찾을 수 없습니다.");
    return;
  }

  showCampaignScheduleModal(campaign);
}

// 배송지 업로드 모달
function openShippingUpload(id) {
  const campaign = (adminCampaigns || []).find(
    (c) => String(c.id) === String(id)
  );
  if (!campaign) {
    alert("캠페인 정보를 찾을 수 없습니다.");
    return;
  }

  showShippingUploadModal(campaign);
}

// 배송지 업로드 모달 표시
function showShippingUploadModal(campaign) {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById("shippingUploadModal");
  if (existingModal) {
    existingModal.remove();
  }

  // 모달 생성
  const modal = document.createElement("div");
  modal.id = "shippingUploadModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 600px; max-height: 92vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b;">배송지 정보 업로드</h2>
        <span class="close" onclick="closeShippingUploadModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
      </div>
      <div class="modal-body">
        <div class="campaign-info" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px;">${campaign.name}</h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">캠페인 ID: ${campaign.id}</p>
        </div>
        
        <form id="shippingUploadForm" enctype="multipart/form-data">
          <div class="form-section" style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">배송지 파일 업로드</h3>
            
            <div class="file-upload-area" style="border: 2px dashed #d1d5db; border-radius: 8px; padding: 40px 20px; text-align: center; background: #f9fafb; margin-bottom: 16px; transition: all 0.3s ease;" 
                 ondrop="handleFileDrop(event)" 
                 ondragover="handleDragOver(event)" 
                 ondragleave="handleDragLeave(event)">
              <div class="upload-icon" style="font-size: 48px; color: #9ca3af; margin-bottom: 16px;">📁</div>
              <p style="margin: 0 0 8px 0; color: #374151; font-weight: 500;">파일을 드래그하거나 클릭하여 업로드</p>
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Excel, CSV 파일만 지원됩니다</p>
              <input type="file" id="shippingFile" name="shippingFile" accept=".xlsx,.xls,.csv" style="display: none;" onchange="handleFileSelect(event)">
              <button type="button" onclick="document.getElementById('shippingFile').click()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">파일 선택</button>
            </div>
            
            <div id="fileInfo" style="display: none; padding: 12px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #059669;">✓</span>
                <span id="fileName" style="color: #065f46; font-weight: 500;"></span>
                <span id="fileSize" style="color: #6b7280; font-size: 14px;"></span>
              </div>
            </div>
          </div>
          
          <div class="form-section" style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">요청사항</h3>
            <div class="form-group">
              <label for="shippingNotes" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">배송 관련 요청사항</label>
              <textarea id="shippingNotes" name="shippingNotes" rows="4" placeholder="배송지 정보, 특별 요청사항, 연락처 등을 입력해주세요..." style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; transition: border-color 0.2s ease;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'"></textarea>
            </div>
          </div>
          
          <div class="form-section" style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">업로드 가이드</h3>
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 16px;">
              <h4 style="margin: 0 0 8px 0; color: #0369a1; font-size: 14px;">필수 컬럼</h4>
              <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; font-size: 14px;">
                <li>수령인명</li>
                <li>연락처</li>
                <li>주소 (도로명주소)</li>
                <li>상세주소</li>
                <li>우편번호</li>
              </ul>
            </div>
          </div>
          
          <div class="modal-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <button type="button" onclick="closeShippingUploadModal()" style="padding: 10px 20px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500;">취소</button>
            <button type="submit" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">업로드</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // 캠페인 ID를 모달에 설정
  modal.setAttribute("data-campaign-id", campaign.id);

  document.body.appendChild(modal);

  // 폼 제출 이벤트 리스너 추가
  document
    .getElementById("shippingUploadForm")
    .addEventListener("submit", handleShippingUpload);
}

// 모달 닫기
function closeShippingUploadModal() {
  const modal = document.getElementById("shippingUploadModal");
  if (modal) {
    modal.remove();
  }
}

// 파일 드래그 앤 드롭 처리
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = "#3b82f6";
  e.currentTarget.style.backgroundColor = "#eff6ff";
}

function handleDragLeave(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = "#d1d5db";
  e.currentTarget.style.backgroundColor = "#f9fafb";
}

function handleFileDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = "#d1d5db";
  e.currentTarget.style.backgroundColor = "#f9fafb";

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    document.getElementById("shippingFile").files = files;
    handleFileSelect({ target: { files: files } });
  }
}

// 파일 선택 처리
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    const fileInfo = document.getElementById("fileInfo");
    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");

    fileName.textContent = file.name;
    fileSize.textContent = `(${formatFileSize(file.size)})`;
    fileInfo.style.display = "block";
  }
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 배송지 업로드 처리
async function handleShippingUpload(e) {
  e.preventDefault();

  const file = document.getElementById("shippingFile").files[0];
  const notes = document.getElementById("shippingNotes").value;
  const campaignId = document
    .getElementById("shippingUploadModal")
    .getAttribute("data-campaign-id");

  if (!file) {
    alert("배송지 파일을 선택해주세요.");
    return;
  }

  // 파일 유효성 검사
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];
  if (!allowedTypes.includes(file.type)) {
    alert("Excel 또는 CSV 파일만 업로드 가능합니다.");
    return;
  }

  // 파일 크기 제한 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert("파일 크기는 10MB를 초과할 수 없습니다.");
    return;
  }

  // 업로드 버튼 비활성화
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "업로드 중...";

  try {
    // FormData 생성
    const uploadData = new FormData();
    uploadData.append("shippingFile", file);
    uploadData.append("request_notes", notes); // notes 대신 request_notes 사용

    // API 호출
    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/shipping-files`,
      {
        method: "POST",
        headers: {
          // adminHeaders()에서 Content-Type을 제거하고 Authorization만 사용
          Authorization: adminHeaders().Authorization,
        },
        body: uploadData,
      }
    );

    const result = await response.json();

    if (response.ok) {
      alert("배송지 파일이 업로드되었습니다.");
      closeShippingUploadModal();
      // 캠페인 목록 새로고침
      if (window.refreshCampaigns) {
        window.refreshCampaigns();
      }
    } else {
      alert(
        `배송지 업로드 중 오류가 발생했습니다: ${
          result.error || "알 수 없는 오류"
        }`
      );
    }
  } catch (error) {
    console.error("배송지 업로드 오류:", error);
    alert("배송지 업로드 중 오류가 발생했습니다.");
  } finally {
    // 업로드 버튼 복원
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// 캠페인 상세보기 모달
function showCampaignDetailModal(campaign) {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById("campaignDetailModal");
  if (existingModal) {
    existingModal.remove();
  }

  // 모달 생성
  const modal = document.createElement("div");
  modal.id = "campaignDetailModal";
  modal.className = "modal campaign-detail-modal";
  modal.setAttribute("data-campaign-id", campaign.id);
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  const statusColor = getStatusColor(campaign.status);
  const companyTypeLabel = getCompanyTypeLabel(campaign.companyType);

  // 디버깅: 캠페인 데이터 구조 확인
  console.log("=== 관리자 캠페인 상세보기 디버깅 ===");
  console.log("캠페인 ID:", campaign.id);
  console.log("캠페인 데이터:", campaign);
  console.log("campaign.requirements:", campaign.requirements);
  console.log("campaign._origin:", campaign._origin);
  console.log(
    "campaign._origin?.requirements:",
    campaign._origin?.requirements
  );
  console.log(
    "agency_request:",
    campaign._origin?.requirements?.agency_request ||
      campaign.requirements?.agency_request
  );

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 800px; max-height: 92vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b;">캠페인 상세 정보</h2>
        <span class="close" onclick="closeCampaignDetailModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
      </div>
      <div class="modal-body">
        <div class="campaign-detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div class="detail-section">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">기본 정보</h3>
            <div class="info-grid" style="display: grid; gap: 12px;">
              <div class="info-item">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인 ID</label>
                <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px; font-family: monospace;">${
                  campaign.id
                }</div>
              </div>
              <div class="info-item">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인명</label>
                <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                  campaign.name
                }</div>
              </div>
              <div class="info-item">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">신청자</label>
                <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                  campaign.customer
                }</div>
              </div>
              <div class="info-item">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">회사 유형</label>
                <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${companyTypeLabel}</div>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">캠페인 상세</h3>
            <div class="info-grid" style="display: grid; gap: 12px;">
              <div class="info-item">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인 유형</label>
                <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                  campaign.type
                }</div>
              </div>
              <div class="info-item">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인 금액</label>
                <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px; font-weight: 600; color: #059669;">₩${campaign.amount.toLocaleString()}</div>
              </div>
              <div class="info-item">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">신청일</label>
                <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                  campaign.date
                }</div>
              </div>
              <div class="info-item">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">상태</label>
                <div style="padding: 8px 12px; background: ${statusColor}; color: white; border-radius: 6px; font-weight: 600; text-align: center;">${getStatusText(
    campaign.status
  )}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">일정 정보</h3>
          <div class="info-grid" style="display: grid; gap: 12px;">
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">캠페인 기간</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">
                ${
                  campaign.schedule
                    ? `${campaign.schedule.startDate} ~ ${campaign.schedule.endDate}`
                    : "미설정"
                }
              </div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">일정 메모</label>
              <div style="padding: 12px; background: #f9fafb; border-radius: 6px; min-height: 60px;">${
                campaign.schedule?.notes || "없음"
              }</div>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">대행사 요청사항</h3>
          <div class="info-grid" style="display: grid; gap: 12px;">
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">요청 내용</label>
              <div style="padding: 12px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; min-height: 80px; white-space: pre-wrap;">${
                campaign._origin?.requirements?.agency_request ||
                campaign.requirements?.agency_request ||
                "대행사에서 요청사항을 등록하지 않았습니다."
              }</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">요청 등록일</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;">${
                campaign._origin?.requirements?.request_updated_at ||
                campaign.requirements?.request_updated_at
                  ? new Date(
                      campaign._origin?.requirements?.request_updated_at ||
                        campaign.requirements?.request_updated_at
                    ).toLocaleString("ko-KR")
                  : "없음"
              }</div>
            </div>
            ${
              campaign.schedule?.notes
                ? `
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">일정 메모</label>
              <div style="padding: 12px; background: #f9fafb; border-radius: 6px; min-height: 60px;">${campaign.schedule.notes}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>
        
        <div class="detail-section">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">제품 반송 주소</h3>
          <div class="info-grid" style="display: grid; gap: 12px;">
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">받는 분 성명</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;" id="returnNameDisplay">로딩 중...</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">연락처</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;" id="returnPhoneDisplay">로딩 중...</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">주소</label>
              <div style="padding: 12px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; min-height: 60px; white-space: pre-wrap;" id="returnAddressDisplay">로딩 중...</div>
            </div>
            <div class="info-item">
              <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">등록일</label>
              <div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px;" id="returnDateDisplay">로딩 중...</div>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">원고 수신함</h3>
          <div class="info-item">
            <div id="manuscriptList" style="padding: 12px; background: #f9fafb; border-radius: 6px; min-height: 60px;">
              <div style="text-align: center; color: #6b7280;">로딩 중...</div>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">캠페인 문의</h3>
          <div class="info-item">
            <div id="inquiryList" style="padding: 12px; background: #f9fafb; border-radius: 6px; min-height: 60px;">
              <div style="text-align: center; color: #6b7280;">로딩 중...</div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <button onclick="closeCampaignDetailModal()" style="padding: 10px 20px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500;">닫기</button>
          ${
            campaign.status === "pending"
              ? `
            <button onclick="approveCampaign('${campaign.id}')" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">승인</button>
            <button onclick="rejectCampaign('${campaign.id}')" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">반려</button>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 원고 파일 목록 로드
  loadManuscriptList(campaign.id);

  // 반송 주소 데이터 로드
  console.log("=== 관리자 모달에서 반송 주소 로드 시작 ===");
  console.log("캠페인 ID:", campaign.id);
  console.log("캠페인 ID 타입:", typeof campaign.id);
  loadReturnAddressData(campaign.id);

  // 문의 데이터 로드
  console.log("=== 관리자 모달에서 문의 로드 시작 ===");
  loadInquiryData(campaign.id);
}

// 모달 닫기
function closeCampaignDetailModal() {
  const modal = document.getElementById("campaignDetailModal");
  if (modal) {
    modal.remove();
  }
}

// 상태 색상 반환
function getStatusColor(status) {
  const colors = {
    pending: "#f59e0b",
    approved: "#10b981",
    rejected: "#ef4444",
  };
  return colors[status] || "#6b7280";
}

// 회사 유형 라벨 반환
function getCompanyTypeLabel(type) {
  const labels = {
    agency: "대행사",
    customer: "고객사",
    partner: "파트너사",
  };
  return labels[type] || type;
}

// 상태 텍스트 반환
function getStatusText(status) {
  const texts = {
    pending: "승인대기",
    approved: "승인완료",
    rejected: "반려",
  };
  return texts[status] || status;
}

// 원고 파일 목록 로드
async function loadManuscriptList(campaignId) {
  try {
    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/manuscripts`,
      {
        headers: adminHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const manuscripts = data.manuscripts || [];

    const manuscriptListEl = document.getElementById("manuscriptList");
    if (!manuscriptListEl) return;

    if (manuscripts.length === 0) {
      manuscriptListEl.innerHTML = `
        <div style="text-align: center; color: #6b7280; padding: 20px;">
          <div style="font-size: 24px; margin-bottom: 8px;">📄</div>
          <div>등록된 원고가 없습니다.</div>
        </div>
      `;
      return;
    }

    manuscriptListEl.innerHTML = manuscripts
      .map(
        (manuscript) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; margin-bottom: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 6px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${
            manuscript.file_name
          }</div>
          <div style="font-size: 12px; color: #6b7280;">
            ${formatFileSize(manuscript.size)} • ${formatDate(
          manuscript.created_at
        )}
          </div>
        </div>
        <button onclick="downloadManuscript('${manuscript.id}', '${
          manuscript.file_name
        }')" 
                style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
          다운로드
        </button>
      </div>
    `
      )
      .join("");
  } catch (error) {
    console.error("원고 목록 로드 오류:", error);
    const manuscriptListEl = document.getElementById("manuscriptList");
    if (manuscriptListEl) {
      manuscriptListEl.innerHTML = `
        <div style="text-align: center; color: #ef4444; padding: 20px;">
          <div>원고 목록을 불러오는데 실패했습니다.</div>
          <div style="font-size: 12px; margin-top: 4px;">${error.message}</div>
        </div>
      `;
    }
  }
}

// 원고 파일 다운로드
function downloadManuscript(manuscriptId, fileName) {
  try {
    // 관리자용 다운로드 API 사용
    const downloadUrl = `/api/admin/campaigns/${campaignId}/manuscripts/${manuscriptId}/download`;

    // 새 창에서 다운로드 URL 열기
    window.open(downloadUrl, "_blank");
  } catch (error) {
    console.error("다운로드 오류:", error);
    alert("파일 다운로드에 실패했습니다.");
  }
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 날짜 포맷팅
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 캠페인 승인
async function approveCampaign(id) {
  if (confirm(`${id} 캠페인을 승인하시겠습니까?`)) {
    try {
      const response = await fetch(
        `/api/admin/campaigns/${encodeURIComponent(id)}/approve`,
        {
          method: "PUT",
          headers: adminHeaders(),
          body: JSON.stringify({
            memo: "관리자 승인",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // 로컬 상태 업데이트
        const campaign = (adminCampaigns || []).find(
          (c) => String(c.id) === String(id)
        );
        if (campaign) {
          campaign.status = "approved";
          campaign.note = "승인완료";

          // 승인 완료 알림 생성
          if (typeof createApprovalCompletionNotification === "function") {
            const campaignData = {
              user_name: campaign.customer.split(" ")[0], // 회사명에서 사용자명 추출
              company: campaign.customer,
              user_type:
                campaign.companyType === "agency"
                  ? "대행사"
                  : campaign.companyType === "customer"
                  ? "고객사"
                  : "파트너사",
              campaign_name: campaign.name,
              campaign_id: campaign.id,
              amount: campaign.amount,
              type: campaign.type,
              status: "approved",
            };
            createApprovalCompletionNotification(campaignData);
          }
        }

        alert("캠페인이 승인되었습니다.");
        closeCampaignDetailModal();
        // 테이블 새로고침
        filterAndDisplayCampaigns();

        // 대행사/3사 화면에서도 캠페인 목록 새로고침
        try {
          if (typeof window.refreshCampaigns === "function") {
            window.refreshCampaigns();
          }
          if (typeof window.refreshPartnerCampaigns === "function") {
            window.refreshPartnerCampaigns();
          }
          // 부모 창이나 다른 창에서도 새로고침 시도
          if (window.parent && window.parent !== window) {
            if (typeof window.parent.refreshCampaigns === "function") {
              window.parent.refreshCampaigns();
            }
            if (typeof window.parent.refreshPartnerCampaigns === "function") {
              window.parent.refreshPartnerCampaigns();
            }
          }
          // 모든 창에서 새로고침 시도 (다중 탭 지원)
          if (
            window.opener &&
            typeof window.opener.refreshPartnerCampaigns === "function"
          ) {
            window.opener.refreshPartnerCampaigns();
          }
        } catch (e) {
          console.log("다른 창 새로고침 실패:", e);
        }
      } else {
        alert(result.error || "캠페인 승인에 실패했습니다.");
      }
    } catch (error) {
      console.error("캠페인 승인 오류:", error);
      alert(`캠페인 승인 중 오류가 발생했습니다: ${error.message}`);
    }
  }
}

function requestRevision(id) {
  if (confirm(`${id} 수정 요청을 보내시겠습니까?`)) {
    alert("수정 요청이 전송되었습니다.");
  }
}

async function rejectCampaign(id) {
  const reason = prompt(
    `${id} 캠페인을 반려하시겠습니까?\n반려 사유를 입력해주세요:`,
    ""
  );
  if (reason === null) return; // 취소된 경우

  if (reason.trim() === "") {
    alert("반려 사유를 입력해주세요.");
    return;
  }

  try {
    const response = await fetch(
      `/api/admin/campaigns/${encodeURIComponent(id)}/reject`,
      {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      // 로컬 상태 업데이트
      const campaign = (adminCampaigns || []).find(
        (c) => String(c.id) === String(id)
      );
      if (campaign) {
        campaign.status = "rejected";
        campaign.note = "반려";
      }

      alert("캠페인이 반려되었습니다.");
      closeCampaignDetailModal();
      // 테이블 새로고침
      filterAndDisplayCampaigns();

      // 대행사/3사 화면에서도 캠페인 목록 새로고침
      try {
        if (typeof window.refreshCampaigns === "function") {
          window.refreshCampaigns();
        }
        if (typeof window.refreshPartnerCampaigns === "function") {
          window.refreshPartnerCampaigns();
        }
        // 부모 창이나 다른 창에서도 새로고침 시도
        if (window.parent && window.parent !== window) {
          if (typeof window.parent.refreshCampaigns === "function") {
            window.parent.refreshCampaigns();
          }
          if (typeof window.parent.refreshPartnerCampaigns === "function") {
            window.parent.refreshPartnerCampaigns();
          }
        }
        // 모든 창에서 새로고침 시도 (다중 탭 지원)
        if (
          window.opener &&
          typeof window.opener.refreshPartnerCampaigns === "function"
        ) {
          window.opener.refreshPartnerCampaigns();
        }
      } catch (e) {
        console.log("다른 창 새로고침 실패:", e);
      }
    } else {
      alert(result.error || "캠페인 반려에 실패했습니다.");
    }
  } catch (error) {
    console.error("캠페인 반려 오류:", error);
    alert(`캠페인 반려 중 오류가 발생했습니다: ${error.message}`);
  }
}

// 검색 기능
function searchCampaigns() {
  const searchInput = document.getElementById("search-input");
  const searchTerm = searchInput.value.toLowerCase();
  filterAndDisplayCampaigns({ search: searchTerm });
}

// 검색 초기화
function resetSearch() {
  document.getElementById("search-input").value = "";
  document.getElementById("period-filter").value = "all";
  document.getElementById("status-filter").value = "all";

  // 회사 타입 버튼 초기화
  const companyBtns = document.querySelectorAll(".company-btn");
  companyBtns.forEach((btn) => btn.classList.remove("active"));
  document.querySelector('[data-type="all"]').classList.add("active");

  filterAndDisplayCampaigns({});
}

// 회사 타입 필터링
function filterByCompanyType(type) {
  const companyBtns = document.querySelectorAll(".company-btn");
  companyBtns.forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`[data-type="${type}"]`).classList.add("active");

  const searchTerm = document.getElementById("search-input").value;
  const periodFilter = document.getElementById("period-filter").value;
  const statusFilter = document.getElementById("status-filter").value;

  filterAndDisplayCampaigns({
    search: searchTerm,
    period: periodFilter,
    status: statusFilter,
    companyType: type,
  });
}

// 필터링 및 표시 함수
function filterAndDisplayCampaigns(filters = {}) {
  const {
    search = "",
    period = "all",
    status = "all",
    companyType = "all",
  } = filters;

  let filteredData = (adminCampaigns || []).filter((campaign) => {
    // 검색 필터
    const matchesSearch =
      campaign.name.toLowerCase().includes(search) ||
      campaign.customer.toLowerCase().includes(search) ||
      campaign.id.toLowerCase().includes(search);

    // 기간 필터 (임시로 status로 대체)
    const matchesPeriod = period === "all" || campaign.status === period;

    // 상태 필터
    const matchesStatus = status === "all" || campaign.status === status;

    // 회사 타입 필터
    const matchesCompanyType =
      companyType === "all" || campaign.companyType === companyType;

    return (
      matchesSearch && matchesPeriod && matchesStatus && matchesCompanyType
    );
  });

  // 테이블 업데이트
  updateCampaignTable(filteredData);

  // 통계 업데이트
  updateStats(filteredData);
}

// 테이블 업데이트
function updateCampaignTable(data) {
  const tbody = document.getElementById("campaign-tbody");
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align:center;color:#64748b;padding:16px;">등록된 캠페인이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map(
      (campaign, index) => `
    <tr data-company-type="${campaign.companyType}">
      <td>${campaign.id}</td>
      <td>${campaign.date}</td>
      <td>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <span>${campaign.name}</span>
          <small style="color:#6b7280;">CODE: ${campaign.code || "-"}</small>
        </div>
      </td>
      <td>${campaign.customer}</td>
      <td>₩${(Number(campaign.amount) || 0).toLocaleString()}</td>
      <td>${campaign.type}</td>
      <td>${
        campaign.schedule
          ? `${campaign.schedule.startDate} ~ ${campaign.schedule.endDate}`
          : "-"
      }</td>
      <td><span class="status-badge ${getStatusClass(
        campaign.status
      )}">${getStatusText(campaign.status)}</span></td>
      <td>
        <div style="position: relative; display: inline-block;" data-campaign-id="${
          campaign.id
        }">
          <button class="action-btn" onclick="openDetail('${
            campaign.id
          }')">상세보기</button>
          ${
            hasNewUpdates(campaign)
              ? '<span class="new-badge" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 10px; z-index: 10;">NEW</span>'
              : ""
          }
        </div>
        <button class="action-btn" onclick="openSchedule('${
          campaign.id
        }')">스케줄설정</button>
        <button class="action-btn upload-btn" onclick="openShippingUpload('${
          campaign.id
        }')">배송지업로드</button>
        
        <button class="action-btn danger" onclick="rejectCampaign('${
          campaign.id
        }')">반려</button>
      </td>
    </tr>
  `
    )
    .join("");
}

// 캠페인을 읽음으로 표시
function markCampaignAsRead(campaignId) {
  try {
    const readCampaigns = JSON.parse(
      localStorage.getItem("adminReadCampaigns") || "[]"
    );
    const campaignIdStr = String(campaignId);

    // 기존 항목 제거
    const filtered = readCampaigns.filter((item) => item.id !== campaignIdStr);

    // 새 항목 추가
    filtered.push({
      id: campaignIdStr,
      readTime: new Date().toISOString(),
    });

    localStorage.setItem("adminReadCampaigns", JSON.stringify(filtered));

    // UI에서 NEW 배지 제거
    const newBadge = document.querySelector(
      `[data-campaign-id="${campaignIdStr}"] .new-badge`
    );
    if (newBadge) {
      newBadge.remove();
    }
  } catch (error) {
    console.error("markCampaignAsRead error:", error);
  }
}

// 캠페인에 새로운 업데이트가 있는지 확인
// 제품 반송 주소 데이터를 캠페인 객체에 추가하는 함수
async function enrichCampaignWithReturnAddress(campaign) {
  try {
    const returnAddress = await loadReturnAddress(campaign.id);
    if (returnAddress) {
      campaign.returnAddress = returnAddress;
    }
    return campaign;
  } catch (error) {
    console.error("enrichCampaignWithReturnAddress error:", error);
    return campaign;
  }
}

function hasNewUpdates(campaign) {
  try {
    // 로컬 스토리지에서 읽은 캠페인 목록 가져오기
    const readCampaigns = JSON.parse(
      localStorage.getItem("adminReadCampaigns") || "[]"
    );

    // requirements에서 업데이트 로그 확인
    const requirements =
      campaign._origin?.requirements || campaign.requirements || {};
    const updateLogs = requirements.updateLogs || [];

    // 제품 반송 주소 확인
    const returnAddress = campaign.returnAddress;
    let latestUpdateTime = null;

    // 1. 업데이트 로그에서 가장 최근 시간 확인
    if (updateLogs.length > 0) {
      const latestUpdate = updateLogs[0];
      latestUpdateTime = latestUpdate?.date || latestUpdate?.changedAt;
    }

    // 2. 제품 반송 주소 등록 시간 확인
    if (returnAddress?.created_at) {
      const returnAddressTime = new Date(returnAddress.created_at);
      if (!latestUpdateTime || returnAddressTime > new Date(latestUpdateTime)) {
        latestUpdateTime = returnAddress.created_at;
      }
    }

    if (!latestUpdateTime) return false;

    // 이 캠페인을 읽었는지 확인
    const campaignId = String(campaign.id);
    const readTime = readCampaigns.find(
      (item) => item.id === campaignId
    )?.readTime;

    if (!readTime) return true; // 읽지 않았다면 NEW

    // 최근 업데이트가 마지막 읽은 시간보다 늦다면 NEW
    return new Date(latestUpdateTime) > new Date(readTime);
  } catch (error) {
    console.error("hasNewUpdates error:", error);
    return false;
  }
}

// 상태 클래스 반환
function getStatusClass(status) {
  switch (status) {
    case "approved":
      return "green";
    case "pending":
      return "orange";
    case "rejected":
      return "red";
    default:
      return "gray";
  }
}

// 상태 텍스트 반환
function getStatusText(status) {
  switch (status) {
    case "approved":
      return "승인완료";
    case "pending":
      return "승인대기";
    case "rejected":
      return "반려";
    default:
      return "알 수 없음";
  }
}

// 통계 업데이트
function updateStats(data) {
  const totalCount = data.length;
  const pendingCount = data.filter((c) => c.status === "pending").length;
  const approvedCount = data.filter((c) => c.status === "approved").length;
  const rejectedCount = data.filter((c) => c.status === "rejected").length;

  document.getElementById("total-count").textContent =
    totalCount || (adminCampaigns || []).length;
  document.getElementById("pending-count").textContent =
    pendingCount ||
    (adminCampaigns || []).filter((c) => c.status === "pending").length;
  document.getElementById("approved-count").textContent =
    approvedCount ||
    (adminCampaigns || []).filter((c) => c.status === "approved").length;
  document.getElementById("rejected-count").textContent =
    rejectedCount ||
    (adminCampaigns || []).filter((c) => c.status === "rejected").length;
}

// 엑셀 다운로드
function downloadExcel() {
  const periodFilter = document.getElementById("period-filter").value;
  const statusFilter = document.getElementById("status-filter").value;
  const searchTerm = document.getElementById("search-input").value;
  const companyType = document
    .querySelector(".company-btn.active")
    .getAttribute("data-type");

  // 현재 필터 조건에 맞는 데이터 가져오기
  let dataToExport = campaignData.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPeriod =
      periodFilter === "all" || campaign.status === periodFilter;
    const matchesStatus =
      statusFilter === "all" || campaign.status === statusFilter;
    const matchesCompanyType =
      companyType === "all" || campaign.companyType === companyType;

    return (
      matchesSearch && matchesPeriod && matchesStatus && matchesCompanyType
    );
  });

  // CSV 형식으로 변환
  const headers = [
    "번호",
    "제출일시",
    "캠페인명",
    "고객사",
    "예산",
    "유형",
    "일정",
    "상태",
    "비고",
  ];

  let csvContent = headers.join(",") + "\n";

  dataToExport.forEach((campaign) => {
    const row = [
      campaign.id,
      campaign.date,
      campaign.name,
      campaign.customer,
      campaign.amount,
      campaign.type,
      campaign.schedule
        ? `${campaign.schedule.startDate} ~ ${campaign.schedule.endDate}`
        : "-",
      getStatusText(campaign.status),
      campaign.note,
    ];
    csvContent += row.map((field) => `"${field}"`).join(",") + "\n";
  });

  // 파일 다운로드
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `캠페인관리_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert(`${dataToExport.length}건의 캠페인 내역이 다운로드되었습니다.`);
}

// 통계 카드 필터링
function filterByStat(status) {
  document.getElementById("status-filter").value = status;
  const periodFilter = document.getElementById("period-filter").value;
  const searchTerm = document.getElementById("search-input").value;
  const companyType = document
    .querySelector(".company-btn.active")
    .getAttribute("data-type");

  filterAndDisplayCampaigns({
    search: searchTerm,
    period: periodFilter,
    status: status,
    companyType: companyType,
  });

  // 활성 상태 표시
  const statCards = document.querySelectorAll(".stat-card");
  statCards.forEach((c) => c.classList.remove("active"));
  if (status !== "all") {
    document.querySelector(`[data-status="${status}"]`).classList.add("active");
  }
}

// 캠페인 승인 컴포넌트 초기화
async function initCampaignApprovalComponent() {
  console.log("캠페인 승인 컴포넌트 초기화");
  // 로딩 표시
  const tbody = document.getElementById("campaign-tbody");
  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align:center;color:#64748b;padding:16px;">데이터 불러오는 중...</td></tr>';
  }
  await fetchAdminCampaigns();

  // 검색 기능 이벤트 리스너
  const searchBtn = document.getElementById("search-btn");
  const resetBtn = document.getElementById("reset-btn");
  const excelBtn = document.getElementById("excel-btn");
  const searchInput = document.getElementById("search-input");
  const periodFilter = document.getElementById("period-filter");
  const statusFilter = document.getElementById("status-filter");

  if (searchBtn) {
    searchBtn.addEventListener("click", searchCampaigns);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetSearch);
  }

  if (excelBtn) {
    excelBtn.addEventListener("click", downloadExcel);
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchCampaigns();
      }
    });
  }

  if (periodFilter) {
    periodFilter.addEventListener("change", function () {
      const searchTerm = document.getElementById("search-input").value;
      const statusValue = document.getElementById("status-filter").value;
      const companyType = document
        .querySelector(".company-btn.active")
        .getAttribute("data-type");
      filterAndDisplayCampaigns({
        search: searchTerm,
        period: this.value,
        status: statusValue,
        companyType: companyType,
      });
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      const searchTerm = document.getElementById("search-input").value;
      const periodValue = document.getElementById("period-filter").value;
      const companyType = document
        .querySelector(".company-btn.active")
        .getAttribute("data-type");
      filterAndDisplayCampaigns({
        search: searchTerm,
        period: periodValue,
        status: this.value,
        companyType: companyType,
      });
    });
  }

  // 회사 타입 버튼 이벤트 리스너
  const companyBtns = document.querySelectorAll(".company-btn");
  companyBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const type = this.getAttribute("data-type");
      filterByCompanyType(type);
    });
  });

  // 통계 카드 클릭 이벤트
  const statCards = document.querySelectorAll(".stat-card");
  statCards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", function () {
      const status = card.getAttribute("data-status");
      filterByStat(status);
    });
  });

  // 초기 데이터 로드
  filterAndDisplayCampaigns({});
}

// 페이지 로드 시 자동 초기화
document.addEventListener("DOMContentLoaded", function () {
  initCampaignApprovalComponent();
});

// 캠페인 일정 수정 모달 표시
function showCampaignScheduleModal(campaign) {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById("campaignScheduleModal");
  if (existingModal) {
    existingModal.remove();
  }

  // 모달 생성
  const modal = document.createElement("div");
  modal.id = "campaignScheduleModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  // 기존 일정 정보가 있으면 사용, 없으면 기본값 설정
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const startDate = campaign.schedule?.startDate || today;
  const endDate = campaign.schedule?.endDate || nextWeek;
  const scheduleNotes = campaign.schedule?.notes || "";

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 2% auto; padding: 28px; border-radius: 14px; width: 95%; max-width: 600px; max-height: 92vh; overflow-y: auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b;">캠페인 일정 수정</h2>
        <span class="close" onclick="closeCampaignScheduleModal()" style="font-size: 24px; cursor: pointer; color: #6b7280;">&times;</span>
      </div>
      <div class="modal-body">
        <div class="campaign-info" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px;">${campaign.name}</h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">캠페인 ID: ${campaign.id}</p>
        </div>
        
        <form id="campaignScheduleForm">
          <div class="form-section" style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">캠페인 일정</h3>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="startDate" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">시작일</label>
              <input type="date" id="startDate" name="startDate" value="${startDate}" 
                     style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s ease;" 
                     onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="endDate" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">종료일</label>
              <input type="date" id="endDate" name="endDate" value="${endDate}" 
                     style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s ease;" 
                     onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
            </div>
            
          </div>
          
          <div class="form-section" style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">추가 설정</h3>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="scheduleNotes" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">일정 메모</label>
              <textarea id="scheduleNotes" name="scheduleNotes" rows="3" placeholder="일정 관련 특이사항이나 메모를 입력해주세요..." 
                        style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; transition: border-color 0.2s ease;" 
                        onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">${scheduleNotes}</textarea>
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">알림 설정</label>
              <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" id="notifyCustomer" name="notifyCustomer" checked style="margin: 0;">
                  <span style="font-size: 14px; color: #374151;">고객사 알림</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" id="notifyPartner" name="notifyPartner" checked style="margin: 0;">
                  <span style="font-size: 14px; color: #374151;">파트너사 알림</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" id="notifyAgency" name="notifyAgency" checked style="margin: 0;">
                  <span style="font-size: 14px; color: #374151;">대행사 알림</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="modal-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <button type="button" onclick="closeCampaignScheduleModal()" style="padding: 10px 20px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500;">취소</button>
            <button type="submit" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">일정 저장</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 폼 제출 이벤트 리스너 추가
  document
    .getElementById("campaignScheduleForm")
    .addEventListener("submit", (e) =>
      handleCampaignScheduleSubmit(e, campaign)
    );

  // 날짜 유효성 검사
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  startDateInput.addEventListener("change", validateDateRange);
  endDateInput.addEventListener("change", validateDateRange);
}

// 모달 닫기
function closeCampaignScheduleModal() {
  const modal = document.getElementById("campaignScheduleModal");
  if (modal) {
    modal.remove();
  }
}

// 날짜 유효성 검사
function validateDateRange() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (startDate && endDate && startDate > endDate) {
    alert("시작일은 종료일보다 이전이어야 합니다.");
    document.getElementById("endDate").value = startDate;
  }
}

// 캠페인 일정 제출 처리
function handleCampaignScheduleSubmit(e, campaign) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const startDate = formData.get("startDate");
  const endDate = formData.get("endDate");
  const scheduleNotes = formData.get("scheduleNotes");
  const notifyCustomer = formData.get("notifyCustomer") === "on";
  const notifyPartner = formData.get("notifyPartner") === "on";
  const notifyAgency = formData.get("notifyAgency") === "on";

  // 유효성 검사
  if (!startDate || !endDate) {
    alert("시작일과 종료일을 모두 입력해주세요.");
    return;
  }

  if (startDate > endDate) {
    alert("시작일은 종료일보다 이전이어야 합니다.");
    return;
  }

  // 일정 데이터 구성
  const scheduleData = {
    campaignId: campaign.id,
    startDate: startDate,
    endDate: endDate,
    notes: scheduleNotes,
    notifications: {
      customer: notifyCustomer,
      partner: notifyPartner,
      agency: notifyAgency,
    },
  };

  // API 호출: 일정 저장 + 변경일시 기록
  fetch(`/api/admin/campaigns/${encodeURIComponent(campaign.id)}/schedule`, {
    method: "PUT",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      start_date: startDate,
      end_date: endDate,
      notes: scheduleNotes,
    }),
  })
    .then(async (r) => {
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`${r.status} ${txt && txt.slice(0, 120)}`);
      }
      return r.json();
    })
    .then((resp) => {
      if (!resp || resp.error) {
        alert(resp?.error || "일정 저장에 실패했습니다.");
        return;
      }

      // 로컬 상태 갱신
      const campaignIndex = (adminCampaigns || []).findIndex(
        (c) => String(c.id) === String(campaign.id)
      );
      if (campaignIndex !== -1) {
        adminCampaigns[campaignIndex].schedule = {
          startDate: startDate,
          endDate: endDate,
          notes: scheduleNotes,
        };
        const changedAt =
          resp?.campaign?.requirements?.schedule_changed_at ||
          new Date().toISOString();
        adminCampaigns[campaignIndex]._origin =
          adminCampaigns[campaignIndex]._origin || {};
        const req = adminCampaigns[campaignIndex]._origin.requirements || {};
        adminCampaigns[campaignIndex]._origin.requirements = {
          ...req,
          schedule_changed_at: changedAt,
        };
      }

      alert(`${campaign.id} 캠페인의 일정이 성공적으로 저장되었습니다.`);

      if (typeof createScheduleUpdateNotification === "function") {
        createScheduleUpdateNotification({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          customer: campaign.customer,
          start_date: startDate,
          end_date: endDate,
          notifications: scheduleData.notifications,
        });
      }

      closeCampaignScheduleModal();
      filterAndDisplayCampaigns();
    })
    .catch((err) => {
      console.error("schedule save error", err);
      alert(`일정 저장 중 오류가 발생했습니다.\n${err?.message || ""}`);
    });
}

// 일정 업데이트 알림 생성 함수
function createScheduleUpdateNotification(data) {
  // 실제로는 API를 통해 알림을 생성
  console.log("일정 업데이트 알림 생성:", data);

  // 각 사용자 유형별로 알림 생성
  if (data.notifications.customer) {
    console.log(`고객사 ${data.customer}에게 일정 변경 알림 전송`);
  }
  if (data.notifications.partner) {
    console.log("파트너사에게 일정 변경 알림 전송");
  }
  if (data.notifications.agency) {
    console.log("대행사에게 일정 변경 알림 전송");
  }
}

// 반송 주소 데이터 가져오기
async function loadReturnAddress(campaignId) {
  try {
    console.log("=== loadReturnAddress 함수 호출 ===");
    console.log("요청할 캠페인 ID:", campaignId);
    console.log(
      "API URL:",
      `/api/admin/campaigns/${campaignId}/return-address`
    );

    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/return-address`,
      {
        headers: adminHeaders(),
      }
    );

    console.log("API 응답 상태:", response.status);
    console.log("API 응답 URL:", response.url);

    if (!response.ok) {
      console.error("반송 주소 조회 실패:", response.status);
      return null;
    }

    const result = await response.json();
    console.log("API 응답 데이터:", result);
    return result.data;
  } catch (error) {
    console.error("반송 주소 조회 오류:", error);
    return null;
  }
}

// 반송 주소 데이터 로드 및 표시
async function loadReturnAddressData(campaignId) {
  try {
    const returnAddress = await loadReturnAddress(campaignId);

    // 받는 분 성명
    const nameDisplay = document.getElementById("returnNameDisplay");
    if (nameDisplay) {
      nameDisplay.textContent = returnAddress?.name || "등록되지 않음";
    }

    // 연락처
    const phoneDisplay = document.getElementById("returnPhoneDisplay");
    if (phoneDisplay) {
      phoneDisplay.textContent = returnAddress?.phone || "등록되지 않음";
    }

    // 주소
    const addressDisplay = document.getElementById("returnAddressDisplay");
    if (addressDisplay) {
      addressDisplay.textContent = returnAddress?.address || "등록되지 않음";
    }

    // 등록일
    const dateDisplay = document.getElementById("returnDateDisplay");
    if (dateDisplay) {
      if (returnAddress?.created_at) {
        dateDisplay.textContent = new Date(
          returnAddress.created_at
        ).toLocaleString("ko-KR");
      } else {
        dateDisplay.textContent = "없음";
      }
    }
  } catch (error) {
    console.error("반송 주소 데이터 로드 오류:", error);

    // 오류 시 기본값 표시
    const displays = [
      "returnNameDisplay",
      "returnPhoneDisplay",
      "returnAddressDisplay",
      "returnDateDisplay",
    ];
    displays.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent =
          id === "returnDateDisplay" ? "없음" : "등록되지 않음";
      }
    });
  }
}

// 전역 함수 등록
window.openDetail = openDetail;
window.openSchedule = openSchedule;
window.openShippingUpload = openShippingUpload;
window.requestRevision = requestRevision;
window.rejectCampaign = rejectCampaign;
// 문의 데이터 로드
async function loadInquiryData(campaignId) {
  try {
    console.log("=== loadInquiryData 함수 호출 ===");
    console.log("요청할 캠페인 ID:", campaignId);
    console.log("API URL:", `/api/admin/campaigns/${campaignId}/inquiries`);

    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/inquiries`,
      {
        headers: adminHeaders(),
      }
    );

    console.log("API 응답 상태:", response.status);
    console.log("API 응답 URL:", response.url);

    if (!response.ok) {
      console.error("문의 조회 실패:", response.status);
      return;
    }

    const result = await response.json();
    console.log("API 응답 데이터:", result);

    displayInquiries(result.data || []);
  } catch (error) {
    console.error("문의 조회 오류:", error);
  }
}

// 문의 목록 표시
function displayInquiries(inquiries) {
  const inquiryListDiv = document.getElementById("inquiryList");
  if (!inquiryListDiv) {
    console.error("inquiryList 요소를 찾을 수 없습니다.");
    return;
  }

  if (!inquiries || inquiries.length === 0) {
    inquiryListDiv.innerHTML = `
      <div style="text-align: center; color: #6b7280; padding: 20px;">
        등록된 문의가 없습니다.
      </div>
    `;
    return;
  }

  const inquiriesHtml = inquiries
    .map((inquiry) => {
      // 문의자 이름 표시 (user_type에 따라 다르게 처리)
      let inquirerName = "알 수 없음";
      if (inquiry.inquirer) {
        if (inquiry.inquirer.user_type === "advertiser") {
          inquirerName = inquiry.inquirer.username || "광고주";
        } else if (inquiry.inquirer.user_type === "agency") {
          inquirerName = inquiry.inquirer.username || "대행사";
        } else if (inquiry.inquirer.user_type === "partner") {
          inquirerName = inquiry.inquirer.username || "파트너사";
        } else {
          inquirerName = inquiry.inquirer.username || "사용자";
        }
      }

      const statusClass =
        inquiry.status === "open"
          ? "pending"
          : inquiry.status === "answered"
          ? "answered"
          : "closed";
      const statusText =
        inquiry.status === "open"
          ? "답변대기"
          : inquiry.status === "answered"
          ? "답변완료"
          : "종료";

      const createdDate = new Date(inquiry.created_at).toLocaleDateString(
        "ko-KR",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      return `
      <div class="inquiry-item" style="margin-bottom: 12px; padding: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px;">
        <div class="inquiry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="inquiry-title" style="font-weight: 600; color: #1e293b;">Q. ${
            inquiry.title
          }</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="inquiry-date" style="font-size: 12px; color: #6b7280;">${createdDate}</span>
            <span class="inquiry-status ${statusClass}" style="padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; background: ${
        statusClass === "pending"
          ? "#fef3c7"
          : statusClass === "answered"
          ? "#d1fae5"
          : "#f3f4f6"
      }; color: ${
        statusClass === "pending"
          ? "#d97706"
          : statusClass === "answered"
          ? "#059669"
          : "#6b7280"
      };">${statusText}</span>
          </div>
        </div>
        <div class="inquiry-content" style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">
          ${inquiry.content}
        </div>
        <div class="inquiry-meta" style="font-size: 12px; color: #6b7280;">
          문의자: ${inquirerName}
        </div>
                 ${
                   inquiry.admin_response
                     ? `
                   <div class="admin-response" style="margin-top: 12px; padding: 12px; background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 6px 6px 0;">
                     <div style="font-weight: 600; color: #0c4a6e; margin-bottom: 4px;">관리자 답변:</div>
                     <div style="color: #0c4a6e; line-height: 1.5;">${
                       inquiry.admin_response
                     }</div>
                     ${
                       inquiry.responded_at
                         ? `
                       <div style="font-size: 11px; color: #0369a1; margin-top: 8px;">
                         답변일: ${new Date(
                           inquiry.responded_at
                         ).toLocaleDateString("ko-KR", {
                           year: "numeric",
                           month: "2-digit",
                           day: "2-digit",
                           hour: "2-digit",
                           minute: "2-digit",
                         })}
                       </div>
                     `
                         : ""
                     }
                   </div>
                 `
                     : `
                   <div class="admin-response-form" style="margin-top: 12px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                     <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">관리자 답변:</div>
                     <textarea 
                       id="adminResponse_${inquiry.id}" 
                       placeholder="답변을 입력해주세요..."
                       style="width: 100%; min-height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical; font-family: inherit;"
                     ></textarea>
                     <div style="margin-top: 8px; text-align: right;">
                       <button 
                         onclick="submitAdminResponse('${inquiry.id}')"
                         style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
                       >
                         답변 등록
                       </button>
                     </div>
                   </div>
                 `
                 }
      </div>
    `;
    })
    .join("");

  inquiryListDiv.innerHTML = inquiriesHtml;
}

// 관리자 답변 제출 함수
async function submitAdminResponse(inquiryId) {
  const responseTextarea = document.getElementById(
    `adminResponse_${inquiryId}`
  );
  if (!responseTextarea) {
    console.error("답변 입력 필드를 찾을 수 없습니다.");
    return;
  }

  const adminResponse = responseTextarea.value.trim();
  if (!adminResponse) {
    alert("답변 내용을 입력해주세요.");
    return;
  }

  // 현재 모달에서 캠페인 ID 가져오기
  let modal = document.querySelector(".campaign-detail-modal");
  if (!modal) {
    // 다른 모달 선택자들도 시도해보기
    modal = document.querySelector("#campaignDetailModal");
    if (!modal) {
      modal = document.querySelector(".modal");
    }
  }

  console.log("찾은 모달:", modal);
  console.log("모달 클래스:", modal?.className);
  console.log("모달 ID:", modal?.id);

  if (!modal) {
    console.error("모달을 찾을 수 없습니다.");
    // 모달이 없으면 현재 열려있는 모달을 찾아보기
    const allModals = document.querySelectorAll('[class*="modal"]');
    console.log("사용 가능한 모달들:", allModals);
    return;
  }

  const campaignId = modal.getAttribute("data-campaign-id");
  console.log("모달에서 가져온 캠페인 ID:", campaignId);
  console.log("모달의 모든 속성들:", modal.attributes);

  if (!campaignId) {
    console.error("캠페인 ID를 찾을 수 없습니다.");
    return;
  }

  try {
    console.log("=== 관리자 답변 제출 시작 ===");
    console.log("캠페인 ID:", campaignId);
    console.log("문의 ID:", inquiryId);
    console.log("답변 내용:", adminResponse);

    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/inquiries/${inquiryId}/respond`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...adminHeaders(),
        },
        body: JSON.stringify({
          admin_response: adminResponse,
        }),
      }
    );

    const result = await response.json();
    console.log("답변 제출 결과:", result);

    if (response.ok && result.success) {
      alert("답변이 등록되었습니다.");

      // 문의 목록 다시 로드
      await loadInquiryData(campaignId);
    } else {
      console.error("답변 제출 실패:", result);
      alert("답변 등록에 실패했습니다: " + (result.error || "알 수 없는 오류"));
    }
  } catch (error) {
    console.error("답변 제출 중 오류:", error);
    alert("답변 제출 중 오류가 발생했습니다: " + error.message);
  }
}

window.searchCampaigns = searchCampaigns;
window.resetSearch = resetSearch;
window.showCampaignDetailModal = showCampaignDetailModal;
window.closeCampaignDetailModal = closeCampaignDetailModal;
window.submitAdminResponse = submitAdminResponse;
window.approveCampaign = approveCampaign;
window.showShippingUploadModal = showShippingUploadModal;
window.closeShippingUploadModal = closeShippingUploadModal;
window.handleFileDrop = handleFileDrop;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleFileSelect = handleFileSelect;
window.handleShippingUpload = handleShippingUpload;
window.downloadExcel = downloadExcel;
window.filterAndDisplayCampaigns = filterAndDisplayCampaigns;
window.filterByStat = filterByStat;
window.filterByCompanyType = filterByCompanyType;
window.initCampaignApprovalComponent = initCampaignApprovalComponent;
window.showCampaignScheduleModal = showCampaignScheduleModal;
window.closeCampaignScheduleModal = closeCampaignScheduleModal;
window.validateDateRange = validateDateRange;
window.handleCampaignScheduleSubmit = handleCampaignScheduleSubmit;
window.createScheduleUpdateNotification = createScheduleUpdateNotification;

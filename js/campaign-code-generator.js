/**
 * 캠페인 코드 자동 생성 유틸리티
 * 목적: 파트너사 코드 + 날짜 + 순번으로 고유한 캠페인 코드 생성
 */

// 캠페인 코드 생성 함수
async function generateCampaignCode(partnerCode) {
  try {
    // 현재 날짜를 MMDD 형식으로 변환
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateString = month + day;

    // 파트너사 코드에서 숫자 부분 추출 (예: AC31 -> 31)
    const partnerNumber = partnerCode.replace(/\D/g, "");

    // 오늘 날짜의 기존 캠페인 수 조회
    const today = now.toISOString().split("T")[0];
    const response = await fetch(
      `/api/admin/campaigns/count?date=${today}&partner=${partnerCode}`
    );
    const data = await response.json();

    let sequenceNumber = 1;
    if (data.success && data.count > 0) {
      sequenceNumber = data.count + 1;
    }

    // 캠페인 코드 생성: 파트너사코드 + 날짜 + 순번 (구조화된 형태)
    // 예: AC31-0927-1 -> AC3109271
    const campaignCode = `${partnerCode}${dateString}${sequenceNumber}`;

    return {
      success: true,
      code: campaignCode,
      displayCode: formatDisplayCode(
        campaignCode,
        partnerCode,
        dateString,
        sequenceNumber
      ),
    };
  } catch (error) {
    console.error("캠페인 코드 생성 오류:", error);
    return {
      success: false,
      error: "캠페인 코드 생성에 실패했습니다.",
    };
  }
}

// 표시용 캠페인 코드 포맷팅 (AC3109271)
function formatDisplayCode(fullCode, partnerCode, dateString, sequenceNumber) {
  return fullCode; // 구조화된 코드를 그대로 반환
}

// 캠페인 코드 유효성 검사
function validateCampaignCode(code) {
  // 구조화된 패턴: AC + 숫자(1-2자리) + 날짜(MMDD) + 순번(1자리)
  // 예: AC3109271
  const pattern = /^AC\d{1,2}\d{4}\d$/;
  return pattern.test(code);
}

// 캠페인 코드에서 정보 추출
function parseCampaignCode(code) {
  if (!validateCampaignCode(code)) {
    return null;
  }

  // 구조화된 코드 파싱: AC + 숫자 + 날짜 + 순번
  // 예: AC3109271 -> AC31, 0927, 1
  const match = code.match(/^(AC)(\d{1,2})(\d{4})(\d)$/);
  if (!match) return null;

  const [, prefix, partnerNumber, dateString, sequenceNumber] = match;
  const partnerCode = prefix + partnerNumber;

  return {
    partnerCode,
    partnerNumber: parseInt(partnerNumber),
    dateString,
    sequenceNumber: parseInt(sequenceNumber),
    month: dateString.substring(0, 2),
    day: dateString.substring(2, 4),
    fullCode: code,
  };
}

// 파트너사 코드 목록 가져오기
async function getPartnerCodes() {
  try {
    const response = await fetch("/api/admin/partner-codes");
    const data = await response.json();

    if (data.success) {
      return data.codes.map((code) => ({
        value: code.code,
        label: `${code.code} - ${code.memo || "메모 없음"}`,
      }));
    }

    return [];
  } catch (error) {
    console.error("파트너사 코드 조회 오류:", error);
    return [];
  }
}

// 캠페인 생성 시 코드 자동 생성
async function createCampaignWithCode(campaignData) {
  try {
    // 캠페인 코드 생성
    const codeResult = await generateCampaignCode(campaignData.partnerCode);

    if (!codeResult.success) {
      throw new Error(codeResult.error);
    }

    // 캠페인 데이터에 코드 추가
    const campaignWithCode = {
      ...campaignData,
      campaign_code: codeResult.code,
      display_code: codeResult.displayCode,
    };

    // 캠페인 생성 API 호출
    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(campaignWithCode),
    });

    const result = await response.json();

    if (result.success) {
      // 알림 생성
      await createNotification({
        type: "campaign",
        title: "새 캠페인 생성",
        message: `캠페인 ${codeResult.displayCode}이 생성되었습니다.`,
        related_id: result.campaign.id,
      });
    }

    return result;
  } catch (error) {
    console.error("캠페인 생성 오류:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 캠페인 코드 중복 검사
async function checkCampaignCodeExists(code) {
  try {
    const response = await fetch(
      `/api/admin/campaigns/check-code?code=${encodeURIComponent(code)}`
    );
    const data = await response.json();

    return data.exists || false;
  } catch (error) {
    console.error("캠페인 코드 중복 검사 오류:", error);
    return false;
  }
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

// 전역 함수로 등록
window.generateCampaignCode = generateCampaignCode;
window.formatDisplayCode = formatDisplayCode;
window.validateCampaignCode = validateCampaignCode;
window.parseCampaignCode = parseCampaignCode;
window.getPartnerCodes = getPartnerCodes;
window.createCampaignWithCode = createCampaignWithCode;
window.checkCampaignCodeExists = checkCampaignCodeExists;

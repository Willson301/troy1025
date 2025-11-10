let selectedCampaignType = "";
let selectedPlatform = "";
let selectedMission = "";

// 드래그앤드롭 기능
const imageUpload = document.getElementById("imageUpload");
const imageInput = document.getElementById("imageInput");

imageUpload.addEventListener("dragover", (e) => {
  e.preventDefault();
  imageUpload.classList.add("dragover");
});

imageUpload.addEventListener("dragleave", () => {
  imageUpload.classList.remove("dragover");
});

imageUpload.addEventListener("drop", (e) => {
  e.preventDefault();
  imageUpload.classList.remove("dragover");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    imageInput.files = files;
    handleImageUpload(files[0]);
  }
});

function checkShippingConditions(price) {
  if (!price || price === "") {
    return {
      isValid: false,
      message: "가격 정보 없음 - 쿠팡와우 적용가 또는 로켓무료배송 조건 미충족",
    };
  }

  const priceNum = parseInt(price.replace(/,/g, ""));

  return {
    isValid: true,
    message: `로켓무료배송 조건 충족 (${price}원)`,
  };
}

function extractCategoryFromTitle(title) {
  // 제품 카테고리 추출 로직 (세분화된 분류 체계)
  const categoryKeywords = {
    "패션의류/잡화>남성패션>속옷/잠옷>팬티": [
      "남자팬티",
      "남성팬티",
      "사각팬티",
      "남성드로즈",
      "언더웨어",
      "팬티",
    ],
    "패션의류/잡화>남성패션>속옷/잠옷>상의": [
      "남성속옷",
      "남자속옷상의",
      "런닝",
      "나시",
    ],
    "패션의류/잡화>남성패션>상의>셔츠": [
      "셔츠",
      "남성셔츠",
      "와이셔츠",
      "캐주얼셔츠",
    ],
    "패션의류/잡화>남성패션>하의>바지": [
      "바지",
      "남성바지",
      "청바지",
      "슬랙스",
      "조거팬츠",
    ],
    "패션의류/잡화>여성패션>상의>블라우스": ["블라우스", "여성상의", "셔츠"],
    "패션의류/잡화>여성패션>하의>치마": ["치마", "스커트", "원피스"],
    "뷰티>스킨케어>기초화장품": [
      "화장품",
      "스킨케어",
      "로션",
      "크림",
      "에센스",
    ],
    "뷰티>메이크업>베이스메이크업": [
      "메이크업",
      "파운데이션",
      "컨실러",
      "베이스",
    ],
    "가전제품>주방가전>조리가전": ["전자레인지", "에어프라이어", "믹서기"],
    "가전제품>생활가전>청소기": ["청소기", "로봇청소기", "무선청소기"],
    "생활용품>세제/세정제>세탁세제": ["세제", "세탁세제", "섬유유연제"],
    "생활용품>욕실용품>샴푸/린스": ["샴푸", "바디워시", "린스", "트리트먼트"],
    "식품>과자/간식>스낵": ["과자", "스낵", "간식"],
    "식품>음료>커피/차": ["음료", "커피", "차", "음료수"],
    "건강식품>영양제>종합비타민": [
      "건강식품",
      "비타민",
      "영양제",
      "건강보조식품",
    ],
  };

  // 제목에서 카테고리 찾기
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => title.includes(keyword))) {
      return category;
    }
  }

  return "기타>미분류"; // 기본값
}

function extractKeywordsFromTitle(title) {
  // 제품명에서 핵심 키워드 3개 추출
  const keywords = [];

  // 브랜드명 추출
  const brandMatch = title.match(/^[가-힣A-Za-z0-9]+/);
  if (brandMatch) {
    keywords.push(brandMatch[0]);
  }

  // 주요 제품 카테고리/특징 키워드들
  const categoryKeywords = [
    "남자팬티",
    "남성드로즈",
    "사각팬티",
    "기능성",
    "항균",
    "퀵드라이",
    "고탄력",
    "입체",
    "오달",
    "안감",
    "세트",
    "속옷",
    "언더웨어",
    "드라이",
    "쿨",
    "통기성",
    "흡습",
    "속건",
    "편안한",
    "신축성",
  ];

  // 제목에서 카테고리 키워드 찾기
  categoryKeywords.forEach((keyword) => {
    if (
      title.includes(keyword) &&
      !keywords.includes(keyword) &&
      keywords.length < 3
    ) {
      keywords.push(keyword);
    }
  });

  // 키워드가 부족하면 제목에서 의미있는 단어 추출
  if (keywords.length < 3) {
    const titleWords = title.split(/[\s,]+/).filter(
      (word) =>
        word.length >= 2 &&
        !keywords.includes(word) &&
        !word.match(/^\d+$/) && // 숫자만 있는 단어 제외
        !word.includes("종") // '10종' 같은 단어 제외
    );

    titleWords.slice(0, 3 - keywords.length).forEach((word) => {
      keywords.push(word);
    });
  }

  return keywords.slice(0, 3); // 최대 3개만 반환
}

function handleImageUpload(file) {
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imageUpload.innerHTML = `<img src="${e.target.result}" class="uploaded-image" alt="업로드된 이미지"><div class="image-upload-hint">이미지가 성공적으로 업로드되었습니다</div>`;
    };
    reader.readAsDataURL(file);
  }
}

imageInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    handleImageUpload(file);
  }
});

function selectCampaignType(card, type) {
  document
    .querySelectorAll(".campaign-type-card")
    .forEach((c) => c.classList.remove("selected"));
  // 유입형 비활성화 방어
  if (type === "delivery" || card.classList.contains("disabled")) {
    return; // 선택 무시
  }
  card.classList.add("selected");
  selectedCampaignType = type;
}

function selectPlatform(card, platform) {
  // 모든 플랫폼 카드의 선택 해제
  document
    .querySelectorAll(".platform-grid .platform-card")
    .forEach((c) => c.classList.remove("selected"));

  // 클릭한 카드만 선택
  card.classList.add("selected");
  selectedPlatform = platform;
}

function selectMission(card, mission) {
  // 모든 미션 카드의 선택 해제
  document
    .querySelectorAll(".campaign-type-grid .campaign-type-card")
    .forEach((c) => c.classList.remove("selected"));

  // 클릭한 카드만 선택
  card.classList.add("selected");
  selectedMission = mission;

  // 모든 안내문 숨김
  const rocketReviewNotice = document.getElementById("rocketReviewNotice");
  const rocketPremiumPhotoNotice = document.getElementById(
    "rocketPremiumPhotoNotice"
  );
  const fakePurchaseNotice = document.getElementById("fakePurchaseNotice");

  if (rocketReviewNotice) rocketReviewNotice.style.display = "none";
  if (rocketPremiumPhotoNotice) rocketPremiumPhotoNotice.style.display = "none";
  if (fakePurchaseNotice) fakePurchaseNotice.style.display = "none";

  // 선택한 미션에 해당하는 안내문만 표시
  if (mission === "rocket-review" && rocketReviewNotice) {
    rocketReviewNotice.style.display = "block";
  } else if (mission === "rocket-premium-photo" && rocketPremiumPhotoNotice) {
    rocketPremiumPhotoNotice.style.display = "block";
  } else if (mission === "fake-purchase" && fakePurchaseNotice) {
    fakePurchaseNotice.style.display = "block";
  }

  // 미션별 필수 항목/활성화 상태 갱신
  updateMissionFieldRequirements(mission);
}

// 라디오 그룹 활성화/필수 토글(숨겨진 required로 인한 제출 차단 방지)
function toggleRadioGroup(name, enabled, makeRequired) {
  const nodes = document.querySelectorAll(`input[name="${name}"]`);
  nodes.forEach((el) => {
    el.disabled = !enabled;
    el.required = !!makeRequired;
  });
}

function updateMissionFieldRequirements(currentMission) {
  // 기본값: 전부 비활성화 + required 해제
  toggleRadioGroup("reviewScript", false, false);
  toggleRadioGroup("reviewScriptPremium", false, false);
  toggleRadioGroup("photoProvide", false, false);
  toggleRadioGroup("reviewScriptFake", false, false);

  // 선택된 미션에 필요한 그룹만 활성화 + required 설정
  if (currentMission === "rocket-review") {
    toggleRadioGroup("reviewScript", true, true);
  } else if (currentMission === "rocket-premium-photo") {
    toggleRadioGroup("reviewScriptPremium", true, true);
    toggleRadioGroup("photoProvide", true, true);
  } else if (currentMission === "fake-purchase") {
    toggleRadioGroup("reviewScriptFake", true, true);
  }
}

function saveDraft() {
  alert("임시저장되었습니다.");
}

document
  .getElementById("campaignForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    // 제출이 막히는 hidden required 방지: 현재 미션 기준으로 갱신
    updateMissionFieldRequirements(selectedMission);
    if (!selectedCampaignType) {
      alert("캠페인 방식을 선택해주세요.");
      return;
    }
    if (!selectedPlatform) {
      alert("리뷰플랫폼을 선택해주세요.");
      return;
    }
    if (!selectedMission) {
      alert("체험단미션을 선택해주세요.");
      return;
    }

    // 캠페인 데이터 수집 및 저장
    saveCampaignData();
  });

function saveCampaignData() {
  // 폼 데이터 수집
  const campaignData = {
    id: Date.now(), // 임시 ID
    timestamp: new Date().toISOString(),

    // 기본 정보
    productUrl: document.getElementById("productUrl")?.value || "",
    productTitle: document.getElementById("productTitle")?.value || "",
    productPrice: document.getElementById("productPrice")?.value || "",
    brandName: document.getElementById("brandName")?.value || "",
    productCategory: document.getElementById("productCategory")?.value || "",

    // 이미지 정보
    mainImage: getUploadedImageData(),

    // 캠페인 설정
    campaignType: selectedCampaignType,
    platform: selectedPlatform,
    mission: selectedMission,

    // 수량 및 기간
    quantity: document.getElementById("inflowQuantity")?.value || "100",
    startDate: document.getElementById("startDate")?.value || "",
    endDate: document.getElementById("endDate")?.value || "",

    // 키워드
    keywords:
      document.querySelector('input[placeholder="검색키워드를 입력해주세요"]')
        ?.value || "",
    hashtagKeywords: document.getElementById("keywordHashtags")?.value || "",

    // 옵션 설정
    selectedOptions: getSelectedOptions(),

    // 견적 정보
    estimate: getCurrentEstimate(),

    // 상태
    status: "pending", // 승인대기

    // 요청사항
    requirements: document.querySelector(".form-textarea")?.value || "",
  };

  // 서버(Supabase)로 저장
  submitCampaignToServer(campaignData);

  // 캠페인 등록 알림 생성
  if (typeof createCampaignRegistrationNotification === "function") {
    const notificationData = {
      user_name: "사용자", // 실제로는 로그인한 사용자 정보
      company: "회사명", // 실제로는 사용자 회사 정보
      user_type: "고객사", // 실제로는 사용자 타입
      campaign_name: campaignData.productTitle,
      campaign_id: `CAMP-${campaignData.id}`,
      amount: parseInt(campaignData.estimate?.total || 0),
      type: campaignData.campaignType,
      status: "pending",
    };
    createCampaignRegistrationNotification(notificationData);
  }

  // 저장 결과는 submitCampaignToServer에서 처리
}

// Supabase에 캠페인 저장
async function submitCampaignToServer(campaignData) {
  try {
    // 우선순위: 현재 역할 토큰(파트너/대행사/고객) → 어드민 토큰
    function pickAnyRoleToken() {
      const roles = ["partner", "agency", "customer"]; // 파트너 우선
      for (const role of roles) {
        try {
          const t =
            (typeof getRoleSessionToken === "function" &&
              getRoleSessionToken(role)) ||
            sessionStorage.getItem(`troy_token_${role}`) ||
            localStorage.getItem(`troy_token_${role}`);
          if (t && t.trim() !== "") return t;
        } catch (_) {}
      }
      return "";
    }

    const adminToken =
      (typeof getRoleSessionToken === "function" &&
        getRoleSessionToken("admin")) ||
      localStorage.getItem("troy_token_admin") ||
      "";
    const roleToken = pickAnyRoleToken();

    // 백엔드 요구 필드로 매핑
    const parsedPrice =
      parseInt(
        (campaignData.productPrice || "0").toString().replace(/,/g, "")
      ) || 0;
    const quantityNum = parseInt(campaignData.quantity || 0) || 0;
    const missionToService = (mission) => {
      if (mission === "rocket-review") return "로켓배송 구매평";
      if (mission === "rocket-premium-photo") return "로켓배송 포토 구매평";
      if (mission === "fake-purchase") return "가구매평";
      return "구매평";
    };

    const payload = {
      title: `${campaignData.brandName || ""} ${
        campaignData.productTitle || ""
      }`.trim(),
      description: campaignData.requirements || "",
      // DB 스키마 요구: campaign_type NOT NULL
      campaign_type:
        campaignData.campaignType === "product" ||
        campaignData.campaignType === "delivery" ||
        campaignData.campaignType === "traffic" ||
        campaignData.campaignType === "content"
          ? campaignData.campaignType
          : selectedMission === "fake-purchase"
          ? "traffic"
          : "product",
      platform: campaignData.platform || selectedPlatform || null,
      product_url: campaignData.productUrl || null,
      product_title: campaignData.productTitle || null,
      product_price: parsedPrice,
      brand_name: campaignData.brandName || null,
      product_category: campaignData.productCategory || null,
      target_count: quantityNum,
      partner_id: null,
      advertiser_id: null,
      budget: Number(campaignData.estimate?.totalAmount || 0),
      start_date: campaignData.startDate || null,
      end_date: campaignData.endDate || null,
      campaign_code: `C${Date.now()}`, // 고유 코드 생성 (서버 유니크 제약 충족)
      // 자유 필드는 requirements JSONB로 저장
      requirements: {
        main_image: campaignData.mainImage || null,
        services: [missionToService(campaignData.mission)],
        selected_mission: campaignData.mission,
        tax_invoice: !!campaignData.selectedOptions?.taxInvoice,
        selected_options: campaignData.selectedOptions || {},
        keywords: campaignData.keywords || "",
        hashtag_keywords: campaignData.hashtagKeywords || "",
        estimate: {
          productCost: campaignData.estimate?.productCost || 0,
          campaignCost: campaignData.estimate?.campaignCost || 0,
          photoCost: campaignData.estimate?.photoCost || 0,
          slotCost: campaignData.estimate?.slotCost || 0,
          taxIncluded: !!campaignData.estimate?.taxIncluded,
          totalAmount: campaignData.estimate?.totalAmount || 0,
        },
      },
    };

    // 현재 로그인 사용자(agency/customer/partner) ID 해석
    async function resolveCurrentUserId() {
      try {
        if (window.SUPABASE_USER_ID) return window.SUPABASE_USER_ID;
        const roles = ["agency", "customer", "partner"];
        for (const role of roles) {
          let tk = "";
          try {
            if (typeof getRoleSessionToken === "function") {
              tk = getRoleSessionToken(role) || "";
            }
          } catch (_) {}
          if (!tk) {
            try {
              tk =
                sessionStorage.getItem(`troy_token_${role}`) ||
                localStorage.getItem(`troy_token_${role}`) ||
                "";
            } catch (_) {}
          }
          if (!tk) continue;
          const pr = await fetch("/api/auth/profile", {
            headers: { Authorization: `Bearer ${tk}` },
          });
          if (pr.ok) {
            const pj = await pr.json();
            const uid = pj?.user?.id;
            if (uid) return uid;
          }
        }
      } catch (_) {}
      return null;
    }

    const ownerUserId = await resolveCurrentUserId();

    // 파트너/대행사/고객은 공용 엔드포인트 사용, 어드민만 관리자 엔드포인트 사용
    const useAdmin = !!adminToken && !roleToken;
    const endpoint = useAdmin ? "/api/admin/campaigns" : "/api/auth/campaigns";
    const authToken = useAdmin ? adminToken : roleToken;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        ...payload,
        // 소유자(생성자) 지정: 고객/대행사/파트너 로그인 사용자 우선 (관리자 경로에서만 사용)
        ...(useAdmin ? { owner_user_id: ownerUserId } : {}),
      }),
    });

    const text = await res.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (_) {
      result = { success: false, raw: text };
    }

    if (!res.ok || result?.error) {
      console.error("[campaign-create] server error:", result);
      const msg =
        result?.supabase?.message ||
        result?.error ||
        result?.message ||
        res.statusText ||
        res.status;
      const detail = result?.supabase?.details || result?.supabase?.hint || "";
      alert(`캠페인 저장 실패: ${msg}${detail ? "\n" + detail : ""}`);
      return;
    }

    // 비동기 저장 성공: 메시지 표시 후 모달 닫기 (페이지 리로드 없음)
    alert("등록이 완료되었습니다.");
    try {
      // 임베디드로 열렸다면 부모 창의 모달을 닫고, 역할별 리스트 새로고침
      if (
        isEmbedded() &&
        window.parent &&
        typeof window.parent.closeCampaignCreateModal === "function"
      ) {
        window.parent.closeCampaignCreateModal();
        if (typeof window.parent.loadPartnerCampaignManagement === "function") {
          window.parent.loadPartnerCampaignManagement();
        } else if (typeof window.parent.loadCampaignManagement === "function") {
          window.parent.loadCampaignManagement();
        } else if (typeof window.parent.loadCampaignApproval === "function") {
          window.parent.loadCampaignApproval();
        } else if (typeof window.parent.loadCustomerCampaign === "function") {
          window.parent.loadCustomerCampaign();
        }
      }
    } catch (_) {}
  } catch (e) {
    console.error("[campaign-create] submit error", e);
    alert("캠페인 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
}

function isEmbedded() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("embedded") === "1") return true;
  } catch (_) {}
  return window.self !== window.top;
}

function getUploadedImageData() {
  const uploadedImg = document.querySelector(".uploaded-image");
  if (uploadedImg) {
    return {
      src: uploadedImg.src,
      name: "uploaded-image",
      type: "image",
    };
  }
  return null;
}

function getSelectedOptions() {
  const options = {};

  // 구매평 원고 옵션
  const reviewOption =
    document.querySelector('input[name="reviewScript"]:checked') ||
    document.querySelector('input[name="reviewScriptPremium"]:checked') ||
    document.querySelector('input[name="reviewScriptFake"]:checked');
  if (reviewOption) {
    options.reviewScript = reviewOption.value;
  }

  // 사진 제공 옵션 (포토구매평용)
  const photoOption = document.querySelector(
    'input[name="photoProvide"]:checked'
  );
  if (photoOption) {
    options.photoProvide = photoOption.value;
  }

  // 트로이 슬롯 추가
  options.slotAdded = isSlotAdded;

  // 세금계산서 발행
  const taxInvoice = document.getElementById("taxInvoiceCheck");
  options.taxInvoice = taxInvoice ? taxInvoice.checked : false;

  return options;
}

function getCurrentEstimate() {
  const totalElement = document.getElementById("totalEstimate");
  const totalAmount = totalElement
    ? totalElement.textContent.replace(/[^\d]/g, "")
    : "0";

  return {
    totalAmount: parseInt(totalAmount) || 0,
    productCost: window.lastProductCost || 0,
    campaignCost: window.lastCampaignCost || 0,
    photoCost: window.currentPhotoCost || 0,
    slotCost: isSlotAdded ? 80000 : 0,
    taxIncluded: document.getElementById("taxInvoiceCheck")?.checked || false,
  };
}

function saveCampaignToStorage(campaignData) {
  // 기존 캠페인 목록 가져오기
  let campaigns = JSON.parse(localStorage.getItem("troyCampaigns") || "[]");

  // 새 캠페인 추가
  campaigns.push(campaignData);

  // 저장
  localStorage.setItem("troyCampaigns", JSON.stringify(campaigns));

  console.log("Campaign saved:", campaignData);
}

function adjustQuantity(inputId, change) {
  const input = document.getElementById(inputId);
  const currentValue = parseInt(input.value) || 0;
  const min = parseInt(input.min) || 100;
  const max = parseInt(input.max) || 1000;
  const step = parseInt(input.step) || 50;

  let newValue = currentValue + change;

  // 50 단위로 반올림
  newValue = Math.round(newValue / step) * step;

  // 최소값과 최대값 범위 내로 제한
  newValue = Math.min(max, Math.max(min, newValue));

  input.value = newValue;

  // 가구매평 가격 업데이트
  if (inputId === "inflowQuantity") {
    updateFakeReviewPriceOnQuantityChange();
  }

  // 견적 업데이트
  calculateEstimate();
}

function adjustProductPrice(change) {
  const input = document.getElementById("productPrice");
  const currentValue = parseInt(input.value.replace(/,/g, "")) || 0;
  const min = 0;
  const max = 1000000;
  const step = 1000;

  let newValue = currentValue + change;

  // 1000원 단위로 반올림
  newValue = Math.round(newValue / step) * step;

  // 최소값과 최대값 범위 내로 제한
  newValue = Math.min(max, Math.max(min, newValue));

  // 콤마 추가하여 표시
  input.value = newValue.toLocaleString();

  // 견적 업데이트
  calculateEstimate();
}

// 가구매평 가격 변경 함수
function updateFakeReviewPrice() {
  const reviewScriptRadios = document.querySelectorAll(
    'input[name="reviewScriptFake"]'
  );
  const priceElement = document.getElementById("fakeReviewPrice");
  const inflowQuantityInput = document.getElementById("inflowQuantity");

  if (priceElement && inflowQuantityInput) {
    const quantity = parseInt(inflowQuantityInput.value) || 0;
    const isDiscountApplied = quantity >= 200;

    reviewScriptRadios.forEach((radio) => {
      if (radio.checked) {
        if (radio.value === "provide") {
          priceElement.textContent = isDiscountApplied
            ? "1건당 ₩3,000"
            : "1건당 ₩3,500";
        } else if (radio.value === "notProvide") {
          priceElement.textContent = isDiscountApplied
            ? "1건당 ₩3,500"
            : "1건당 ₩4,000";
        }
      }
    });

    // 옵션이 선택되지 않은 경우 기본값 표시
    if (!document.querySelector('input[name="reviewScriptFake"]:checked')) {
      priceElement.textContent = isDiscountApplied
        ? "1건당 ₩3,000"
        : "1건당 ₩3,500";
    }
  }
}

// 수량 변경 시 가구매평 가격 업데이트
function updateFakeReviewPriceOnQuantityChange() {
  const inflowQuantityInput = document.getElementById("inflowQuantity");
  const quantity = parseInt(inflowQuantityInput.value) || 0;
  const isDiscountApplied = quantity >= 200;

  // 옵션 가격 표시 업데이트
  const fakeReviewOptions = document.querySelectorAll(
    'input[name="reviewScriptFake"]'
  );
  fakeReviewOptions.forEach((radio) => {
    const label = radio.closest("label");
    const priceSpan = label.querySelector("span");
    if (radio.value === "provide") {
      priceSpan.textContent = isDiscountApplied ? "(₩3,000)" : "(₩3,500)";
    } else if (radio.value === "notProvide") {
      priceSpan.textContent = isDiscountApplied ? "(₩3,500)" : "(₩4,000)";
    }
  });

  // 가격 안내 박스 업데이트
  updateFakeReviewPrice();
}

// 날짜 범위 유효성 검사
document.addEventListener("DOMContentLoaded", function () {
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  if (startDate && endDate) {
    startDate.addEventListener("change", function () {
      if (startDate.value) {
        endDate.min = startDate.value;
        if (endDate.value && endDate.value < startDate.value) {
          endDate.value = startDate.value;
        }
      }
    });

    endDate.addEventListener("change", function () {
      if (startDate.value && endDate.value && endDate.value < startDate.value) {
        alert("마감일은 시작일 이후로 선택해주세요.");
        endDate.value = startDate.value;
      }
    });
  }

  // 가구매평 가격 변경 이벤트 리스너 추가
  const reviewScriptFakeRadios = document.querySelectorAll(
    'input[name="reviewScriptFake"]'
  );
  reviewScriptFakeRadios.forEach((radio) => {
    radio.addEventListener("change", updateFakeReviewPrice);
  });

  // 유입 수량 변경 시 가구매평 가격 업데이트
  const inflowQuantityInput = document.getElementById("inflowQuantity");
  if (inflowQuantityInput) {
    inflowQuantityInput.addEventListener(
      "input",
      updateFakeReviewPriceOnQuantityChange
    );
    inflowQuantityInput.addEventListener(
      "change",
      updateFakeReviewPriceOnQuantityChange
    );
    // 페이지 로드 시 초기 가격 설정
    updateFakeReviewPriceOnQuantityChange();
  }

  // 견적 계산 관련 이벤트 리스너
  setupEstimateCalculation();

  // 초기 로드시 모든 라디오 required 해제 및 비활성화(미션 선택 전 제출 차단 방지)
  updateMissionFieldRequirements(selectedMission || "");
});

function setupEstimateCalculation() {
  // 제품 가격 변경 시
  const productPriceInput = document.getElementById("productPrice");
  if (productPriceInput) {
    productPriceInput.addEventListener("input", calculateEstimate);
  }

  // 유입 수량 변경 시
  const inflowQuantityInput = document.getElementById("inflowQuantity");
  if (inflowQuantityInput) {
    inflowQuantityInput.addEventListener("input", calculateEstimate);
  }

  // 캠페인 방식 선택 시
  const campaignCards = document.querySelectorAll(".campaign-type-card");
  campaignCards.forEach((card) => {
    card.addEventListener("click", () => {
      setTimeout(calculateEstimate, 100); // 선택 완료 후 계산
    });
  });

  // 옵션 변경 시
  const optionRadios = document.querySelectorAll('input[type="radio"]');
  optionRadios.forEach((radio) => {
    radio.addEventListener("change", calculateEstimate);
  });
}

let isSlotAdded = false;

function toggleSlot() {
  const btn = document.getElementById("addSlotBtn");
  const slotCostElement = document.getElementById("slotCost");

  isSlotAdded = !isSlotAdded;

  if (isSlotAdded) {
    btn.textContent = "슬롯 제거하기";
    btn.style.background = "#dc3545";
    slotCostElement.textContent = "월 ₩80,000";
  } else {
    btn.textContent = "슬롯 추가하기";
    btn.style.background = "#007bff";
    slotCostElement.textContent = "₩0";
  }

  calculateEstimate();
}

function calculateEstimate() {
  const productPrice =
    parseInt(
      (document.getElementById("productPrice")?.value || "0").replace(/,/g, "")
    ) || 0;
  const quantity =
    parseInt(document.getElementById("inflowQuantity")?.value || "0") || 0;

  // 제품 비용 계산
  const productCost = productPrice * quantity;

  // 캠페인 비용 계산
  let campaignCost = 0;
  let campaignDetails = "";
  let serviceName = "캠페인 비용";

  if (selectedMission === "rocket-review") {
    // 로켓배송 구매평
    serviceName = "로켓배송 캠페인";
    const reviewOption = document.querySelector(
      'input[name="reviewScript"]:checked'
    );
    if (reviewOption) {
      campaignCost =
        reviewOption.value === "provide" ? 3000 * quantity : 3500 * quantity;
      campaignDetails = `로켓배송 구매평: ${
        reviewOption.value === "provide" ? "원고제공" : "원고미제공"
      } (${quantity}건)`;
    }
  } else if (selectedMission === "rocket-premium-photo") {
    // 로켓배송 포토구매평
    serviceName = "구매평 원고";
    const reviewOption = document.querySelector(
      'input[name="reviewScriptPremium"]:checked'
    );
    const photoOption = document.querySelector(
      'input[name="photoProvide"]:checked'
    );

    let reviewCost = 0;
    let photoCost = 0;

    if (reviewOption) {
      reviewCost =
        reviewOption.value === "provide" ? 3000 * quantity : 3500 * quantity;
    }
    if (photoOption) {
      photoCost =
        photoOption.value === "provide" ? 1000 * quantity : 3000 * quantity;
    }

    campaignCost = reviewCost; // 구매평 원고 비용만
    campaignDetails = `구매평 원고: ${
      reviewOption?.value === "provide" ? "제공" : "미제공"
    } (${quantity}건)`;

    // 사진 비용 정보 저장 (별도 표시용)
    window.currentPhotoCost = photoCost;
    window.currentPhotoDetails = `사진 ${
      photoOption?.value === "provide" ? "제공" : "미제공"
    } (${quantity}건)`;
  } else if (selectedMission === "fake-purchase") {
    // 가구매평
    serviceName = "가구매 캠페인";
    const fakeReviewOption = document.querySelector(
      'input[name="reviewScriptFake"]:checked'
    );
    if (fakeReviewOption) {
      const isDiscounted = quantity >= 200;
      const unitPrice =
        fakeReviewOption.value === "provide"
          ? isDiscounted
            ? 3000
            : 3500
          : isDiscounted
          ? 3500
          : 4000;

      campaignCost = unitPrice * quantity;
      campaignDetails = `가구매평: ${
        fakeReviewOption.value === "provide" ? "원고제공" : "원고미제공"
      } ${isDiscounted ? "(할인적용)" : ""} (${quantity}건)`;
    }
  }

  // 슬롯 비용 추가
  const slotCost = isSlotAdded ? 80000 : 0;

  // 포토구매평인 경우 사진 비용 별도 계산
  const photoCost = window.currentPhotoCost || 0;
  let totalEstimate = productCost + campaignCost + photoCost + slotCost;

  // 세금계산서 발행 시 10% 추가
  const taxInvoiceCheck = document.getElementById("taxInvoiceCheck");
  const isTaxInvoice = taxInvoiceCheck ? taxInvoiceCheck.checked : false;
  if (isTaxInvoice) {
    totalEstimate = Math.round(totalEstimate * 1.1);
  }

  // UI 업데이트
  updateEstimateDisplay(
    productCost,
    campaignCost,
    photoCost,
    slotCost,
    totalEstimate,
    campaignDetails,
    serviceName,
    isTaxInvoice
  );
}

function updateEstimateDisplay(
  productCost,
  campaignCost,
  photoCost,
  slotCost,
  totalEstimate,
  details,
  serviceName,
  isTaxInvoice
) {
  const productCostElement = document.getElementById("productCost");
  const campaignCostElement = document.getElementById("campaignCost");
  const campaignServiceNameElement = document.getElementById(
    "campaignServiceName"
  );
  const photoCostElement = document.getElementById("photoCost");
  const photoCostSection = document.getElementById("photoCostSection");
  const totalEstimateElement = document.getElementById("totalEstimate");
  const estimateDetailsElement = document.getElementById("estimateDetails");

  const productPrice =
    parseInt(
      (document.getElementById("productPrice")?.value || "0").replace(/,/g, "")
    ) || 0;
  const quantity =
    parseInt(document.getElementById("inflowQuantity")?.value || "0") || 0;

  // 서비스명 업데이트
  if (campaignServiceNameElement) {
    campaignServiceNameElement.textContent = serviceName || "캠페인 비용";
  }

  if (productCostElement) {
    if (productPrice > 0 && quantity > 0) {
      productCostElement.textContent = `₩${productPrice.toLocaleString()} × ${quantity}건 = ₩${productCost.toLocaleString()}`;
    } else {
      productCostElement.textContent = `₩${productCost.toLocaleString()}`;
    }
  }

  if (campaignCostElement) {
    if (quantity > 0 && campaignCost > 0) {
      const unitPrice = Math.round(campaignCost / quantity);
      campaignCostElement.textContent = `₩${unitPrice.toLocaleString()} × ${quantity}건 = ₩${campaignCost.toLocaleString()}`;
    } else {
      campaignCostElement.textContent = `₩${campaignCost.toLocaleString()}`;
    }
  }

  // 사진 비용 섹션 표시/숨김
  if (photoCostSection) {
    if (photoCost > 0) {
      photoCostSection.style.display = "flex";
      if (photoCostElement && quantity > 0) {
        const photoUnitPrice = Math.round(photoCost / quantity);
        photoCostElement.textContent = `₩${photoUnitPrice.toLocaleString()} × ${quantity}건 = ₩${photoCost.toLocaleString()}`;
      }
    } else {
      photoCostSection.style.display = "none";
    }
  }

  if (totalEstimateElement) {
    totalEstimateElement.textContent = `₩${totalEstimate.toLocaleString()}`;
  }

  if (estimateDetailsElement) {
    if (totalEstimate > 0) {
      let detailsText = details || "견적이 계산되었습니다.";
      if (window.currentPhotoDetails && photoCost > 0) {
        detailsText += `<br>${window.currentPhotoDetails}`;
      }
      if (slotCost > 0) {
        detailsText += `<br>트로이 슬롯: 월 ₩${slotCost.toLocaleString()} 추가`;
      }
      if (isTaxInvoice) {
        const baseAmount = productCost + campaignCost + photoCost + slotCost;
        const vatAmount = Math.round(baseAmount * 0.1);
        detailsText += `<br>부가세(VAT 10%): ₩${vatAmount.toLocaleString()}`;
      }
      estimateDetailsElement.innerHTML = detailsText;
      estimateDetailsElement.style.background = "#e8f5e8";
      estimateDetailsElement.style.color = "#2e7d32";
    } else {
      estimateDetailsElement.innerHTML =
        "견적을 확인하려면 제품가격, 수량, 캠페인 방식을 선택해주세요.";
      estimateDetailsElement.style.background = "#e3f2fd";
      estimateDetailsElement.style.color = "#1976d2";
    }
  }
}

function payWithBankTransfer() {
  showBankTransferModal();
}

// 계좌이체 결제 모달 표시
function showBankTransferModal() {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById("bankTransferModal");
  if (existingModal) {
    existingModal.remove();
  }

  // 모달 생성
  const modal = document.createElement("div");
  modal.id = "bankTransferModal";
  modal.className = "modal";
  modal.style.cssText =
    "display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  // 실제 견적 총액 불러오기 (UI의 총 견적 금액을 우선 사용)
  const estimate = (typeof getCurrentEstimate === "function"
    ? getCurrentEstimate()
    : { totalAmount: 0 }) || { totalAmount: 0 };
  const totalAmount = Number(estimate.totalAmount || 0);
  const totalAmountText = `₩${(isNaN(totalAmount)
    ? 0
    : totalAmount
  ).toLocaleString()}`;

  modal.innerHTML = `
    <div class="modal-content" style="background-color: white; margin: 5% auto; padding: 32px; border-radius: 16px; width: 95%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <h2 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 700;">계좌이체 결제</h2>
        <span class="close" onclick="closeBankTransferModal()" style="font-size: 28px; cursor: pointer; color: #6b7280; font-weight: bold;">&times;</span>
      </div>
      
      <div class="modal-body">
        <!-- 강조된 안내 문구 -->
        <div class="alert-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 24px; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -10px; right: -10px; font-size: 40px; opacity: 0.3;">⚠️</div>
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="font-size: 24px; margin-top: 2px;">⚠️</div>
            <div>
              <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 18px; font-weight: 700;">중요 안내</h3>
              <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600; line-height: 1.5;">
                <strong>반드시 가입자 이름으로 송금해주세요.</strong><br>
                입금자명이 다를 경우 결제 확인이 지연될 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <!-- 계좌 정보 -->
        <div class="account-info" style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">입금 계좌 정보</h3>
          <div class="account-details" style="display: grid; gap: 12px;">
            <div class="account-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">은행명</span>
              <span style="font-weight: 700; color: #1e293b;">카카오뱅크</span>
            </div>
            <div class="account-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">계좌번호</span>
              <span style="font-weight: 700; color: #1e293b; font-family: monospace;">3333-33-5686993</span>
            </div>
            <div class="account-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">예금주</span>
              <span style="font-weight: 700; color: #1e293b;">이원섭</span>
            </div>
          </div>
        </div>

        <!-- 결제 금액 -->
        <div class="payment-amount" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px; font-weight: 600;">결제 금액</h3>
          <div style="font-size: 28px; font-weight: 800; color: #1e40af;">${totalAmountText}</div>
        </div>

        <!-- 추가 안내 -->
        <div class="additional-info" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px;">
          <h4 style="margin: 0 0 8px 0; color: #0369a1; font-size: 14px; font-weight: 600;">📋 결제 안내</h4>
          <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.6;">
            <li>입금 후 영업일 기준 1-2일 내에 결제가 확인됩니다</li>
            <li>입금자명과 가입자명이 일치해야 합니다</li>
            <li>결제 확인 후 캠페인이 진행됩니다</li>
            <li>문의사항은 1:1 문의를 이용해주세요</li>
          </ul>
        </div>
      </div>
      
      <div class="modal-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <button onclick="closeBankTransferModal()" style="padding: 12px 24px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;">닫기</button>
        <button onclick="copyAccountInfo()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;">계좌번호 복사</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 모달 외부 클릭 시 닫기
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeBankTransferModal();
    }
  });
}

// 계좌이체 모달 닫기
function closeBankTransferModal() {
  const modal = document.getElementById("bankTransferModal");
  if (modal) {
    modal.remove();
  }
}

// 계좌번호 복사 기능
function copyAccountInfo() {
  const accountInfo = `은행명: 카카오뱅크\n계좌번호: 3333-33-5686993\n예금주: 이원섭\n\n※ 반드시 가입자 이름으로 송금해주세요.`;

  navigator.clipboard
    .writeText(accountInfo)
    .then(() => {
      // 복사 성공 알림
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = "복사완료!";
      button.style.background = "#10b981";

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = "#3b82f6";
      }, 2000);
    })
    .catch(() => {
      alert("계좌 정보를 복사할 수 없습니다. 수동으로 복사해주세요.");
    });
}

// 전역 함수 등록
window.payWithBankTransfer = payWithBankTransfer;
window.showBankTransferModal = showBankTransferModal;
window.closeBankTransferModal = closeBankTransferModal;
window.copyAccountInfo = copyAccountInfo;

// 대시보드로 돌아가기 함수
function goBackToDashboard() {
  // URL 파라미터를 통해 어디서 왔는지 확인
  const urlParams = new URLSearchParams(window.location.search);
  const from = urlParams.get("from");

  console.log("From parameter:", from); // 디버깅용

  if (from === "partner") {
    // 파트너 대시보드에서 온 경우
    console.log("Going to partner dashboard");
    window.location.href = "partner-dashboard.html";
  } else if (from === "agency") {
    // 대행사 대시보드에서 온 경우
    console.log("Going to agency dashboard");
    window.location.href = "agency-dashboard.html";
  } else {
    // 파라미터가 없으면 history.back() 시도, 실패하면 기본 대시보드로
    try {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "agency-dashboard.html";
      }
    } catch (e) {
      window.location.href = "agency-dashboard.html";
    }
  }
}

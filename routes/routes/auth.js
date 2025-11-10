const express = require("express");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";

function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
  }
}

// 캠페인 식별자(코드 또는 UUID)를 실제 UUID로 해석
async function resolveCampaignUuid(idOrCode) {
  try {
    // 1) 코드로 조회
    let row = null;
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("id")
        .eq("campaign_code", idOrCode)
        .maybeSingle();
      row = data || null;
    } catch (e) {
      console.error("Campaign code lookup error:", e);
    }

    // 2) UUID로 조회 (UUID 형식인 경우에만)
    if (!row && isValidUuid(idOrCode)) {
      try {
        const { data } = await supabase
          .from("campaigns")
          .select("id")
          .eq("id", idOrCode)
          .maybeSingle();
        row = data || null;
      } catch (e) {
        console.error("Campaign UUID lookup error:", e);
      }
    }

    return row?.id || null;
  } catch (e) {
    console.error("resolveCampaignUuid error:", e);
    return null;
  }
}

// UUID 형식 검증 함수
function isValidUuid(str) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// 스토리지 버킷 보장 (없으면 생성 시도)
async function ensureBucketExists(bucket) {
  try {
    // createBucket은 이미 존재하면 409를 반환할 수 있음 → 무시
    const opts = { public: true };
    const { error } = await supabase.storage.createBucket(bucket, opts);
    if (
      error &&
      !String(error?.message || "")
        .toLowerCase()
        .includes("exists")
    ) {
      // 다른 오류는 로깅만
      console.warn("ensureBucketExists warning:", error);
    }
  } catch (e) {
    // SDK 내부 예외는 무시 (동시성/존재 시)
  }
}

function validateUserTypeFields(userType, data) {
  const errors = [];
  if (userType === "advertiser") {
    [
      "business_number",
      "company_name",
      "manager_name",
      "phone",
      "email",
      "product_url",
    ].forEach((k) => !data[k] && errors.push(k));
  } else if (userType === "agency") {
    [
      "business_number",
      "agency_name",
      "manager_name",
      "phone",
      "email",
      "website_url",
    ].forEach((k) => !data[k] && errors.push(k));
  } else if (userType === "partner") {
    ["partner_code", "manager_name", "phone", "email", "messenger_id"].forEach(
      (k) => !data[k] && errors.push(k)
    );
  }
  return errors;
}

async function saveUserTypeData(userType, userId, data) {
  try {
    if (userType === "advertiser") {
      const { error } = await supabase.from("advertisers").insert({
        id: userId,
        business_number: data.business_number,
        company_name: data.company_name,
        manager_name: data.manager_name,
        phone: data.phone,
        email: data.email,
        product_url: data.product_url,
      });
      return error || null;
    }
    if (userType === "agency") {
      console.log("Agency data to insert:", {
        id: userId,
        business_number: data.business_number,
        agency_name: data.agency_name,
        manager_name: data.manager_name,
        phone: data.phone,
        email: data.email,
        website_url: data.website_url,
      });

      const { error } = await supabase.from("agencies").insert({
        id: userId,
        business_number: data.business_number,
        agency_name: data.agency_name,
        manager_name: data.manager_name,
        phone: data.phone,
        email: data.email,
        website_url: data.website_url,
      });

      if (error) {
        console.error("Agency insert error:", error);
      } else {
        console.log("Agency data inserted successfully");
      }

      return error || null;
    }
    if (userType === "partner") {
      // 먼저 관리자 발급 파트너 코드 확인
      let codeRow = null;
      let inviteCodeRow = null;
      let parentPartnerId = null;

      // 관리자 발급 파트너 코드 확인 (없어도 실패로 보지 않음)
      let adminCodeErr = null;
      let adminCodeRow = null;
      try {
        const { data, error } = await supabase
          .from("partner_codes")
          .select("id, is_used")
          .eq("code", data.partner_code)
          .maybeSingle();
        adminCodeRow = data || null;
        adminCodeErr = error || null;
      } catch (e) {
        adminCodeErr = e;
      }

      if (adminCodeRow && !adminCodeRow.is_used) {
        codeRow = adminCodeRow;
      } else {
        // 파트너사 발급 초대코드 확인
        try {
          const { data: partnerInviteCodeRow, error: inviteCodeErr } =
            await supabase
              .from("partner_invite_codes")
              .select("id, is_used, created_by_user_id, parent_partner_id")
              .eq("code", data.partner_code)
              .maybeSingle();
          if (
            !inviteCodeErr &&
            partnerInviteCodeRow &&
            !partnerInviteCodeRow.is_used
          ) {
            inviteCodeRow = partnerInviteCodeRow;
            parentPartnerId = partnerInviteCodeRow.parent_partner_id;
          }
          // 테이블이 없거나 기타 오류는 개발 환경에서는 무시
        } catch (_) {}
      }

      if (!codeRow && !inviteCodeRow) {
        const allowAny =
          process.env.ALLOW_ANY_PARTNER_CODE === "true" ||
          (process.env.NODE_ENV || "development") !== "production";
        if (!allowAny) {
          return { message: "유효하지 않거나 이미 사용된 파트너 코드입니다." };
        }
      }

      // 파트너사 데이터 저장 (필수 필드 우선)
      const { error } = await supabase.from("partners").insert({
        id: userId,
        partner_code: data.partner_code,
        manager_name: data.manager_name,
        phone: data.phone,
        email: data.email,
        messenger_id: data.messenger_id,
        // parent_partner_id 컬럼이 없는 스키마가 있어 저장 제외 (별도 hierarchy 테이블로 관리)
      });

      if (error) return error;

      // 선택 필드(사업자명/사업자번호)가 존재하는 경우 컬럼이 있을 때만 업데이트 시도
      try {
        const optionalUpdate = {};
        if (data.business_name)
          optionalUpdate.business_name = data.business_name;
        if (data.business_number)
          optionalUpdate.business_number = data.business_number;
        if (Object.keys(optionalUpdate).length > 0) {
          await supabase
            .from("partners")
            .update(optionalUpdate)
            .eq("id", userId);
        }
      } catch (e) {
        // 컬럼이 없는 환경일 수 있으므로 경고만 남기고 계속 진행
        console.warn(
          "Optional partner fields update skipped:",
          e?.message || e
        );
      }

      // 사용된 코드 업데이트
      try {
        if (codeRow) {
          // 관리자 발급 코드 사용 처리 (테이블이 없을 일은 거의 없지만 예외 보호)
          await supabase
            .from("partner_codes")
            .update({
              is_used: true,
              used_by: userId,
              used_at: new Date().toISOString(),
            })
            .eq("id", codeRow.id);
        } else if (inviteCodeRow) {
          // 파트너사 발급 초대코드 사용 처리 (테이블 없을 수 있어 try 보호)
          try {
            await supabase
              .from("partner_invite_codes")
              .update({
                is_used: true,
                used_by: userId,
                used_at: new Date().toISOString(),
              })
              .eq("id", inviteCodeRow.id);
          } catch (_) {}

          // 파트너사 계층 구조 저장 (옵션)
          if (parentPartnerId) {
            try {
              await supabase.from("partner_hierarchy").insert({
                parent_partner_id: parentPartnerId,
                child_partner_id: userId,
                invite_code_id: inviteCodeRow.id,
              });
            } catch (_) {}
          }
        }
      } catch (_) {}

      return null;
    }
    return { message: "지원하지 않는 userType" };
  } catch (e) {
    return { message: e.message };
  }
}

router.post("/signup", async (req, res) => {
  try {
    const { userType, username, password, ...additionalData } = req.body || {};
    if (!userType || !username || !password) {
      return res.status(400).json({
        error: "필수 필드가 누락되었습니다.",
        required: ["userType", "username", "password"],
      });
    }
    const missing = validateUserTypeFields(userType, additionalData);
    if (missing.length) {
      return res
        .status(400)
        .json({ error: "유효하지 않은 데이터입니다.", details: missing });
    }

    // 사전 중복 체크: username 중복 시 명확한 에러 반환
    try {
      const { data: existingUser } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (existingUser) {
        return res.status(409).json({ error: "이미 사용 중인 아이디입니다." });
      }
    } catch (_) {}

    const email = additionalData.email;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, user_type: userType } },
    });
    if (authError) return res.status(400).json({ error: authError.message });
    if (!authData.user)
      return res.status(400).json({ error: "사용자 생성에 실패했습니다." });

    const userId = authData.user.id;
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({ id: userId, user_type: userType, username });
    if (profileError) {
      console.warn(
        "user_profiles insert error:",
        profileError.message || profileError
      );
      await supabase.auth.admin.deleteUser(userId);
      return res.status(500).json({
        error:
          profileError?.code === "23505" ||
          (profileError?.message || "").includes("duplicate")
            ? "이미 사용 중인 아이디입니다."
            : "프로필 생성에 실패했습니다.",
        details:
          process.env.NODE_ENV !== "production"
            ? profileError.message
            : undefined,
      });
    }

    const additionalInfoError = await saveUserTypeData(
      userType,
      userId,
      additionalData
    );
    if (additionalInfoError) {
      const devMode = (process.env.NODE_ENV || "development") !== "production";
      console.warn(
        "saveUserTypeData error (" + userType + "):",
        additionalInfoError
      );
      if (!devMode) {
        await supabase.from("user_profiles").delete().eq("id", userId);
        await supabase.auth.admin.deleteUser(userId);
        return res
          .status(500)
          .json({ error: "사용자 정보 저장에 실패했습니다." });
      }
      // 개발 환경에서는 추가정보 저장 실패를 허용하고 계속 진행
    }

    const token = jwt.sign({ userId, username, userType }, JWT_SECRET, {
      expiresIn: "24h",
    });
    return res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      token,
      user: { id: userId, username, userType, email },
    });
  } catch (e) {
    console.error("/signup error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({
        error: "필수 필드가 누락되었습니다.",
        required: ["username", "password"],
      });

    // Admin 계정 체크
    if (username === "admin" && password === "1234") {
      const token = jwt.sign(
        {
          userId: "admin",
          username: "admin",
          userType: "admin",
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      return res.status(200).json({
        message: "관리자 로그인 성공",
        token,
        user: {
          id: "admin",
          username: "admin",
          userType: "admin",
        },
      });
    }

    const { data: userRow, error: userErr } = await supabase
      .from("user_profiles")
      .select("id, user_type, username")
      .eq("username", username)
      .maybeSingle();
    if (userErr) return res.status(400).json({ error: userErr.message });
    if (!userRow)
      return res.status(400).json({ error: "존재하지 않는 아이디입니다." });

    // user_profiles에서 user_type에 따라 해당 테이블에서 email 조회
    let email = "";
    if (userRow.user_type === "advertiser") {
      const { data: advertiserData } = await supabase
        .from("advertisers")
        .select("email")
        .eq("id", userRow.id)
        .single();
      email = advertiserData?.email || "";
    } else if (userRow.user_type === "agency") {
      const { data: agencyData } = await supabase
        .from("agencies")
        .select("email")
        .eq("id", userRow.id)
        .single();
      email = agencyData?.email || "";
    } else if (userRow.user_type === "partner") {
      const { data: partnerData } = await supabase
        .from("partners")
        .select("email")
        .eq("id", userRow.id)
        .single();
      email = partnerData?.email || "";
    }

    if (!email) {
      return res
        .status(400)
        .json({ error: "사용자 이메일을 찾을 수 없습니다." });
    }

    // 실제 로그인은 email로 수행
    const { data: signInData, error: signInErr } =
      await supabase.auth.signInWithPassword({
        email: email,
        password,
      });
    if (signInErr) return res.status(400).json({ error: signInErr.message });

    const token = jwt.sign(
      {
        userId: userRow.id,
        username: userRow.username,
        userType: userRow.user_type,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    return res.json({
      message: "로그인 성공",
      token,
      user: {
        id: userRow.id,
        username: userRow.username,
        userType: userRow.user_type,
      },
    });
  } catch (e) {
    console.error("/login error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.get("/profile", requireAuth, async (req, res) => {
  try {
    const { userId } = req.user;
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("id, user_type, username")
      .eq("id", userId)
      .maybeSingle();
    if (error) return res.status(400).json({ error: error.message });

    let approval_status = "approved"; // 기본값 (관리자 등)
    let approved_at = null;
    let company_name = "";
    let business_number = "";
    let manager_name = "";
    let email = "";
    let phone = "";

    if (profile?.user_type === "advertiser") {
      const { data: row } = await supabase
        .from("advertisers")
        .select(
          "approval_status, approved_at, company_name, business_number, manager_name, email, phone"
        )
        .eq("id", userId)
        .maybeSingle();
      approval_status = row?.approval_status || "pending";
      approved_at = row?.approved_at || null;
      company_name = row?.company_name || "";
      business_number = row?.business_number || "";
      manager_name = row?.manager_name || "";
      email = row?.email || "";
      phone = row?.phone || "";
    } else if (profile?.user_type === "agency") {
      const { data: row } = await supabase
        .from("agencies")
        .select(
          "approval_status, approved_at, agency_name, business_number, manager_name, email, phone"
        )
        .eq("id", userId)
        .maybeSingle();
      approval_status = row?.approval_status || "pending";
      approved_at = row?.approved_at || null;
      company_name = row?.agency_name || "";
      business_number = row?.business_number || "";
      manager_name = row?.manager_name || "";
      email = row?.email || "";
      phone = row?.phone || "";
    } else if (profile?.user_type === "partner") {
      let row = null;
      try {
        // 가능한 경우 사업자명/번호도 조회
        const { data, error } = await supabase
          .from("partners")
          .select(
            "approval_status, approved_at, partner_code, business_name, business_number, manager_name, email, phone"
          )
          .eq("id", userId)
          .maybeSingle();
        if (!error) row = data || null;
      } catch (_) {}
      // 호환: 구 스키마 (business_* 미존재)
      if (!row) {
        const { data } = await supabase
          .from("partners")
          .select(
            "approval_status, approved_at, partner_code, manager_name, email, phone"
          )
          .eq("id", userId)
          .maybeSingle();
        row = data || null;
      }

      approval_status = row?.approval_status || "pending";
      approved_at = row?.approved_at || null;
      // 파트너 닉네임은 초대코드가 아닌, 가입 시 입력한 사업자명 사용
      company_name = row?.business_name || profile?.username || "";
      business_number = row?.business_number || "";
      manager_name = row?.manager_name || "";
      email = row?.email || "";
      phone = row?.phone || "";
    }

    return res.json({
      user: {
        ...profile,
        approval_status,
        approved_at,
        company_name,
        business_number,
        manager_name,
        email,
        phone,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

router.post("/logout", (req, res) => {
  return res.json({ message: "클라이언트 토큰 삭제 후 로그아웃하세요." });
});

// ===== 원고 업로드 (3사) =====
// Storage 버킷: manuscripts (사전에 Public 또는 Signed URL 사용 설정 필요)
router.post(
  "/campaigns/:id/manuscripts",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const idParam = req.params.id;
      const campaignUuid = await resolveCampaignUuid(idParam);
      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }
      const userId = req.user.userId;
      const file = req.file;
      if (!file) return res.status(400).json({ error: "파일이 필요합니다." });

      const originalname = file.originalname || `file_${Date.now()}`;
      // 한글 파일명을 안전한 형식으로 변환
      const safeFileName = originalname
        .replace(/[^\w\s.-]/g, "") // 특수문자 제거
        .replace(/\s+/g, "_") // 공백을 언더스코어로 변환
        .substring(0, 100); // 파일명 길이 제한
      const path = `campaigns/${campaignUuid}/${Date.now()}_${safeFileName}`;

      // 1) Storage 업로드 (버킷 보장 + 업로드)
      await ensureBucketExists("manuscripts");
      let { data: upData, error: upErr } = await supabase.storage
        .from("manuscripts")
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
      // 버킷이 바로 생성된 직후 타이밍 이슈 시 1회 재시도
      if (
        upErr &&
        String(upErr?.message || "")
          .toLowerCase()
          .includes("not found")
      ) {
        await ensureBucketExists("manuscripts");
        ({ data: upData, error: upErr } = await supabase.storage
          .from("manuscripts")
          .upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          }));
      }
      if (upErr) {
        console.error("Supabase storage upload error", upErr);
        return res
          .status(500)
          .json({ error: "스토리지 업로드에 실패했습니다." });
      }

      // 2) Public/Signed URL 생성 (Public 버킷 권장)
      let fileUrl = null;
      try {
        const pub = supabase.storage.from("manuscripts").getPublicUrl(path);
        fileUrl = pub?.data?.publicUrl || null;
      } catch (_) {}
      if (!fileUrl) {
        try {
          const signed = await supabase.storage
            .from("manuscripts")
            .createSignedUrl(path, 60 * 60);
          fileUrl = signed?.data?.signedUrl || null;
        } catch (_) {}
      }

      // 3) DB 기록 (manuscripts 테이블 필요)
      const insertData = {
        campaign_id: campaignUuid,
        uploaded_by: userId,
        file_name: safeFileName, // 안전한 파일명 저장
        file_path: path, // 안전한 경로 사용
        file_url: fileUrl,
        size: file.size,
      };

      // original_file_name 컬럼이 있는 경우에만 추가
      try {
        insertData.original_file_name = originalname; // 원본 파일명 저장
      } catch (e) {
        console.log(
          "original_file_name 컬럼이 없습니다. file_name에 원본 파일명 저장"
        );
        insertData.file_name = originalname; // 원본 파일명을 file_name에 저장
      }

      const { data: row, error: insErr } = await supabase
        .from("manuscripts")
        .insert(insertData)
        .select()
        .single();
      if (insErr) {
        console.error("Insert manuscripts error", insErr);
        return res.status(500).json({ error: "DB 저장에 실패했습니다." });
      }

      return res.json({ success: true, manuscript: row });
    } catch (e) {
      console.error("Upload manuscript exception", e);
      return res.status(500).json({ error: "업로드 중 오류가 발생했습니다." });
    }
  }
);

// 내 캠페인 원고 리스트 (코드/UUID 모두 허용)
router.get("/campaigns/:id/manuscripts", requireAuth, async (req, res) => {
  try {
    const idParam = req.params.id;
    const campaignUuid = await resolveCampaignUuid(idParam);
    if (!campaignUuid) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }
    const { data, error } = await supabase
      .from("manuscripts")
      .select("id,campaign_id,file_name,file_path,file_url,size,created_at")
      .eq("campaign_id", campaignUuid)
      .order("created_at", { ascending: false });
    if (error)
      return res.status(500).json({ error: "원고 조회에 실패했습니다." });
    return res.json({ success: true, manuscripts: data || [] });
  } catch (e) {
    return res.status(500).json({ error: "원고 조회 중 오류가 발생했습니다." });
  }
});

// 원고 파일 다운로드 (원본 파일명으로)
router.get(
  "/campaigns/:id/manuscripts/:manuscriptId/download",
  requireAuth,
  async (req, res) => {
    try {
      const { id: campaignId, manuscriptId } = req.params;
      const campaignUuid = await resolveCampaignUuid(campaignId);
      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // 원고 정보 조회
      const { data: manuscript, error: fetchError } = await supabase
        .from("manuscripts")
        .select("file_path, file_name")
        .eq("id", manuscriptId)
        .eq("campaign_id", campaignUuid)
        .single();

      if (fetchError || !manuscript) {
        return res.status(404).json({ error: "원고 파일을 찾을 수 없습니다." });
      }

      // Signed URL 생성 (다운로드용)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("manuscripts")
        .createSignedUrl(manuscript.file_path, 60 * 60, {
          download: true,
        });

      if (signedError) {
        console.error("Create signed URL error:", signedError);
        return res
          .status(500)
          .json({ error: "다운로드 URL 생성에 실패했습니다." });
      }

      // 원본 파일명으로 다운로드하도록 프록시 방식 사용
      const originalFileName = manuscript.file_name; // 현재는 file_name에 원본 파일명이 저장됨
      const encodedFileName = encodeURIComponent(originalFileName);

      // 파일을 직접 다운로드하도록 프록시
      try {
        const fileResponse = await fetch(signedData.signedUrl);
        if (!fileResponse.ok) {
          throw new Error("파일 다운로드 실패");
        }

        const fileBuffer = await fileResponse.arrayBuffer();

        res.setHeader(
          "Content-Type",
          fileResponse.headers.get("content-type") || "application/octet-stream"
        );
        res.setHeader("Content-Length", fileBuffer.byteLength);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodedFileName}`
        );

        res.send(Buffer.from(fileBuffer));
      } catch (proxyError) {
        console.error("Proxy download error:", proxyError);
        // 프록시 실패 시 기존 방식으로 fallback
        res.setHeader(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodedFileName}`
        );
        res.redirect(signedData.signedUrl);
      }
    } catch (e) {
      console.error("Download manuscript error:", e);
      return res
        .status(500)
        .json({ error: "다운로드 중 오류가 발생했습니다." });
    }
  }
);

// 인증번호 발송 (비밀번호 찾기)
router.post("/send-verification-code", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "휴대폰 번호를 입력해주세요." });
    }

    // 휴대폰 번호 형식 검증
    const phoneRegex = /^01[0-9]-\d{4}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res
        .status(400)
        .json({ error: "올바른 휴대폰 번호 형식을 입력해주세요." });
    }

    // 등록된 사용자인지 확인
    const { data: advertiserData } = await supabase
      .from("advertisers")
      .select("id")
      .eq("phone", phoneNumber)
      .single();

    const { data: agencyData } = await supabase
      .from("agencies")
      .select("id")
      .eq("phone", phoneNumber)
      .single();

    const { data: partnerData } = await supabase
      .from("partners")
      .select("id")
      .eq("phone", phoneNumber)
      .single();

    // 어느 테이블에서도 사용자를 찾지 못한 경우
    if (!advertiserData && !agencyData && !partnerData) {
      return res.status(404).json({
        error: "해당 휴대폰 번호로 등록된 사용자를 찾을 수 없습니다.",
      });
    }

    // 6자리 랜덤 인증번호 생성
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // 5분 후 만료시간 설정
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 기존 인증번호 삭제 (같은 휴대폰 번호)
    await supabase
      .from("verification_codes")
      .delete()
      .eq("phone_number", phoneNumber);

    // 새 인증번호 저장
    const { data, error } = await supabase
      .from("verification_codes")
      .insert({
        phone_number: phoneNumber,
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        is_used: false,
      })
      .select()
      .single();

    if (error) {
      console.error("인증번호 저장 오류:", error);
      return res.status(500).json({ error: "인증번호 발송에 실패했습니다." });
    }

    // 실제 SMS 발송 (개발 환경에서는 콘솔에 출력)
    console.log(`SMS 발송: ${phoneNumber}로 인증번호 ${verificationCode} 발송`);

    // TODO: 실제 SMS API 연동 (예: Twilio, AWS SNS, 네이버 클라우드 플랫폼 등)
    // await sendSMS(phoneNumber, `Troy 인증번호: ${verificationCode}`);

    res.json({
      message: "인증번호가 발송되었습니다.",
      // 개발 환경에서만 인증번호 반환 (실제 운영에서는 제거)
      verificationCode:
        process.env.NODE_ENV === "development" ? verificationCode : undefined,
    });
  } catch (error) {
    console.error("인증번호 발송 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 인증번호 확인
router.post("/verify-code", async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res
        .status(400)
        .json({ error: "휴대폰 번호와 인증번호를 입력해주세요." });
    }

    // 인증번호 조회
    const { data: verificationData, error: fetchError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("code", code)
      .eq("is_used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationData) {
      // 시도 횟수 증가
      await supabase
        .from("verification_codes")
        .update({ attempts: supabase.raw("attempts + 1") })
        .eq("phone_number", phoneNumber)
        .eq("code", code);

      return res
        .status(400)
        .json({ error: "인증번호가 올바르지 않거나 만료되었습니다." });
    }

    // 시도 횟수 확인 (5회 초과 시 차단)
    if (verificationData.attempts >= 5) {
      return res.status(429).json({
        error: "인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요.",
      });
    }

    // 인증번호 사용 처리
    await supabase
      .from("verification_codes")
      .update({ is_used: true })
      .eq("id", verificationData.id);

    // 인증 성공 토큰 생성 (비밀번호 재설정용)
    const resetToken = jwt.sign(
      { phoneNumber, purpose: "password_reset" },
      JWT_SECRET,
      { expiresIn: "10m" } // 10분 유효
    );

    res.json({
      message: "인증이 완료되었습니다.",
      resetToken,
    });
  } catch (error) {
    console.error("인증번호 확인 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 비밀번호 재설정
router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "모든 필드를 입력해주세요." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "비밀번호가 일치하지 않습니다." });
    }

    // 비밀번호 강도 검증
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "비밀번호는 최소 8자 이상이어야 합니다." });
    }

    // 토큰 검증
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (error) {
      return res
        .status(401)
        .json({ error: "유효하지 않거나 만료된 토큰입니다." });
    }

    if (decoded.purpose !== "password_reset") {
      return res.status(401).json({ error: "잘못된 토큰입니다." });
    }

    const { phoneNumber } = decoded;

    // 휴대폰 번호로 사용자 찾기
    let userId = null;
    let userEmail = null;

    // advertisers 테이블에서 찾기
    const { data: advertiserData } = await supabase
      .from("advertisers")
      .select("id, email")
      .eq("phone", phoneNumber)
      .single();

    if (advertiserData) {
      userId = advertiserData.id;
      userEmail = advertiserData.email;
    } else {
      // agencies 테이블에서 찾기
      const { data: agencyData } = await supabase
        .from("agencies")
        .select("id, email")
        .eq("phone", phoneNumber)
        .single();

      if (agencyData) {
        userId = agencyData.id;
        userEmail = agencyData.email;
      } else {
        // partners 테이블에서 찾기
        const { data: partnerData } = await supabase
          .from("partners")
          .select("id, email")
          .eq("phone", phoneNumber)
          .single();

        if (partnerData) {
          userId = partnerData.id;
          userEmail = partnerData.email;
        }
      }
    }

    if (!userId || !userEmail) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // Supabase Auth Admin API로 비밀번호 업데이트
    const { data: updateData, error: updateError } =
      await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (updateError) {
      console.error("비밀번호 업데이트 오류:", updateError);
      return res.status(500).json({ error: "비밀번호 재설정에 실패했습니다." });
    }

    res.json({ message: "비밀번호가 성공적으로 재설정되었습니다." });
  } catch (error) {
    console.error("비밀번호 재설정 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 1:1문의 생성
router.post("/tickets", requireAuth, async (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "제목과 내용은 필수입니다." });
    }

    // 사용자 프로필에서 실제 UUID 가져오기
    let userProfile;

    // 먼저 user_profiles 테이블에서 찾기
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", req.user.userId)
      .single();

    if (profileError || !profileData) {
      console.error("User profile not found:", profileError);
      return res
        .status(404)
        .json({ error: "사용자 프로필을 찾을 수 없습니다." });
    }

    userProfile = profileData;

    // tickets 테이블 존재 확인
    const { data: tableCheck, error: tableError } = await supabase
      .from("tickets")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error("Tickets table error:", tableError);
      return res.status(500).json({
        error:
          "tickets 테이블에 접근할 수 없습니다. Supabase에서 테이블을 생성해주세요.",
        details: tableError.message,
      });
    }

    console.log("Creating ticket with data:", {
      created_by: userProfile.id,
      title: title.trim(),
      content: content.trim(),
      category: category || "기타",
      status: "open",
    });

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        created_by: userProfile.id,
        title: title.trim(),
        content: content.trim(),
        category: category || "기타",
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Create ticket error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return res.status(500).json({
        error: "문의 등록에 실패했습니다.",
        details: error.message,
      });
    }

    console.log("Ticket created successfully:", data);

    res.status(201).json({
      message: "문의가 등록되었습니다.",
      ticket: data,
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 나의 문의 내역 조회
router.get("/tickets/my", requireAuth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 사용자 프로필에서 실제 UUID 가져오기
    let userProfile;

    // 먼저 user_profiles 테이블에서 찾기
    console.log("Looking for user profile with userId:", req.user.userId);
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", req.user.userId)
      .single();

    if (profileError || !profileData) {
      console.error("User profile not found:", profileError);
      return res
        .status(404)
        .json({ error: "사용자 프로필을 찾을 수 없습니다." });
    }

    console.log("Found user profile:", profileData);
    userProfile = profileData;

    console.log("Fetching tickets for user ID:", userProfile.id);
    const { data, error, count } = await supabase
      .from("tickets")
      .select(
        `
        id,
        title,
        content,
        category,
        status,
        created_at,
        updated_at,
        ticket_comments(id, content, created_at, author_id)
      `,
        { count: "exact" }
      )
      .eq("created_by", userProfile.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Fetch my tickets error:", error);
      return res.status(500).json({ error: "문의 내역 조회에 실패했습니다." });
    }

    console.log("Found tickets:", data?.length || 0, "tickets");

    const totalItems = count || 0;
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    // 답변 여부 추가
    const ticketsWithReplyStatus = (data || []).map((ticket) => ({
      ...ticket,
      hasReply: ticket.ticket_comments && ticket.ticket_comments.length > 0,
      replyCount: ticket.ticket_comments ? ticket.ticket_comments.length : 0,
    }));

    return res.json({
      tickets: ticketsWithReplyStatus,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error("/tickets/my error", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 나의 문의 상세 조회
router.get("/tickets/my/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 사용자 프로필에서 실제 UUID 가져오기
    let userProfile;

    // 먼저 user_profiles 테이블에서 찾기
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", req.user.userId)
      .single();

    if (profileError || !profileData) {
      console.error("User profile not found:", profileError);
      return res
        .status(404)
        .json({ error: "사용자 프로필을 찾을 수 없습니다." });
    }

    userProfile = profileData;

    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select(
        `
        id,
        title,
        content,
        category,
        status,
        created_at,
        updated_at,
        created_by
      `
      )
      .eq("id", id)
      .eq("created_by", userProfile.id)
      .single();

    if (ticketError || !ticketData) {
      return res.status(404).json({ error: "문의를 찾을 수 없습니다." });
    }

    // 댓글 조회 - 외래키 참조 수정
    const { data: commentsData, error: commentsError } = await supabase
      .from("ticket_comments")
      .select(
        `
        id,
        content,
        created_at,
        author_id,
        user_profiles!author_id(username, user_type)
      `
      )
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("Fetch ticket comments error:", commentsError);
    }

    const ticket = {
      ...ticketData,
      comments: (commentsData || []).map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        author: {
          id: comment.author_id,
          username: comment.user_profiles?.username || "관리자",
          userType: comment.user_profiles?.user_type || "admin",
        },
      })),
    };

    return res.json({ ticket });
  } catch (error) {
    console.error("/tickets/my/:id error", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 대행사에서 캠페인 요청사항 저장
router.put("/campaigns/:id/request", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { request } = req.body || {};

    if (!request || !request.trim()) {
      return res.status(400).json({ error: "요청사항을 입력해주세요." });
    }

    // campaign_code로 우선 조회, 없으면 id로 조회
    let row = null;
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("id, requirements")
        .eq("campaign_code", id)
        .maybeSingle();
      row = data || null;
    } catch (_) {}
    if (!row) {
      const { data } = await supabase
        .from("campaigns")
        .select("id, requirements")
        .eq("id", id)
        .maybeSingle();
      row = data || null;
    }

    if (!row) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    const nowIso = new Date().toISOString();
    const currentReq = row.requirements || {};
    const prevLogs = Array.isArray(currentReq.updateLogs)
      ? currentReq.updateLogs
      : [];

    // 요청사항 업데이트 로그 생성
    const newLog = {
      type: "요청사항 등록",
      date: nowIso,
      changedAt: nowIso,
      memo: `대행사에서 요청사항을 등록했습니다: ${request.trim()}`,
      request: request.trim(),
    };

    const nextReq = {
      ...currentReq,
      agency_request: request.trim(),
      request_updated_at: nowIso,
      updateLogs: [newLog, ...prevLogs],
    };

    const { data: updated, error: updateErr } = await supabase
      .from("campaigns")
      .update({
        requirements: nextReq,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .select("id, campaign_code, title, requirements")
      .single();

    if (updateErr) {
      console.error("Update campaign request error:", updateErr);
      return res.status(500).json({ error: "요청사항 저장에 실패했습니다." });
    }

    return res.json({ success: true, campaign: updated });
  } catch (error) {
    console.error("Campaign request update error:", error);
    return res
      .status(500)
      .json({ error: "요청사항 저장 중 오류가 발생했습니다." });
  }
});

// ===== 제품 반송 주소 저장 =====
router.post("/campaigns/:id/return-address", requireAuth, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { name, phone, address } = req.body;

    // 필수 필드 검증
    if (!name || !phone || !address) {
      return res.status(400).json({ error: "모든 필드를 입력해주세요." });
    }

    // 캠페인 존재 확인 및 권한 검증
    const campaignUuid = await resolveCampaignUuid(campaignId);
    if (!campaignUuid) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 캠페인 조회
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, created_by, partner_id, advertiser_id")
      .eq("id", campaignUuid)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 권한 확인 (대행사만 접근 가능)
    const userId = req.user.userId;
    if (campaign.created_by !== userId) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    console.log("=== 제품 반송 주소 저장 시작 ===");
    console.log("캠페인 ID:", campaignUuid);
    console.log("입력 데이터:", { name, phone, address });

    // 기존 반송 주소 데이터 확인
    const { data: existingAddress, error: fetchError } = await supabase
      .from("campaign_return_address")
      .select("*")
      .eq("campaign_id", campaignUuid)
      .single();

    console.log("기존 데이터 조회 결과:", { existingAddress, fetchError });

    const nowIso = new Date().toISOString();

    let result;
    if (existingAddress) {
      console.log("기존 데이터 업데이트 시도");
      // 기존 데이터가 있으면 UPDATE
      const { data: updatedAddress, error: updateError } = await supabase
        .from("campaign_return_address")
        .update({
          name: name,
          phone: phone,
          address: address,
          updated_at: nowIso,
        })
        .eq("campaign_id", campaignUuid)
        .select()
        .single();

      console.log("업데이트 결과:", { updatedAddress, updateError });
      if (updateError) {
        console.error("Update return address error:", updateError);
        return res
          .status(500)
          .json({ error: "반송 주소 업데이트에 실패했습니다." });
      }
      result = updatedAddress;
    } else {
      console.log("새 데이터 삽입 시도");
      // 기존 데이터가 없으면 INSERT
      const { data: newAddress, error: insertError } = await supabase
        .from("campaign_return_address")
        .insert({
          campaign_id: campaignUuid,
          name: name,
          phone: phone,
          address: address,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .single();

      console.log("삽입 결과:", { newAddress, insertError });
      if (insertError) {
        console.error("Insert return address error:", insertError);
        return res
          .status(500)
          .json({ error: "반송 주소 저장에 실패했습니다." });
      }
      result = newAddress;
    }

    return res.json({
      success: true,
      message: "저장되었습니다.",
      data: result,
    });
  } catch (error) {
    console.error("Return address save error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// ===== 내 캠페인 목록 (대행사/고객/파트너 공용) =====
router.get("/my-campaigns", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "50", 10), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("campaigns")
      .select("*", { count: "exact" })
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    const { data, error, count } = await query.range(from, to);
    if (error) {
      console.error("/auth/my-campaigns error:", error);
      return res.status(500).json({ error: "캠페인 조회에 실패했습니다." });
    }

    return res.json({
      success: true,
      campaigns: data || [],
      pagination: {
        totalItems: count || 0,
        totalPages: Math.max(Math.ceil((count || 0) / limit), 1),
        currentPage: page,
      },
    });
  } catch (e) {
    console.error("/auth/my-campaigns exception", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// ===== 캠페인 생성 (파트너/대행사/광고주 공용) =====
router.post("/campaigns", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      description,
      campaign_type,
      platform,
      product_url,
      product_title,
      product_price,
      brand_name,
      product_category,
      budget,
      start_date,
      end_date,
      campaign_code,
      target_count,
      requirements,
    } = req.body || {};

    if (!title || !campaign_code) {
      return res
        .status(400)
        .json({ error: "제목과 캠페인 코드는 필수입니다." });
    }

    const normalizedType = (campaign_type || "product")
      .toString()
      .toLowerCase();

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        title,
        description,
        campaign_type: normalizedType,
        platform: platform || null,
        product_url: product_url || null,
        product_title: product_title || null,
        product_price: product_price ?? null,
        brand_name: brand_name || null,
        product_category: product_category || null,
        budget,
        start_date,
        end_date,
        campaign_code,
        created_by: userId,
        target_count: Number.isFinite(target_count) ? target_count : null,
        requirements: requirements || {},
      })
      .select()
      .single();

    if (error) {
      console.error("/auth/campaigns create error:", error);
      return res.status(500).json({ error: "캠페인 생성에 실패했습니다." });
    }

    // 캠페인 등록 시 결제 레코드 생성
    if (data && data.id && budget) {
      try {
        const { error: paymentError } = await supabase.from("payments").insert({
          campaign_id: data.id,
          payer_id: userId,
          amount: budget,
          payment_method: "계좌이체",
          payment_status: "pending_approval",
          payment_type: "settlement",
          payment_date: new Date().toISOString(),
        });

        if (paymentError) {
          console.error("Payment record creation error:", paymentError);
          // 결제 레코드 생성 실패해도 캠페인 생성은 성공으로 처리
        } else {
          console.log("결제 레코드가 자동으로 생성되었습니다:", data.id);
        }
      } catch (paymentErr) {
        console.error("Payment record creation exception:", paymentErr);
        // 결제 레코드 생성 실패해도 캠페인 생성은 성공으로 처리
      }
    }

    return res.json({ success: true, campaign: data });
  } catch (e) {
    console.error("/auth/campaigns create exception", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// ===== 캠페인 문의 조회 (대행사/파트너사/광고주용) =====
router.get("/campaigns/:id/inquiries", requireAuth, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const userId = req.user.userId;

    console.log("=== 캠페인 문의 조회 시작 ===");
    console.log("캠페인 ID:", campaignId);
    console.log("사용자 ID:", userId);

    // 캠페인 존재 확인 및 권한 검증
    const campaignUuid = await resolveCampaignUuid(campaignId);
    if (!campaignUuid) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 캠페인 조회
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, created_by, partner_id, advertiser_id")
      .eq("id", campaignUuid)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 권한 확인 (대행사, 파트너사, 광고주만 접근 가능)
    const hasAccess =
      campaign.created_by === userId ||
      campaign.partner_id === userId ||
      campaign.advertiser_id === userId;

    if (!hasAccess) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    // 문의 목록 조회
    const { data: inquiries, error: inquiryError } = await supabase
      .from("campaign_inquiries")
      .select(
        `
        *,
        inquirer:inquirer_id (
          id,
          username,
          user_type
        )
      `
      )
      .eq("campaign_id", campaignUuid)
      .order("created_at", { ascending: false });

    if (inquiryError) {
      console.error("Inquiry fetch error:", inquiryError);
      return res.status(500).json({ error: "문의 조회에 실패했습니다." });
    }

    console.log("문의 조회 성공:", inquiries?.length || 0, "개");

    return res.json({
      success: true,
      data: inquiries || [],
    });
  } catch (error) {
    console.error("Inquiry fetch error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// ===== 캠페인 문의 저장 =====
router.post("/campaigns/:id/inquiries", requireAuth, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { title, content } = req.body;
    const userId = req.user.userId;

    // 필수 필드 검증
    if (!title || !content) {
      return res
        .status(400)
        .json({ error: "제목과 내용을 모두 입력해주세요." });
    }

    // 캠페인 존재 확인 및 권한 검증
    const campaignUuid = await resolveCampaignUuid(campaignId);
    if (!campaignUuid) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 캠페인 조회
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, created_by, partner_id, advertiser_id")
      .eq("id", campaignUuid)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 권한 확인 (대행사, 파트너사, 광고주만 접근 가능)
    const hasAccess =
      campaign.created_by === userId ||
      campaign.partner_id === userId ||
      campaign.advertiser_id === userId;

    if (!hasAccess) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    console.log("=== 캠페인 문의 저장 시작 ===");
    console.log("캠페인 ID:", campaignUuid);
    console.log("문의자 ID:", userId);
    console.log("입력 데이터:", { title, content });

    // 문의 저장
    const { data: inquiry, error: insertError } = await supabase
      .from("campaign_inquiries")
      .insert({
        campaign_id: campaignUuid,
        inquirer_id: userId,
        title: title,
        content: content,
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert inquiry error:", insertError);
      return res.status(500).json({ error: "문의 저장에 실패했습니다." });
    }

    console.log("문의 저장 성공:", inquiry);

    return res.json({
      success: true,
      message: "문의가 등록되었습니다.",
      data: inquiry,
    });
  } catch (error) {
    console.error("Inquiry save error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 대행사용 배송지 파일 조회
router.get("/campaigns/:id/shipping-files", requireAuth, async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const userId = req.user.userId;

    console.log("=== 대행사 배송지 파일 조회 시작 ===");
    console.log("캠페인 ID:", campaignId);
    console.log("사용자 ID:", userId);

    // 캠페인 UUID 변환
    const campaignUuid = await resolveCampaignUuid(campaignId);
    if (!campaignUuid) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 캠페인 조회
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, created_by, partner_id, advertiser_id")
      .eq("id", campaignUuid)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 권한 확인 (대행사, 파트너사, 광고주만 접근 가능)
    const hasAccess =
      campaign.created_by === userId ||
      campaign.partner_id === userId ||
      campaign.advertiser_id === userId;

    if (!hasAccess) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    // 배송지 파일 조회
    const { data: shippingFiles, error: filesError } = await supabase
      .from("shipping_files")
      .select("*")
      .eq("campaign_id", campaignUuid)
      .order("created_at", { ascending: false });

    if (filesError) {
      console.error("배송지 파일 조회 오류:", filesError);
      return res
        .status(500)
        .json({ error: "배송지 파일 조회에 실패했습니다." });
    }

    console.log("배송지 파일 조회 성공:", shippingFiles?.length || 0, "개");

    return res.json({
      success: true,
      shippingFiles: shippingFiles || [],
    });
  } catch (error) {
    console.error("배송지 파일 조회 오류:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 대행사용 배송지 파일 다운로드
router.get(
  "/campaigns/:id/shipping-files/:fileId/download",
  requireAuth,
  async (req, res) => {
    try {
      const { id: campaignId, fileId } = req.params;
      const userId = req.user.userId;

      console.log("=== 대행사 배송지 파일 다운로드 시작 ===");
      console.log("캠페인 ID:", campaignId);
      console.log("파일 ID:", fileId);
      console.log("사용자 ID:", userId);

      // 캠페인 UUID 변환
      const campaignUuid = await resolveCampaignUuid(campaignId);
      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // 캠페인 조회
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, created_by, partner_id, advertiser_id")
        .eq("id", campaignUuid)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // 권한 확인 (대행사, 파트너사, 광고주만 접근 가능)
      const hasAccess =
        campaign.created_by === userId ||
        campaign.partner_id === userId ||
        campaign.advertiser_id === userId;

      if (!hasAccess) {
        return res.status(403).json({ error: "권한이 없습니다." });
      }

      // 배송지 파일 조회
      const { data: shippingFile, error: fileError } = await supabase
        .from("shipping_files")
        .select("*")
        .eq("id", fileId)
        .eq("campaign_id", campaignUuid)
        .single();

      if (fileError || !shippingFile) {
        return res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      }

      // Supabase Storage에서 파일 다운로드
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("shipping-files")
        .download(shippingFile.file_path);

      if (downloadError) {
        console.error("파일 다운로드 오류:", downloadError);
        return res.status(500).json({ error: "파일 다운로드에 실패했습니다." });
      }

      // 파일을 Buffer로 변환
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 한글 파일명 처리
      const originalFileName = shippingFile.original_file_name;
      const encodedFileName = encodeURIComponent(originalFileName);

      // 응답 헤더 설정
      res.setHeader("Content-Type", shippingFile.file_type);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodedFileName}`
      );

      console.log("파일 다운로드 성공:", originalFileName);

      return res.send(buffer);
    } catch (error) {
      console.error("배송지 파일 다운로드 오류:", error);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);

// ===== 결제 내역 조회 =====
router.get("/payments", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "50", 10), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("payments")
      .select(
        `
        *,
        campaigns (
          id,
          title,
          campaign_code,
          campaign_type,
          budget,
          target_count,
          status,
          requirements
        )
      `,
        { count: "exact" }
      )
      .eq("payer_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("/auth/payments error:", error);
      return res.status(500).json({ error: "결제 내역 조회에 실패했습니다." });
    }

    return res.json({
      success: true,
      payments: data || [],
      pagination: {
        totalItems: count || 0,
        totalPages: Math.max(Math.ceil((count || 0) / limit), 1),
        currentPage: page,
      },
    });
  } catch (e) {
    console.error("/auth/payments exception", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;

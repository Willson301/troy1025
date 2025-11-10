const express = require("express");
const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// UUID 유효성 검사 함수
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

// 관리자 인증 미들웨어 (admin/1234 토큰 및 임시 토큰 지원)
async function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  }

  try {
    // 임시 관리자 토큰 허용 (테스트용)
    if (token.startsWith("admin_token_") || token === "admin_temp_token") {
      // ENV 또는 DB에서 관리자 UUID 해석
      let adminId = process.env.ADMIN_USER_ID || null;
      if (!adminId) {
        try {
          const { data: adminProfile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("username", "admin")
            .maybeSingle();
          adminId = adminProfile?.id || null;
        } catch (_) {}
      }
      req.user = { id: adminId, username: "admin", userType: "admin" };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.userType !== "admin") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다." });
    }
    // admin/1234 로그인 토큰은 userId가 'admin' 문자열일 수 있음 → 실제 UUID로 매핑
    let resolvedAdminId = decoded.userId;
    if (!resolvedAdminId || resolvedAdminId === "admin") {
      resolvedAdminId = process.env.ADMIN_USER_ID || null;
      if (!resolvedAdminId) {
        try {
          const { data: adminProfile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("username", "admin")
            .maybeSingle();
          resolvedAdminId = adminProfile?.id || null;
        } catch (_) {}
      }
    }

    req.user = { ...decoded, id: resolvedAdminId };
    next();
  } catch (error) {
    return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
  }
}

// 파트너 코드 발급
router.post("/partner-codes", authenticateAdmin, async (req, res) => {
  try {
    const { memo, code } = req.body;

    let finalCode = code;

    // 코드가 제공되지 않으면 랜덤 생성
    if (!finalCode) {
      const generateCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 10; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${result.slice(0, 4)}-${result.slice(4, 7)}-${result.slice(
          7,
          10
        )}`;
      };
      finalCode = generateCode();
    }

    // DB에 코드 저장
    const { data, error } = await supabase
      .from("partner_codes")
      .insert({
        code: finalCode,
        memo: memo || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Partner code creation error:", error);
      return res.status(500).json({ error: "코드 저장에 실패했습니다." });
    }

    return res.status(201).json({
      message: "파트너 코드가 저장되었습니다.",
      code: data,
    });
  } catch (error) {
    console.error("Partner code generation error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 발급된 파트너 코드 목록 조회
router.get("/partner-codes", authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("partner_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Partner codes fetch error:", error);
      return res.status(500).json({ error: "코드 목록 조회에 실패했습니다." });
    }

    return res.status(200).json({
      codes: data,
    });
  } catch (error) {
    console.error("Partner codes fetch error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너사 초대코드 발급 (파트너사용)
router.post("/partner-invite-codes", async (req, res) => {
  try {
    const { code, memo, created_by, created_by_user_id } = req.body;

    // 코드 중복 확인
    const { data: existingCode, error: checkError } = await supabase
      .from("partner_invite_codes")
      .select("id")
      .eq("code", code)
      .single();

    if (existingCode) {
      return res.status(400).json({ error: "이미 존재하는 코드입니다." });
    }

    // DB에 코드 저장
    const { data, error } = await supabase
      .from("partner_invite_codes")
      .insert({
        code: code,
        memo: memo || null,
        created_by: created_by || "partner",
        created_by_user_id: created_by_user_id || null,
        parent_partner_id: created_by_user_id || null, // 파트너사가 발급한 경우 해당 파트너사가 상위
      })
      .select()
      .single();

    if (error) {
      console.error("Partner invite code creation error:", error);
      return res.status(500).json({ error: "코드 저장에 실패했습니다." });
    }

    return res.status(201).json({
      message: "파트너사 초대코드가 저장되었습니다.",
      code: data,
    });
  } catch (error) {
    console.error("Partner invite code generation error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너사 초대코드 목록 조회
router.get("/partner-invite-codes", async (req, res) => {
  try {
    const { status, created_by_user_id } = req.query;

    let query = supabase
      .from("partner_invite_codes")
      .select("*")
      .order("created_at", { ascending: false });

    // 상태 필터
    if (status && status !== "all") {
      if (status === "used") {
        query = query.eq("is_used", true);
      } else if (status === "unused") {
        query = query.eq("is_used", false);
      }
    }

    // 특정 파트너사가 발급한 코드만 조회
    if (created_by_user_id) {
      query = query.eq("created_by_user_id", created_by_user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Partner invite codes fetch error:", error);
      return res.status(500).json({ error: "코드 목록 조회에 실패했습니다." });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Partner invite codes fetch error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너사 초대코드 통계 조회
router.get("/partner-invite-codes/stats", async (req, res) => {
  try {
    const { created_by_user_id } = req.query;

    let query = supabase.from("partner_invite_codes").select("is_used");

    // 특정 파트너사가 발급한 코드만 조회
    if (created_by_user_id) {
      query = query.eq("created_by_user_id", created_by_user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Partner invite codes stats error:", error);
      return res.status(500).json({ error: "통계 조회에 실패했습니다." });
    }

    const total = data.length;
    const used = data.filter((code) => code.is_used).length;

    return res.status(200).json({
      total,
      used,
      unused: total - used,
    });
  } catch (error) {
    console.error("Partner invite codes stats error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너사 초대코드 삭제
router.delete("/partner-invite-codes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 코드가 사용되었는지 확인
    const { data: codeData, error: checkError } = await supabase
      .from("partner_invite_codes")
      .select("is_used")
      .eq("id", id)
      .single();

    if (checkError) {
      return res.status(404).json({ error: "코드를 찾을 수 없습니다." });
    }

    if (codeData.is_used) {
      return res
        .status(400)
        .json({ error: "이미 사용된 코드는 삭제할 수 없습니다." });
    }

    // 코드 삭제
    const { error } = await supabase
      .from("partner_invite_codes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Partner invite code deletion error:", error);
      return res.status(500).json({ error: "코드 삭제에 실패했습니다." });
    }

    return res.status(200).json({ message: "코드가 삭제되었습니다." });
  } catch (error) {
    console.error("Partner invite code deletion error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너사 계층 구조 통계 조회
router.get("/partner-hierarchy/stats", async (req, res) => {
  try {
    const { parent_partner_id } = req.query;

    if (!parent_partner_id) {
      return res.status(400).json({ error: "parent_partner_id가 필요합니다." });
    }

    // 하위 파트너사 수 조회
    const { data: hierarchyData, error: hierarchyError } = await supabase
      .from("partner_hierarchy")
      .select("child_partner_id")
      .eq("parent_partner_id", parent_partner_id);

    if (hierarchyError) {
      console.error("Partner hierarchy stats error:", hierarchyError);
      return res
        .status(500)
        .json({ error: "계층 구조 통계 조회에 실패했습니다." });
    }

    const total = hierarchyData.length;

    // 활성 파트너사 수 조회 (실제 구현에서는 파트너사 상태를 확인)
    const active = total; // 임시로 전체를 활성으로 처리

    return res.status(200).json({
      total,
      active,
      inactive: total - active,
    });
  } catch (error) {
    console.error("Partner hierarchy stats error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 하위 파트너사 목록 조회
router.get("/partner-hierarchy/children", async (req, res) => {
  try {
    const { parent_partner_id, status } = req.query;

    if (!parent_partner_id) {
      return res.status(400).json({ error: "parent_partner_id가 필요합니다." });
    }

    // 하위 파트너사 정보 조회
    const { data: hierarchyData, error: hierarchyError } = await supabase
      .from("partner_hierarchy")
      .select(
        `
        child_partner_id,
        created_at,
        partners!child_partner_id (
          id,
          manager_name,
          email,
          phone,
          created_at
        )
      `
      )
      .eq("parent_partner_id", parent_partner_id)
      .order("created_at", { ascending: false });

    if (hierarchyError) {
      console.error("Partner hierarchy children error:", hierarchyError);
      return res
        .status(500)
        .json({ error: "하위 파트너사 목록 조회에 실패했습니다." });
    }

    // 파트너사 정보 추출
    const partners = hierarchyData.map((item) => ({
      id: item.child_partner_id,
      manager_name: item.partners?.manager_name,
      email: item.partners?.email,
      phone: item.partners?.phone,
      created_at: item.created_at,
    }));

    return res.status(200).json(partners);
  } catch (error) {
    console.error("Partner hierarchy children error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너사 계층 구조 트리 조회
router.get("/partner-hierarchy/tree", async (req, res) => {
  try {
    const { root_partner_id } = req.query;

    if (!root_partner_id) {
      return res.status(400).json({ error: "root_partner_id가 필요합니다." });
    }

    // 재귀적으로 계층 구조 조회
    async function buildTree(partnerId) {
      // 파트너사 정보 조회
      const { data: partnerData, error: partnerError } = await supabase
        .from("partners")
        .select("id, manager_name, email")
        .eq("id", partnerId)
        .single();

      if (partnerError) {
        console.error("Partner data error:", partnerError);
        return null;
      }

      // 하위 파트너사 조회
      const { data: childrenData, error: childrenError } = await supabase
        .from("partner_hierarchy")
        .select("child_partner_id")
        .eq("parent_partner_id", partnerId);

      if (childrenError) {
        console.error("Children data error:", childrenError);
        return partnerData;
      }

      // 재귀적으로 하위 파트너사 트리 구성
      const children = await Promise.all(
        childrenData.map(async (child) => {
          return await buildTree(child.child_partner_id);
        })
      );

      return {
        ...partnerData,
        children: children.filter((child) => child !== null),
      };
    }

    const treeData = await buildTree(root_partner_id);

    if (!treeData) {
      return res.status(404).json({ error: "파트너사를 찾을 수 없습니다." });
    }

    return res.status(200).json(treeData);
  } catch (error) {
    console.error("Partner hierarchy tree error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너 목록 (관리자)
router.get("/partners", authenticateAdmin, async (req, res) => {
  try {
    // 개발/데모 모드: 더미 반환
    if (!process.env.SUPABASE_URL) {
      const items = [
        {
          id: "partner-mock-001",
          name: "크리에이티브 파트너",
          manager_name: "김파트너",
          phone: "010-1111-2222",
          email: "partner1@example.com",
          partner_code: "MOCK-AAA",
          approval_status: "approved",
          created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
          monthly_revenue: 24500000,
        },
        {
          id: "partner-mock-002",
          name: "미디어 플러스",
          manager_name: "이파트너",
          phone: "010-3333-4444",
          email: "partner2@example.com",
          partner_code: "MOCK-BBB",
          approval_status: "approved",
          created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
          monthly_revenue: 18500000,
        },
        {
          id: "partner-mock-003",
          name: "콘텐츠 메이커",
          manager_name: "박파트너",
          phone: "010-5555-6666",
          email: "partner3@example.com",
          partner_code: "MOCK-CCC",
          approval_status: "pending",
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
          monthly_revenue: 0,
        },
      ];
      return res.json({ items });
    }

    const { data, error } = await supabase
      .from("partners")
      .select(
        "id, manager_name, phone, email, partner_code, approval_status, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Fetch partners error:", error);
      return res
        .status(500)
        .json({ error: "파트너 목록 조회에 실패했습니다." });
    }
    // 매출 합산은 캠페인/주문 테이블이 정해지면 조인. 현재는 0으로 반환.
    const items = (data || []).map((p) => ({
      id: p.id,
      name: p.manager_name, // UI 표시는 운영명/담당자명 중 선택. 테이블에 상호명 컬럼 추가 시 교체.
      manager_name: p.manager_name,
      phone: p.phone,
      email: p.email,
      partner_code: p.partner_code,
      approval_status: p.approval_status || "approved",
      created_at: p.created_at,
      monthly_revenue: 0,
    }));
    return res.json({ items });
  } catch (e) {
    console.error("/admin/partners error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 대행사 목록 (관리자)
router.get("/agencies", authenticateAdmin, async (req, res) => {
  try {
    // 개발/데모 모드: 더미 반환
    if (!process.env.SUPABASE_URL) {
      const items = [
        {
          id: "agen-mock-001",
          agency_name: "토탈 마케팅",
          manager_name: "김대행",
          phone: "010-2222-3333",
          email: "agency1@example.com",
          approval_status: "approved",
          created_at: new Date(Date.now() - 86400000 * 150).toISOString(),
          clients: 12,
        },
        {
          id: "agen-mock-002",
          agency_name: "디지털 에이전시",
          manager_name: "이대행",
          phone: "010-4444-5555",
          email: "agency2@example.com",
          approval_status: "approved",
          created_at: new Date(Date.now() - 86400000 * 110).toISOString(),
          clients: 8,
        },
        {
          id: "agen-mock-003",
          agency_name: "크리에이티브 솔루션",
          manager_name: "박대행",
          phone: "010-6666-7777",
          email: "agency3@example.com",
          approval_status: "pending",
          created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
          clients: 0,
        },
      ];
      return res.json({ items });
    }

    let query = supabase
      .from("agencies")
      .select(
        "id, agency_name, manager_name, phone, email, approval_status, created_at"
      )
      .order("created_at", { ascending: false });
    let { data, error } = await query;
    if (
      error &&
      (error.code === "42703" ||
        (error.message || "").includes("approval_status"))
    ) {
      // approval_status 컬럼이 없는 경우 최소 필드로 재시도
      ({ data, error } = await supabase
        .from("agencies")
        .select("id, agency_name, manager_name, phone, email, created_at")
        .order("created_at", { ascending: false }));
    }
    if (error) {
      console.error("Fetch agencies error:", error);
      return res
        .status(500)
        .json({ error: "대행사 목록 조회에 실패했습니다." });
    }

    const items = (data || []).map((a) => ({
      id: a.id,
      agency_name: a.agency_name,
      manager_name: a.manager_name,
      phone: a.phone,
      email: a.email,
      approval_status: a.approval_status || "approved",
      created_at: a.created_at,
      clients: 0,
    }));
    return res.json({ items });
  } catch (e) {
    console.error("/admin/agencies error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너 상세 (관리자)
router.get("/partners/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!process.env.SUPABASE_URL) {
      // 데모 상세
      return res.json({
        id,
        name: "크리에이티브 파트너",
        manager_name: "김파트너",
        phone: "010-1111-2222",
        email: "partner1@example.com",
        partner_code: "MOCK-AAA",
        approval_status: "approved",
        created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
        campaigns: [],
        monthly_revenue: 24500000,
      });
    }

    const { data, error } = await supabase
      .from("partners")
      .select(
        "id, manager_name, phone, email, partner_code, approval_status, created_at"
      )
      .eq("id", id)
      .single();
    if (error || !data)
      return res.status(404).json({ error: "파트너를 찾을 수 없습니다." });

    // TODO: 캠페인/정산 데이터 조인
    const detail = {
      id: data.id,
      name: data.manager_name,
      manager_name: data.manager_name,
      phone: data.phone,
      email: data.email,
      partner_code: data.partner_code,
      approval_status: data.approval_status || "approved",
      created_at: data.created_at,
      campaigns: [],
      monthly_revenue: 0,
    };
    return res.json(detail);
  } catch (e) {
    console.error("/admin/partners/:id error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 고객사 목록 (관리자)
router.get("/customers", authenticateAdmin, async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL) {
      const items = [
        {
          id: "cust-mock-001",
          company_name: "ABC 마케팅",
          manager_name: "김대표",
          phone: "010-1234-5678",
          approval_status: "approved",
          created_at: new Date(Date.now() - 86400000 * 100).toISOString(),
          running: 15,
          progress: 0.5,
        },
        {
          id: "cust-mock-002",
          company_name: "디지털 플러스",
          manager_name: "이대표",
          phone: "010-9876-5432",
          approval_status: "pending",
          created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
          running: 0,
          progress: 0.25,
        },
        {
          id: "cust-mock-003",
          company_name: "스마트솔루션",
          manager_name: "박대표",
          phone: "010-5555-1234",
          approval_status: "approved",
          created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
          running: 8,
          progress: 0.75,
        },
      ];
      return res.json({ items });
    }

    let { data, error } = await supabase
      .from("advertisers")
      .select("id, company_name, manager_name, phone, email, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Fetch customers error:", error);
      return res
        .status(500)
        .json({ error: "고객사 목록 조회에 실패했습니다." });
    }
    const items = (data || []).map((c) => ({
      id: c.id,
      company_name: c.company_name,
      manager_name: c.manager_name,
      phone: c.phone,
      approval_status: "approved",
      created_at: c.created_at,
      running: 0,
      progress: 0,
    }));
    return res.json({ items });
  } catch (e) {
    console.error("/admin/customers error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 파트너 정산 요약 (관리자) - 데모/기본값
router.get("/partners/:id/settlement", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!process.env.SUPABASE_URL) {
      return res.json({
        partnerId: id,
        month: new Date().toISOString().slice(0, 7),
        totalRevenue: 24500000,
        payableAmount: 19600000,
        items: [
          { date: "2024-09-01", campaign: "유입형 A", amount: 3500000 },
          { date: "2024-09-05", campaign: "콘텐츠 B", amount: 4200000 },
        ],
      });
    }
    // 실제 구현 시 정산 데이터 조인/집계
    return res.json({
      partnerId: id,
      month: new Date().toISOString().slice(0, 7),
      totalRevenue: 0,
      payableAmount: 0,
      items: [],
    });
  } catch (e) {
    console.error("/admin/partners/:id/settlement error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 가입 대기 회원 목록 조회 (관리자)
// /api/admin/members/pending?type=agency|advertiser|partner
router.get("/members/pending", authenticateAdmin, async (req, res) => {
  try {
    const type = (req.query.type || "agency").toLowerCase();
    const tableMap = {
      advertiser: {
        table: "advertisers",
        select:
          "id, company_name, business_number, manager_name, phone, email, approval_status, approved_at, rejected_reason, created_at",
        nameField: "company_name",
      },
      agency: {
        table: "agencies",
        select:
          "id, agency_name, business_number, manager_name, phone, email, approval_status, approved_at, rejected_reason, created_at, website_url",
        nameField: "agency_name",
      },
      partner: {
        table: "partners",
        select:
          "id, partner_code, manager_name, phone, email, approval_status, approved_at, rejected_reason, created_at",
        nameField: null,
      },
    };

    const meta = tableMap[type];
    if (!meta) return res.status(400).json({ error: "유효하지 않은 type" });

    const { data, error } = await supabase
      .from(meta.table)
      .select(meta.select)
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch pending members error:", error);
      return res.status(500).json({ error: "목록 조회에 실패했습니다." });
    }

    const items = (data || []).map((row) => ({
      id: row.id,
      bizNo: row.business_number,
      name:
        type === "agency"
          ? row.agency_name
          : type === "advertiser"
          ? row.company_name
          : row.manager_name,
      phone: row.phone,
      email: row.email,
      extra:
        type === "agency"
          ? { website_url: row.website_url }
          : type === "partner"
          ? { partner_code: row.partner_code }
          : {},
      approval_status: row.approval_status,
      created_at: row.created_at,
    }));

    return res.json({ items });
  } catch (e) {
    console.error("/admin/members/pending error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 회원 승인 (관리자)
// POST /api/admin/members/:type/:id/approve
router.post(
  "/members/:type/:id/approve",
  authenticateAdmin,
  async (req, res) => {
    try {
      const type = (req.params.type || "").toLowerCase();
      const id = req.params.id;
      const table =
        type === "agency"
          ? "agencies"
          : type === "advertiser"
          ? "advertisers"
          : type === "partner"
          ? "partners"
          : null;
      if (!table) return res.status(400).json({ error: "유효하지 않은 type" });

      const { data, error } = await supabase
        .from(table)
        .update({
          approval_status: "approved",
          approved_at: new Date().toISOString(),
          rejected_reason: null,
        })
        .eq("id", id)
        .select("id, approval_status, approved_at")
        .single();

      if (error) {
        console.error("Approve member error:", error);
        return res.status(500).json({ error: "승인 처리에 실패했습니다." });
      }

      return res.json({ message: "승인되었습니다.", result: data });
    } catch (e) {
      console.error("/admin/members/:type/:id/approve error", e);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);

// 회원 거절 (관리자)
// POST /api/admin/members/:type/:id/reject { reason }
router.post(
  "/members/:type/:id/reject",
  authenticateAdmin,
  async (req, res) => {
    try {
      const type = (req.params.type || "").toLowerCase();
      const id = req.params.id;
      const reason = (req.body?.reason || "").slice(0, 500);
      const table =
        type === "agency"
          ? "agencies"
          : type === "advertiser"
          ? "advertisers"
          : type === "partner"
          ? "partners"
          : null;
      if (!table) return res.status(400).json({ error: "유효하지 않은 type" });

      const { data, error } = await supabase
        .from(table)
        .update({
          approval_status: "rejected",
          rejected_reason: reason || null,
        })
        .eq("id", id)
        .select("id, approval_status, rejected_reason")
        .single();

      if (error) {
        console.error("Reject member error:", error);
        return res.status(500).json({ error: "거절 처리에 실패했습니다." });
      }

      return res.json({ message: "거절되었습니다.", result: data });
    } catch (e) {
      console.error("/admin/members/:type/:id/reject error", e);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);

// 1:1문의 목록 조회 (관리자용)
router.get("/tickets", authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
    const status = req.query.status; // open, pending, resolved, closed
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
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
        created_by,
        assignee
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // 상태 필터링
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Admin fetch tickets error:", error);
      return res.status(500).json({ error: "1:1문의 조회에 실패했습니다." });
    }

    const totalItems = count || 0;
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    // 데이터 변환
    const transformedTickets = (data || []).map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      content: ticket.content,
      category: ticket.category,
      status: ticket.status,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      createdBy: {
        id: ticket.created_by,
        username: "사용자", // 임시로 고정값 사용
        userType: "agency", // 임시로 고정값 사용
      },
      assignee: ticket.assignee
        ? {
            id: ticket.assignee,
            username: "관리자",
            userType: "admin",
          }
        : null,
    }));

    return res.json({
      tickets: transformedTickets,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (e) {
    console.error("/admin/tickets error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 1:1문의 상세 조회 (관리자용)
router.get("/tickets/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 티켓 정보 조회
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
        created_by,
        assignee
      `
      )
      .eq("id", id)
      .single();

    if (ticketError || !ticketData) {
      return res.status(404).json({ error: "문의를 찾을 수 없습니다." });
    }

    // 댓글 조회
    const { data: commentsData, error: commentsError } = await supabase
      .from("ticket_comments")
      .select(
        `
        id,
        content,
        created_at,
        author_id
      `
      )
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("Comments fetch error:", commentsError);
    }

    // 데이터 변환
    const ticket = {
      id: ticketData.id,
      title: ticketData.title,
      content: ticketData.content,
      category: ticketData.category,
      status: ticketData.status,
      createdAt: ticketData.created_at,
      updatedAt: ticketData.updated_at,
      createdBy: {
        id: ticketData.created_by,
        username: "사용자", // 임시로 고정값 사용
        userType: "agency", // 임시로 고정값 사용
      },
      assignee: ticketData.assignee
        ? {
            id: ticketData.assignee,
            username: "관리자",
            userType: "admin",
          }
        : null,
      comments: (commentsData || []).map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        author: {
          id: comment.author_id,
          username: "관리자",
          userType: "admin",
        },
      })),
    };

    return res.json({ ticket });
  } catch (e) {
    console.error("/admin/tickets/:id error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 1:1문의 상태 업데이트 (관리자용)
router.put("/tickets/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !status ||
      !["open", "pending", "resolved", "closed"].includes(status)
    ) {
      return res.status(400).json({ error: "유효하지 않은 상태입니다." });
    }

    const updateData = { status };

    // 상태가 pending으로 변경되면 현재 관리자를 담당자로 설정
    if (status === "pending") {
      updateData.assignee = req.user?.id || null;
    }

    const { data, error } = await supabase
      .from("tickets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update ticket status error:", error);
      return res.status(500).json({ error: "상태 업데이트에 실패했습니다." });
    }

    return res.json({
      message: "상태가 업데이트되었습니다.",
      ticket: data,
    });
  } catch (e) {
    console.error("/admin/tickets/:id/status error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 1:1문의 답변 추가 (관리자용)
router.post("/tickets/:id/comments", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "답변 내용을 입력해주세요." });
    }

    // JWT/임시 토큰에서 해석된 관리자 UUID
    const authorId = req.user?.id;
    if (!authorId) {
      return res
        .status(400)
        .json({ error: "관리자 사용자 ID가 확인되지 않습니다." });
    }

    const { data, error } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: id,
        author_id: authorId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Add comment error:", error);
      return res.status(500).json({ error: "답변 등록에 실패했습니다." });
    }

    // 티켓 상태가 open이면 pending으로 변경
    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        status: "pending",
        assignee: authorId,
      })
      .eq("id", id)
      .eq("status", "open");

    if (updateError) {
      console.error("Update ticket status error:", updateError);
    }

    return res.json({
      message: "답변이 등록되었습니다.",
      comment: data,
    });
  } catch (e) {
    console.error("/admin/tickets/:id/comments error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 공지사항 목록 (공개)
router.get("/notices/public", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "6", 10), 1);
    const audience = (req.query.audience || "all").toLowerCase();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // audience 필터: all 또는 특정 대상 포함 행
    const baseQuery = supabase
      .from("notices")
      .select(
        "id, title, content, category, target_audience, pinned, visible, created_by, created_at, updated_at",
        { count: "exact" }
      )
      .eq("visible", true)
      .order("created_at", { ascending: false });

    let query = baseQuery;
    // audience 필터링은 현재 테이블 구조에서 지원하지 않으므로 제거

    const { data, error, count } = await query.range(from, to);
    if (error) {
      console.error("Fetch notices error:", error);
      return res.status(500).json({ error: "공지사항 조회에 실패했습니다." });
    }

    const totalItems = count || 0;
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    // 프론트엔드가 기대하는 필드명으로 변환
    const transformedNotices = (data || []).map((notice) => ({
      ...notice,
      category: notice.category || "service",
      target_audience: notice.target_audience || "all",
      is_important: notice.pinned,
      is_active: notice.visible,
    }));

    return res.json({
      notices: transformedNotices,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (e) {
    console.error("/notices/public error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 공지사항 목록 (관리자용 - 모든 공지사항 조회)
router.get("/notices", authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "50", 10), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("notices")
      .select(
        "id, title, content, category, target_audience, pinned, visible, created_by, created_at, updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Admin fetch notices error:", error);
      return res.status(500).json({ error: "공지사항 조회에 실패했습니다." });
    }

    const totalItems = count || 0;
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    // 프론트엔드가 기대하는 필드명으로 변환
    const transformedNotices = (data || []).map((notice) => ({
      ...notice,
      category: notice.category || "service",
      target_audience: notice.target_audience || "all",
      is_important: notice.pinned,
      is_active: notice.visible,
    }));

    return res.json({
      notices: transformedNotices,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (e) {
    console.error("/notices admin error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 공지사항 등록 (관리자)
router.post("/notices", authenticateAdmin, async (req, res) => {
  try {
    const { title, content, category, target_audience, is_important } =
      req.body || {};
    if (!title || !content) {
      return res.status(400).json({ error: "제목과 내용은 필수입니다." });
    }

    const { data, error } = await supabase
      .from("notices")
      .insert({
        title,
        content,
        category: category || "service",
        target_audience: target_audience || "all",
        pinned: !!is_important, // is_important를 pinned로 매핑
        visible: true, // is_active를 visible로 매핑
        created_by: null, // UUID 타입이므로 null로 설정
      })
      .select(
        "id, title, content, category, target_audience, pinned, visible, created_by, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("Create notice error:", error);
      return res.status(500).json({ error: "공지사항 저장에 실패했습니다." });
    }

    // 프론트엔드가 기대하는 필드명으로 변환
    const transformedNotice = {
      ...data,
      category: data.category || "service",
      target_audience: data.target_audience || "all",
      is_important: data.pinned,
      is_active: data.visible,
    };

    return res.status(201).json({
      message: "공지사항이 등록되었습니다.",
      notice: transformedNotice,
    });
  } catch (e) {
    console.error("/notices create error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 공지사항 목록 (관리자)
router.get("/notices", authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("notices")
      .select(
        "id, title, content, category, target_audience, is_important, is_active, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Admin fetch notices error:", error);
      return res.status(500).json({ error: "공지사항 조회에 실패했습니다." });
    }

    const totalItems = count || 0;
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    return res.json({
      notices: data || [],
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (e) {
    console.error("/notices admin list error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 공지사항 수정 (관리자)
router.put("/notices/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      target_audience,
      is_important,
      is_active,
    } = req.body || {};

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (is_important !== undefined) updates.pinned = !!is_important;
    if (is_active !== undefined) updates.visible = !!is_active;

    const { data, error } = await supabase
      .from("notices")
      .update(updates)
      .eq("id", id)
      .select(
        "id, title, content, pinned, visible, created_by, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("Update notice error:", error);
      return res.status(500).json({ error: "공지사항 수정에 실패했습니다." });
    }

    // 프론트엔드가 기대하는 필드명으로 변환
    const transformedNotice = {
      ...data,
      category: notice.category || "service",
      target_audience: notice.target_audience || "all",
      is_important: data.pinned,
      is_active: data.visible,
    };

    return res.json({
      message: "공지사항이 수정되었습니다.",
      notice: transformedNotice,
    });
  } catch (e) {
    console.error("/notices update error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 공지사항 삭제 (관리자)
router.delete("/notices/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) {
      console.error("Delete notice error:", error);
      return res.status(500).json({ error: "공지사항 삭제에 실패했습니다." });
    }
    return res.json({ message: "공지사항이 삭제되었습니다." });
  } catch (e) {
    console.error("/notices delete error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 결제 내역 목록 (임시): 3사 캠페인 데이터를 결제 목록 형태로 매핑
router.get("/payments", authenticateAdmin, async (req, res) => {
  try {
    // campaigns 테이블 기준으로 최근 내역 200건
    const { data, error } = await supabase
      .from("campaigns")
      .select(
        `id, title, campaign_type, created_at, target_count, budget, created_by,
         user_profiles!created_by(username)`
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Fetch campaigns for payments error:", error);
      return res.status(500).json({ error: "결제내역 조회에 실패했습니다." });
    }

    const mapService = (type) => {
      if (type === "product") return { key: "review", label: "쿠팡구매평" };
      if (type === "traffic") return { key: "traffic", label: "유입형" };
      if (type === "content") return { key: "content", label: "콘텐츠제작" };
      return { key: "experience", label: "체험단" };
    };

    const unitPriceByType = (type) => {
      if (type === "product") return 3000;
      if (type === "traffic") return 3000;
      if (type === "content") return 4000;
      return 3000;
    };

    const items = (data || []).map((c) => {
      const created = new Date(c.created_at);
      const service = mapService(c.campaign_type);
      const unit = unitPriceByType(c.campaign_type);
      const qty = c.target_count || 0;
      return {
        date: created.toISOString().slice(0, 10),
        time: created.toTimeString().slice(0, 5),
        campaignName: c.title,
        campaignId: `#CAMP-${created.getFullYear()}-${String(c.id).slice(
          0,
          8
        )}`,
        clientName: c.user_profiles?.username || "알 수 없음",
        clientContact: null,
        service: service.key,
        serviceLabel: service.label,
        quantity: qty,
        unitPrice: unit,
        totalAmount: qty * unit,
        status: "completed",
        statusLabel: "완료",
      };
    });

    const stats = items.reduce(
      (acc, it) => {
        acc[it.service] = (acc[it.service] || 0) + 1;
        return acc;
      },
      { review: 0, traffic: 0, experience: 0, content: 0 }
    );

    return res.json({ items, stats });
  } catch (e) {
    console.error("/admin/payments error", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// ===== 알림 시스템 API =====

// 알림 목록 조회
router.get("/notifications", authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
    const type = req.query.type || "all";
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (type !== "all") {
      query = query.eq("type", type);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Fetch notifications error:", error);
      return res.status(500).json({ error: "알림 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      notifications: data || [],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        totalItems: count || 0,
        hasNext: to < (count || 0) - 1,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({ error: "알림 조회 중 오류가 발생했습니다." });
  }
});

// 알림 상세 조회
router.get("/notifications/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch notification error:", error);
      return res.status(500).json({ error: "알림 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      notification: data,
    });
  } catch (error) {
    console.error("Notification fetch error:", error);
    res.status(500).json({ error: "알림 조회 중 오류가 발생했습니다." });
  }
});

// 알림 읽음 처리
router.put("/notifications/:id/read", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Mark notification read error:", error);
      return res.status(500).json({ error: "읽음 처리에 실패했습니다." });
    }

    res.json({
      success: true,
      notification: data,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "읽음 처리 중 오류가 발생했습니다." });
  }
});

// 모든 알림 읽음 처리
router.put("/notifications/read-all", authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false)
      .select();

    if (error) {
      console.error("Mark all notifications read error:", error);
      return res.status(500).json({ error: "읽음 처리에 실패했습니다." });
    }

    res.json({
      success: true,
      updatedCount: data?.length || 0,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ error: "읽음 처리 중 오류가 발생했습니다." });
  }
});

// 알림 생성
router.post("/notifications", authenticateAdmin, async (req, res) => {
  try {
    const { user_id, type, title, message, related_id } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ error: "필수 필드가 누락되었습니다." });
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        type,
        title,
        message,
        related_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Create notification error:", error);
      return res.status(500).json({ error: "알림 생성에 실패했습니다." });
    }

    res.json({
      success: true,
      notification: data,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ error: "알림 생성 중 오류가 발생했습니다." });
  }
});

// ===== 결제 관리 API =====

// 결제 목록 조회 (관리자용)
router.get("/payments", authenticateAdmin, async (req, res) => {
  try {
    // DEMO/로컬 환경: Supabase 미설정 시 더미 응답 반환
    if (!process.env.SUPABASE_URL) {
      const now = new Date();
      const demo = Array.from({ length: 5 }).map((_, i) => ({
        id: `PAY-DEMO-${i + 1}`,
        payer_name: `데모사용자${i + 1}`,
        amount: 1000000 * (i + 1),
        payment_status:
          i % 3 === 0
            ? "pending_approval"
            : i % 3 === 1
            ? "active"
            : "completed",
        payment_date: new Date(now.getTime() - i * 86400000).toISOString(),
      }));
      return res.json({
        success: true,
        payments: demo,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: demo.length,
          hasNext: false,
          hasPrev: false,
        },
      });
    }
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
    const status = req.query.status || "all";
    const type = req.query.type || "all";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("payments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("payment_status", status);
    }

    if (type !== "all") {
      query = query.eq("payment_type", type);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Fetch payments error:", error);
      return res.status(500).json({ error: "결제 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      payments: data || [],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        totalItems: count || 0,
        hasNext: to < (count || 0) - 1,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Payments fetch error:", error);
    // 실패시에도 최소 더미 응답 반환(프론트 에러 화면 방지)
    const demo = [
      {
        id: "PAY-ERR-1",
        payer_name: "데모사용자",
        amount: 0,
        payment_status: "pending_approval",
        payment_date: new Date().toISOString(),
      },
    ];
    res.json({
      success: true,
      payments: demo,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: demo.length,
        hasNext: false,
        hasPrev: false,
      },
    });
  }
});

// 캠페인 원고 목록 조회 (관리자용)
router.get(
  "/api/admin/partner-settlements",
  authenticateAdmin,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page || "1", 10);
      const limit = Math.min(parseInt(req.query.limit || "100", 10), 1000);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // 데모/로컬 환경: Supabase 미설정 시 샘플 데이터 반환
      if (!process.env.SUPABASE_URL) {
        const sample = [
          {
            id: "demo-set-1",
            settlement_month: "2025-09",
            partner_id: "partner-aaa",
            partner_name: "벨라뷰티",
            customer_name: "비앤비지",
            review_count: 45,
            unit_price: 300,
            amount: 13500,
            status: "pending",
          },
          {
            id: "demo-set-2",
            settlement_month: "2025-09",
            partner_id: "partner-bbb",
            partner_name: "크리에이티브 파트너",
            customer_name: "센텔리안",
            review_count: 67,
            unit_price: 300,
            amount: 20100,
            status: "completed",
          },
        ];
        return res.json({
          items: sample,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });
      }

      // 실제 DB에서 partner_settlements 테이블 조회 (존재 시)
      let rows = [];
      try {
        const { data, error, count } = await supabase
          .from("partner_settlements")
          .select("*", { count: "exact" })
          .order("settlement_month", { ascending: false })
          .range(from, to);
        if (error) throw error;
        rows = data || [];
        const total = typeof count === "number" ? count : rows.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        return res.json({
          items: rows,
          pagination: {
            currentPage: page,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        });
      } catch (dbErr) {
        console.warn(
          "partner_settlements select error:",
          dbErr?.message || dbErr
        );
        // 테이블 부재/오류시 빈 배열 반환
        return res.json({
          items: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        });
      }
    } catch (e) {
      console.error("/api/admin/partner-settlements error", e);
      res
        .status(500)
        .json({ error: "파트너 정산 목록을 불러오지 못했습니다." });
    }
  }
);

// 파트너 코드로 가입한 회원 목록 (관리자용)
router.get(
  "/api/admin/partner-members",
  authenticateAdmin,
  async (req, res) => {
    try {
      const code = req.query.code || req.query.partner_code;
      if (!code) return res.json({ items: [] });

      if (!process.env.SUPABASE_URL) {
        return res.json({
          items: [
            {
              id: "demo-m-1",
              name: "김회원",
              email: "kim@example.com",
              phone: "010-1234-5678",
              joinDate: "2025-01-15",
              status: "active",
              totalOrders: 5,
              totalAmount: 150000,
            },
            {
              id: "demo-m-2",
              name: "이회원",
              email: "lee@example.com",
              phone: "010-2345-6789",
              joinDate: "2025-01-20",
              status: "active",
              totalOrders: 3,
              totalAmount: 90000,
            },
          ],
        });
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select(
            "id, name, email, phone, created_at, status, total_orders, total_amount"
          )
          .eq("partner_code", code);
        if (error) throw error;
        const mapped = (data || []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          joinDate: u.created_at,
          status: u.status || "active",
          totalOrders: u.total_orders || 0,
          totalAmount: u.total_amount || 0,
        }));
        return res.json({ items: mapped });
      } catch (dbErr) {
        console.warn("partner-members select error:", dbErr?.message || dbErr);
        return res.json({ items: [] });
      }
    } catch (e) {
      console.error("/api/admin/partner-members error", e);
      res
        .status(500)
        .json({ error: "파트너 회원 목록을 불러오지 못했습니다." });
    }
  }
);

router.get(
  "/campaigns/:id/manuscripts",
  authenticateAdmin,
  async (req, res) => {
    try {
      const idParam = req.params.id;
      const campaignUuid = await resolveCampaignUuid(idParam);
      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      const { data, error } = await supabase
        .from("manuscripts")
        .select(
          "id,campaign_id,file_name,file_path,file_url,size,created_at,uploaded_by"
        )
        .eq("campaign_id", campaignUuid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Admin fetch manuscripts error:", error);
        return res.status(500).json({ error: "원고 조회에 실패했습니다." });
      }

      return res.json({ success: true, manuscripts: data || [] });
    } catch (e) {
      console.error("Admin manuscripts fetch error:", e);
      return res
        .status(500)
        .json({ error: "원고 조회 중 오류가 발생했습니다." });
    }
  }
);

// 원고 파일 다운로드 (관리자용, 원본 파일명으로)
router.get(
  "/campaigns/:id/manuscripts/:manuscriptId/download",
  authenticateAdmin,
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

// resolveCampaignUuid 함수 (admin.js에서 사용)
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

// 결제 상세 조회
router.get("/payments/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch payment error:", error);
      return res.status(500).json({ error: "결제 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      payment: data,
    });
  } catch (error) {
    console.error("Payment fetch error:", error);
    res.status(500).json({ error: "결제 조회 중 오류가 발생했습니다." });
  }
});

// 결제 승인
router.put("/payments/:id/approve", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, memo } = req.body;

    const { data, error } = await supabase
      .from("payments")
      .update({
        payment_status: status || "active",
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Approve payment error:", error);
      return res.status(500).json({ error: "결제 승인에 실패했습니다." });
    }

    res.json({
      success: true,
      payment: data,
    });
  } catch (error) {
    console.error("Approve payment error:", error);
    res.status(500).json({ error: "결제 승인 중 오류가 발생했습니다." });
  }
});

// 결제 거부
router.put("/payments/:id/reject", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { memo } = req.body;

    const { data, error } = await supabase
      .from("payments")
      .update({
        payment_status: "rejected",
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Reject payment error:", error);
      return res.status(500).json({ error: "결제 거부에 실패했습니다." });
    }

    res.json({
      success: true,
      payment: data,
    });
  } catch (error) {
    console.error("Reject payment error:", error);
    res.status(500).json({ error: "결제 거부 중 오류가 발생했습니다." });
  }
});

// 일괄 결제 승인
router.put("/payments/bulk-approve", authenticateAdmin, async (req, res) => {
  try {
    const { payment_ids, memo } = req.body;

    if (
      !payment_ids ||
      !Array.isArray(payment_ids) ||
      payment_ids.length === 0
    ) {
      return res.status(400).json({ error: "승인할 결제 ID가 필요합니다." });
    }

    const { data, error } = await supabase
      .from("payments")
      .update({
        payment_status: "active",
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .in("id", payment_ids)
      .select();

    if (error) {
      console.error("Bulk approve payments error:", error);
      return res.status(500).json({ error: "일괄 승인에 실패했습니다." });
    }

    res.json({
      success: true,
      updatedCount: data?.length || 0,
      payments: data,
    });
  } catch (error) {
    console.error("Bulk approve payments error:", error);
    res.status(500).json({ error: "일괄 승인 중 오류가 발생했습니다." });
  }
});

// 결제 통계 조회
router.get("/payments/stats", authenticateAdmin, async (req, res) => {
  try {
    const { data: payments, error } = await supabase
      .from("payments")
      .select("payment_status, amount");

    if (error) {
      console.error("Fetch payment stats error:", error);
      return res.status(500).json({ error: "결제 통계 조회에 실패했습니다." });
    }

    const stats = {
      pending: 0,
      active: 0,
      completed: 0,
      totalAmount: 0,
    };

    payments?.forEach((payment) => {
      if (payment.payment_status === "pending_approval") stats.pending++;
      else if (payment.payment_status === "active") stats.active++;
      else if (payment.payment_status === "completed") stats.completed++;

      if (payment.amount) {
        stats.totalAmount += parseFloat(payment.amount);
      }
    });

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Payment stats error:", error);
    res.status(500).json({ error: "결제 통계 조회 중 오류가 발생했습니다." });
  }
});

// ===== 캠페인 관리 API =====

// 캠페인 목록 조회
router.get("/campaigns", authenticateAdmin, async (req, res) => {
  try {
    // DEMO/로컬 환경: Supabase 미설정 시 더미 캠페인 반환
    if (!process.env.SUPABASE_URL) {
      const demoCampaigns = [
        {
          id: "C-DEMO-1",
          title: "데모 캠페인 A",
          status: "pending",
          campaign_code: "AC-0101",
          budget: 1500000,
          created_at: new Date().toISOString(),
        },
        {
          id: "C-DEMO-2",
          title: "데모 캠페인 B",
          status: "active",
          campaign_code: "BC-0102",
          budget: 2500000,
          created_at: new Date().toISOString(),
        },
        {
          id: "C-DEMO-3",
          title: "데모 캠페인 C",
          status: "completed",
          campaign_code: "PC-0103",
          budget: 500000,
          created_at: new Date().toISOString(),
        },
      ];
      return res.json({
        success: true,
        campaigns: demoCampaigns,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: demoCampaigns.length,
          hasNext: false,
          hasPrev: false,
        },
      });
    }
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const createdBy = req.query.created_by || "all";

    let query = supabase
      .from("campaigns")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (createdBy !== "all") {
      query = query.eq("created_by", createdBy);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Fetch campaigns error:", error);
      return res.status(500).json({ error: "캠페인 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      campaigns: data || [],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        totalItems: count || 0,
        hasNext: to < (count || 0) - 1,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Campaigns fetch error:", error);
    // 실패 시에도 최소 더미 응답 반환
    const demoCampaigns = [
      {
        id: "C-ERR-1",
        title: "데모 캠페인",
        status: "pending",
        campaign_code: "AC-0000",
        budget: 0,
        created_at: new Date().toISOString(),
      },
    ];
    res.json({
      success: true,
      campaigns: demoCampaigns,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: demoCampaigns.length,
        hasNext: false,
        hasPrev: false,
      },
    });
  }
});

// 캠페인 일정 업데이트 (start_date/end_date) + 변경일시 기록
router.put("/campaigns/:id/schedule", authenticateAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { start_date: startDate, end_date: endDate, notes } = req.body || {};

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "시작일과 종료일은 필수입니다." });
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
    if (!row)
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });

    const nowIso = new Date().toISOString();
    const currentReq = row.requirements || {};
    const prevLogs = Array.isArray(currentReq.updateLogs)
      ? currentReq.updateLogs
      : [];
    // 날짜 포맷팅 함수
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
    };

    const newLog = {
      type: "스케줄 변경",
      date: nowIso,
      changedAt: nowIso,
      startDate: startDate,
      endDate: endDate,
      notes: notes || null,
      memo: `캠페인 일정이 ${formatDate(startDate)}부터 ${formatDate(
        endDate
      )}까지로 변경되었습니다.${notes ? ` (메모: ${notes})` : ""}`,
    };
    const nextReq = {
      ...currentReq,
      schedule: {
        ...(currentReq.schedule || {}),
        notes: notes || null,
      },
      schedule_changed_at: nowIso,
      scheduleUpdated: true,
      updateLogs: [newLog, ...prevLogs],
    };

    const { data: updated, error: updateErr } = await supabase
      .from("campaigns")
      .update({
        start_date: startDate,
        end_date: endDate,
        requirements: nextReq,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .select("id, campaign_code, title, start_date, end_date, requirements")
      .single();

    if (updateErr) {
      console.error("Update campaign schedule error:", updateErr);
      return res.status(500).json({ error: "일정 업데이트에 실패했습니다." });
    }

    return res.json({ success: true, campaign: updated });
  } catch (error) {
    console.error("Campaign schedule update error:", error);
    return res
      .status(500)
      .json({ error: "일정 업데이트 중 오류가 발생했습니다." });
  }
});

// 캠페인 승인
router.put("/campaigns/:id/approve", authenticateAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { memo } = req.body || {};

    // campaign_code로 우선 조회, 없으면 id로 조회
    let row = null;
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("id, campaign_code, status, requirements")
        .eq("campaign_code", id)
        .maybeSingle();
      row = data || null;
    } catch (_) {}
    if (!row) {
      const { data } = await supabase
        .from("campaigns")
        .select("id, campaign_code, status, requirements")
        .eq("id", id)
        .maybeSingle();
      row = data || null;
    }
    if (!row) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 이미 승인된 캠페인인지 확인
    if (row.status === "approved") {
      return res.status(400).json({ error: "이미 승인된 캠페인입니다." });
    }

    const nowIso = new Date().toISOString();
    const currentReq = row.requirements || {};
    const prevLogs = Array.isArray(currentReq.updateLogs)
      ? currentReq.updateLogs
      : [];
    const newLog = {
      type: "캠페인 승인",
      date: nowIso,
      changedAt: nowIso,
      memo: memo || null,
    };
    const nextReq = {
      ...currentReq,
      approved_at: nowIso,
      approved_by: req.user?.id || "admin",
      approval_memo: memo || null,
      updateLogs: [newLog, ...prevLogs],
    };

    const { data: updated, error: updateErr } = await supabase
      .from("campaigns")
      .update({
        status: "approved",
        requirements: nextReq,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .select("id, campaign_code, title, status, requirements")
      .single();

    if (updateErr) {
      console.error("Approve campaign error:", updateErr);
      return res.status(500).json({ error: "캠페인 승인에 실패했습니다." });
    }

    res.json({
      success: true,
      message: "캠페인이 승인되었습니다.",
      campaign: updated,
    });
  } catch (error) {
    console.error("Approve campaign error:", error);
    res.status(500).json({ error: "캠페인 승인 중 오류가 발생했습니다." });
  }
});

// 캠페인 반려
router.put("/campaigns/:id/reject", authenticateAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { reason } = req.body || {};

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ error: "반려 사유를 입력해주세요." });
    }

    // campaign_code로 우선 조회, 없으면 id로 조회
    let row = null;
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("id, campaign_code, status, requirements")
        .eq("campaign_code", id)
        .maybeSingle();
      row = data || null;
    } catch (_) {}
    if (!row) {
      const { data } = await supabase
        .from("campaigns")
        .select("id, campaign_code, status, requirements")
        .eq("id", id)
        .maybeSingle();
      row = data || null;
    }
    if (!row) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 이미 반려된 캠페인인지 확인
    if (row.status === "rejected") {
      return res.status(400).json({ error: "이미 반려된 캠페인입니다." });
    }

    const nowIso = new Date().toISOString();
    const currentReq = row.requirements || {};
    const prevLogs = Array.isArray(currentReq.updateLogs)
      ? currentReq.updateLogs
      : [];
    const newLog = {
      type: "캠페인 반려",
      date: nowIso,
      changedAt: nowIso,
      memo: reason.trim(),
    };
    const nextReq = {
      ...currentReq,
      rejected_at: nowIso,
      rejected_by: req.user?.id || "admin",
      rejection_reason: reason.trim(),
      updateLogs: [newLog, ...prevLogs],
    };

    const { data: updated, error: updateErr } = await supabase
      .from("campaigns")
      .update({
        status: "rejected",
        requirements: nextReq,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .select("id, campaign_code, title, status, requirements")
      .single();

    if (updateErr) {
      console.error("Reject campaign error:", updateErr);
      return res.status(500).json({ error: "캠페인 반려에 실패했습니다." });
    }

    res.json({
      success: true,
      message: "캠페인이 반려되었습니다.",
      campaign: updated,
    });
  } catch (error) {
    console.error("Reject campaign error:", error);
    res.status(500).json({ error: "캠페인 반려 중 오류가 발생했습니다." });
  }
});

// 캠페인 생성
router.post("/campaigns", authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      campaign_type, // 추가: NOT NULL 제약 대응
      platform,
      product_url,
      product_title,
      product_price,
      brand_name,
      product_category,
      partner_id,
      advertiser_id,
      budget,
      start_date,
      end_date,
      campaign_code,
      target_count,
      requirements,
      owner_user_id,
    } = req.body;

    if (!title || !campaign_code) {
      return res
        .status(400)
        .json({ error: "제목과 캠페인 코드는 필수입니다." });
    }

    // campaign_type 기본값 보정 (프론트 미전송 시 방어)
    const normalizedType = (campaign_type || "product")
      .toString()
      .toLowerCase();

    // created_by (NOT NULL) 채우기: 미들웨어에서 못 채운 경우 보조 조회
    let createdById = req.user?.id || null;
    // 전달된 소유자 우선 적용 (존재 검증 후)
    if (owner_user_id) {
      try {
        const { data: ownerRow } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", owner_user_id)
          .maybeSingle();
        if (ownerRow?.id) createdById = ownerRow.id;
      } catch (_) {}
    }
    if (!createdById) {
      try {
        const { data: adminProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("username", "admin")
          .maybeSingle();
        createdById = adminProfile?.id || null;
      } catch (_) {}
    }
    if (!createdById) {
      return res.status(401).json({
        error: "관리자 사용자 ID를 확인할 수 없습니다.",
      });
    }

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
        partner_id,
        advertiser_id,
        budget,
        start_date,
        end_date,
        campaign_code,
        created_by: createdById,
        target_count: Number.isFinite(target_count) ? target_count : null,
        requirements: requirements || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Create campaign error:", error);
      return res.status(500).json({ error: "캠페인 생성에 실패했습니다." });
    }

    // 캠페인 등록 시 결제 레코드 생성
    if (data && data.id && budget) {
      try {
        // payer_id는 advertiser_id 또는 created_by 중 선택
        const payerId = advertiser_id || createdById;

        const { error: paymentError } = await supabase.from("payments").insert({
          campaign_id: data.id,
          payer_id: payerId,
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

    res.json({
      success: true,
      campaign: data,
    });
  } catch (error) {
    console.error("Create campaign error:", error);
    res.status(500).json({ error: "캠페인 생성 중 오류가 발생했습니다." });
  }
});

// 캠페인 코드 중복 검사
router.get("/campaigns/check-code", authenticateAdmin, async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "캠페인 코드가 필요합니다." });
    }

    const { data, error } = await supabase
      .from("campaigns")
      .select("id")
      .eq("campaign_code", code)
      .single();

    res.json({
      success: true,
      exists: !!data,
    });
  } catch (error) {
    console.error("Check campaign code error:", error);
    res.status(500).json({ error: "캠페인 코드 검사 중 오류가 발생했습니다." });
  }
});

// 특정 날짜/파트너의 캠페인 수 조회
router.get("/campaigns/count", authenticateAdmin, async (req, res) => {
  try {
    const { date, partner } = req.query;

    let query = supabase.from("campaigns").select("id", { count: "exact" });

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      query = query
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString());
    }

    if (partner) {
      query = query.like("campaign_code", `${partner}%`);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Count campaigns error:", error);
      return res.status(500).json({ error: "캠페인 수 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      count: count || 0,
    });
  } catch (error) {
    console.error("Count campaigns error:", error);
    res.status(500).json({ error: "캠페인 수 조회 중 오류가 발생했습니다." });
  }
});

// ===== 캠페인 진행률 관리 API =====

// 캠페인 진행률 목록 조회
router.get("/campaign-progress", authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
    const campaign = req.query.campaign || "all";
    const range = req.query.range || "all";
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("campaign_progress")
      .select(
        `
        *,
        campaigns!inner(title, campaign_code)
      `,
        { count: "exact" }
      )
      .order("updated_at", { ascending: false });

    if (campaign !== "all") {
      query = query.eq("campaign_id", campaign);
    }

    if (range !== "all") {
      const [min, max] = range.split("-").map(Number);
      query = query
        .gte("progress_percentage", min)
        .lte("progress_percentage", max);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Fetch campaign progress error:", error);
      return res.status(500).json({ error: "진행률 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      progress: data || [],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        totalItems: count || 0,
        hasNext: to < (count || 0) - 1,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Campaign progress fetch error:", error);
    res.status(500).json({ error: "진행률 조회 중 오류가 발생했습니다." });
  }
});

// 캠페인 진행률 상세 조회
router.get("/campaign-progress/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("campaign_progress")
      .select(
        `
        *,
        campaigns!inner(title, campaign_code, description)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch campaign progress error:", error);
      return res.status(500).json({ error: "진행률 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      progress: data,
    });
  } catch (error) {
    console.error("Campaign progress fetch error:", error);
    res.status(500).json({ error: "진행률 조회 중 오류가 발생했습니다." });
  }
});

// 캠페인 진행률 생성/업데이트
router.post("/campaign-progress", authenticateAdmin, async (req, res) => {
  try {
    const {
      campaign_id,
      progress_percentage,
      status_message,
      next_milestone_date,
    } = req.body;

    if (!campaign_id || progress_percentage === undefined) {
      return res
        .status(400)
        .json({ error: "캠페인 ID와 진행률은 필수입니다." });
    }

    if (progress_percentage < 0 || progress_percentage > 100) {
      return res
        .status(400)
        .json({ error: "진행률은 0-100 사이의 값이어야 합니다." });
    }

    // 기존 진행률이 있는지 확인
    const { data: existing, error: checkError } = await supabase
      .from("campaign_progress")
      .select("id")
      .eq("campaign_id", campaign_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let result;
    if (existing) {
      // 기존 진행률 업데이트
      const { data, error } = await supabase
        .from("campaign_progress")
        .update({
          progress_percentage,
          status_message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Update campaign progress error:", error);
        return res
          .status(500)
          .json({ error: "진행률 업데이트에 실패했습니다." });
      }

      result = data;
    } else {
      // 새로운 진행률 생성
      const { data, error } = await supabase
        .from("campaign_progress")
        .insert({
          campaign_id,
          progress_percentage,
          status_message,
          next_milestone_date,
        })
        .select()
        .single();

      if (error) {
        console.error("Create campaign progress error:", error);
        return res.status(500).json({ error: "진행률 생성에 실패했습니다." });
      }

      result = data;
    }

    res.json({
      success: true,
      progress: result,
    });
  } catch (error) {
    console.error("Campaign progress create/update error:", error);
    res.status(500).json({ error: "진행률 처리 중 오류가 발생했습니다." });
  }
});

// 캠페인 진행률 통계 조회
router.get("/campaign-progress/stats", authenticateAdmin, async (req, res) => {
  try {
    const { data: progress, error } = await supabase
      .from("campaign_progress")
      .select("progress_percentage, campaigns!inner(status)");

    if (error) {
      console.error("Fetch campaign progress stats error:", error);
      return res
        .status(500)
        .json({ error: "진행률 통계 조회에 실패했습니다." });
    }

    const stats = {
      active: 0,
      completed: 0,
      average: 0,
      total: progress?.length || 0,
    };

    let totalProgress = 0;
    progress?.forEach((item) => {
      totalProgress += item.progress_percentage;
      if (item.campaigns?.status === "active") stats.active++;
      if (item.campaigns?.status === "completed") stats.completed++;
    });

    if (stats.total > 0) {
      stats.average = Math.round(totalProgress / stats.total);
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Campaign progress stats error:", error);
    res.status(500).json({ error: "진행률 통계 조회 중 오류가 발생했습니다." });
  }
});

// ===== 캠페인 반송 주소 조회 (관리자용) =====
router.get(
  "/campaigns/:id/return-address",
  authenticateAdmin,
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      console.log("관리자 반송 주소 조회 - 입력 캠페인 ID:", campaignId);

      // 캠페인 코드를 UUID로 변환
      const campaignUuid = await resolveCampaignUuid(campaignId);
      console.log("변환된 캠페인 UUID:", campaignUuid);

      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // 반송 주소 조회
      const { data: returnAddress, error: addressError } = await supabase
        .from("campaign_return_address")
        .select("*")
        .eq("campaign_id", campaignUuid)
        .single();

      console.log("반송 주소 조회 결과:", { returnAddress, addressError });

      if (addressError && addressError.code !== "PGRST116") {
        console.error("Return address fetch error:", addressError);
        return res
          .status(500)
          .json({ error: "반송 주소 조회에 실패했습니다." });
      }

      res.json({
        success: true,
        data: returnAddress || null,
      });
    } catch (error) {
      console.error("Return address fetch error:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);

// ===== 캠페인 문의 답변 (관리자용) =====
router.put(
  "/campaigns/:id/inquiries/:inquiryId/respond",
  authenticateAdmin,
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      const inquiryId = req.params.inquiryId;
      const { admin_response } = req.body;
      const adminId = req.user.id;

      console.log("=== 관리자 문의 답변 시작 ===");
      console.log("캠페인 ID:", campaignId);
      console.log("문의 ID:", inquiryId);
      console.log("관리자 ID:", adminId);
      console.log("답변 내용:", admin_response);

      // 필수 필드 검증
      if (!admin_response || admin_response.trim() === "") {
        return res.status(400).json({ error: "답변 내용을 입력해주세요." });
      }

      // 캠페인 코드를 UUID로 변환
      const campaignUuid = await resolveCampaignUuid(campaignId);
      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // 문의 존재 확인
      const { data: inquiry, error: inquiryError } = await supabase
        .from("campaign_inquiries")
        .select("*")
        .eq("id", inquiryId)
        .eq("campaign_id", campaignUuid)
        .single();

      if (inquiryError || !inquiry) {
        return res.status(404).json({ error: "문의를 찾을 수 없습니다." });
      }

      // 답변 업데이트
      const { data: updatedInquiry, error: updateError } = await supabase
        .from("campaign_inquiries")
        .update({
          admin_response: admin_response.trim(),
          responded_by: adminId,
          responded_at: new Date().toISOString(),
          status: "answered",
          updated_at: new Date().toISOString(),
        })
        .eq("id", inquiryId)
        .select()
        .single();

      if (updateError) {
        console.error("Inquiry response update error:", updateError);
        return res.status(500).json({ error: "답변 저장에 실패했습니다." });
      }

      console.log("문의 답변 성공:", updatedInquiry);

      return res.json({
        success: true,
        message: "답변이 등록되었습니다.",
        data: updatedInquiry,
      });
    } catch (error) {
      console.error("Inquiry response error:", error);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);

// ===== 캠페인 문의 조회 (관리자용) =====
router.get("/campaigns/:id/inquiries", authenticateAdmin, async (req, res) => {
  try {
    const campaignId = req.params.id;
    console.log("관리자 문의 조회 - 입력 캠페인 ID:", campaignId);

    // 캠페인 코드를 UUID로 변환
    const campaignUuid = await resolveCampaignUuid(campaignId);
    console.log("변환된 캠페인 UUID:", campaignUuid);

    if (!campaignUuid) {
      return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
    }

    // 문의 목록 조회 (문의자 정보 포함)
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

    console.log("문의 조회 결과:", { inquiries, inquiryError });

    if (inquiryError) {
      console.error("Inquiry fetch error:", inquiryError);
      return res.status(500).json({ error: "문의 조회에 실패했습니다." });
    }

    res.json({
      success: true,
      data: inquiries || [],
    });
  } catch (error) {
    console.error("Inquiry fetch error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// ===== 배송지 파일 업로드 (관리자용) =====
const multer = require("multer");
const path = require("path");

// multer 설정
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    console.log("파일 필터 체크:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      encoding: file.encoding,
    });

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (allowedTypes.includes(file.mimetype)) {
      console.log("파일 허용됨:", file.originalname);
      cb(null, true);
    } else {
      console.log("파일 거부됨:", file.originalname, "타입:", file.mimetype);
      cb(new Error("Excel 또는 CSV 파일만 업로드 가능합니다."), false);
    }
  },
});

router.post(
  "/campaigns/:id/shipping-files",
  authenticateAdmin,
  (req, res, next) => {
    console.log("=== multer 미들웨어 실행 전 ===");
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Body keys:", Object.keys(req.body || {}));
    next();
  },
  upload.single("shippingFile"),
  (req, res, next) => {
    console.log("=== multer 미들웨어 실행 후 ===");
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);
    next();
  },
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      const { notes, request_notes } = req.body;
      const shippingNotes = request_notes || notes;
      const file = req.file;

      console.log("=== 배송지 파일 업로드 시작 ===");
      console.log("캠페인 ID:", campaignId);
      console.log(
        "파일 정보:",
        file
          ? {
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            }
          : "파일 없음"
      );
      console.log("요청사항:", shippingNotes);

      if (!file) {
        return res.status(400).json({ error: "배송지 파일을 선택해주세요." });
      }

      // 캠페인 코드를 UUID로 변환
      const campaignUuid = await resolveCampaignUuid(campaignId);
      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // 파일명 안전하게 변환 (한글 지원)
      const originalFileName = file.originalname;
      const fileExtension = path.extname(originalFileName);
      const safeFileName = `shipping_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}${fileExtension}`;

      // 버킷 존재 확인 및 생성 (필요시)
      await ensureBucketExists("shipping-files");

      // Supabase Storage에 업로드
      let uploadData, uploadError;

      try {
        const result = await supabase.storage
          .from("shipping-files")
          .upload(safeFileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: "3600",
          });
        uploadData = result.data;
        uploadError = result.error;
      } catch (err) {
        uploadError = err;
      }

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);

        // 버킷이 존재하지 않는 경우 또는 RLS 오류인 경우 생성 시도
        if (
          uploadError.statusCode === "404" ||
          uploadError.message?.includes("Bucket not found") ||
          uploadError.message?.includes("row-level security policy")
        ) {
          console.log("버킷이 존재하지 않음. 생성 시도...");

          try {
            // 버킷 생성 시도 (개발용으로 public 설정)
            const { data: bucketData, error: bucketError } =
              await supabase.storage.createBucket("shipping-files", {
                public: true, // 개발용으로 public 설정하여 RLS 우회
                allowedMimeTypes: [
                  "text/csv",
                  "application/vnd.ms-excel",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ],
                fileSizeLimit: 10485760, // 10MB
              });

            if (bucketError) {
              console.log("버킷 생성 실패:", bucketError);
              return res.status(500).json({
                error: "파일 저장 중 오류가 발생했습니다.",
                details: bucketError.message,
              });
            }

            console.log("버킷 생성 성공. 파일 재업로드 시도...");

            // 버킷 생성 후 파일 재업로드 시도
            const retryResult = await supabase.storage
              .from("shipping-files")
              .upload(safeFileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: "3600",
              });

            if (retryResult.error) {
              console.log("재업로드 실패:", retryResult.error);
              return res.status(500).json({
                error: "파일 저장 중 오류가 발생했습니다.",
                details: retryResult.error.message,
              });
            }

            console.log("파일 재업로드 성공");
            uploadData = retryResult.data;
          } catch (bucketErr) {
            console.error("버킷 생성 중 오류:", bucketErr);
            return res.status(500).json({
              error: "파일 저장 중 오류가 발생했습니다.",
              details: bucketErr.message,
            });
          }
        } else {
          return res.status(500).json({
            error: "파일 업로드에 실패했습니다.",
            details: uploadError.message,
          });
        }
      }

      // 파일 URL 생성
      const { data: urlData } = supabase.storage
        .from("shipping-files")
        .getPublicUrl(safeFileName);

      // DB에 파일 정보 저장 (request_notes 컬럼 사용)
      const { data: fileRecord, error: dbError } = await supabase
        .from("shipping_files")
        .insert({
          campaign_id: campaignUuid,
          uploaded_by: req.user?.id || null,
          file_name: safeFileName,
          original_file_name: originalFileName,
          file_path: uploadData.path,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.mimetype,
          request_notes: shippingNotes || null,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database insert error:", dbError);
        // 업로드된 파일 삭제
        await supabase.storage.from("shipping-files").remove([safeFileName]);
        return res
          .status(500)
          .json({ error: "파일 정보 저장에 실패했습니다." });
      }

      console.log("배송지 파일 업로드 성공:", fileRecord);

      res.json({
        success: true,
        message: "배송지 파일이 업로드되었습니다.",
        data: fileRecord,
      });
    } catch (error) {
      console.error("Shipping file upload error:", error);
      res.status(500).json({ error: "파일 업로드 중 오류가 발생했습니다." });
    }
  }
);

// ===== 배송지 파일 목록 조회 (관리자용) =====
router.get(
  "/campaigns/:id/shipping-files",
  authenticateAdmin,
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      console.log("관리자 배송지 파일 조회 - 입력 캠페인 ID:", campaignId);

      // 캠페인 코드를 UUID로 변환
      const campaignUuid = await resolveCampaignUuid(campaignId);
      console.log("변환된 캠페인 UUID:", campaignUuid);

      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // 배송지 파일 목록 조회
      const { data: shippingFiles, error: filesError } = await supabase
        .from("shipping_files")
        .select("*")
        .eq("campaign_id", campaignUuid)
        .order("created_at", { ascending: false });

      console.log("배송지 파일 조회 결과:", { shippingFiles, filesError });

      if (filesError) {
        console.error("Shipping files fetch error:", filesError);
        return res
          .status(500)
          .json({ error: "배송지 파일 조회에 실패했습니다." });
      }

      res.json({
        success: true,
        data: shippingFiles || [],
      });
    } catch (error) {
      console.error("Shipping files fetch error:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);

// ===== 배송지 파일 다운로드 (관리자용) =====
router.get(
  "/campaigns/:id/shipping-files/:fileId/download",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { id: campaignId, fileId } = req.params;
      const campaignUuid = await resolveCampaignUuid(campaignId);

      if (!campaignUuid) {
        return res.status(404).json({ error: "캠페인을 찾을 수 없습니다." });
      }

      // 파일 정보 조회
      const { data: fileRecord, error: fetchError } = await supabase
        .from("shipping_files")
        .select("*")
        .eq("id", fileId)
        .eq("campaign_id", campaignUuid)
        .single();

      if (fetchError || !fileRecord) {
        return res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      }

      // Signed URL 생성 (다운로드용)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("shipping-files")
        .createSignedUrl(fileRecord.file_path, 60 * 60, {
          download: true,
        });

      if (signedError) {
        console.error("Create signed URL error:", signedError);
        return res
          .status(500)
          .json({ error: "다운로드 URL 생성에 실패했습니다." });
      }

      // 원본 파일명으로 다운로드하도록 프록시 방식 사용
      const originalFileName = fileRecord.original_file_name;
      const encodedFileName = encodeURIComponent(originalFileName);

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
    } catch (error) {
      console.error("Shipping file download error:", error);
      res.status(500).json({ error: "파일 다운로드 중 오류가 발생했습니다." });
    }
  }
);

module.exports = router;

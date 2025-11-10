// 대행사 캠페인 관리 - 내 캠페인 목록 로드 & 렌더링
(function () {
  let lastCampaigns = [];
  let allCampaigns = [];
  let currentCampaigns = [];
  let currentPage = 1;
  const PAGE_SIZE = 7;
  function getToken() {
    // 고객/파트너를 위해 전역 함수 확인
    if (typeof window.getToken === "function") {
      const globalToken = window.getToken();
      if (globalToken && globalToken.trim() !== "") return globalToken;
    }

    // 대행사 토큰 (기존 로직)
    try {
      if (typeof getRoleSessionToken === "function") {
        const t = getRoleSessionToken("agency");
        if (t && t.trim() !== "") return t;
      }
    } catch (_) {}
    try {
      // 현재 창 저장소 우선
      let t =
        sessionStorage.getItem("troy_token_agency") ||
        localStorage.getItem("troy_token_agency") ||
        localStorage.getItem("troy_token");
      if (t && t.trim() !== "") return t;
      // 부모 창 저장소 (same-origin 가정)
      try {
        if (window.parent && window.parent !== window) {
          t =
            window.parent.sessionStorage.getItem("troy_token_agency") ||
            window.parent.localStorage.getItem("troy_token_agency") ||
            window.parent.localStorage.getItem("troy_token");
        }
      } catch (_) {}
      if (t && t.trim() !== "") return t;
      return t || "";
    } catch (_) {
      return "";
    }
  }

  // 캠페인 상태를 통계 카테고리로 매핑
  function mapCampaignStatus(status) {
    const s = (status || "").toString().toLowerCase();
    if (s === "completed") return "completed";
    if (s === "active" || s === "approved") return "progress";
    if (s === "pending" || s === "draft" || s === "scheduled")
      return "scheduled";
    return "scheduled"; // 기본값
  }

  function mapStatus(status) {
    const m = {
      draft: { text: "임시", color: "#999" },
      pending: { text: "승인대기", color: "#f39c12" },
      approved: { text: "승인완료", color: "#27ae60" },
      active: { text: "진행중", color: "#3498db" },
      completed: { text: "완료", color: "#95a5a6" },
      cancelled: { text: "취소", color: "#e74c3c" },
      rejected: { text: "반려", color: "#e74c3c" },
      revision_requested: { text: "수정요청", color: "#e67e22" },
    };
    return m[status] || { text: status || "-", color: "#666" };
  }

  function formatDateRange(start, end) {
    if (!start || !end) return "날짜 미설정";
    try {
      const s = new Date(start).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
      const e = new Date(end).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
      return `${s} ~ ${e}`;
    } catch (_) {
      return "날짜 미설정";
    }
  }

  function serviceLabelFromRequirements(req) {
    try {
      if (req?.services && req.services.length) return req.services[0];
      if (req?.selected_mission === "rocket-review") return "로켓배송 구매평";
      if (req?.selected_mission === "rocket-premium-photo")
        return "로켓배송 포토 구매평";
      if (req?.selected_mission === "fake-purchase") return "가구매평";
    } catch (_) {}
    return "구매평";
  }

  function getServiceLabels(req) {
    try {
      if (Array.isArray(req?.services) && req.services.length)
        return req.services;
      const one = serviceLabelFromRequirements(req);
      return one ? [one] : [];
    } catch (_) {
      return [];
    }
  }

  function getTypeLabelInfo(type) {
    const t = (type || "").toString().toLowerCase();
    if (t === "product") return { text: "제품형", cls: "type-product" };
    if (t === "traffic") return { text: "유입형", cls: "type-traffic" };
    if (t === "content") return { text: "콘텐츠형", cls: "type-content" };
    return { text: type || "-", cls: "type-default" };
  }

  function renderChannelBadge(platform) {
    const key = (platform || "").toString().toLowerCase();
    if (key.includes("coupang")) {
      return (
        '<span class="channel-badge coupang">' +
        '<span class="cou">cou</span>' +
        '<span class="p">p</span>' +
        '<span class="a">a</span>' +
        '<span class="n">n</span>' +
        '<span class="g">g</span>' +
        "</span>"
      );
    }
    if (key.includes("naver")) {
      return '<span class="channel-badge naver">NAVER</span>';
    }
    if (
      key.includes("오늘") ||
      key.includes("today") ||
      key.includes("ohouse")
    ) {
      return '<span class="channel-badge ohouse">오늘의집</span>';
    }
    return `<span class="channel-badge default">${platform || "-"}</span>`;
  }

  async function renderCampaignList(campaigns, page = 1) {
    let list = document.querySelector(".campaign-list");
    if (!list) list = await waitForElement(".campaign-list", 1000);
    if (!list) return;

    // 기존 아이템 제거 (헤더 유지)
    list.querySelectorAll(".campaign-item").forEach((el) => el.remove());

    // 최근 데이터 저장 (상세/관리 클릭 시 사용)
    lastCampaigns = campaigns || [];

    const total = (campaigns || []).length;
    const startIdx = (page - 1) * PAGE_SIZE;
    const pageItems = (campaigns || []).slice(startIdx, startIdx + PAGE_SIZE);

    (pageItems || []).forEach((c) => {
      const item = document.createElement("div");
      item.className = "campaign-item";
      // 통계를 위한 data-status 속성 추가
      item.setAttribute("data-status", mapCampaignStatus(c.status));

      const statusInfo = mapStatus(c.status);
      const req = c.requirements || {};
      const imgSrc = (req.main_image && req.main_image.src) || null;
      const platform = c.platform || "-";
      const ctype = c.campaign_type || "-";
      const service = serviceLabelFromRequirements(req);
      const brand = c.brand_name || "";
      const titleRaw = c.product_title || c.title || "";
      const title =
        titleRaw.length > 25 ? titleRaw.substring(0, 25) + "..." : titleRaw;
      const qty = c.target_count || 0;
      const dateRange = formatDateRange(c.start_date, c.end_date);
      const channelBadge = renderChannelBadge(platform);
      const typeInfo = getTypeLabelInfo(ctype);
      const serviceList = getServiceLabels(req);
      const infoDesc = (
        c.description ||
        req.description ||
        req.summary ||
        req.brief ||
        ""
      ).toString();

      const codeOrId = c.campaign_code || c.id;
      const changedAt = c?.requirements?.schedule_changed_at || null;
      let readMap = {};
      try {
        if (typeof localStorage !== "undefined") {
          const rawMap = localStorage.getItem("readCampaignsMap");
          if (rawMap) {
            readMap = JSON.parse(rawMap) || {};
          } else {
            // 레거시 배열 형식 지원
            const arrRaw = localStorage.getItem("readCampaigns");
            const arr = JSON.parse(arrRaw || "[]");
            if (Array.isArray(arr)) {
              arr.forEach((k) => (readMap[String(k)] = "__legacy__"));
            }
          }
        }
      } catch (_) {}
      const showNew =
        !!changedAt &&
        String(readMap[String(codeOrId)] || "") !== String(changedAt);

      item.innerHTML = `
        <div class="campaign-cell">
          ${
            imgSrc
              ? `<img src="${imgSrc}" alt="이미지" style="width:120px;height:120px;object-fit:cover;border-radius:4px;">`
              : '<div style="width:120px;height:120px;background:#f5f5f5;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#999;">이미지</div>'
          }
        </div>
        <div class="campaign-cell campaign-info">
          <div class="info-title-wrapper">
            <div class="info-title">${brand} ${title}</div>
          </div>
          <div class="info-meta">
            <div class="info-code">CODE: ${c.campaign_code || "-"}</div>
          </div>
          <div class="info-services">${
            serviceList.length
              ? serviceList
                  .map((s) => `<span class=\"service-badge\">${s}</span>`)
                  .join("")
              : ""
          }</div>
          <div class="info-desc">${infoDesc || "-"}</div>
        </div>
        <div class="campaign-cell">${channelBadge}</div>
        <div class="campaign-cell"><span class="type-badge ${typeInfo.cls}">${
        typeInfo.text
      }</span></div>
        <div class="campaign-cell" style="color:${
          statusInfo.color
        };font-weight:700;">${statusInfo.text}</div>
        <div class="campaign-cell">0/${qty}</div>
        <div class="campaign-cell">${dateRange}</div>
        <div class="campaign-cell campaign-actions">
          <div class="button-container agency-detail-btn-container" style="position:relative;display:inline-block;">
            ${
              showNew
                ? '<span class="campaign-new-indicator" style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:10px;padding:2px 6px;font-size:10px;font-weight:700;line-height:1;pointer-events:none;z-index:2;">NEW</span>'
                : ""
            }
            <button class="space-button" data-id="${
              c.id
            }" data-campaign-id="${codeOrId}">
              <div class="bright-particles"></div>
              <span>상세</span>
            </button>
          </div>
        </div>
      `;

      list.appendChild(item);
    });

    if (!campaigns || !campaigns.length) {
      const empty = document.createElement("div");
      empty.className = "campaign-item empty-message";
      empty.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:24px;color:#666;">등록된 캠페인이 없습니다.</div>';
      list.appendChild(empty);
    }

    // 통계 카드가 있으면 업데이트 (안전 가드)
    try {
      if (typeof updateStatistics === "function") updateStatistics();
    } catch (_) {}

    renderPagination(total, page, PAGE_SIZE);

    // 클릭 이벤트 위임: 리스트 엘리먼트가 교체되어도 동작하도록 엘리먼트별 플래그로 1회만 바인딩
    if (!list.dataset.boundClick) {
      list.addEventListener("click", function (e) {
        const detailBtn = e.target.closest(
          ".space-button, .action-btn:not(.secondary)"
        );
        if (!detailBtn) return;
        const id = detailBtn.getAttribute("data-id");
        if (!id) return;
        handleDetailClick(id);
      });
      list.dataset.boundClick = "1";
    }
  }

  function renderPagination(total, page, size) {
    const container = document.querySelector(".pagination");
    if (!container) return;
    const totalPages = Math.ceil((total || 0) / size) || 1;
    if (totalPages <= 1) {
      container.style.display = "none";
      return;
    }
    container.style.display = "flex";
    let html = "";
    const prevDisabled = page <= 1 ? "disabled" : "";
    const nextDisabled = page >= totalPages ? "disabled" : "";
    html += `<button class="page-btn" data-page="${
      page - 1
    }" ${prevDisabled}>‹</button>`;
    for (let p = 1; p <= totalPages; p++) {
      const active = p === page ? "active" : "";
      html += `<button class="page-btn ${active}" data-page="${p}">${p}</button>`;
    }
    html += `<button class="page-btn" data-page="${
      page + 1
    }" ${nextDisabled}>›</button>`;
    container.innerHTML = html;

    if (!container.dataset.boundClick) {
      container.addEventListener("click", function (e) {
        const btn = e.target.closest(".page-btn");
        if (!btn) return;
        const p = parseInt(btn.getAttribute("data-page"), 10);
        if (!p || isNaN(p)) return;
        if (p < 1) return;
        const totalPagesInner =
          Math.ceil((currentCampaigns.length || 0) / PAGE_SIZE) || 1;
        if (p > totalPagesInner) return;
        currentPage = p;
        renderCampaignList(currentCampaigns, currentPage);
      });
      container.dataset.boundClick = "1";
    }
  }

  function setViewCampaigns(arr) {
    currentCampaigns = Array.isArray(arr) ? arr : [];
    currentPage = 1;
    renderCampaignList(currentCampaigns, currentPage);
  }

  function findCampaignById(id) {
    try {
      return (
        (lastCampaigns || []).find((c) => String(c.id) === String(id)) || null
      );
    } catch (_) {
      return null;
    }
  }

  // 원고 업로드 상태 및 헬퍼
  let selectedManuscriptFile = null;
  const MANUSCRIPT_MAX_SIZE = 20 * 1024 * 1024; // 20MB
  const MANUSCRIPT_ALLOWED_EXTS = ["pdf", "docx", "hwp", "txt"]; // 요구 확장자

  function setSelectedManuscriptFile(file) {
    const statusEl = document.getElementById("manuscriptUploadStatus");
    const lastFileEl = document.getElementById("manuscriptLastFile");
    if (!file) {
      if (statusEl) statusEl.textContent = "";
      if (lastFileEl) lastFileEl.textContent = "선택된 파일이 없습니다.";
      selectedManuscriptFile = null;
      window.selectedManuscriptFile = null;
      return;
    }
    const name = file.name || "";
    const size = file.size || 0;
    const ext = (name.split(".").pop() || "").toLowerCase();
    if (!MANUSCRIPT_ALLOWED_EXTS.includes(ext)) {
      if (statusEl) statusEl.textContent = "";
      if (lastFileEl)
        lastFileEl.textContent =
          "허용되지 않는 형식입니다. (pdf, docx, hwp, txt)";
      selectedManuscriptFile = null;
      window.selectedManuscriptFile = null;
      return;
    }
    if (size > MANUSCRIPT_MAX_SIZE) {
      if (statusEl) statusEl.textContent = "";
      if (lastFileEl) lastFileEl.textContent = "파일 크기가 20MB를 초과합니다.";
      selectedManuscriptFile = null;
      window.selectedManuscriptFile = null;
      return;
    }
    selectedManuscriptFile = file;
    window.selectedManuscriptFile = file; // 추후 Supabase 업로드 시 사용
    try {
      console.log("[Manuscript] selected:", file);
    } catch (_) {}
    const sizeKB = (size / 1024).toFixed(1);
    if (lastFileEl)
      lastFileEl.textContent = `선택된 파일: ${name} (${sizeKB} KB)`;
  }

  function onManuscriptInputChange(event) {
    try {
      const input =
        event && event.target
          ? event.target
          : document.getElementById("manuscriptFile");
      if (input && input.files && input.files.length > 0) {
        setSelectedManuscriptFile(input.files[0]);
      } else {
        setSelectedManuscriptFile(null);
      }
    } catch (_) {}
  }
  // 전역 노출 (다른 페이지에서 inline onchange 호출 대비)
  window.onManuscriptInputChange = onManuscriptInputChange;

  async function saveManuscriptToServer() {
    try {
      const statusEl = document.getElementById("manuscriptUploadStatus");
      const lastFileEl = document.getElementById("manuscriptLastFile");
      const campaignId = window.currentCampaignId || "";
      if (!selectedManuscriptFile) {
        if (lastFileEl) lastFileEl.textContent = "선택된 파일이 없습니다.";
        return;
      }
      if (!campaignId) {
        if (lastFileEl) lastFileEl.textContent = "캠페인 정보가 없습니다.";
        return;
      }
      if (statusEl) {
        statusEl.textContent = "업로드 중...";
        statusEl.style.cssText =
          "color:#3b82f6;font-weight:600;text-align:center;display:block;margin-top:8px;padding:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;";
      }
      const token = (typeof getToken === "function" && getToken()) || "";
      const form = new FormData();
      form.append("file", selectedManuscriptFile);
      form.append("campaign_id", String(campaignId));
      const res = await fetch(
        `/api/auth/campaigns/${encodeURIComponent(campaignId)}/manuscripts`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        if (statusEl) {
          statusEl.textContent = "업로드 실패";
          statusEl.style.cssText =
            "color:#ef4444;font-weight:600;text-align:center;display:block;margin-top:8px;padding:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;";
        }
        return;
      }
      if (statusEl) {
        statusEl.textContent = "업로드 완료";
        statusEl.style.cssText =
          "color:#10b981;font-weight:600;text-align:center;display:block;margin-top:8px;padding:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;";
      }
      // 업로드 후 파일명 유지 표시
      const f = selectedManuscriptFile;
      const sizeKB = (f.size / 1024).toFixed(1);
      if (lastFileEl)
        lastFileEl.textContent = `저장됨: ${f.name} (${sizeKB} KB)`;
    } catch (_) {
      const statusEl = document.getElementById("manuscriptUploadStatus");
      if (statusEl) {
        statusEl.textContent = "업로드 중 오류";
        statusEl.style.cssText =
          "color:#ef4444;font-weight:600;text-align:center;display:block;margin-top:8px;padding:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;";
      }
    }
  }

  // 전역 노출: HTML onclick에서 호출 가능하도록 바인딩
  try {
    window.saveManuscriptToServer = saveManuscriptToServer;
  } catch (_) {}

  function waitForElement(selector, timeoutMs = 1500) {
    return new Promise((resolve) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);
      const start = Date.now();
      const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          resolve(null);
        }
      }, 50);
    });
  }

  async function handleDetailClick(id) {
    const campaign = findCampaignById(id) || { id };
    // 상세 클릭 시 NEW 배지 해제: 해당 변경시각을 readCampaignsMap에 기록 후 즉시 리렌더
    try {
      const codeOrId =
        (campaign && (campaign.campaign_code || campaign.id)) || id;
      const changedAt = campaign?.requirements?.schedule_changed_at || null;
      if (typeof localStorage !== "undefined" && codeOrId) {
        if (changedAt) {
          let map = {};
          try {
            map = JSON.parse(localStorage.getItem("readCampaignsMap") || "{}");
          } catch (_) {
            map = {};
          }
          map[String(codeOrId)] = String(changedAt);
          localStorage.setItem("readCampaignsMap", JSON.stringify(map));
        } else {
          // 변경시각이 없을 경우, 레거시 배열 방식으로 처리
          const key = "readCampaigns";
          const arr = JSON.parse(localStorage.getItem(key) || "[]");
          const codeStr = String(codeOrId);
          if (!arr.includes(codeStr)) {
            arr.push(codeStr);
            localStorage.setItem(key, JSON.stringify(arr));
          }
        }
        // 현재 페이지 목록 즉시 리렌더하여 NEW 제거
        renderCampaignList(currentCampaigns, currentPage);
      }
    } catch (_) {}
    if (typeof window.onCampaignDetail === "function") {
      return window.onCampaignDetail(campaign);
    }
    await adoptCustomerDetailModal(campaign);
  }

  function handleManageClick(id) {
    const campaign = findCampaignById(id);
    if (typeof window.openCampaignManage === "function") {
      return window.openCampaignManage(campaign || { id });
    }
    try {
      if (
        window.parent &&
        typeof window.parent.openCampaignManage === "function"
      ) {
        return window.parent.openCampaignManage(campaign || { id });
      }
    } catch (_) {}
    alert("관리 화면은 곧 제공됩니다. (캠페인 ID: " + id + ")");
  }

  function showCampaignDetailModal(c) {
    return adoptCustomerDetailModal(c);
    // 기존 모달 제거 (더 이상 사용하지 않음)
    const old = document.getElementById("campaignDetailModal");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "campaignDetailModal";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;";

    const req = c?.requirements || {};
    const imgSrc = (req.main_image && req.main_image.src) || "";
    const title = c?.product_title || c?.title || "-";
    const brand = c?.brand_name || "";
    const code = c?.campaign_code || "-";
    const type = c?.campaign_type || "-";
    const platform = c?.platform || "-";
    const qty = c?.target_count || 0;
    const date = formatDateRange(c?.start_date, c?.end_date);
    const desc = (c?.description || "").slice(0, 500);
    const servicesArr = Array.isArray(req?.services) ? req.services : [];
    const singleService = serviceLabelFromRequirements(req);
    const services = servicesArr.length
      ? servicesArr
      : singleService
      ? [singleService]
      : [];
    const est = req?.estimate || {};
    const budget = c?.budget ?? est?.totalAmount ?? 0;
    const statusInfo = mapStatus(c?.status);
    const typeLabel = (function () {
      const t = (type || "").toString().toLowerCase();
      if (t === "product") return "제품형";
      if (t === "traffic") return "유입형";
      if (t === "content") return "콘텐츠형";
      return type || "-";
    })();
    const platformKey = (platform || "").toString().toLowerCase();
    const theme = (function () {
      if (platformKey.includes("coupang"))
        return { name: "쿠팡", color: "#E61E2B", bg: "#FEF2F2" };
      if (platformKey.includes("naver"))
        return { name: "네이버", color: "#03C75A", bg: "#ECFDF5" };
      if (platformKey.includes("오늘") || platformKey.includes("today"))
        return { name: "오늘의집", color: "#35C5F0", bg: "#EFF6FF" };
      return { name: platform || "플랫폼", color: "#64748B", bg: "#F1F5F9" };
    })();

    const modal = document.createElement("div");
    modal.style.cssText =
      "background:#fff;border-radius:16px;max-width:820px;width:94%;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.35);";
    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;">
        <div style="display:flex;align-items:center;gap:14px;min-width:0;">
          <div>
            ${
              imgSrc
                ? `<img src="${imgSrc}" alt="이미지" style="width:72px;height:72px;object-fit:cover;border-radius:10px;">`
                : '<div style="width:72px;height:72px;background:#f5f5f5;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#999;">이미지</div>'
            }
          </div>
          <div style="min-width:0;">
            <div style="font-weight:800;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${brand} ${title}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
              <span class="tag">${platform}</span>
              <span class="tag">${type}</span>
              <span class="tag">${services}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="copyCampaignCode" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;cursor:pointer;">코드 복사</button>
          <button id="manageCampaign" style="padding:8px 12px;border:none;border-radius:8px;background:#3b82f6;color:#fff;cursor:pointer;">관리</button>
          <button id="closeCampaignDetail" style="padding:8px 12px;border:none;border-radius:8px;background:#e5e7eb;color:#111827;cursor:pointer;">닫기</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:16px;">
        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
          <div style="font-weight:700;margin-bottom:10px;">요약</div>
          <div style="font-size:13px;color:#374151;line-height:1.6;">${
            desc || "설명이 없습니다."
          }</div>
          <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:#111827;">
            <div>수량 <b style="float:right;">${qty}</b></div>
            <div>기간 <b style="float:right;">${date}</b></div>
            <div>예산 <b style="float:right;">₩${Number(
              budget
            ).toLocaleString()}</b></div>
            <div>코드 <b style="float:right;">${code}</b></div>
          </div>
        </div>

        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
          <div style="font-weight:700;margin-bottom:10px;color:${
            theme.color
          };">플랫폼/상태</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span class="tag" style="border-color:${theme.color};color:${
      theme.color
    };background:${theme.bg};">${theme.name}</span>
            <span class="tag" style="color:${statusInfo.color};border-color:${
      statusInfo.color
    };">${statusInfo.text}</span>
          </div>
          <div style="font-weight:700;margin:12px 0 6px 0;">캠페인 방식</div>
          <div style="font-size:13px;color:#111827;">${typeLabel}</div>
          <div style="font-weight:700;margin:12px 0 6px 0;">서비스 목록</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${
              services.length
                ? services
                    .map((s) => `<span class=\"tag\">${s}</span>`)
                    .join("")
                : '<span class="tag">-</span>'
            }
          </div>
        </div>
      </div>

      <div style="margin-top:16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
        <div style="font-weight:700;margin-bottom:10px;">견적 요약</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:13px;color:#111827;">
          <div>제품비 <b style="float:right;">₩${Number(
            est.productCost || 0
          ).toLocaleString()}</b></div>
          <div>캠페인비 <b style="float:right;">₩${Number(
            est.campaignCost || 0
          ).toLocaleString()}</b></div>
          <div>사진비 <b style="float:right;">₩${Number(
            est.photoCost || 0
          ).toLocaleString()}</b></div>
          <div>슬롯비 <b style="float:right;">₩${Number(
            est.slotCost || 0
          ).toLocaleString()}</b></div>
        </div>
        <div style="margin-top:8px;font-size:13px;color:#111827;">부가세 포함: <b>${
          est.taxIncluded ? "예" : "아니오"
        }</b></div>
        <div style="margin-top:8px;font-weight:800;font-size:14px;">총액: ₩${Number(
          est.totalAmount || budget || 0
        ).toLocaleString()}</div>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });
    modal.querySelector("#closeCampaignDetail").onclick = function () {
      overlay.remove();
    };
    // ESC 닫기
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        overlay.remove();
        window.removeEventListener("keydown", onKey);
      }
    };
    window.addEventListener("keydown", onKey);
    // 코드 복사
    const copyBtn = modal.querySelector("#copyCampaignCode");
    if (copyBtn) {
      copyBtn.onclick = async function () {
        try {
          await navigator.clipboard.writeText(code);
          copyBtn.textContent = "복사됨";
          setTimeout(() => (copyBtn.textContent = "코드 복사"), 1200);
        } catch (_) {
          alert("코드 복사 실패");
        }
      };
    }
    // 모달 내 관리 버튼
    const manageBtn = modal.querySelector("#manageCampaign");
    if (manageBtn) {
      manageBtn.onclick = function () {
        handleManageClick(c?.id);
      };
    }
  }

  // 고객사 상세 모달을 로드/주입하여 동일하게 동작시키는 헬퍼들
  async function adoptCustomerDetailModal(c) {
    const codeOrId = c?.campaign_code || c?.id || "";
    await Promise.all([
      loadCssOnce("/css/customer-campaign.css"),
      loadScriptOnce("/js/components/customer-campaign.js"),
    ]);
    injectCustomerModalOnce();
    try {
      if (typeof window.showCampaignDetail === "function") {
        window.currentCampaignId = String(codeOrId);
        window.showCampaignDetail(String(codeOrId));
        populateCustomerDetailModal(c);
      } else {
        alert("상세 모달 스크립트를 불러올 수 없습니다.");
      }
    } catch (e) {
      console.error("adoptCustomerDetailModal error", e);
      alert("상세 모달을 여는 중 오류가 발생했습니다.");
    }
  }

  async function populateCustomerDetailModal(c) {
    console.log("=== populateCustomerDetailModal 함수 호출됨 ===");
    try {
      // 모달에 data-campaign-id 설정
      const modal = document.getElementById("campaignDetailModal");
      if (modal) {
        const campaignId = c?.campaign_code || c?.id || "";
        modal.setAttribute("data-campaign-id", campaignId);
        modal.classList.add("customer-detail-modal");
        console.log("모달에 data-campaign-id 설정:", campaignId);
      }

      const req = c?.requirements || {};
      const est = req?.estimate || {};
      const title = c?.product_title || c?.title || "-";
      const brand = c?.brand_name || "";
      const qty = c?.target_count || 0;
      const progressEl = document.getElementById("detailCampaignProgress");
      const nameEl = document.getElementById("detailCampaignName");
      const startEl = document.getElementById("scheduleStart");
      const endEl = document.getElementById("scheduleEnd");
      const productCostEl = document.getElementById("budgetProductCost");
      const campaignCostEl = document.getElementById("budgetCampaignCost");
      const photoCostEl = document.getElementById("budgetPhotoCost");
      const slotCostEl = document.getElementById("budgetSlotCost");
      const totalEl = document.getElementById("budgetTotal");

      if (nameEl) nameEl.textContent = `${brand} ${title}`.trim();
      if (startEl) startEl.textContent = formatDate(c?.start_date);
      if (endEl) endEl.textContent = formatDate(c?.end_date);
      if (progressEl) progressEl.textContent = `0/${qty}`;
      if (productCostEl)
        productCostEl.textContent = `제품비 ₩${num(est.productCost)}`;
      if (campaignCostEl)
        campaignCostEl.textContent = `캠페인비 ₩${num(est.campaignCost)}`;
      if (photoCostEl)
        photoCostEl.textContent = `사진비 ₩${num(est.photoCost)}`;
      if (slotCostEl) slotCostEl.textContent = `슬롯비 ₩${num(est.slotCost)}`;
      if (totalEl)
        totalEl.textContent = `합계: ₩${num(
          est.totalAmount ?? c?.budget ?? 0
        )}`;

      // 업데이트 타임라인에 스케줄 변경 이력 추가 (전환 시 초기화 + schedule 로그 조건 + 1회만)
      try {
        let timeline = document.querySelector(".update-timeline");
        if (!timeline)
          timeline = await waitForElement(".update-timeline", 1500);
        if (timeline) {
          // 1) 이 캠페인 렌더 전에 기존 정적/동적 업데이트 항목 초기화
          const prev = timeline.querySelectorAll(
            '.update-item[data-update-id^="update-"], .update-item[data-update-id^="schedule-"]'
          );
          prev.forEach((n) => n.remove());

          // 기존 정적 업데이트 항목들도 제거 (HTML에 하드코딩된 것들)
          const staticItems = timeline.querySelectorAll(".update-item");
          staticItems.forEach((n) => n.remove());

          // 2) updateLogs에서 모든 업데이트 타입 표시 (스케줄 변경, 승인, 반려 등)
          const logsFromReq = Array.isArray(c?.requirements?.updateLogs)
            ? c.requirements.updateLogs
            : [];
          const logsRoot = Array.isArray(c?.updateLogs) ? c.updateLogs : [];
          const logs = logsRoot.length ? logsRoot : logsFromReq;

          console.log("=== 대행사 캠페인 업데이트 현황 디버깅 ===");
          console.log("캠페인 ID:", c.id);
          console.log("캠페인 상태:", c.status);
          console.log("requirements:", c.requirements);
          console.log("updateLogs (from requirements):", logsFromReq);
          console.log("updateLogs (from root):", logsRoot);
          console.log("최종 사용할 logs:", logs);
          console.log("반려 사유:", c?.requirements?.rejection_reason);

          // 모든 업데이트 로그를 시간순으로 표시
          logs.forEach((log, index) => {
            const logDate = log?.date || log?.changedAt;
            if (logDate) {
              const dt = new Date(logDate);
              if (!isNaN(dt)) {
                const updateId = `update-${c.id}-${index}-${dt.getTime()}`;
                if (!timeline.querySelector(`[data-update-id="${updateId}"]`)) {
                  const when = dt.toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const node = document.createElement("div");
                  node.className = "update-item new";
                  node.setAttribute("data-update-id", updateId);
                  // "2025.10.24" 형식으로 날짜 표시
                  const year = dt.getFullYear();
                  const month = String(dt.getMonth() + 1).padStart(2, "0");
                  const day = String(dt.getDate()).padStart(2, "0");
                  const dateOnly = `${year}.${month}.${day}`;

                  // 업데이트 타입에 따른 제목 설정
                  let title = log?.type || "업데이트";
                  let description =
                    log?.memo || log?.description || "내용 없음";

                  // 반려 사유가 있는 경우 특별히 표시
                  if (
                    log?.type === "반려" &&
                    c?.requirements?.rejection_reason
                  ) {
                    description = c.requirements.rejection_reason;
                  }

                  node.innerHTML = `
                    <div class="update-date">${dateOnly}</div>
                    <div class="update-content">
                      <div class="update-title">${title}</div>
                      <div class="update-desc">${description}</div>
                    </div>
                  `;
                  timeline.prepend(node);
                }
              }
            }
          });
        }
      } catch (_) {}

      // 미니 캘린더 동적 렌더링
      renderMiniCalendar(c);

      // 제품 반송 주소 저장 버튼 이벤트 리스너 등록
      setTimeout(() => {
        const saveReturnAddressBtn = document.getElementById(
          "saveReturnAddressBtn"
        );
        console.log("=== 버튼 이벤트 리스너 등록 시도 ===");
        console.log("버튼 요소:", saveReturnAddressBtn);

        if (saveReturnAddressBtn) {
          // 기존 이벤트 리스너 제거
          saveReturnAddressBtn.onclick = null;

          // 새 이벤트 리스너 추가
          saveReturnAddressBtn.onclick = async function () {
            console.log("🔥 저장 버튼 클릭됨! 🔥");

            try {
              console.log("=== 직접 저장 로직 실행 ===");

              // 입력값 가져오기
              const returnName = document
                .getElementById("returnName")
                ?.value?.trim();
              const returnPhone = document
                .getElementById("returnPhone")
                ?.value?.trim();
              const returnAddress = document
                .getElementById("returnAddress")
                ?.value?.trim();
              const statusDiv = document.getElementById("returnAddressStatus");

              console.log("입력된 값들:", {
                returnName,
                returnPhone,
                returnAddress,
              });

              // 필수 필드 검증
              if (!returnName || !returnPhone || !returnAddress) {
                console.log("필수 필드 누락");
                if (statusDiv) {
                  statusDiv.style.display = "block";
                  statusDiv.style.color = "#ef4444";
                  statusDiv.style.backgroundColor = "#fef2f2";
                  statusDiv.style.border = "1px solid #fecaca";
                  statusDiv.style.padding = "8px 12px";
                  statusDiv.style.borderRadius = "6px";
                  statusDiv.textContent = "모든 필드를 입력해주세요.";
                }
                return;
              }

              // 캠페인 ID 가져오기
              const modal = document.querySelector(".customer-detail-modal");
              if (!modal) {
                alert("캠페인 정보를 찾을 수 없습니다.");
                return;
              }

              const campaignId = modal.getAttribute("data-campaign-id");
              if (!campaignId) {
                alert("캠페인 ID를 찾을 수 없습니다.");
                return;
              }

              console.log("캠페인 ID:", campaignId);

              // 토큰 가져오기
              const token = getToken();
              if (!token) {
                alert("로그인이 필요합니다.");
                return;
              }

              // 로딩 상태 표시
              if (statusDiv) {
                statusDiv.style.display = "block";
                statusDiv.style.color = "#0ea5e9";
                statusDiv.style.backgroundColor = "#f0f9ff";
                statusDiv.style.border = "1px solid #0ea5e9";
                statusDiv.style.padding = "8px 12px";
                statusDiv.style.borderRadius = "6px";
                statusDiv.textContent = "저장 중...";
              }

              // API 호출
              console.log("API 호출 시작");
              const response = await fetch(
                `/api/auth/campaigns/${campaignId}/return-address`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    name: returnName,
                    phone: returnPhone,
                    address: returnAddress,
                  }),
                }
              );

              console.log("API 응답 상태:", response.status);
              const result = await response.json();
              console.log("API 응답 결과:", result);

              if (response.ok && result.success) {
                // 성공 상태 표시
                if (statusDiv) {
                  statusDiv.style.color = "#059669";
                  statusDiv.style.backgroundColor = "#ecfdf5";
                  statusDiv.style.border = "1px solid #10b981";
                  statusDiv.textContent = "저장되었습니다.";
                }

                // 입력 필드 초기화
                document.getElementById("returnName").value = "";
                document.getElementById("returnPhone").value = "";
                document.getElementById("returnAddress").value = "";

                // 3초 후 상태 메시지 숨기기
                setTimeout(() => {
                  if (statusDiv) {
                    statusDiv.style.display = "none";
                  }
                }, 3000);
              } else {
                // 실패 상태 표시
                console.error("API 응답 실패:", {
                  status: response.status,
                  result,
                });
                if (statusDiv) {
                  statusDiv.style.color = "#ef4444";
                  statusDiv.style.backgroundColor = "#fef2f2";
                  statusDiv.style.border = "1px solid #fecaca";
                  statusDiv.textContent =
                    result.error || "저장에 실패했습니다.";
                }
                alert("저장 실패: " + (result.error || "알 수 없는 오류"));
              }
            } catch (error) {
              console.error("저장 중 오류:", error);
              alert("저장 중 오류가 발생했습니다: " + error.message);
            }
          };

          console.log("✅ 이벤트 리스너 등록 완료");
        } else {
          console.error("❌ saveReturnAddressBtn 버튼을 찾을 수 없음");
        }
      }, 200);

      // 연락처 자동 포맷팅 이벤트 리스너 추가
      const returnPhoneInput = document.getElementById("returnPhone");
      if (returnPhoneInput) {
        returnPhoneInput.addEventListener("input", function (e) {
          let value = e.target.value.replace(/[^\d]/g, ""); // 숫자만 추출

          if (value.length >= 3 && value.length <= 6) {
            value = value.slice(0, 3) + "-" + value.slice(3);
          } else if (value.length >= 7 && value.length <= 10) {
            value =
              value.slice(0, 3) +
              "-" +
              value.slice(3, 7) +
              "-" +
              value.slice(7);
          } else if (value.length > 10) {
            value =
              value.slice(0, 3) +
              "-" +
              value.slice(3, 7) +
              "-" +
              value.slice(7, 11);
          }

          e.target.value = value;
        });
      }

      // 배송지 파일 로드 (대행사용)
      try {
        const campaignId = c?.campaign_code || c?.id || "";
        if (campaignId) {
          console.log("대행사 배송지 파일 로드 시도:", campaignId);
          setTimeout(() => {
            loadShippingFilesForAgency(campaignId);
          }, 100);
        }
      } catch (e) {
        console.warn("배송지 파일 로드 오류:", e);
      }
    } catch (e) {
      console.warn("populateCustomerDetailModal error", e);
    }
  }

  function num(v) {
    const n = Number(v || 0);
    return isNaN(n) ? "-" : n.toLocaleString();
  }

  function formatDate(d) {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (_) {
      return "-";
    }
  }

  function renderMiniCalendar(c) {
    try {
      const start = c?.start_date ? new Date(c.start_date) : null;
      const end = c?.end_date ? new Date(c.end_date) : null;
      if (!start || !end || isNaN(start) || isNaN(end)) return;

      const modal = document.getElementById("campaignDetailModal");
      if (!modal) return;
      const monthEl = modal.querySelector(".calendar-month");
      const daysWrap = modal.querySelector(".mini-calendar .days");
      if (!daysWrap) return;

      const year = start.getFullYear();
      const month = start.getMonth(); // 0-11
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const firstWeekday = first.getDay(); // 0:일 ~ 6:토
      const numDays = last.getDate();

      if (monthEl) monthEl.textContent = `${year}년 ${month + 1}월`;

      let html = "";
      // 앞쪽 빈 칸
      for (let i = 0; i < firstWeekday; i++)
        html += '<span class="empty"></span>';
      // 날짜 셀
      for (let d = 1; d <= numDays; d++) {
        const cur = new Date(year, month, d);
        const ymd = cur.getTime();
        const inRange =
          ymd >= start.setHours(0, 0, 0, 0) && ymd <= end.setHours(0, 0, 0, 0);
        const isStart =
          d === new Date(c.start_date).getDate() &&
          month === new Date(c.start_date).getMonth() &&
          year === new Date(c.start_date).getFullYear();
        const isEnd =
          d === new Date(c.end_date).getDate() &&
          month === new Date(c.end_date).getMonth() &&
          year === new Date(c.end_date).getFullYear();
        let cls = "";
        if (inRange) cls = "campaign";
        if (isStart) cls = "campaign-start";
        if (isEnd) cls = "campaign-end";
        html += `<span class="${cls}">${d}</span>`;
      }
      daysWrap.innerHTML = html;
    } catch (e) {
      console.warn("renderMiniCalendar error", e);
    }
  }

  function loadCssOnce(href) {
    return new Promise((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) return resolve();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
  }

  function loadScriptOnce(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.body.appendChild(s);
    });
  }

  function injectCustomerModalOnce() {
    if (document.getElementById("campaignDetailModal")) return;
    const container = document.createElement("div");
    container.innerHTML = `
  <div id="campaignDetailModal" class="modal" style="display: none">
    <div class="modal-content large">
      <div class="modal-header">
        <h2>캠페인 상세정보</h2>
        <span class="close-btn" onclick="hideCampaignDetail()">&times;</span>
      </div>
      <div class="modal-body">
        <div class="detail-section">
          <h3>
            캠페인 기본정보
            <span class="campaign-status-point">
              <span class="status-indicator"></span>
              활성
            </span>
          </h3>
          <div class="campaign-info-container">
            <div class="campaign-basic-info">
              <div class="info-row">
                <label>캠페인명:</label>
                <span id="detailCampaignName">-</span>
              </div>
              <div class="info-row">
                <label>캠페인 예산:</label>
                <div class="budget-breakdown">
                  <div id="budgetProductCost">제품비 -</div>
                  <div id="budgetCampaignCost">캠페인비 -</div>
                  <div id="budgetPhotoCost">사진비 -</div>
                  <div id="budgetSlotCost">슬롯비 -</div>
                  <div class="budget-total" id="budgetTotal">합계: -</div>
                </div>
              </div>
            </div>
            <div class="schedule-calendar-mini">
              <div class="calendar-title">캠페인 일정</div>
              <div class="calendar-month">2025년 8월</div>
              <div class="mini-calendar">
                <div class="weekdays">
                  <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
                </div>
                <div class="days">
                  <span class="empty"></span><span class="empty"></span><span class="empty"></span><span class="empty"></span>
                  <span>1</span><span>2</span><span class="campaign-start">3</span>
                  <span class="campaign">4</span><span class="campaign">5</span><span class="campaign">6</span><span class="campaign">7</span>
                  <span class="campaign">8</span><span class="campaign">9</span><span class="campaign">10</span>
                  <span class="campaign">11</span><span class="campaign">12</span><span class="campaign">13</span><span class="campaign">14</span>
                  <span class="campaign">15</span><span class="campaign">16</span><span class="campaign">17</span>
                  <span class="campaign">18</span><span class="campaign">19</span><span class="campaign">20</span>
                  <span class="campaign-end">21</span><span>22</span><span>23</span><span>24</span>
                  <span>25</span><span>26</span><span>27</span><span>28</span><span>29</span><span>30</span><span>31</span>
                </div>
              </div>
              <div class="schedule-info">
                <span class="info-item"><span class="dot start"></span> 시작: <span id="scheduleStart">-</span></span>
                <span class="info-item"><span class="dot end"></span> 종료: <span id="scheduleEnd">-</span></span>
              </div>
              <div class="campaign-progress-mini">
                <span class="progress-label">진행현황</span>
                <span id="detailCampaignProgress" class="campaign-progress">-</span>
              </div>
            </div>
          </div>
          <div class="request-section">
            <div class="form-group">
              <label for="campaignRequest">캠페인 요청사항:</label>
              <textarea id="campaignRequest" rows="4" placeholder="캠페인 진행 시 특별히 요청하고 싶은 사항이 있다면 입력해주세요..." class="request-textarea"></textarea>
            </div>
            <div class="request-actions">
              <button class="action-btn primary" onclick="saveCampaignRequest()">요청사항 저장</button>
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h3>원고 관리</h3>
          <div class="manuscript-guide">
            * 실유저를 기반으로 구매작업을 선행합니다. 구매작업이 시작되고나서 최소 <span class="highlight-deadline">3일</span> 안에는 원고를 업로드<br />해주셔야만 순차적으로 리뷰가 작성되며, 원고가 작성되지않을시에는 캠페인 지연될 수 있으므로 이점 양지 부탁드립니다.
          </div>
          <div class="manuscript-section">
            <div id="manuscriptDropzone" style="margin-top:8px;margin-bottom:10px;padding:28px;border:2px dashed #93c5fd;border-radius:12px;color:#1e3a8a;background:#e0f2fe;text-align:center;cursor:pointer;min-height:120px;display:flex;align-items:center;justify-content:center;font-size:14px;">
              여기로 파일을 드래그 앤 드랍하거나 클릭하여 선택하세요 (PDF, DOCX, HWP, TXT, 최대 20MB)
            </div>
            <div class="manuscript-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <button class="action-btn primary" onclick="downloadManuscriptGuide()">📄 원고가이드 다운로드</button>
              <label for="manuscriptFile" class="action-btn primary" style="cursor:pointer;">📤 원고 업로드</label>
              <input type="file" id="manuscriptFile" accept=".pdf,.docx,.hwp,.txt" style="display:none;" onchange="onManuscriptInputChange(event)" />
            </div>
            <div id="manuscriptUploadStatus" style="color:#6b7280;text-align:center;margin-top:8px;"></div>
            <div id="manuscriptLastFile" style="margin-top:6px;color:#374151;font-size:12px;text-align:center;font-weight:500;min-height:16px;"></div>
            <div style="display:flex;justify-content:center;margin-top:6px;">
              <button class="action-btn primary" onclick="saveManuscriptToServer()">저장</button>
            </div>
            <div class="manuscript-upload" style="display:none;">
              <div class="upload-header"><span class="upload-icon">📤</span><span class="upload-title">원고 업로드</span></div>
              <div class="upload-content">
                <p>아래에서 원고 파일을 업로드해 주세요. 지원 형식: PDF, DOCX, HWP, TXT (최대 20MB)</p>
                <div class="upload-inputs">
                  <input type="file" id="manuscriptFileHidden" accept=".pdf,.doc,.docx,.hwp,.txt" />
                  <button class="action-btn primary" onclick="uploadManuscript(true)">업로드</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h3>제품 반송 주소</h3>
          <div class="address-notice">* 쿠팡 리뷰캠페인을 진행하실경우 캠페인 종료후 회수된 제품을 해당캠페인에 저장된 주소지로 착불 발송됩니다. *</div>
          <div class="address-section">
            <div class="form-group"><label>받는 분 성명:</label><input type="text" id="returnName" placeholder="받는 분 이름을 입력해주세요" /></div>
            <div class="form-group"><label>연락처:</label><input type="tel" id="returnPhone" placeholder="010-0000-0000" /></div>
            <div class="address-input-group">
              <div class="form-group">
                <label>주소:</label>
                <div class="postcode-input"><input type="text" id="returnAddress" placeholder="주소를 입력해주세요" /><button type="button" class="postcode-btn" id="saveReturnAddressBtn">저장</button></div>
              </div>
            </div>
            <div id="returnAddressStatus" style="margin-top: 10px; text-align: center; display: none;"></div>
          </div>
        </div>
        <div class="detail-section">
          <h3>배송지 파일</h3>
          <div class="shipping-files-section">
            <div class="shipping-files-notice">
              <p>관리자가 업로드한 배송지 파일을 다운로드할 수 있습니다.</p>
            </div>
            <div class="shipping-files-list">
              <!-- 배송지 파일 목록이 여기에 동적으로 표시됩니다 -->
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h3>
            캠페인 현황
            <span class="notification-bell"><span class="bell-icon">🔔</span><span class="notification-dot"></span></span>
          </h3>
          <div class="inquiry-container">
            <div class="update-section">
              <h4>캠페인 업데이트 현황</h4>
              <div class="update-timeline">
                <div class="update-item">
                  <div class="update-date">2025-08-15</div>
                  <div class="update-content"><div class="update-title">캠페인 시작</div><div class="update-desc">캠페인이 정식으로 시작되었습니다. 인플루언서 모집을 개시합니다.</div></div>
                </div>
              </div>
            </div>
            <div class="inquiry-board-section">
              <h4>캠페인 문의</h4>
              <div class="inquiry-list"></div>
              <div class="new-inquiry-form">
                <div class="form-header"><h5>새 문의 작성</h5></div>
                <div class="form-body">
                  <input type="text" id="inquiryTitle" placeholder="문의 제목을 입력하세요" class="inquiry-title-input" />
                  <textarea id="inquiryContent" placeholder="문의 내용을 상세히 입력하세요..." rows="4" class="inquiry-content-input"></textarea>
                  <button class="submit-inquiry-btn" onclick="submitInquiry()">문의 등록</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
    document.body.appendChild(container.firstElementChild);
  }

  async function loadMyCampaigns() {
    const token = getToken();
    if (!token) {
      renderCampaignList([]);
      return;
    }
    try {
      const res = await fetch("/api/auth/my-campaigns", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        console.error(
          "/api/auth/my-campaigns error:",
          data?.error || res.status
        );
        renderCampaignList([]);
        return;
      }
      allCampaigns = data.campaigns || [];
      setViewCampaigns(allCampaigns);
    } catch (e) {
      console.error("loadMyCampaigns exception", e);
      allCampaigns = [];
      setViewCampaigns([]);
    }
  }

  async function initCampaignManagementComponent() {
    await loadMyCampaigns();
    const searchBtn = document.getElementById("search-btn");
    const resetBtn = document.getElementById("reset-btn");
    const searchInput = document.getElementById("search-input");
    if (searchBtn && searchInput) {
      searchBtn.onclick = function () {
        const kw = (searchInput.value || "").trim().toLowerCase();
        if (!kw) return setViewCampaigns(allCampaigns);
        const filtered = (allCampaigns || []).filter((c) => {
          const req = c.requirements || {};
          const text = [
            c.brand_name,
            c.product_title,
            c.title,
            c.campaign_code,
            c.platform,
            c.campaign_type,
            c.description,
            req.description,
            req.summary,
            req.brief,
          ]
            .map((v) => (v || "").toString().toLowerCase())
            .join(" ");
          return text.includes(kw);
        });
        setViewCampaigns(filtered);
      };
    }
    if (resetBtn && searchInput) {
      resetBtn.onclick = function () {
        searchInput.value = "";
        setViewCampaigns(allCampaigns);
      };
    }
  }

  // 제품 반송 주소 저장 함수
  window.saveReturnAddress = async function () {
    console.log("=== saveReturnAddress 함수 호출됨 ===");
    try {
      console.log("함수 시작 - 입력값 확인 중...");
      const returnName = document.getElementById("returnName")?.value?.trim();
      const returnPhone = document.getElementById("returnPhone")?.value?.trim();
      const returnAddress = document
        .getElementById("returnAddress")
        ?.value?.trim();
      const statusDiv = document.getElementById("returnAddressStatus");

      console.log("입력된 값들:", { returnName, returnPhone, returnAddress });

      if (!returnName || !returnPhone || !returnAddress) {
        console.log("필수 필드 누락:", {
          returnName,
          returnPhone,
          returnAddress,
        });
        if (statusDiv) {
          statusDiv.style.display = "block";
          statusDiv.style.color = "#ef4444";
          statusDiv.style.backgroundColor = "#fef2f2";
          statusDiv.style.border = "1px solid #fecaca";
          statusDiv.style.padding = "8px 12px";
          statusDiv.style.borderRadius = "6px";
          statusDiv.textContent = "모든 필드를 입력해주세요.";
        }
        return;
      }

      // 현재 캠페인 ID 가져오기 (모달에서)
      const modal = document.querySelector(".customer-detail-modal");
      console.log("모달 요소:", modal);
      if (!modal) {
        console.error("모달을 찾을 수 없습니다.");
        alert("캠페인 정보를 찾을 수 없습니다.");
        return;
      }

      const campaignId = modal.getAttribute("data-campaign-id");
      console.log("캠페인 ID:", campaignId);
      if (!campaignId) {
        console.error("캠페인 ID를 찾을 수 없습니다.");
        alert("캠페인 ID를 찾을 수 없습니다.");
        return;
      }

      // 로딩 상태 표시
      if (statusDiv) {
        statusDiv.style.display = "block";
        statusDiv.style.color = "#0ea5e9";
        statusDiv.style.backgroundColor = "#f0f9ff";
        statusDiv.style.border = "1px solid #0ea5e9";
        statusDiv.style.padding = "8px 12px";
        statusDiv.style.borderRadius = "6px";
        statusDiv.textContent = "저장 중...";
      }

      // 토큰 가져오기
      const token = getToken();
      console.log("토큰:", token ? "존재함" : "없음");
      if (!token) {
        console.error("토큰을 찾을 수 없습니다.");
        alert("로그인이 필요합니다.");
        return;
      }

      // API 호출
      const apiUrl = `/api/auth/campaigns/${campaignId}/return-address`;
      const requestBody = {
        name: returnName,
        phone: returnPhone,
        address: returnAddress,
      };

      console.log("API 호출 시작:", {
        url: apiUrl,
        method: "POST",
        body: requestBody,
        token: token ? "존재함" : "없음",
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      console.log("=== 제품 반송 주소 저장 응답 ===");
      console.log("Response status:", response.status);
      console.log("Response result:", result);

      if (response.ok && result.success) {
        // 성공 상태 표시
        if (statusDiv) {
          statusDiv.style.color = "#059669";
          statusDiv.style.backgroundColor = "#ecfdf5";
          statusDiv.style.border = "1px solid #10b981";
          statusDiv.textContent = "저장되었습니다.";
        }

        // 입력 필드 초기화
        if (document.getElementById("returnName"))
          document.getElementById("returnName").value = "";
        if (document.getElementById("returnPhone"))
          document.getElementById("returnPhone").value = "";
        if (document.getElementById("returnAddress"))
          document.getElementById("returnAddress").value = "";

        // 3초 후 상태 메시지 숨기기
        setTimeout(() => {
          if (statusDiv) {
            statusDiv.style.display = "none";
          }
        }, 3000);
      } else {
        // 실패 상태 표시
        console.error("API 응답 실패:", { status: response.status, result });
        if (statusDiv) {
          statusDiv.style.color = "#ef4444";
          statusDiv.style.backgroundColor = "#fef2f2";
          statusDiv.style.border = "1px solid #fecaca";
          statusDiv.textContent = result.error || "저장에 실패했습니다.";
        }
        alert("저장 실패: " + (result.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("제품 반송 주소 저장 오류:", error);
      const statusDiv = document.getElementById("returnAddressStatus");
      if (statusDiv) {
        statusDiv.style.display = "block";
        statusDiv.style.color = "#ef4444";
        statusDiv.style.backgroundColor = "#fef2f2";
        statusDiv.style.border = "1px solid #fecaca";
        statusDiv.style.padding = "8px 12px";
        statusDiv.style.borderRadius = "6px";
        statusDiv.textContent = "저장 중 오류가 발생했습니다.";
      }
    }
  };

  // ===== 대행사용 배송지 파일 관련 함수들 =====

  // 배송지 파일 로드 (대행사용)
  async function loadShippingFilesForAgency(campaignId) {
    try {
      const token = getToken();
      if (!token) {
        console.error("토큰이 없습니다.");
        return;
      }

      const response = await fetch(
        `/api/auth/campaigns/${encodeURIComponent(campaignId)}/shipping-files`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      displayShippingFilesForAgency(data.shippingFiles || []);
    } catch (error) {
      console.error("배송지 파일 로드 오류:", error);
    }
  }

  // 배송지 파일 목록 표시 (대행사용)
  function displayShippingFilesForAgency(shippingFiles) {
    const container = document.querySelector(".shipping-files-list");
    if (!container) {
      console.error("배송지 파일 컨테이너를 찾을 수 없습니다.");
      return;
    }

    if (!shippingFiles || shippingFiles.length === 0) {
      container.innerHTML = `
        <div class="shipping-files-empty">
          <div class="shipping-files-empty-icon">📁</div>
          <div class="shipping-files-empty-text">업로드된 배송지 파일이 없습니다</div>
          <div class="shipping-files-empty-subtext">관리자가 배송지 파일을 업로드하면 여기에 표시됩니다</div>
        </div>
      `;
      return;
    }

    container.innerHTML = shippingFiles
      .map((file) => {
        const uploadDate = new Date(file.created_at).toLocaleDateString(
          "ko-KR"
        );
        const fileSize = formatFileSize(file.file_size);
        const fileIcon = getFileTypeIcon(file.file_type);

        return `
          <div class="shipping-file-item">
            <div class="shipping-file-info">
              <div class="shipping-file-icon">${fileIcon}</div>
              <div class="shipping-file-details">
                <div class="shipping-file-name">${file.original_file_name}</div>
                <div class="shipping-file-meta">
                  ${fileSize} • ${uploadDate}
                  ${file.request_notes ? ` • ${file.request_notes}` : ""}
                </div>
              </div>
            </div>
            <button 
              class="shipping-file-download-btn"
              onclick="downloadShippingFileForAgency('${file.id}', '${
          file.original_file_name
        }')"
            >
              📥 다운로드
            </button>
          </div>
        `;
      })
      .join("");
  }

  // 파일 크기 포맷팅
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // 파일 타입별 아이콘
  function getFileTypeIcon(fileType) {
    if (fileType.includes("csv")) return "📊";
    if (fileType.includes("excel") || fileType.includes("spreadsheet"))
      return "📈";
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("word") || fileType.includes("doc")) return "📝";
    if (
      fileType.includes("image") ||
      fileType.includes("jpg") ||
      fileType.includes("png")
    )
      return "🖼️";
    return "📎";
  }

  // 배송지 파일 다운로드 (대행사용)
  async function downloadShippingFileForAgency(fileId, fileName) {
    const modal = document.getElementById("campaignDetailModal");
    if (!modal) {
      console.error("캠페인 모달을 찾을 수 없습니다.");
      return;
    }

    const campaignId = modal.getAttribute("data-campaign-id");
    if (!campaignId) {
      console.error("캠페인 ID를 찾을 수 없습니다.");
      return;
    }

    try {
      // 토큰 가져오기 (다른 함수들과 동일한 방식 사용)
      const token = getToken();
      console.log("토큰 확인:", token ? "토큰 존재" : "토큰 없음");

      if (!token) {
        alert("로그인이 필요합니다.");
        return;
      }

      console.log("배송지 파일 다운로드 시작:", {
        fileId,
        fileName,
        campaignId,
      });

      // fetch로 파일 다운로드
      const response = await fetch(
        `/api/auth/campaigns/${encodeURIComponent(
          campaignId
        )}/shipping-files/${fileId}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "다운로드에 실패했습니다.");
      }

      // 응답을 blob으로 변환
      const blob = await response.blob();

      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // 정리
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log("파일 다운로드 완료:", fileName);
    } catch (error) {
      console.error("파일 다운로드 오류:", error);
      alert(`파일 다운로드 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  // 전역 함수로 등록
  window.loadShippingFilesForAgency = loadShippingFilesForAgency;
  window.displayShippingFilesForAgency = displayShippingFilesForAgency;
  window.downloadShippingFileForAgency = downloadShippingFileForAgency;

  window.initCampaignManagementComponent = initCampaignManagementComponent;

  // 다른 역할에서도 사용할 수 있도록 모달 함수들 전역 등록
  window.adoptCustomerDetailModal = adoptCustomerDetailModal;
  window.loadCssOnce = loadCssOnce;
  window.loadScriptOnce = loadScriptOnce;
})();

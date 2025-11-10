// 경량 초기화: 하드코딩된 클라이언트 카드와 버튼을 연결
(function () {
  function onClick(e) {
    const viewBtn = e.target.closest(".client-view-btn");
    if (viewBtn) {
      const card = viewBtn.closest("[data-client-name]");
      const clientName = card
        ? card.getAttribute("data-client-name") || "클라이언트"
        : "클라이언트";
      openClientCampaignListModalLite(clientName);
      return;
    }
    // 대량등록 버튼 제거됨
  }

  function getCampaignsForClient(clientName) {
    // 1) 캠페인 관리 스크립트가 전역 데이터를 노출했다면 우선 사용
    try {
      if (Array.isArray(window.campaignsData) && window.campaignsData.length) {
        return window.campaignsData.filter(
          (c) =>
            (c.company && c.company.includes(clientName)) ||
            (c.tags && c.tags.some((t) => t.includes(clientName))) ||
            (c.title && c.title.includes(clientName))
        );
      }
    } catch (_) {}

    // 2) Supabase 연동 훅이 노출된 경우 (선택적)
    try {
      if (typeof window.getAgencyCampaigns === "function") {
        const list = window.getAgencyCampaigns();
        if (Array.isArray(list)) {
          return list.filter((c) => (c.company || "").includes(clientName));
        }
      }
    } catch (_) {}

    // 하드코딩된 테스트 데이터 제거됨 - 실제 데이터만 사용
    return [];
  }

  function renderStatusBadge(status) {
    switch (status) {
      case "progress":
        return '<span style="padding:4px 8px;border-radius:12px;background:#ecfdf5;color:#047857;font-size:12px;font-weight:600;">진행중</span>';
      case "completed":
        return '<span style="padding:4px 8px;border-radius:12px;background:#f3f4f6;color:#374151;font-size:12px;font-weight:600;">완료</span>';
      case "scheduled":
        return '<span style="padding:4px 8px;border-radius:12px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:600;">예정</span>';
      case "cancelled":
        return '<span style="padding:4px 8px;border-radius:12px;background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:600;">취소</span>';
      default:
        return '<span style="padding:4px 8px;border-radius:12px;background:#e5e7eb;color:#374151;font-size:12px;font-weight:600;">-</span>';
    }
  }

  function openClientCampaignListModalLite(clientName) {
    const exist = document.getElementById("client-campaigns-modal");
    if (exist) exist.remove();
    const wrap = document.createElement("div");
    wrap.id = "client-campaigns-modal";
    wrap.style.cssText =
      "position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;";
    const campaigns = getCampaignsForClient(clientName);
    // 현재 모달 내 상세보기를 위해 리스트 맵 보관
    try {
      window.__clientCampaignsMap = Object.create(null);
      campaigns.forEach(function (c) {
        window.__clientCampaignsMap[c.id] = c;
      });
    } catch (_) {}

    const rows = campaigns
      .map(
        (c) => `
      <div style="display:grid;grid-template-columns:1fr 120px 120px 140px;gap:12px;align-items:center;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;">
        <div>
          <div style="font-weight:700;color:#1e293b;margin-bottom:4px;">${
            c.title
          }</div>
          <div style="font-size:12px;color:#64748b;">${c.id}</div>
        </div>
        <div style="text-align:center;">${renderStatusBadge(c.status)}</div>
        <div style="text-align:center;color:#111827;font-weight:600;">${
          (c.progress && c.progress.percentage) || 0
        }%</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" style="padding:8px 12px;border:2px solid #255ffe;border-radius:8px;background:#fff;color:#255ffe;font-weight:700;cursor:pointer;" onclick="(window.__showClientCampaignDetailModal?window.__showClientCampaignDetailModal('${
            c.id
          }'):alert('상세보기 준비중입니다.'))">상세보기</button>
        </div>
      </div>
    `
      )
      .join("");

    wrap.innerHTML = `
      <div style="background:#fff;width:92%;max-width:960px;max-height:85vh;overflow:auto;border-radius:12px;padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid #e5e7eb;">
          <h3 style="margin:0;color:#1e293b;">📋 ${clientName} 캠페인 목록</h3>
          <button type="button" style="background:none;border:none;font-size:20px;color:#6b7280;cursor:pointer;" onclick="document.getElementById('client-campaigns-modal').remove()">×</button>
        </div>
        ${
          campaigns.length
            ? `<div style=\"display:grid;gap:10px;\">${rows}</div>`
            : `<div style=\"text-align:center;color:#9ca3af;padding:28px;\">연결된 캠페인이 없습니다.</div>`
        }
        <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:16px;">
          <button type="button" style="padding:8px 14px;border-radius:8px;border:1px solid #d1d5db;background:#f8fafc;color:#374151;cursor:pointer;" onclick="document.getElementById('client-campaigns-modal').remove()">닫기</button>
          <button type="button" style="padding:8px 14px;border-radius:8px;border:2px solid #255ffe;background:#fff;color:#255ffe;font-weight:700;cursor:pointer;" onclick="(window.loadCampaignManagement?window.loadCampaignManagement():alert('캠페인 관리 로드 함수가 없습니다.'))">캠페인 관리로 이동</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // 상세보기 모달 즉시 표시 함수
    if (!window.__showClientCampaignDetailModal) {
      window.__showClientCampaignDetailModal = function (id) {
        var data = null;
        try {
          if (window.__clientCampaignsMap)
            data = window.__clientCampaignsMap[id] || null;
          if (!data && Array.isArray(window.campaignsData)) {
            data =
              window.campaignsData.find(function (c) {
                return c.id === id;
              }) || null;
          }
        } catch (_) {}
        if (!data) {
          alert("캠페인 데이터를 찾을 수 없습니다.");
          return;
        }

        var exist = document.getElementById("client-campaign-detail-modal");
        if (exist) exist.remove();

        var detail = document.createElement("div");
        detail.id = "client-campaign-detail-modal";
        detail.style.cssText =
          "position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;";

        var pct = (data.progress && data.progress.percentage) || 0;
        var bar =
          '<div style="width:100%;height:10px;background:#e5e7eb;border-radius:6px;overflow:hidden;">\
          <div style="width:' +
          pct +
          '%;height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);"></div>\
        </div>';

        var dateStr = data.date || "";
        var company = data.company || "-";
        var statusHtml = (function () {
          try {
            return "Status: " + (data.status || "-");
          } catch (_) {
            return "Status: -";
          }
        })();

        detail.innerHTML =
          '\
          <div style="background:#fff;width:94%;max-width:980px;max-height:88vh;overflow:auto;border-radius:14px;padding:24px;">\
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:16px;">\
              <h3 style="margin:0;color:#1e293b;">📄 캠페인 상세</h3>\
              <button type="button" style="background:none;border:none;font-size:22px;color:#6b7280;cursor:pointer;" onclick="document.getElementById(\'client-campaign-detail-modal\').remove()">×</button>\
            </div>\
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">\
              <div>\
                <div style="color:#64748b;font-size:12px;">캠페인명</div>\
                <div style="font-size:18px;font-weight:700;color:#111827;margin-top:4px;">' +
          (data.title || "-") +
          '</div>\
              </div>\
              <div>\
                <div style="color:#64748b;font-size:12px;">캠페인 ID</div>\
                <div style="font-size:14px;color:#374151;margin-top:4px;">' +
          data.id +
          '</div>\
              </div>\
              <div>\
                <div style="color:#64748b;font-size:12px;">업체명</div>\
                <div style="font-size:14px;color:#374151;margin-top:4px;">' +
          company +
          '</div>\
              </div>\
              <div>\
                <div style="color:#64748b;font-size:12px;">기간</div>\
                <div style="font-size:14px;color:#374151;margin-top:4px;">' +
          dateStr +
          '</div>\
              </div>\
            </div>\
            <div style="margin-top:16px;">\
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">\
                <div style="color:#374151;font-weight:600;">진행률</div>\
                <div style="color:#111827;font-weight:700;">' +
          pct +
          "%</div>\
              </div>\
              " +
          bar +
          '\
            </div>\
            <div style="margin-top:16px;color:#6b7280;font-size:13px;">' +
          statusHtml +
          '</div>\
            <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:16px;">\
              <button type="button" style="padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;background:#f8fafc;color:#374151;cursor:pointer;" onclick="document.getElementById(\'client-campaign-detail-modal\').remove()">닫기</button>\
            </div>\
          </div>';

        document.body.appendChild(detail);
      };
    }
  }

  // 캠페인 데이터 로드 및 클라이언트 통계 계산
  async function loadClientData() {
    try {
      // 토큰 가져오기
      const token = (() => {
        try {
          if (typeof getRoleSessionToken === "function") {
            const t = getRoleSessionToken("agency");
            if (t && t.trim() !== "") return t;
          }
        } catch (_) {}
        return (
          sessionStorage.getItem("troy_token_agency") ||
          localStorage.getItem("troy_token_agency") ||
          localStorage.getItem("troy_token") ||
          ""
        );
      })();

      if (!token) {
        console.log("토큰이 없어 클라이언트 데이터를 불러올 수 없습니다.");
        return;
      }

      // 캠페인 데이터 로드
      const res = await fetch("/api/auth/my-campaigns", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok || data?.error) {
        console.error("캠페인 데이터 조회 실패:", data?.error || res.status);
        return;
      }

      const campaigns = data.campaigns || [];

      // 캠페인에서 광고주(advertiser_id) 정보 추출하여 클라이언트 목록 생성
      const clientsMap = new Map();
      campaigns.forEach((campaign) => {
        const advertiserId = campaign.advertiser_id;
        if (advertiserId) {
          if (!clientsMap.has(advertiserId)) {
            clientsMap.set(advertiserId, {
              id: advertiserId,
              name: campaign.advertiser_name || `클라이언트 ${advertiserId}`,
              campaigns: [],
              totalCampaigns: 0,
              activeCampaigns: 0,
              completedCampaigns: 0,
            });
          }
          const client = clientsMap.get(advertiserId);
          client.campaigns.push(campaign);
          client.totalCampaigns++;

          // 상태별 집계
          const status = (campaign.status || "").toLowerCase();
          if (status === "completed") {
            client.completedCampaigns++;
          } else if (status === "active" || status === "approved") {
            client.activeCampaigns++;
          }
        }
      });

      // 클라이언트 카드 렌더링
      renderClientCards(Array.from(clientsMap.values()));

      // 통계 업데이트
      updateClientStatistics(clientsMap.size, campaigns);
    } catch (e) {
      console.error("클라이언트 데이터 로드 오류:", e);
    }
  }

  // 클라이언트 카드 렌더링
  function renderClientCards(clients) {
    const container = document.getElementById("client-cards-container");
    if (!container) return;

    // 기존 내용 제거
    container.innerHTML = "";

    if (clients.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; padding: 40px; color: #64748b; width: 100%;">등록된 클라이언트가 없습니다.</div>';
      return;
    }

    clients.forEach((client, index) => {
      const progress =
        client.totalCampaigns > 0
          ? Math.round(
              (client.completedCampaigns / client.totalCampaigns) * 100
            )
          : 0;

      const card = document.createElement("div");
      card.setAttribute("data-client-name", client.name);
      card.style.cssText = `
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
        min-width: 250px;
      `;

      card.innerHTML = `
        <div style="margin-bottom: 10px; flex: 1">
          <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">
            ${index + 1}. ${client.name}
          </h3>
          <div style="font-size: 9px; color: #64748b; margin-bottom: 6px">
            ${client.id}
          </div>
          <div style="margin-bottom: 6px">
            <span style="font-size: 8px; padding: 2px 6px; border-radius: 4px; background: #dbeafe; color: #1e40af;">
              클라이언트
            </span>
          </div>
        </div>

        <!-- 진행률 바 -->
        <div style="margin-bottom: 10px">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="font-size: 10px; color: #64748b; font-weight: 600">진행률</span>
            <span style="font-size: 10px; color: #255ffe; font-weight: 700">${progress}%</span>
          </div>
          <div style="background: #f1f5f9; height: 5px; border-radius: 3px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #255ffe 0%, #1d4ed8 100%); height: 100%; width: ${progress}%;"></div>
          </div>
          <div style="font-size: 8px; color: #64748b; margin-top: 2px">
            ${client.completedCampaigns}/${client.totalCampaigns} 완료
          </div>
        </div>

        <!-- 버튼 -->
        <div style="display: flex; gap: 6px">
          <button style="flex: 1; padding: 6px 2px; background: #f8fafc; border: 1px solid #255ffe; border-radius: 6px; color: #255ffe; font-weight: 600; font-size: 9px; cursor: pointer;" class="client-view-btn">
            캠페인 보기
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // 통계 업데이트
  function updateClientStatistics(clientCount, campaigns) {
    const totalEl = document.getElementById("total-count");
    const scheduledEl = document.getElementById("scheduled-count");
    const progressEl = document.getElementById("progress-count");
    const completedEl = document.getElementById("completed-count");

    if (totalEl) totalEl.textContent = clientCount;

    // 캠페인 상태별 집계
    let totalCampaigns = campaigns.length;
    let scheduledCampaigns = 0;
    let progressCampaigns = 0;
    let completedCampaigns = 0;

    campaigns.forEach((campaign) => {
      const status = (campaign.status || "").toLowerCase();
      if (status === "completed") {
        completedCampaigns++;
      } else if (status === "active" || status === "approved") {
        progressCampaigns++;
      } else {
        scheduledCampaigns++;
      }
    });

    if (scheduledEl) scheduledEl.textContent = totalCampaigns;
    if (progressEl) progressEl.textContent = progressCampaigns;
    if (completedEl) completedEl.textContent = completedCampaigns;
  }

  function init() {
    // 스타일 주입: 동적 호버 인터랙션
    if (!document.getElementById("client-mgmt-lite-style")) {
      const style = document.createElement("style");
      style.id = "client-mgmt-lite-style";
      style.textContent = `
        .client-view-btn, .client-bulk-btn {
          transition: transform .2s ease, box-shadow .2s ease, filter .2s ease, background-color .2s ease, color .2s ease;
          will-change: transform, box-shadow, filter;
        }
        .client-view-btn.is-hover, .client-bulk-btn.is-hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 6px 18px rgba(37, 95, 254, 0.24);
        }
        /* 뷰 버튼은 배경을 살짝 밝게 */
        .client-view-btn.is-hover {
          background-color: #f0f5ff !important;
        }
        /* 대량등록(그라디언트) 버튼은 살짝 밝기 업 */
        .client-bulk-btn.is-hover {
          filter: brightness(1.05);
        }
        /* 포커스 접근성 */
        .client-view-btn:focus-visible, .client-bulk-btn:focus-visible {
          outline: 2px solid #255ffe;
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(style);
    }

    // 컨테이너 존재 시 위임 이벤트 바인딩
    const container = document.querySelector(".main-content");
    if (!container) {
      document.addEventListener("click", onClick);
    } else {
      container.addEventListener("click", onClick);
    }

    // 호버 위임: mouseenter/leave로 is-hover 토글
    const onEnter = (e) => {
      const btn = e.target.closest(".client-view-btn, .client-bulk-btn");
      if (btn) btn.classList.add("is-hover");
    };
    const onLeave = (e) => {
      const btn = e.target.closest(".client-view-btn, .client-bulk-btn");
      if (btn) btn.classList.remove("is-hover");
    };

    const root = container || document;
    root.addEventListener("mouseover", onEnter);
    root.addEventListener("mouseout", onLeave);

    // 클라이언트 데이터 로드
    loadClientData();
  }

  window.initClientManagementLite = init;
})();

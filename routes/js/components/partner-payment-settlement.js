// 파트너 정산 페이지 JavaScript (실데이터 연동)

let monthFilter, searchInput, searchBtn, resetBtn, excelBtn;
let allItems = [];

function getAdminLikeToken() {
  try {
    let t =
      sessionStorage.getItem("troy_token_admin") ||
      localStorage.getItem("troy_token_admin") ||
      localStorage.getItem("troy_token");
    if (!t) {
      localStorage.setItem("troy_token", "admin_temp_token");
      t = "admin_temp_token";
    }
    return t;
  } catch (_) {
    return "admin_temp_token";
  }
}

function headers() {
  return { Authorization: `Bearer ${getAdminLikeToken()}` };
}

function showLoading(show) {
  const l = document.getElementById("partnerSettlementLoading");
  if (l) l.style.display = show ? "block" : "none";
}

function showError(msg) {
  const e = document.getElementById("partnerSettlementError");
  if (e) {
    e.textContent = msg || "데이터를 불러오지 못했습니다.";
    e.style.display = "block";
  }
}

async function fetchSettlements() {
  const res = await fetch("/api/admin/partner-settlements?page=1&limit=1000", {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : data.settlements || [];
}

function renderMonthOptions(items) {
  if (!monthFilter) return;
  const months = Array.from(
    new Set(items.map((it) => it.month || it.settlement_month).filter(Boolean))
  ).sort();
  monthFilter.innerHTML =
    '<option value="all">전체</option>' +
    months.map((m) => `<option value="${m}">${m}</option>`).join("");
}

function krw(n) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(Number(n) || 0);
}

function renderStats(items) {
  const sept = items.filter((it) =>
    String(it.month || it.settlement_month || "").includes("09")
  );
  const septSum = sept.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const allSum = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const invited = new Set(items.map((it) => it.customer_name).filter(Boolean))
    .size;
  const sEl = document.getElementById("september-total");
  const aEl = document.getElementById("august-total");
  const iEl = document.getElementById("invited-count");
  if (sEl) sEl.textContent = krw(septSum);
  if (aEl) aEl.textContent = krw(allSum);
  if (iEl) iEl.textContent = String(invited);
}

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return { cls: "completed", text: "정산 완료" };
  if (s === "processing") return { cls: "processing", text: "처리중" };
  return { cls: "pending", text: "정산 예정" };
}

function renderTable(items) {
  const body = document.getElementById("partnerSettlementBody");
  if (!body) return;
  if (items.length === 0) {
    body.innerHTML =
      '<div style="grid-column:1/-1;padding:16px;color:#6b7280;text-align:center;">데이터가 없습니다.</div>';
    return;
  }
  body.innerHTML = items
    .map((row) => {
      const month = row.month || row.settlement_month || "-";
      const customer = row.customer_name || row.customer || "-";
      const join = (row.join_date || row.created_at || "").slice(0, 10) || "-";
      const count = Number(row.review_count) || 0;
      const unit = Number(row.unit_price) || 300;
      const amount = Number(row.amount) || count * unit;
      const st = statusLabel(row.status);
      return `
      <div class="table-row" data-settlement-row>
        <div><strong style="color:#255ffe">${month}</strong></div>
        <div>${customer}</div>
        <div style="color:#64748b">${join}</div>
        <div><strong style="color:#3b82f6">${count}건</strong></div>
        <div>${krw(unit)}</div>
        <div><strong style="color:#10b981">${krw(amount)}</strong></div>
        <div><span class="status-badge ${st.cls}">${st.text}</span></div>
      </div>`;
    })
    .join("");
}

function applyFilters() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  const m = monthFilter?.value || "all";
  let items = allItems;
  if (m !== "all")
    items = items.filter((it) => String(it.month || it.settlement_month) === m);
  if (q)
    items = items.filter((it) =>
      String(it.customer_name || it.customer || "")
        .toLowerCase()
        .includes(q)
    );
  renderTable(items);
  renderStats(items);
}

async function initPartnerSettlement() {
  monthFilter = document.getElementById("month-filter");
  searchInput = document.getElementById("search-input");
  searchBtn = document.getElementById("search-btn");
  resetBtn = document.getElementById("reset-btn");
  excelBtn = document.getElementById("excel-btn");

  searchBtn?.addEventListener("click", applyFilters);
  resetBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (monthFilter) monthFilter.value = "all";
    applyFilters();
  });
  monthFilter?.addEventListener("change", applyFilters);

  showLoading(true);
  try {
    allItems = await fetchSettlements();
    renderMonthOptions(allItems);
    applyFilters();
  } catch (e) {
    console.error("partner settlements load error", e);
    showError();
  } finally {
    showLoading(false);
  }
}

window.initPartnerSettlement = initPartnerSettlement;

document.addEventListener("DOMContentLoaded", initPartnerSettlement);

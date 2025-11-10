let __ADMIN_PAYMENTS_CACHE__ = [];

async function loadAdminPayments() {
  try {
    const token = localStorage.getItem("troy_token");
    const res = await fetch("/api/admin/payments", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("결제내역을 불러올 수 없습니다.");
    const data = await res.json();
    __ADMIN_PAYMENTS_CACHE__ = Array.isArray(data.items) ? data.items : [];
    applyPaymentsFilters();
    renderStats(data.stats || {});
  } catch (e) {
    const body = document.getElementById("paymentsBody");
    if (body)
      body.innerHTML = `<tr><td colspan="8" class="empty">${e.message}</td></tr>`;
  }
}

function renderStats(stats) {
  document.getElementById("stat-review").textContent = `${stats.review || 0}건`;
  document.getElementById("stat-traffic").textContent = `${
    stats.traffic || 0
  }건`;
  document.getElementById("stat-experience").textContent = `${
    stats.experience || 0
  }건`;
  document.getElementById("stat-content").textContent = `${
    stats.content || 0
  }건`;
}

function renderPayments(rows) {
  const tbody = document.getElementById("paymentsBody");
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty">데이터가 없습니다.</td></tr>';
    return;
  }
  const toWon = (n) => `₩${(n || 0).toLocaleString()}`;
  tbody.innerHTML = rows
    .map((r) => {
      const statusClass =
        r.status === "completed"
          ? "completed"
          : r.status === "progress"
          ? "progress"
          : "pending";
      return `<tr>
        <td>
          <div>${r.date || "-"}</div>
          <div style="color:#94a3b8; font-size:12px;">${r.time || ""}</div>
        </td>
        <td>
          <div style="font-weight:600;">${r.campaignName}</div>
          <div style="color:#94a3b8; font-size:12px;">${r.campaignId}</div>
        </td>
        <td>
          <div>${r.clientName}</div>
          <div style="color:#94a3b8; font-size:12px;">${
            r.clientContact || ""
          }</div>
        </td>
        <td><span class="badge service">${r.serviceLabel}</span></td>
        <td>${r.quantity?.toLocaleString?.() || r.quantity}</td>
        <td>${toWon(r.unitPrice)}</td>
        <td style="font-weight:700;">${toWon(r.totalAmount)}</td>
        <td><span class="badge status ${statusClass}">${
        r.statusLabel
      }</span><div style="color:#94a3b8; font-size:12px;">계좌이체</div></td>
      </tr>`;
    })
    .join("");
}

function applyPaymentsFilters() {
  const keyword = (
    document.getElementById("searchKeyword")?.value || ""
  ).toLowerCase();
  const service = document.getElementById("filterService")?.value || "all";
  const status = document.getElementById("filterStatus")?.value || "all";

  const filtered = (__ADMIN_PAYMENTS_CACHE__ || []).filter((r) => {
    const matchKeyword =
      !keyword ||
      (r.campaignName || "").toLowerCase().includes(keyword) ||
      (r.campaignId || "").toLowerCase().includes(keyword) ||
      (r.clientName || "").toLowerCase().includes(keyword);
    const matchService = service === "all" || r.service === service;
    const matchStatus = status === "all" || r.status === status;
    return matchKeyword && matchService && matchStatus;
  });

  renderPayments(filtered);
}

function exportPaymentsCSV() {
  const rows = document.querySelectorAll("#paymentsBody tr");
  if (!rows.length) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }
  // 헤더
  const header = [
    "결제일",
    "캠페인명",
    "캠페인ID",
    "클라이언트",
    "서비스",
    "수량",
    "단가",
    "결제금액",
    "상태",
  ];

  const csvRows = [header.join(",")];

  (__ADMIN_PAYMENTS_CACHE__ || []).forEach((r) => {
    const filtered = (() => {
      const keyword = (
        document.getElementById("searchKeyword")?.value || ""
      ).toLowerCase();
      const service = document.getElementById("filterService")?.value || "all";
      const status = document.getElementById("filterStatus")?.value || "all";
      const matchKeyword =
        !keyword ||
        (r.campaignName || "").toLowerCase().includes(keyword) ||
        (r.campaignId || "").toLowerCase().includes(keyword) ||
        (r.clientName || "").toLowerCase().includes(keyword);
      const matchService = service === "all" || r.service === service;
      const matchStatus = status === "all" || r.status === status;
      return matchKeyword && matchService && matchStatus;
    })();
    if (!filtered) return;
    const line = [
      `${r.date} ${r.time || ""}`.trim(),
      escapeCSV(r.campaignName),
      r.campaignId,
      escapeCSV(r.clientName),
      r.serviceLabel,
      r.quantity,
      r.unitPrice,
      r.totalAmount,
      r.statusLabel,
    ].join(",");
    csvRows.push(line);
  });

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  if (/[",\n]/.test(s)) return `"${s}"`;
  return s;
}

function initAdminPayments() {
  document
    .getElementById("btnSearch")
    ?.addEventListener("click", applyPaymentsFilters);
  document.getElementById("btnReset")?.addEventListener("click", () => {
    document.getElementById("searchKeyword").value = "";
    document.getElementById("filterService").value = "all";
    document.getElementById("filterStatus").value = "all";
    applyPaymentsFilters();
  });
  document
    .getElementById("btnExport")
    ?.addEventListener("click", exportPaymentsCSV);
  // 필터 컨트롤 변경 시 자동 반영
  document
    .getElementById("filterService")
    ?.addEventListener("change", applyPaymentsFilters);
  document
    .getElementById("filterStatus")
    ?.addEventListener("change", applyPaymentsFilters);
  document.getElementById("searchKeyword")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyPaymentsFilters();
  });
  loadAdminPayments();
}

window.initAdminPayments = initAdminPayments;

// Troy Bulk Campaign Management System
class TroyBulkCampaign {
  constructor() {
    this.clients = JSON.parse(localStorage.getItem("troy_clients") || "[]");
    this.campaigns = JSON.parse(localStorage.getItem("troy_campaigns") || "{}");
    this.currentClient = null;
    this.pricePerTraffic = 2500; // 유입수 1개당 비용
    this.maxUrlRows = 5; // 최대 URL 입력 개수

    this.init();
  }

  init() {
    this.bindEvents();
    this.renderAgencyDashboard();
    this.showSection("agency-dashboard-section");
  }

  bindEvents() {
    // Client management events
    document
      .getElementById("add-client-btn")
      .addEventListener("click", () => this.showAddClientModal());
    document
      .getElementById("add-client-form")
      .addEventListener("submit", (e) => this.addClient(e));
    document
      .getElementById("back-to-dashboard")
      .addEventListener("click", () => this.showAgencyDashboard());

    // Quick campaign events
    document
      .getElementById("quick-extract-btn")
      .addEventListener("click", () => this.quickExtractProduct());
    document
      .getElementById("quick-target-traffic")
      .addEventListener("input", () => this.updateQuickPricing());
    document
      .getElementById("quick-register-btn")
      .addEventListener("click", () => this.registerQuickCampaign());

    // Campaign events
    document
      .getElementById("bulk-campaign-btn")
      .addEventListener("click", () => this.showBulkCampaignModal());
    document
      .getElementById("preview-btn")
      .addEventListener("click", () => this.previewUrls());
    document
      .getElementById("bulk-register-btn")
      .addEventListener("click", () => this.bulkRegisterCampaigns());

    // Client management events
    document
      .getElementById("client-management-btn")
      .addEventListener("click", () => this.showClientManagementModal());

    // URL inputs and pricing calculation
    this.bindUrlInputEvents();

    // Dynamic row management
    document
      .getElementById("add-url-row-btn")
      .addEventListener("click", () => this.addUrlRow());

    // Modal close events
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.closeModal(e.target.closest(".modal"))
      );
    });

    // Click outside modal to close
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closeModal(modal);
      });
    });
  }

  showSection(sectionId) {
    document
      .querySelectorAll(".section")
      .forEach((section) => section.classList.remove("active"));
    document.getElementById(sectionId).classList.add("active");
  }

  showAddClientModal() {
    document.getElementById("add-client-modal").classList.add("active");
  }

  showBulkCampaignModal() {
    if (!this.currentClient) return;
    document.getElementById("bulk-campaign-modal").classList.add("active");

    // 초기 상태 설정
    this.updateAddButtonState();
    this.updateModalSize();

    // 초기 장바구니 업데이트
    this.updatePricing();
  }

  showClientManagementModal() {
    if (!this.currentClient) return;

    // Update client information in modal
    document.getElementById("current-client-name").textContent =
      this.currentClient.name;
    document.getElementById("current-business-name").textContent =
      this.currentClient.businessName || "없음";
    document.getElementById("current-business-number").textContent =
      this.currentClient.businessNumber;
    document.getElementById("current-client-url").textContent =
      this.currentClient.url;
    document.getElementById("current-created-date").textContent = new Date(
      this.currentClient.createdAt
    ).toLocaleDateString("ko-KR");

    // Update statistics
    document.getElementById("mgmt-total-campaigns").textContent =
      this.currentClient.totalCampaigns;
    document.getElementById("mgmt-active-campaigns").textContent =
      this.currentClient.activeCampaigns;
    document.getElementById("mgmt-completed-campaigns").textContent =
      this.currentClient.completedCampaigns;
    document.getElementById("mgmt-target-traffic").textContent =
      this.currentClient.targetTraffic.toLocaleString();
    document.getElementById("mgmt-completed-traffic").textContent =
      this.currentClient.completedTraffic.toLocaleString();
    document.getElementById(
      "mgmt-execution-rate"
    ).textContent = `${this.currentClient.executionRate}%`;

    document.getElementById("client-management-modal").classList.add("active");
  }

  closeModal(modal) {
    modal.classList.remove("active");
    // Reset forms
    modal.querySelectorAll("form").forEach((form) => form.reset());
    document.getElementById("preview-section").style.display = "none";
    this.resetUrlInputs();
    this.updatePricing();
  }

  addClient(e) {
    e.preventDefault();

    const name = document.getElementById("client-name-input").value;
    const businessName = document.getElementById(
      "client-business-name-input"
    ).value;
    const url = document.getElementById("client-url-input").value;
    const businessNumber = document.getElementById(
      "client-business-input"
    ).value;

    const client = {
      id: Date.now().toString(),
      name,
      businessName,
      url,
      businessNumber,
      createdAt: new Date().toISOString(),
      totalCampaigns: 0,
      activeCampaigns: 0,
      completedCampaigns: 0,
      totalReviews: 0,
      targetTraffic: 0,
      completedTraffic: 0,
      progress: 0,
      executionRate: 0,
    };

    this.clients.push(client);
    this.campaigns[client.id] = [];
    this.saveData();
    this.renderAgencyDashboard();
    this.closeModal(document.getElementById("add-client-modal"));
  }

  renderAgencyDashboard() {
    this.updateOverallStats();
    this.renderClientDashboardGrid();
  }

  updateOverallStats() {
    let totalCampaigns = 0;
    let activeCampaigns = 0;
    let completedCampaigns = 0;
    let totalReviews = 0;

    this.clients.forEach((client) => {
      totalCampaigns += client.totalCampaigns;
      activeCampaigns += client.activeCampaigns;
      completedCampaigns += client.completedCampaigns;
      totalReviews += client.totalReviews;
    });

    document.getElementById("total-campaigns").textContent = totalCampaigns;
    document.getElementById("active-campaigns").textContent = activeCampaigns;
    document.getElementById("completed-campaigns").textContent =
      completedCampaigns;
    document.getElementById("total-reviews").textContent = totalReviews;
  }

  renderClientDashboardGrid() {
    const grid = document.getElementById("client-dashboard-grid");

    if (this.clients.length === 0) {
      grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                    <h3 style="color: #6b7280; margin-bottom: 1rem;">등록된 클라이언트가 없습니다</h3>
                    <p style="color: #9ca3af;">새 클라이언트를 추가해보세요.</p>
                </div>
            `;
      return;
    }

    grid.innerHTML = this.clients
      .map((client) => {
        const clientCampaigns = this.campaigns[client.id] || [];
        const recentCampaigns = clientCampaigns.slice(0, 3); // 최근 3개만 표시

        return `
                <div class="client-dashboard-card" data-client-id="${
                  client.id
                }">
                    <div class="client-card-header">
                        <div class="client-card-info">
                            <div class="client-card-name">${client.name}</div>
                            <div class="client-card-business">${
                              client.businessName || "사업자명 없음"
                            }</div>
                            <div class="client-card-url">${client.url}</div>
                        </div>
                        <div class="client-card-icon">${client.name.charAt(
                          0
                        )}</div>
                    </div>
                    
                    <div class="client-card-metrics">
                        <div class="client-metric">
                            <div class="client-metric-label">진행률</div>
                            <div class="client-metric-value">${
                              client.progress
                            }%</div>
                        </div>
                        <div class="client-metric">
                            <div class="client-metric-label">집행률</div>
                            <div class="client-metric-value">${
                              client.executionRate
                            }%</div>
                        </div>
                    </div>
                    
                    <div class="client-card-actions">
                        <button class="client-action-btn btn btn-primary" onclick="app.showQuickCampaignModal('${
                          client.id
                        }')">
                            📝 간편등록
                        </button>
                        <button class="client-action-btn btn btn-outline" onclick="app.showClientDetail('${
                          client.id
                        }')">
                            📊 상세보기
                        </button>
                    </div>
                </div>
            `;
      })
      .join("");

    // Add click handlers
    grid.querySelectorAll(".client-dashboard-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const clientId = e.currentTarget.dataset.clientId;
        this.showClientDetail(clientId);
      });
    });
  }

  renderClients() {
    const grid = document.getElementById("client-grid");

    if (this.clients.length === 0) {
      grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <h3 style="color: #6b7280; margin-bottom: 1rem;">등록된 클라이언트가 없습니다</h3>
                    <p style="color: #9ca3af;">새 클라이언트를 추가해보세요.</p>
                </div>
            `;
      return;
    }

    grid.innerHTML = this.clients
      .map(
        (client) => `
            <div class="client-folder" data-client-id="${client.id}">
                <div class="folder-header">
                    <div class="folder-icon">${client.name.charAt(0)}</div>
                    <button class="folder-menu">⋮</button>
                </div>
                <div class="client-info">
                    <div class="client-name">${client.name}</div>
                    <div class="business-name">${
                      client.businessName || "사업자명 없음"
                    }</div>
                    <div class="client-url">${client.url}</div>
                </div>
                
                <div class="metrics-section">
                    <div class="metric-row">
                        <div class="metric-label">캠페인 진행률</div>
                        <div class="metric-value">${client.progress}%</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill campaign-progress" style="width: ${
                          client.progress
                        }%"></div>
                    </div>
                    
                    <div class="metric-row">
                        <div class="metric-label">집행률</div>
                        <div class="metric-value">${client.executionRate}%</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill execution-progress" style="width: ${
                          client.executionRate
                        }%"></div>
                    </div>
                </div>
                
                <div class="folder-stats">
                    <div class="stat-item">
                        <span class="stat-label">캠페인</span>
                        <span class="stat-value">${
                          client.totalCampaigns
                        }개</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">목표 유입</span>
                        <span class="stat-value">${client.targetTraffic.toLocaleString()}개</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">완료 유입</span>
                        <span class="stat-value">${client.completedTraffic.toLocaleString()}개</span>
                    </div>
                </div>
            </div>
        `
      )
      .join("");

    // Add click handlers
    grid.querySelectorAll(".client-folder").forEach((folder) => {
      folder.addEventListener("click", (e) => {
        const clientId = e.currentTarget.dataset.clientId;
        this.showClientDashboard(clientId);
      });
    });
  }

  showClientDetail(clientId) {
    this.currentClient = this.clients.find((c) => c.id === clientId);
    if (!this.currentClient) return;

    document.getElementById(
      "client-detail-name"
    ).textContent = `${this.currentClient.name} 상세`;
    this.updateClientDetailStats();
    this.renderCampaigns();
    this.showSection("client-detail-section");
  }

  showAgencyDashboard() {
    this.currentClient = null;
    this.renderAgencyDashboard();
    this.showSection("agency-dashboard-section");
  }

  updateClientDetailStats() {
    if (!this.currentClient) return;

    document.getElementById("client-total-campaigns").textContent =
      this.currentClient.totalCampaigns;
    document.getElementById("client-active-campaigns").textContent =
      this.currentClient.activeCampaigns;
    document.getElementById("client-completed-campaigns").textContent =
      this.currentClient.completedCampaigns;
    document.getElementById("client-total-reviews").textContent =
      this.currentClient.totalReviews;
  }

  updateDashboardStats() {
    if (!this.currentClient) return;

    document.getElementById("total-campaigns").textContent =
      this.currentClient.totalCampaigns;
    document.getElementById("active-campaigns").textContent =
      this.currentClient.activeCampaigns;
    document.getElementById("completed-campaigns").textContent =
      this.currentClient.completedCampaigns;
    document.getElementById("total-reviews").textContent =
      this.currentClient.totalReviews;
  }

  renderCampaigns() {
    const tbody = document.getElementById("campaign-tbody");
    const clientCampaigns = this.campaigns[this.currentClient.id] || [];

    if (clientCampaigns.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #6b7280;">
                        등록된 캠페인이 없습니다. 대량 캠페인 등록을 시작해보세요.
                    </td>
                </tr>
            `;
      return;
    }

    tbody.innerHTML = clientCampaigns
      .map(
        (campaign) => `
            <tr>
                <td>
                    <span class="group-badge">그룹 ${campaign.group || 1}</span>
                </td>
                <td>${campaign.title}</td>
                <td>
                    <img src="${
                      campaign.image
                    }" alt="상품 이미지" class="product-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'">
                </td>
                <td>${campaign.price}</td>
                <td>${campaign.targetTraffic.toLocaleString()}개</td>
                <td>
                    <div class="progress-bar" style="width: 100px;">
                        <div class="progress-fill" style="width: ${
                          campaign.progress
                        }%"></div>
                    </div>
                    ${campaign.progress}%
                </td>
                <td>
                    <span class="status-badge status-${
                      campaign.status
                    }">${this.getStatusText(campaign.status)}</span>
                </td>
                <td>${new Date(campaign.createdAt).toLocaleDateString(
                  "ko-KR"
                )}</td>
            </tr>
        `
      )
      .join("");
  }

  getStatusText(status) {
    const statusMap = {
      active: "진행중",
      pending: "대기중",
      completed: "완료",
    };
    return statusMap[status] || status;
  }

  bindUrlInputEvents() {
    // URL inputs와 traffic inputs에 이벤트 바인딩 (동적으로 처리)
    document.addEventListener("input", async (e) => {
      if (
        e.target.classList.contains("url-input") ||
        e.target.classList.contains("traffic-input")
      ) {
        await this.updatePricing();
      }
    });

    // 삭제 버튼 이벤트 (동적으로 처리)
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-row-btn")) {
        this.removeUrlRow(e.target.closest(".url-input-row"));
      }
    });
  }

  async addUrlRow() {
    const container = document.getElementById("url-inputs-container");
    const currentRows = container.querySelectorAll(".url-input-row").length;

    if (currentRows >= this.maxUrlRows) {
      alert(`최대 ${this.maxUrlRows}개까지만 등록 가능합니다.`);
      return;
    }

    const newIndex = currentRows + 1;
    const newRow = document.createElement("div");
    newRow.className = "url-input-row";
    newRow.dataset.index = newIndex;

    newRow.innerHTML = `
            <div class="row-header">
                <span class="row-number">${newIndex}</span>
                <button type="button" class="remove-row-btn">×</button>
            </div>
            <input type="url" class="url-input" placeholder="https://example.com/product${newIndex}">
            <div class="traffic-section">
                <label class="traffic-label">유입수</label>
                <input type="number" class="traffic-input" value="200" min="1" max="9999">
                <span class="unit">개</span>
            </div>
        `;

    container.appendChild(newRow);
    this.updateRowNumbers();
    this.updateAddButtonState();
    await this.updatePricing();

    // 모달 크기 조정을 위한 클래스 추가
    this.updateModalSize();
  }

  removeUrlRow(row) {
    const container = document.getElementById("url-inputs-container");
    const rows = container.querySelectorAll(".url-input-row");

    if (rows.length <= 1) {
      alert("최소 1개 이상의 URL 입력란이 필요합니다.");
      return;
    }

    row.remove();
    this.updateRowNumbers();
    this.updateAddButtonState();
    this.updatePricing();
    this.updateModalSize();
  }

  updateRowNumbers() {
    const rows = document.querySelectorAll(
      "#url-inputs-container .url-input-row"
    );
    rows.forEach((row, index) => {
      const numberLabel = row.querySelector(".row-number");
      const removeBtn = row.querySelector(".remove-row-btn");

      numberLabel.textContent = `${index + 1}`;
      row.dataset.index = index + 1;

      // 첫 번째 행의 삭제 버튼은 숨김
      removeBtn.style.display = index === 0 ? "none" : "flex";
    });
  }

  updateAddButtonState() {
    const currentRows = document.querySelectorAll(
      "#url-inputs-container .url-input-row"
    ).length;
    const addButton = document.getElementById("add-url-row-btn");

    addButton.disabled = currentRows >= this.maxUrlRows;
    addButton.textContent =
      currentRows >= this.maxUrlRows ? "최대 개수" : "+ 추가";
  }

  updateModalSize() {
    const modal = document.getElementById("bulk-campaign-modal");
    const rowCount = document.querySelectorAll(
      "#url-inputs-container .url-input-row"
    ).length;

    // 행 개수에 따라 모달 크기 조정
    if (rowCount <= 2) {
      modal.classList.remove("modal-expanded");
    } else {
      modal.classList.add("modal-expanded");
    }
  }

  updateIndividualPrice(row) {
    if (!row) return;

    const trafficInput = row.querySelector(".traffic-input");
    const priceDisplay = row.querySelector(".individual-price");

    if (trafficInput && priceDisplay) {
      const traffic = parseInt(trafficInput.value) || 0;
      const price = traffic * this.pricePerTraffic;
      priceDisplay.textContent = `${price.toLocaleString()}원`;
    }
  }

  resetUrlInputs() {
    const container = document.getElementById("url-inputs-container");

    // 모든 행 제거 후 첫 번째 행만 남기기
    container.innerHTML = `
            <div class="url-input-row" data-index="1">
                <div class="row-header">
                    <span class="row-number">1</span>
                    <button type="button" class="remove-row-btn" style="display: none;">×</button>
                </div>
                <input type="url" class="url-input" placeholder="https://example.com/product1">
                <div class="traffic-section">
                    <label class="traffic-label">유입수</label>
                    <input type="number" class="traffic-input" value="200" min="1" max="9999">
                    <span class="unit">개</span>
                </div>
            </div>
        `;

    this.updateAddButtonState();
    this.updateModalSize();
  }

  getValidUrls() {
    const results = [];
    const urlInputs = document.querySelectorAll(".url-input");
    const trafficInputs = document.querySelectorAll(".traffic-input");

    for (let i = 0; i < urlInputs.length; i++) {
      const url = urlInputs[i].value.trim();
      const traffic = parseInt(trafficInputs[i].value) || 0;

      if (url && this.isValidUrl(url) && traffic > 0) {
        results.push({
          url,
          traffic,
          index: i + 1,
        });
      }
    }

    return results;
  }

  async updatePricing() {
    const validUrls = this.getValidUrls();

    // 장바구니 업데이트 (제품가격 기준으로 계산)
    await this.updateCartItems(validUrls);

    // 예치금 표시
    document.getElementById(
      "deposit-balance"
    ).textContent = `${this.depositBalance.toLocaleString()}원`;
  }

  async updateCartItems(validUrls) {
    const cartItems = document.getElementById("cart-items");

    if (validUrls.length === 0) {
      cartItems.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">등록할 캠페인을 추가해주세요</div>
                </div>
            `;
      return;
    }

    // 각 URL의 제품 정보를 가져와서 가격 계산
    const cartItemsHTML = await Promise.all(
      validUrls.map(async (item) => {
        const shortUrl = this.shortenUrl(item.url);
        let productPrice = 0;
        let itemPrice = 0;
        let pricePerUnit = 0;

        try {
          // 제품 정보 스크래핑 (임시 데이터)
          const productInfo = await this.getProductPrice(item.url);
          productPrice = productInfo.price;
          // (제품가격 × 유입수) + (리뷰비용 2500원 × 유입수)
          const productCost = productPrice * item.traffic;
          const reviewCost = this.pricePerTraffic * item.traffic;
          itemPrice = productCost + reviewCost;
        } catch (error) {
          // 스크래핑 실패시 기본값
          productPrice = 50000; // 기본 제품가격
          const productCost = productPrice * item.traffic;
          const reviewCost = this.pricePerTraffic * item.traffic;
          itemPrice = productCost + reviewCost;
        }

        return `
                <div class="cart-item" data-product-price="${productPrice}" data-traffic="${
          item.traffic
        }" data-item-price="${itemPrice}">
                    <div class="item-header">
                        <span class="item-number">${item.index}</span>
                        <span class="item-title">${shortUrl}</span>
                    </div>
                    <div class="item-details">
                        제품가격 ${productPrice.toLocaleString()}원 × ${item.traffic.toLocaleString()}건 = ${(
          productPrice * item.traffic
        ).toLocaleString()}원<br>
                        리뷰비용 2,500원 × ${item.traffic.toLocaleString()}건 = ${(
          this.pricePerTraffic * item.traffic
        ).toLocaleString()}원<br>
                        <small>합계: ${itemPrice.toLocaleString()}원</small>
                    </div>
                    <div class="item-price">${itemPrice.toLocaleString()}원</div>
                </div>
            `;
      })
    );

    cartItems.innerHTML = cartItemsHTML.join("");

    // 총 가격 재계산
    this.recalculateTotal();
  }

  async getProductPrice(url) {
    // 임의의 제품 가격 생성 (실제로는 스크래핑 API 사용)
    return new Promise((resolve) => {
      setTimeout(() => {
        const prices = [
          15000, 25000, 35000, 45000, 55000, 65000, 75000, 85000, 95000, 120000,
        ];
        const randomPrice = prices[Math.floor(Math.random() * prices.length)];
        resolve({ price: randomPrice });
      }, 100);
    });
  }

  recalculateTotal() {
    const cartItems = document.querySelectorAll(".cart-item");
    let totalPrice = 0;
    let totalTraffic = 0;

    cartItems.forEach((item) => {
      const itemPrice = parseInt(item.dataset.itemPrice) || 0;
      const traffic = parseInt(item.dataset.traffic) || 0;

      totalPrice += itemPrice;
      totalTraffic += traffic;
    });

    const campaignCount = cartItems.length;
    const remainingBalance = this.depositBalance - totalPrice;

    // UI 업데이트
    document.getElementById(
      "cart-campaign-count"
    ).textContent = `${campaignCount}개`;
    document.getElementById(
      "cart-total-traffic"
    ).textContent = `${totalTraffic.toLocaleString()}개`;
    document.getElementById(
      "cart-total-price"
    ).textContent = `${totalPrice.toLocaleString()}원`;
    document.getElementById(
      "remaining-balance"
    ).textContent = `${remainingBalance.toLocaleString()}원`;

    // 잔액 상태 업데이트
    const remainingElement = document.getElementById("remaining-balance");
    const registerButton = document.getElementById("bulk-register-btn");
    const chargeButton = document.getElementById("charge-deposit-btn");

    if (remainingBalance < 0) {
      remainingElement.classList.add("insufficient");
      registerButton.style.display = "none";
      chargeButton.style.display = "block";
    } else {
      remainingElement.classList.remove("insufficient");
      registerButton.style.display = "block";
      chargeButton.style.display = "none";
      registerButton.disabled = campaignCount === 0;
    }
  }

  shortenUrl(url) {
    try {
      const urlObj = new URL(url);
      let shortened = urlObj.hostname.replace("www.", "");
      if (urlObj.pathname && urlObj.pathname !== "/") {
        const pathParts = urlObj.pathname.split("/").filter((part) => part);
        if (pathParts.length > 0) {
          shortened += "/" + pathParts[0];
          if (pathParts.length > 1) {
            shortened += "/...";
          }
        }
      }
      return shortened;
    } catch {
      return url.length > 25 ? url.substring(0, 25) + "..." : url;
    }
  }

  updateUrlAndGroupCount(value) {
    const lines = value.split("\n");
    const urls = lines.filter(
      (line) => line.trim() && this.isValidUrl(line.trim())
    );
    const urlCount = urls.length;

    // Count groups by empty lines
    let groupCount = 1;
    let hasContent = false;

    for (const line of lines) {
      if (line.trim()) {
        hasContent = true;
      } else if (hasContent) {
        // Empty line after content - potential group separator
        const nextContentIndex = lines.indexOf(line) + 1;
        for (let i = nextContentIndex; i < lines.length; i++) {
          if (lines[i].trim()) {
            groupCount++;
            break;
          }
        }
        hasContent = false;
      }
    }

    // If no valid URLs, set group count to 0
    if (urlCount === 0) {
      groupCount = 0;
    }

    document.querySelector(".url-count").textContent = `${urlCount} / 200 URLs`;
    document.querySelector(".group-count").textContent = `${groupCount}개 그룹`;

    if (urlCount > 200) {
      document.querySelector(".url-count").style.color = "#ef4444";
    } else {
      document.querySelector(".url-count").style.color = "#6b7280";
    }
  }

  parseUrlsWithGroups(urlsText) {
    const lines = urlsText.split("\n");
    const result = [];
    let currentGroup = 1;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        // Empty line - increment group for next URL
        if (
          result.length > 0 &&
          result[result.length - 1].group === currentGroup
        ) {
          currentGroup++;
        }
      } else if (this.isValidUrl(trimmedLine)) {
        result.push({
          url: trimmedLine,
          group: currentGroup,
        });
      }
    }

    return result;
  }

  async previewUrls() {
    const validUrls = this.getValidUrls();

    if (validUrls.length === 0) {
      alert("유효한 URL을 입력해주세요.");
      return;
    }

    this.showLoadingOverlay("상품 정보를 가져오는 중...", 0, validUrls.length);

    const previewData = [];

    for (let i = 0; i < validUrls.length; i++) {
      const urlData = validUrls[i];
      try {
        const productInfo = await this.scrapeProductInfo(urlData.url);
        previewData.push({
          ...productInfo,
          traffic: urlData.traffic,
          index: urlData.index,
        });
        this.updateLoadingProgress(i + 1, validUrls.length);
      } catch (error) {
        console.error("스크래핑 실패:", urlData.url, error);
        previewData.push({
          ...this.createFallbackProductInfo(urlData.url),
          traffic: urlData.traffic,
          index: urlData.index,
        });
      }

      // Rate limiting
      if (i < validUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    this.hideLoadingOverlay();
    this.renderPreview(previewData);
    document.getElementById("preview-section").style.display = "block";
  }

  async scrapeProductInfo(url) {
    // Mock scraping function - 실제로는 프록시 서버나 백엔드 API를 사용해야 함
    return new Promise((resolve) => {
      setTimeout(() => {
        const titles = [
          "프리미엄 무선 이어폰",
          "스마트 워치 밴드",
          "휴대용 보조배터리",
          "블루투스 스피커",
          "무선 충전기",
          "스마트폰 케이스",
          "노트북 거치대",
          "게이밍 키보드",
        ];

        const prices = [
          "29,900원",
          "45,000원",
          "18,500원",
          "89,000원",
          "35,900원",
        ];
        const images = [
          "https://via.placeholder.com/200x200/3b82f6/ffffff?text=Product1",
          "https://via.placeholder.com/200x200/10b981/ffffff?text=Product2",
          "https://via.placeholder.com/200x200/f59e0b/ffffff?text=Product3",
          "https://via.placeholder.com/200x200/ef4444/ffffff?text=Product4",
        ];

        resolve({
          url,
          title:
            titles[Math.floor(Math.random() * titles.length)] +
            " " +
            Math.floor(Math.random() * 1000),
          price: prices[Math.floor(Math.random() * prices.length)],
          image: images[Math.floor(Math.random() * images.length)],
        });
      }, 200 + Math.random() * 800);
    });
  }

  createFallbackProductInfo(url) {
    return {
      url,
      title: "URL에서 정보를 가져올 수 없음",
      price: "가격 정보 없음",
      image:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCA4MEgxMjBWMTIwSDgwVjgwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=",
    };
  }

  renderPreview(previewData) {
    const grid = document.getElementById("preview-grid");
    grid.innerHTML = previewData
      .map(
        (item, index) => `
            <div class="preview-item">
                <div style="margin-bottom: 0.5rem;">
                    <span class="group-badge">${item.index}번</span>
                </div>
                <img src="${item.image}" alt="${
          item.title
        }" class="preview-image">
                <div class="preview-title">${item.title}</div>
                <div class="preview-price">${item.price}</div>
                <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                    목표 유입: ${item.traffic.toLocaleString()}개
                </div>
            </div>
        `
      )
      .join("");
  }

  async bulkRegisterCampaigns() {
    const validUrls = this.getValidUrls();

    if (validUrls.length === 0) {
      alert("유효한 URL을 입력해주세요.");
      return;
    }

    if (!this.currentClient) {
      alert("클라이언트를 선택해주세요.");
      return;
    }

    // 총 유입수 × 유입수 1개당 가격
    const totalTraffic = validUrls.reduce((sum, item) => sum + item.traffic, 0);
    const totalPrice = totalTraffic * this.pricePerTraffic;

    if (totalPrice > this.depositBalance) {
      alert("예치금이 부족합니다. 예치금을 충전해주세요.");
      return;
    }

    // 결제 확인
    const confirmMessage = `총 ${
      validUrls.length
    }개 캠페인을 ${totalPrice.toLocaleString()}원에 등록하시겠습니까?\n예치금 잔액: ${this.depositBalance.toLocaleString()}원`;
    if (!confirm(confirmMessage)) {
      return;
    }

    this.showLoadingOverlay("캠페인을 등록하는 중...", 0, validUrls.length);

    const newCampaigns = [];

    for (let i = 0; i < validUrls.length; i++) {
      const urlData = validUrls[i];
      try {
        const productInfo = await this.scrapeProductInfo(urlData.url);
        const campaign = {
          id: Date.now() + "-" + i,
          url: urlData.url,
          title: productInfo.title,
          price: productInfo.price,
          image: productInfo.image,
          group: urlData.index, // 입력 순서를 그룹으로 사용
          targetTraffic: urlData.traffic,
          progress: Math.floor(Math.random() * 80), // Random progress for demo
          status: "active",
          createdAt: new Date().toISOString(),
        };

        newCampaigns.push(campaign);
        this.updateLoadingProgress(i + 1, validUrls.length);
      } catch (error) {
        console.error("캠페인 등록 실패:", urlData.url, error);
      }

      // Rate limiting
      if (i < validUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Add campaigns to client
    if (!this.campaigns[this.currentClient.id]) {
      this.campaigns[this.currentClient.id] = [];
    }

    this.campaigns[this.currentClient.id].push(...newCampaigns);

    // 예치금 차감
    this.depositBalance -= totalPrice;
    localStorage.setItem(
      "troy_deposit_balance",
      this.depositBalance.toString()
    );

    // Update client stats
    this.updateClientStats(this.currentClient.id);

    this.saveData();
    this.hideLoadingOverlay();
    this.closeModal(document.getElementById("bulk-campaign-modal"));

    // Refresh dashboard
    this.updateClientDetailStats();
    this.renderCampaigns();

    alert(
      `${
        newCampaigns.length
      }개의 캠페인이 성공적으로 등록되었습니다.\n결제금액: ${totalPrice.toLocaleString()}원\n잔여 예치금: ${this.depositBalance.toLocaleString()}원`
    );
  }

  updateClientStats(clientId) {
    const client = this.clients.find((c) => c.id === clientId);
    const clientCampaigns = this.campaigns[clientId] || [];

    if (client) {
      client.totalCampaigns = clientCampaigns.length;
      client.activeCampaigns = clientCampaigns.filter(
        (c) => c.status === "active"
      ).length;
      client.completedCampaigns = clientCampaigns.filter(
        (c) => c.status === "completed"
      ).length;
      client.targetTraffic = clientCampaigns.reduce(
        (sum, c) => sum + c.targetTraffic,
        0
      );
      client.completedTraffic = clientCampaigns.reduce(
        (sum, c) => sum + Math.floor((c.progress / 100) * c.targetTraffic),
        0
      );
      client.totalReviews = client.completedTraffic;

      // 캠페인 진행률 (완료된 캠페인 기준)
      client.progress =
        client.totalCampaigns > 0
          ? Math.round(
              (client.completedCampaigns / client.totalCampaigns) * 100
            )
          : 0;

      // 집행률 (목표 유입 대비 완료 유입)
      client.executionRate =
        client.targetTraffic > 0
          ? Math.round((client.completedTraffic / client.targetTraffic) * 100)
          : 0;
    }
  }

  showLoadingOverlay(text, current = 0, total = 0) {
    const overlay = document.getElementById("loading-overlay");
    const loadingText = overlay.querySelector(".loading-text");
    const progressFill = overlay.querySelector(".progress-fill");
    const progressText = overlay.querySelector(".progress-text");

    loadingText.textContent = text;
    progressFill.style.width = total > 0 ? `${(current / total) * 100}%` : "0%";
    progressText.textContent = `${current} / ${total}`;

    overlay.style.display = "flex";
  }

  updateLoadingProgress(current, total) {
    const progressFill = document.querySelector(
      "#loading-overlay .progress-fill"
    );
    const progressText = document.querySelector(
      "#loading-overlay .progress-text"
    );

    if (progressFill && progressText) {
      progressFill.style.width = `${(current / total) * 100}%`;
      progressText.textContent = `${current} / ${total}`;
    }
  }

  hideLoadingOverlay() {
    document.getElementById("loading-overlay").style.display = "none";
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  showQuickCampaignModal(clientId) {
    this.currentClient = this.clients.find((c) => c.id === clientId);
    if (!this.currentClient) return;

    // Reset form
    document.getElementById("quick-campaign-url").value = "";
    document.getElementById("quick-product-info").style.display = "none";
    document.getElementById("quick-target-traffic").value = "200";

    // Reset product tags
    document.getElementById("quick-brand-tag").textContent = "브랜드명";
    document.getElementById("quick-product-tag").textContent = "제품명";

    // Update deposit display
    document.getElementById(
      "quick-current-deposit"
    ).textContent = `${this.depositBalance.toLocaleString()}원`;

    document.getElementById("quick-campaign-modal").classList.add("active");
  }

  async quickExtractProduct() {
    const url = document.getElementById("quick-campaign-url").value.trim();

    if (!url) {
      alert("URL을 입력해주세요.");
      return;
    }

    if (!url.includes("coupang.com")) {
      alert("쿠팡 상품 URL을 입력해주세요.");
      return;
    }

    this.showLoadingOverlay("상품 정보를 추출하는 중...");

    try {
      const productInfo = await this.mockExtractProduct(url);

      // Update UI with product info
      document.getElementById("quick-product-title").textContent =
        productInfo.title;
      document.getElementById("quick-product-brand").textContent =
        productInfo.brand;
      document.getElementById("quick-product-price").textContent =
        productInfo.price;
      document.getElementById("quick-product-image").src = productInfo.image;

      // Update product tags
      document.getElementById("quick-brand-tag").textContent =
        productInfo.brand;
      document.getElementById("quick-product-tag").textContent =
        productInfo.title;

      // Show product info section
      document.getElementById("quick-product-info").style.display = "block";

      // Update price calculation
      this.updateQuickPricing(productInfo.priceValue);
    } catch (error) {
      console.error("상품 정보 추출 실패:", error);
      alert("상품 정보를 가져오는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      this.hideLoadingOverlay();
    }
  }

  async mockExtractProduct(url) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const titles = [
          "삼성 갤럭시 버즈2 무선 이어폰",
          "애플 에어팟 프로 2세대",
          "LG 그램 노트북 15인치",
          "다이슨 V15 무선청소기",
          "아이폰 15 케이스 투명",
        ];

        const brands = ["삼성전자", "애플", "LG전자", "다이슨", "ESR"];
        const prices = [129000, 259000, 899000, 599000, 29900];
        const images = [
          "https://via.placeholder.com/80x80/3b82f6/ffffff?text=Samsung",
          "https://via.placeholder.com/80x80/000000/ffffff?text=Apple",
          "https://via.placeholder.com/80x80/d946ef/ffffff?text=LG",
          "https://via.placeholder.com/80x80/7c3aed/ffffff?text=Dyson",
          "https://via.placeholder.com/80x80/059669/ffffff?text=ESR",
        ];

        const randomIndex = Math.floor(Math.random() * titles.length);
        const priceValue = prices[randomIndex];

        resolve({
          title: titles[randomIndex],
          brand: brands[randomIndex],
          price: `${priceValue.toLocaleString()}원`,
          priceValue: priceValue,
          image: images[randomIndex],
        });
      }, 1000 + Math.random() * 1000);
    });
  }

  updateQuickPricing(productPriceValue) {
    const traffic =
      parseInt(document.getElementById("quick-target-traffic").value) || 0;

    // Get current product price if not provided
    if (!productPriceValue) {
      const priceText = document.getElementById(
        "quick-product-price"
      ).textContent;
      productPriceValue = parseInt(priceText.replace(/[^0-9]/g, "")) || 0;
    }

    const productCost = productPriceValue * traffic;
    const reviewCost = this.pricePerTraffic * traffic;
    const totalCost = productCost + reviewCost;

    document.getElementById(
      "quick-product-cost"
    ).textContent = `${productCost.toLocaleString()}원`;
    document.getElementById(
      "quick-review-cost"
    ).textContent = `${reviewCost.toLocaleString()}원`;
    document.getElementById(
      "quick-total-cost"
    ).textContent = `${totalCost.toLocaleString()}원`;

    // Update remaining deposit
    const remainingDeposit = this.depositBalance - totalCost;
    document.getElementById(
      "quick-remaining-deposit"
    ).textContent = `${remainingDeposit.toLocaleString()}원`;

    // Update button states
    const registerBtn = document.getElementById("quick-register-btn");
    const chargeBtn = document.getElementById("quick-charge-btn");

    if (remainingDeposit < 0) {
      registerBtn.style.display = "none";
      chargeBtn.style.display = "block";
    } else {
      registerBtn.style.display = "block";
      chargeBtn.style.display = "none";
    }
  }

  async registerQuickCampaign() {
    if (!this.currentClient) {
      alert("클라이언트를 선택해주세요.");
      return;
    }

    const url = document.getElementById("quick-campaign-url").value.trim();
    const traffic =
      parseInt(document.getElementById("quick-target-traffic").value) || 0;
    const title = document.getElementById("quick-product-title").textContent;
    const brand = document.getElementById("quick-product-brand").textContent;
    const price = document.getElementById("quick-product-price").textContent;
    const image = document.getElementById("quick-product-image").src;

    if (!url || !traffic || title === "-") {
      alert("모든 정보를 입력하고 상품 정보를 추출해주세요.");
      return;
    }

    // Get selected services
    const selectedServices = [];
    document
      .querySelectorAll(
        '#quick-campaign-modal .service-options input[type="checkbox"]:checked'
      )
      .forEach((checkbox) => {
        selectedServices.push(checkbox.value);
      });

    if (selectedServices.length === 0) {
      alert("서비스를 하나 이상 선택해주세요.");
      return;
    }

    // Calculate total cost
    const priceValue = parseInt(price.replace(/[^0-9]/g, "")) || 0;
    const totalCost = priceValue * traffic + this.pricePerTraffic * traffic;

    if (totalCost > this.depositBalance) {
      alert("예치금이 부족합니다.");
      return;
    }

    // Confirm registration
    const confirmMessage = `캠페인을 등록하시겠습니까?\n\n상품명: ${title}\n목표 유입: ${traffic}개\n총 비용: ${totalCost.toLocaleString()}원\n선택 서비스: ${selectedServices.join(
      ", "
    )}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.showLoadingOverlay("캠페인을 등록하는 중...");

    try {
      // Create campaign
      const campaign = {
        id: Date.now().toString(),
        clientId: this.currentClient.id,
        url: url,
        title: title,
        brand: brand,
        price: price,
        priceValue: priceValue,
        image: image,
        targetTraffic: traffic,
        services: selectedServices,
        totalCost: totalCost,
        progress: Math.floor(Math.random() * 20),
        status: "active",
        createdAt: new Date().toISOString(),
        group: 1,
      };

      // Add to campaigns
      if (!this.campaigns[this.currentClient.id]) {
        this.campaigns[this.currentClient.id] = [];
      }
      this.campaigns[this.currentClient.id].push(campaign);

      // Deduct from deposit
      this.depositBalance -= totalCost;
      localStorage.setItem(
        "troy_deposit_balance",
        this.depositBalance.toString()
      );

      // Update client stats
      this.updateClientStats(this.currentClient.id);

      // Save data
      this.saveData();

      // Success message
      alert(
        `캠페인이 성공적으로 등록되었습니다!\n\n결제금액: ${totalCost.toLocaleString()}원\n잔여 예치금: ${this.depositBalance.toLocaleString()}원`
      );

      // Close modal and refresh dashboard
      this.closeModal(document.getElementById("quick-campaign-modal"));
      this.renderAgencyDashboard();
    } catch (error) {
      console.error("캠페인 등록 실패:", error);
      alert("캠페인 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      this.hideLoadingOverlay();
    }
  }

  saveData() {
    localStorage.setItem("troy_clients", JSON.stringify(this.clients));
    localStorage.setItem("troy_campaigns", JSON.stringify(this.campaigns));

    // Update clients stats
    this.clients.forEach((client) => {
      this.updateClientStats(client.id);
    });

    // Re-save with updated stats
    localStorage.setItem("troy_clients", JSON.stringify(this.clients));
  }
}

// Global app instance for onclick handlers
let app;

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  app = new TroyBulkCampaign();
});

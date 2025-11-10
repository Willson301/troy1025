// Troy Simple Campaign Management System
class TroySimpleCampaign {
    constructor() {
        this.clients = JSON.parse(localStorage.getItem('troy_simple_clients') || '[]');
        this.campaigns = JSON.parse(localStorage.getItem('troy_simple_campaigns') || '{}');
        this.currentClient = null;
        this.depositBalance = parseInt(localStorage.getItem('troy_simple_deposit') || '1000000');
        this.pricePerTraffic = 2500;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.renderAgencyDashboard();
        this.showSection('agency-dashboard-section');
    }
    
    bindEvents() {
        // Client management events
        document.getElementById('add-client-btn').addEventListener('click', () => this.showAddClientModal());
        document.getElementById('add-client-form').addEventListener('submit', (e) => this.addClient(e));
        
        // Simple campaign events
        document.getElementById('extract-product-btn').addEventListener('click', () => this.extractProductInfo());
        document.getElementById('target-traffic').addEventListener('input', () => this.updatePriceCalculation());
        document.getElementById('register-campaign-btn').addEventListener('click', () => this.registerCampaign());
        
        // Modal close events
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });
    }
    
    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
    }
    
    showAddClientModal() {
        document.getElementById('add-client-modal').classList.add('active');
    }
    
    showSimpleCampaignModal(clientId) {
        this.currentClient = this.clients.find(c => c.id === clientId);
        if (!this.currentClient) return;
        
        // Reset form
        document.getElementById('campaign-url').value = '';
        document.getElementById('product-info-section').style.display = 'none';
        document.getElementById('target-traffic').value = '200';
        
        // Update deposit display
        document.getElementById('current-deposit').textContent = `${this.depositBalance.toLocaleString()}원`;
        
        document.getElementById('simple-campaign-modal').classList.add('active');
    }
    
    closeModal(modal) {
        modal.classList.remove('active');
        modal.querySelectorAll('form').forEach(form => form.reset());
    }
    
    addClient(e) {
        e.preventDefault();
        
        const name = document.getElementById('client-name-input').value;
        const businessName = document.getElementById('client-business-name-input').value;
        const url = document.getElementById('client-url-input').value;
        const businessNumber = document.getElementById('client-business-input').value;
        
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
            executionRate: 0
        };
        
        this.clients.push(client);
        this.campaigns[client.id] = [];
        this.saveData();
        this.renderAgencyDashboard();
        this.closeModal(document.getElementById('add-client-modal'));
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
        
        this.clients.forEach(client => {
            totalCampaigns += client.totalCampaigns;
            activeCampaigns += client.activeCampaigns;
            completedCampaigns += client.completedCampaigns;
            totalReviews += client.totalReviews;
        });
        
        document.getElementById('total-campaigns').textContent = totalCampaigns;
        document.getElementById('active-campaigns').textContent = activeCampaigns;
        document.getElementById('completed-campaigns').textContent = completedCampaigns;
        document.getElementById('total-reviews').textContent = totalReviews;
    }
    
    renderClientDashboardGrid() {
        const grid = document.getElementById('client-dashboard-grid');
        
        if (this.clients.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                    <h3 style="color: #6b7280; margin-bottom: 1rem;">등록된 클라이언트가 없습니다</h3>
                    <p style="color: #9ca3af;">새 클라이언트를 추가해보세요.</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.clients.map(client => {
            const clientCampaigns = this.campaigns[client.id] || [];
            const recentCampaigns = clientCampaigns.slice(0, 2);
            
            return `
                <div class="client-dashboard-card" data-client-id="${client.id}">
                    <div class="client-card-header">
                        <div class="client-card-info">
                            <div class="client-card-name">${client.name}</div>
                            <div class="client-card-business">${client.businessName || '사업자명 없음'}</div>
                            <div class="client-card-url">${client.url}</div>
                        </div>
                        <div class="client-card-icon">${client.name.charAt(0)}</div>
                    </div>
                    
                    <div class="client-card-metrics">
                        <div class="client-metric">
                            <div class="client-metric-label">진행률</div>
                            <div class="client-metric-value">${client.progress}%</div>
                        </div>
                        <div class="client-metric">
                            <div class="client-metric-label">집행률</div>
                            <div class="client-metric-value">${client.executionRate}%</div>
                        </div>
                    </div>
                    
                    <!-- Campaign Actions -->
                    <div class="client-campaign-actions">
                        <button class="client-action-btn btn btn-primary" onclick="app.showSimpleCampaignModal('${client.id}')">
                            📝 간편등록
                        </button>
                        <button class="client-action-btn btn btn-outline" onclick="app.showClientDetail('${client.id}')">
                            📊 상세보기
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    showClientDetail(clientId) {
        // TODO: 클라이언트 상세 페이지로 이동 (기존 시스템과 연동 가능)
        alert(`${this.clients.find(c => c.id === clientId)?.name}의 상세 페이지로 이동`);
    }
    
    async extractProductInfo() {
        const url = document.getElementById('campaign-url').value.trim();
        
        if (!url) {
            alert('URL을 입력해주세요.');
            return;
        }
        
        if (!url.includes('coupang.com')) {
            alert('쿠팡 상품 URL을 입력해주세요.');
            return;
        }
        
        this.showLoadingOverlay('상품 정보를 추출하는 중...');
        
        try {
            // Mock product extraction - 실제로는 백엔드 API 호출
            const productInfo = await this.mockExtractProduct(url);
            
            // Update UI with product info
            document.getElementById('product-title').textContent = productInfo.title;
            document.getElementById('product-brand').textContent = productInfo.brand;
            document.getElementById('product-price').textContent = productInfo.price;
            document.getElementById('product-image').src = productInfo.image;
            
            // Show product info section
            document.getElementById('product-info-section').style.display = 'block';
            
            // Update price calculation
            this.updatePriceCalculation(productInfo.priceValue);
            
        } catch (error) {
            console.error('상품 정보 추출 실패:', error);
            alert('상품 정보를 가져오는데 실패했습니다. 다시 시도해주세요.');
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    async mockExtractProduct(url) {
        // Mock extraction function
        return new Promise((resolve) => {
            setTimeout(() => {
                const titles = [
                    '삼성 갤럭시 버즈2 무선 이어폰',
                    '애플 에어팟 프로 2세대',
                    'LG 그램 노트북 15인치',
                    '다이슨 V15 무선청소기',
                    '아이폰 15 케이스 투명'
                ];
                
                const brands = ['삼성전자', '애플', 'LG전자', '다이슨', 'ESR'];
                const prices = [129000, 259000, 899000, 599000, 29900];
                const images = [
                    'https://via.placeholder.com/80x80/3b82f6/ffffff?text=Samsung',
                    'https://via.placeholder.com/80x80/000000/ffffff?text=Apple',
                    'https://via.placeholder.com/80x80/d946ef/ffffff?text=LG',
                    'https://via.placeholder.com/80x80/7c3aed/ffffff?text=Dyson',
                    'https://via.placeholder.com/80x80/059669/ffffff?text=ESR'
                ];
                
                const randomIndex = Math.floor(Math.random() * titles.length);
                const priceValue = prices[randomIndex];
                
                resolve({
                    title: titles[randomIndex],
                    brand: brands[randomIndex],
                    price: `${priceValue.toLocaleString()}원`,
                    priceValue: priceValue,
                    image: images[randomIndex]
                });
            }, 1000 + Math.random() * 1000);
        });
    }
    
    updatePriceCalculation(productPriceValue) {
        const traffic = parseInt(document.getElementById('target-traffic').value) || 0;
        
        // Get current product price if not provided
        if (!productPriceValue) {
            const priceText = document.getElementById('product-price').textContent;
            productPriceValue = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
        }
        
        const productCost = productPriceValue * traffic;
        const reviewCost = this.pricePerTraffic * traffic;
        const totalCost = productCost + reviewCost;
        
        document.getElementById('product-cost').textContent = `${productCost.toLocaleString()}원`;
        document.getElementById('review-cost').textContent = `${reviewCost.toLocaleString()}원`;
        document.getElementById('total-cost').textContent = `${totalCost.toLocaleString()}원`;
        
        // Update remaining deposit
        const remainingDeposit = this.depositBalance - totalCost;
        document.getElementById('remaining-deposit').textContent = `${remainingDeposit.toLocaleString()}원`;
        
        // Update button states
        const registerBtn = document.getElementById('register-campaign-btn');
        const chargeBtn = document.getElementById('charge-deposit-btn');
        
        if (remainingDeposit < 0) {
            registerBtn.style.display = 'none';
            chargeBtn.style.display = 'block';
        } else {
            registerBtn.style.display = 'block';
            chargeBtn.style.display = 'none';
        }
    }
    
    async registerCampaign() {
        if (!this.currentClient) {
            alert('클라이언트를 선택해주세요.');
            return;
        }
        
        const url = document.getElementById('campaign-url').value.trim();
        const traffic = parseInt(document.getElementById('target-traffic').value) || 0;
        const title = document.getElementById('product-title').textContent;
        const brand = document.getElementById('product-brand').textContent;
        const price = document.getElementById('product-price').textContent;
        const image = document.getElementById('product-image').src;
        
        if (!url || !traffic || title === '-') {
            alert('모든 정보를 입력하고 상품 정보를 추출해주세요.');
            return;
        }
        
        // Get selected services
        const selectedServices = [];
        document.querySelectorAll('.service-options input[type="checkbox"]:checked').forEach(checkbox => {
            selectedServices.push(checkbox.value);
        });
        
        if (selectedServices.length === 0) {
            alert('서비스를 하나 이상 선택해주세요.');
            return;
        }
        
        // Calculate total cost
        const priceValue = parseInt(price.replace(/[^0-9]/g, '')) || 0;
        const totalCost = (priceValue * traffic) + (this.pricePerTraffic * traffic);
        
        if (totalCost > this.depositBalance) {
            alert('예치금이 부족합니다.');
            return;
        }
        
        // Confirm registration
        const confirmMessage = `캠페인을 등록하시겠습니까?\n\n상품명: ${title}\n목표 유입: ${traffic}개\n총 비용: ${totalCost.toLocaleString()}원\n선택 서비스: ${selectedServices.join(', ')}`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        this.showLoadingOverlay('캠페인을 등록하는 중...');
        
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
                progress: Math.floor(Math.random() * 20), // Random initial progress
                status: 'active',
                createdAt: new Date().toISOString()
            };
            
            // Add to campaigns
            if (!this.campaigns[this.currentClient.id]) {
                this.campaigns[this.currentClient.id] = [];
            }
            this.campaigns[this.currentClient.id].push(campaign);
            
            // Deduct from deposit
            this.depositBalance -= totalCost;
            localStorage.setItem('troy_simple_deposit', this.depositBalance.toString());
            
            // Update client stats
            this.updateClientStats(this.currentClient.id);
            
            // Save data
            this.saveData();
            
            // Success message
            alert(`캠페인이 성공적으로 등록되었습니다!\n\n결제금액: ${totalCost.toLocaleString()}원\n잔여 예치금: ${this.depositBalance.toLocaleString()}원`);
            
            // Close modal and refresh dashboard
            this.closeModal(document.getElementById('simple-campaign-modal'));
            this.renderAgencyDashboard();
            
        } catch (error) {
            console.error('캠페인 등록 실패:', error);
            alert('캠페인 등록에 실패했습니다. 다시 시도해주세요.');
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    updateClientStats(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        const clientCampaigns = this.campaigns[clientId] || [];
        
        if (client) {
            client.totalCampaigns = clientCampaigns.length;
            client.activeCampaigns = clientCampaigns.filter(c => c.status === 'active').length;
            client.completedCampaigns = clientCampaigns.filter(c => c.status === 'completed').length;
            client.targetTraffic = clientCampaigns.reduce((sum, c) => sum + c.targetTraffic, 0);
            client.completedTraffic = clientCampaigns.reduce((sum, c) => sum + Math.floor(c.progress / 100 * c.targetTraffic), 0);
            client.totalReviews = client.completedTraffic;
            
            // Campaign progress rate
            client.progress = client.totalCampaigns > 0 ? 
                Math.round((client.completedCampaigns / client.totalCampaigns) * 100) : 0;
                
            // Execution rate
            client.executionRate = client.targetTraffic > 0 ? 
                Math.round((client.completedTraffic / client.targetTraffic) * 100) : 0;
        }
    }
    
    showLoadingOverlay(text) {
        document.getElementById('loading-overlay').style.display = 'flex';
        document.querySelector('.loading-text').textContent = text;
    }
    
    hideLoadingOverlay() {
        document.getElementById('loading-overlay').style.display = 'none';
    }
    
    saveData() {
        localStorage.setItem('troy_simple_clients', JSON.stringify(this.clients));
        localStorage.setItem('troy_simple_campaigns', JSON.stringify(this.campaigns));
        
        // Update all client stats
        this.clients.forEach(client => {
            this.updateClientStats(client.id);
        });
        
        // Re-save with updated stats
        localStorage.setItem('troy_simple_clients', JSON.stringify(this.clients));
    }
}

// Global app instance
let app;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    app = new TroySimpleCampaign();
});
-- 결제 내역 테이블 생성 (기존 스키마에 맞춤)
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL, -- 관련 캠페인 ID
    payer_id UUID REFERENCES user_profiles(id), -- 결제자 ID (대행사, 파트너, 고객)
    payee_id UUID REFERENCES user_profiles(id), -- 수취자 ID
    amount DECIMAL(12,2) NOT NULL, -- 결제 금액
    currency VARCHAR(3) DEFAULT 'KRW', -- 통화
    payment_type VARCHAR(50) NOT NULL, -- 결제 유형: 'deposit', 'settlement', 'refund'
    payment_method VARCHAR(50), -- 결제 방법: 'bank_transfer', 'card', 'digital_wallet'
    status VARCHAR(20) DEFAULT 'pending', -- 결제 상태: 'pending', 'processing', 'completed', 'failed', 'refunded'
    transaction_id VARCHAR(255), -- 거래 ID
    payment_date TIMESTAMP WITH TIME ZONE, -- 결제일
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약조건
    CONSTRAINT check_payment_type CHECK (payment_type IN ('deposit', 'settlement', 'refund')),
    CONSTRAINT check_payment_method CHECK (payment_method IN ('bank_transfer', 'card', 'digital_wallet')),
    CONSTRAINT check_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'))
);

-- 인덱스 생성 (기존 스키마에 맞춤)
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee_id ON payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_campaign_id ON payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 결제 내역만 조회 가능 (기존 스키마에 맞춤)
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (payer_id = auth.uid());

-- 관리자는 모든 결제 내역 조회 가능
CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- 결제 생성 정책 (사용자가 자신의 결제 생성 가능)
CREATE POLICY "Users can create own payments" ON payments
    FOR INSERT WITH CHECK (payer_id = auth.uid());

-- 결제 상태 업데이트 정책 (관리자만 가능)
CREATE POLICY "Admins can update payment status" ON payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- 샘플 데이터 삽입 (기존 스키마에 맞춤)
-- 대행사 샘플 데이터
INSERT INTO payments (amount, payment_type, payment_method, status, payer_id, campaign_id, payment_date) VALUES
(500000, 'deposit', 'bank_transfer', 'completed', (SELECT id FROM user_profiles WHERE user_type = 'agency' LIMIT 1), NULL, NOW()),
(150000, 'deposit', 'bank_transfer', 'completed', (SELECT id FROM user_profiles WHERE user_type = 'agency' LIMIT 1), (SELECT id FROM campaigns LIMIT 1), NOW()),
(350000, 'deposit', 'bank_transfer', 'completed', (SELECT id FROM user_profiles WHERE user_type = 'agency' LIMIT 1), (SELECT id FROM campaigns LIMIT 1 OFFSET 1), NOW()),
(1000000, 'deposit', 'bank_transfer', 'completed', (SELECT id FROM user_profiles WHERE user_type = 'agency' LIMIT 1), NULL, NOW());

-- 파트너 샘플 데이터
INSERT INTO payments (amount, payment_type, payment_method, status, payer_id, campaign_id, payment_date) VALUES
(250000, 'deposit', 'bank_transfer', 'completed', (SELECT id FROM user_profiles WHERE user_type = 'partner' LIMIT 1), (SELECT id FROM campaigns LIMIT 1), NOW()),
(180000, 'deposit', 'bank_transfer', 'completed', (SELECT id FROM user_profiles WHERE user_type = 'partner' LIMIT 1), (SELECT id FROM campaigns LIMIT 1 OFFSET 1), NOW());

-- 고객(광고주) 샘플 데이터  
INSERT INTO payments (amount, payment_type, payment_method, status, payer_id, campaign_id, payment_date) VALUES
(300000, 'deposit', 'bank_transfer', 'completed', (SELECT id FROM user_profiles WHERE user_type = 'advertiser' LIMIT 1), (SELECT id FROM campaigns LIMIT 1), NOW()),
(450000, 'deposit', 'card', 'completed', (SELECT id FROM user_profiles WHERE user_type = 'advertiser' LIMIT 1), (SELECT id FROM campaigns LIMIT 1 OFFSET 1), NOW());

-- 기본 테이블
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type varchar(20) not null check (user_type in ('advertiser','agency','partner')),
  username varchar(50) unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists advertisers (
  id uuid primary key references user_profiles(id) on delete cascade,
  business_number varchar(20) unique not null,
  company_name varchar(100) not null,
  manager_name varchar(50) not null,
  phone varchar(20) not null,
  email varchar(100) not null,
  product_url text,
  approval_status varchar(20) not null default 'pending', -- pending | approved | rejected
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agencies (
  id uuid primary key references user_profiles(id) on delete cascade,
  agency_name varchar(100) not null,
  business_number varchar(20) unique not null,
  manager_name varchar(50) not null,
  phone varchar(20) not null,
  email varchar(100) not null,
  website_url text,
  approval_status varchar(20) not null default 'pending', -- pending | approved | rejected
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists partners (
  id uuid primary key references user_profiles(id) on delete cascade,
  partner_code varchar(50) unique not null,
  manager_name varchar(50) not null,
  phone varchar(20) not null,
  email varchar(100) not null,
  messenger_id varchar(100),
  approval_status varchar(20) not null default 'pending', -- pending | approved | rejected
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS 활성화
alter table user_profiles enable row level security;
alter table advertisers  enable row level security;
alter table agencies     enable row level security;
alter table partners     enable row level security;

-- 정책 (DROP 후 CREATE)
drop policy if exists "view own profile"  on user_profiles;
create policy "view own profile" on user_profiles
  for select using (auth.uid() = id);

drop policy if exists "update own profile" on user_profiles;
create policy "update own profile" on user_profiles
  for update using (auth.uid() = id);

drop policy if exists "view own advertisers"  on advertisers;
create policy "view own advertisers" on advertisers
  for select using (auth.uid() = id);

drop policy if exists "update own advertisers" on advertisers;
create policy "update own advertisers" on advertisers
  for update using (auth.uid() = id);

drop policy if exists "view own agencies"  on agencies;
create policy "view own agencies" on agencies
  for select using (auth.uid() = id);

drop policy if exists "update own agencies" on agencies;
create policy "update own agencies" on agencies
  for update using (auth.uid() = id);

drop policy if exists "view own partners"  on partners;
create policy "view own partners" on partners
  for select using (auth.uid() = id);

drop policy if exists "update own partners" on partners;
create policy "update own partners" on partners
  for update using (auth.uid() = id);

-- updated_at 자동 갱신
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_user_profiles_updated on user_profiles;
create trigger trg_user_profiles_updated
before update on user_profiles
for each row execute function update_updated_at_column();

drop trigger if exists trg_advertisers_updated on advertisers;
create trigger trg_advertisers_updated
before update on advertisers
for each row execute function update_updated_at_column();

drop trigger if exists trg_agencies_updated on agencies;
create trigger trg_agencies_updated
before update on agencies
for each row execute function update_updated_at_column();

drop trigger if exists trg_partners_updated on partners;
create trigger trg_partners_updated
before update on partners
for each row execute function update_updated_at_column();

-- 파트너 코드
create table if not exists partner_codes (
  id uuid primary key default gen_random_uuid(),
  code varchar(32) unique not null,
  memo text,
  issued_by uuid references auth.users(id),
  is_used boolean default false,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table partner_codes enable row level security;
drop policy if exists "read partner codes admin only" on partner_codes;
create policy "read partner codes admin only" on partner_codes
  for select using (true); -- 서버에서 SERVICE_ROLE로 접근 권장

-- 공지사항
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category varchar(50) default 'service',
  target_audience varchar(50) default 'all',
  pinned boolean default false,
  visible boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 기존 테이블에 컬럼 추가 (이미 존재하는 경우 무시)
DO $$ 
BEGIN
  -- category 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notices' AND column_name = 'category') THEN
    ALTER TABLE notices ADD COLUMN category varchar(50) default 'service';
  END IF;
  
  -- target_audience 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notices' AND column_name = 'target_audience') THEN
    ALTER TABLE notices ADD COLUMN target_audience varchar(50) default 'all';
  END IF;
END $$;

alter table notices enable row level security;
drop policy if exists "read public notices" on notices;
create policy "read public notices" on notices
  for select using (visible = true);

-- 1:1 문의 (티켓)
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) not null,
  assignee uuid references auth.users(id),
  category text,
  title text not null,
  content text not null,
  status text not null check (status in ('open','pending','resolved','closed')) default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  author_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz default now()
);

alter table tickets enable row level security;
alter table ticket_comments enable row level security;

drop policy if exists "read own or assigned tickets" on tickets;
create policy "read own or assigned tickets" on tickets
  for select using (created_by = auth.uid() or assignee = auth.uid());

drop policy if exists "insert own tickets" on tickets;
create policy "insert own tickets" on tickets
  for insert with check (created_by = auth.uid());

drop policy if exists "update own or assigned tickets" on tickets;
create policy "update own or assigned tickets" on tickets
  for update using (created_by = auth.uid() or assignee = auth.uid());

drop policy if exists "read ticket comments by participants" on ticket_comments;
create policy "read ticket comments by participants" on ticket_comments
  for select using (
    exists (
      select 1 from tickets t
      where t.id = ticket_id and (t.created_by = auth.uid() or t.assignee = auth.uid())
    )
  );

drop policy if exists "insert ticket comments by participants" on ticket_comments;
create policy "insert ticket comments by participants" on ticket_comments
  for insert with check (
    exists (
      select 1 from tickets t
      where t.id = ticket_id and (t.created_by = auth.uid() or t.assignee = auth.uid())
    ) and author_id = auth.uid()
  );

-- 인덱스
create index if not exists idx_user_profiles_username on user_profiles(username);
create index if not exists idx_user_profiles_user_type on user_profiles(user_type);
create index if not exists idx_advertisers_bizno on advertisers(business_number);
create index if not exists idx_agencies_bizno on agencies(business_number);
create index if not exists idx_partners_code on partners(partner_code);
create index if not exists idx_partner_codes_code on partner_codes(code);
create index if not exists idx_partner_codes_is_used on partner_codes(is_used);
create index if not exists idx_notices_created_at on notices(created_at desc);
create index if not exists idx_notices_pinned on notices(pinned);
create index if not exists idx_tickets_status_created_at on tickets(status, created_at);
create index if not exists idx_ticket_comments_ticket_id_created_at on ticket_comments(ticket_id, created_at);

-- 공통 updated_at 트리거 적용 (notices, tickets)
drop trigger if exists trg_notices_updated on notices;
create trigger trg_notices_updated
before update on notices
for each row execute function update_updated_at_column();

drop trigger if exists trg_tickets_updated on tickets;
create trigger trg_tickets_updated
before update on tickets
for each row execute function update_updated_at_column();


-- 최소 테이블 생성
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type varchar(20) not null check (user_type in ('advertiser','agency','partner')),
  username varchar(50) unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists advertisers (
  id uuid primary key references user_profiles(id) on delete cascade,
  business_number varchar(20) unique not null,
  company_name varchar(100) not null,
  manager_name varchar(50) not null,
  phone varchar(20) not null,
  email varchar(100) not null,
  product_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type varchar(20) not null check (user_type in ('advertiser','agency','partner')),
  username varchar(50) unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agencies (
  id uuid primary key references user_profiles(id) on delete cascade,
  agency_name varchar(100) not null,
  business_number varchar(20) unique not null,
  manager_name varchar(50) not null,
  phone varchar(20) not null,
  email varchar(100) not null,
  website_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists partners (
  id uuid primary key references user_profiles(id) on delete cascade,
  partner_code varchar(50) unique not null,
  manager_name varchar(50) not null,
  phone varchar(20) not null,
  email varchar(100) not null,
  messenger_id varchar(100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table partner_codes (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) unique not null,
  memo text,
  is_used boolean default false,
  created_at timestamptz default now()
);

-- RLS 비활성화 (개발용)
alter table partner_codes disable row level security;




-- RLS 비활성화 (개발용)
alter table partner_codes disable row level security;
alter table user_profiles disable row level security;
alter table agencies disable row level security;
alter table partners disable row level security;
alter table user_profiles disable row level security;
alter table advertisers disable row level security;


-- 공지사항 테이블
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  content text not null,
  category varchar(50) not null,
  target_audience varchar(50) not null default 'all',
  is_important boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by varchar(50)
);

-- RLS 비활성화 (개발용)
alter table notices disable row level security;

-- 샘플 데이터 삽입
insert into notices (title, content, category, target_audience, is_important, created_by) values
('Troy 플랫폼 오픈 안내', 'Troy 플랫폼이 정식 오픈되었습니다.', 'system', 'all', true, 'admin'),
('서비스 이용 가이드', 'Troy 플랫폼 이용 방법에 대한 상세 가이드입니다.', 'service', 'all', false, 'admin');

-- 인증번호 테이블
create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  phone_number varchar(20) not null,
  code varchar(6) not null,
  expires_at timestamptz not null,
  attempts integer default 0,
  is_used boolean default false,
  created_at timestamptz default now()
);

-- 인증번호 테이블 인덱스
create index if not exists idx_verification_codes_phone on verification_codes(phone_number);
create index if not exists idx_verification_codes_expires on verification_codes(expires_at);

-- RLS 비활성화 (개발용)
alter table verification_codes disable row level security;

-- 만료된 인증번호 자동 삭제 함수
create or replace function cleanup_expired_verification_codes()
returns void as $$
begin
  delete from verification_codes where expires_at < now();
end; $$ language plpgsql;

-- 1:1문의 테이블
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references user_profiles(id) on delete cascade,
  title varchar(255) not null,
  content text not null,
  category varchar(50) not null default 'general',
  status varchar(20) not null default 'open',
  assignee uuid references user_profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1:1문의 댓글 테이블
create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references user_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- 1:1문의 테이블 인덱스
create index if not exists idx_tickets_created_by on tickets(created_by);
create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_tickets_created_at on tickets(created_at);
create index if not exists idx_ticket_comments_ticket_id on ticket_comments(ticket_id);
create index if not exists idx_ticket_comments_author_id on ticket_comments(author_id);

-- RLS 비활성화 (개발용)
alter table tickets disable row level security;
alter table ticket_comments disable row level security;

-- 1:1문의 테이블 업데이트 트리거
create or replace function update_tickets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

create trigger trigger_update_tickets_updated_at
  before update on tickets
  for each row
  execute function update_tickets_updated_at();

-- ===== 관리자 페이지 기능 확장을 위한 테이블들 =====

-- 알림 시스템 테이블
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  type varchar(50) not null, -- 'payment', 'campaign', 'inquiry', 'progress'
  title varchar(255) not null,
  message text not null,
  is_read boolean default false,
  related_id uuid, -- 관련 ID (결제ID, 캠페인ID 등)
  created_at timestamptz default now()
);

-- 캠페인 진행률 테이블
create table if not exists campaign_progress (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  progress_percentage integer default 0 check (progress_percentage >= 0 and progress_percentage <= 100),
  status_message text,
  updated_by uuid references user_profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 캠페인별 문의 테이블
create table if not exists campaign_inquiries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  inquirer_id uuid references user_profiles(id) on delete cascade,
  title varchar(255) not null,
  content text not null,
  status varchar(20) default 'open' check (status in ('open', 'answered', 'closed')),
  admin_response text,
  responded_by uuid references user_profiles(id),
  responded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 캠페인 테이블 (코드 생성용)
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_code varchar(50) unique not null,
  title varchar(255) not null,
  description text,
  partner_id uuid references user_profiles(id),
  advertiser_id uuid references user_profiles(id),
  status varchar(20) default 'draft' check (status in ('draft', 'pending', 'active', 'completed', 'cancelled')),
  budget decimal(12,2),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 결제 상태 업데이트 (3단계로 분리)
alter table payments add column if not exists payment_status varchar(20) default 'pending_approval' 
  check (payment_status in ('pending_approval', 'active', 'completed'));

-- 기존 테이블에 누락된 컬럼들 추가
DO $$ 
BEGIN
  -- campaigns 테이블이 존재하지 않는 경우 생성
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
    CREATE TABLE campaigns (
      id uuid primary key default gen_random_uuid(),
      campaign_code varchar(50) unique not null,
      title varchar(255) not null,
      description text,
      partner_id uuid references user_profiles(id),
      advertiser_id uuid references user_profiles(id),
      status varchar(20) default 'draft' check (status in ('draft', 'pending', 'active', 'completed', 'cancelled')),
      budget decimal(12,2),
      start_date timestamptz,
      end_date timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
  ELSE
    -- campaigns 테이블이 존재하는 경우 누락된 컬럼들 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'campaign_code') THEN
      ALTER TABLE campaigns ADD COLUMN campaign_code varchar(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'title') THEN
      ALTER TABLE campaigns ADD COLUMN title varchar(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'description') THEN
      ALTER TABLE campaigns ADD COLUMN description text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'partner_id') THEN
      ALTER TABLE campaigns ADD COLUMN partner_id uuid references user_profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'advertiser_id') THEN
      ALTER TABLE campaigns ADD COLUMN advertiser_id uuid references user_profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'status') THEN
      ALTER TABLE campaigns ADD COLUMN status varchar(20) default 'draft';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'budget') THEN
      ALTER TABLE campaigns ADD COLUMN budget decimal(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'start_date') THEN
      ALTER TABLE campaigns ADD COLUMN start_date timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'end_date') THEN
      ALTER TABLE campaigns ADD COLUMN end_date timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'created_at') THEN
      ALTER TABLE campaigns ADD COLUMN created_at timestamptz default now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'updated_at') THEN
      ALTER TABLE campaigns ADD COLUMN updated_at timestamptz default now();
    END IF;
  END IF;
END $$;

-- 인덱스 생성
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_is_read on notifications(is_read);
create index if not exists idx_notifications_created_at on notifications(created_at desc);
create index if not exists idx_campaign_progress_campaign_id on campaign_progress(campaign_id);
create index if not exists idx_campaign_inquiries_campaign_id on campaign_inquiries(campaign_id);
create index if not exists idx_campaign_inquiries_status on campaign_inquiries(status);
create index if not exists idx_campaigns_code on campaigns(campaign_code);
create index if not exists idx_campaigns_status on campaigns(status);

-- RLS 비활성화 (개발용)
alter table notifications disable row level security;
alter table campaign_progress disable row level security;
alter table campaign_inquiries disable row level security;
alter table campaigns disable row level security;

-- 트리거 함수들
create or replace function update_campaign_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

create or replace function update_campaign_inquiries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

create or replace function update_campaigns_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

-- 트리거 생성
create trigger trigger_update_campaign_progress_updated_at
  before update on campaign_progress
  for each row
  execute function update_campaign_progress_updated_at();

create trigger trigger_update_campaign_inquiries_updated_at
  before update on campaign_inquiries
  for each row
  execute function update_campaign_inquiries_updated_at();

create trigger trigger_update_campaigns_updated_at
  before update on campaigns
  for each row
  execute function update_campaigns_updated_at();

-- 사업자등록증 파일 테이블
create table if not exists business_licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  file_name varchar(255) not null,
  file_path text not null,
  file_size bigint not null,
  file_type varchar(50) not null,
  upload_date timestamptz default now(),
  created_at timestamptz default now()
);

-- 사업자등록증 테이블 인덱스
create index if not exists idx_business_licenses_user_id on business_licenses(user_id);
create index if not exists idx_business_licenses_upload_date on business_licenses(upload_date);

-- RLS 비활성화 (개발용)
alter table business_licenses disable row level security;


-- 원고(manuscripts) 테이블
create table if not exists manuscripts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  uploaded_by uuid,
  file_name text not null,
  original_file_name text, -- 원본 파일명 저장
  file_path text not null,
  file_url text,
  size bigint,
  created_at timestamptz default now()
);

-- 인덱스
create index if not exists idx_manuscripts_campaign_id on manuscripts(campaign_id);
create index if not exists idx_manuscripts_created_at on manuscripts(created_at desc);

-- RLS 비활성화 (개발용)
alter table manuscripts disable row level security;

-- manuscripts 테이블에 original_file_name 컬럼 추가 (기존 테이블용)
alter table manuscripts add column if not exists original_file_name text;

-- campaign_return_address 테이블 생성
create table if not exists campaign_return_address (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name varchar(100) not null,
  phone varchar(20) not null,
  address text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(campaign_id)
);

-- 인덱스 생성
create index if not exists idx_campaign_return_address_campaign_id on campaign_return_address(campaign_id);

-- RLS 정책 설정
alter table campaign_return_address enable row level security;

-- 대행사는 자신이 생성한 캠페인의 반송 주소를 조회/수정할 수 있음
create policy "Agency can manage return address for own campaigns" on campaign_return_address
  for all using (
    campaign_id in (
      select id from campaigns where created_by = auth.uid()
    )
  );

-- 관리자는 모든 반송 주소를 조회할 수 있음
create policy "Admin can view all return addresses" on campaign_return_address
  for select using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and username = 'admin'
    )
  );

-- 배송지 파일 테이블 생성
create table if not exists shipping_files (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  uploaded_by uuid references user_profiles(id) on delete set null,
  file_name varchar(255) not null,
  original_file_name varchar(255) not null,
  file_path text not null,
  file_url text,
  file_size bigint not null,
  file_type varchar(50) not null,
  request_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 인덱스 생성
create index if not exists idx_shipping_files_campaign_id on shipping_files(campaign_id);
create index if not exists idx_shipping_files_uploaded_by on shipping_files(uploaded_by);
create index if not exists idx_shipping_files_created_at on shipping_files(created_at desc);

-- RLS 정책 설정
alter table shipping_files enable row level security;

-- 관리자는 모든 배송지 파일을 조회/업로드할 수 있음
create policy "Admin can manage all shipping files" on shipping_files
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and username = 'admin'
    )
  );

-- 대행사/파트너사/광고주는 관련 캠페인의 배송지 파일을 조회할 수 있음
create policy "Users can view shipping files for related campaigns" on shipping_files
  for select using (
    campaign_id in (
      select id from campaigns 
      where created_by = auth.uid() 
         or partner_id = auth.uid() 
         or advertiser_id = auth.uid()
    )
  );
-- 파트너사 초대코드 테이블 생성
create table if not exists partner_invite_codes (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) unique not null,
  memo text,
  is_used boolean default false,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz default now(),
  created_by varchar(50) not null, -- 'admin' 또는 'partner'
  created_by_user_id uuid references auth.users(id), -- 파트너사가 발급한 경우 해당 파트너사 ID
  parent_partner_id uuid references auth.users(id) -- 상위 파트너사 ID (계층 구조용)
);

-- RLS 비활성화 (개발용)
alter table partner_invite_codes disable row level security;

-- 인덱스 생성
create index if not exists idx_partner_invite_codes_code on partner_invite_codes(code);
create index if not exists idx_partner_invite_codes_is_used on partner_invite_codes(is_used);
create index if not exists idx_partner_invite_codes_created_by on partner_invite_codes(created_by);
create index if not exists idx_partner_invite_codes_parent_partner on partner_invite_codes(parent_partner_id);

-- 파트너사 계층 구조 테이블 생성
create table if not exists partner_hierarchy (
  id uuid primary key default gen_random_uuid(),
  parent_partner_id uuid references auth.users(id) not null, -- 상위 파트너사
  child_partner_id uuid references auth.users(id) not null,  -- 하위 파트너사
  created_at timestamptz default now(),
  invite_code_id uuid references partner_invite_codes(id), -- 사용된 초대코드
  unique(parent_partner_id, child_partner_id)
);

-- RLS 비활성화 (개발용)
alter table partner_hierarchy disable row level security;

-- 인덱스 생성
create index if not exists idx_partner_hierarchy_parent on partner_hierarchy(parent_partner_id);
create index if not exists idx_partner_hierarchy_child on partner_hierarchy(child_partner_id);

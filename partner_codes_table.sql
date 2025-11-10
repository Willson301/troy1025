-- 파트너 코드 테이블 생성
create table if not exists partner_codes (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) unique not null,
  memo text,
  is_used boolean default false,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz default now(),
  created_by varchar(50) default 'admin'
);

-- RLS 비활성화 (개발용)
alter table partner_codes disable row level security;

-- 인덱스 생성
create index if not exists idx_partner_codes_code on partner_codes(code);
create index if not exists idx_partner_codes_is_used on partner_codes(is_used);

-- 파트너사 테이블에 상위 파트너사 ID 컬럼 추가
alter table partners add column if not exists parent_partner_id uuid references auth.users(id);

-- 인덱스 생성
create index if not exists idx_partners_parent_partner on partners(parent_partner_id);

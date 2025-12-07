-- =============================================
-- HOWPAPA 프로젝트 관리 시스템 - Supabase 스키마
-- =============================================

-- 1. 프로필 테이블 (사용자 정보)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null,
  role text default 'member' check (role in ('admin', 'member', 'viewer')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. 프로젝트 테이블
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text not null check (type in ('sampling', 'detail_page', 'influencer', 'product_order', 'group_purchase', 'other')),
  status text default 'planning' check (status in ('planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  start_date date not null,
  target_date date not null,
  completed_date date,
  assignee text,
  notes text,
  data jsonb default '{}'::jsonb, -- 타입별 추가 데이터 저장
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. 평가 항목 테이블
create table if not exists public.evaluation_criteria (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null,
  max_score int default 5,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- Row Level Security (RLS) 정책
-- =============================================

-- RLS 활성화
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.evaluation_criteria enable row level security;

-- profiles 정책
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- projects 정책
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- evaluation_criteria 정책
create policy "Users can view own criteria"
  on public.evaluation_criteria for select
  using (auth.uid() = user_id);

create policy "Users can create own criteria"
  on public.evaluation_criteria for insert
  with check (auth.uid() = user_id);

create policy "Users can update own criteria"
  on public.evaluation_criteria for update
  using (auth.uid() = user_id);

create policy "Users can delete own criteria"
  on public.evaluation_criteria for delete
  using (auth.uid() = user_id);

-- =============================================
-- 트리거: 자동 업데이트 시간
-- =============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_projects_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- =============================================
-- 트리거: 회원가입 시 프로필 자동 생성
-- =============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- 기본 평가 항목 삽입 함수
-- =============================================

create or replace function public.create_default_criteria(p_user_id uuid)
returns void as $$
declare
  categories text[] := array['크림', '패드', '로션', '앰플', '세럼', '미스트'];
  cat text;
begin
  foreach cat in array categories
  loop
    insert into public.evaluation_criteria (user_id, name, description, category, max_score, is_active)
    values
      (p_user_id, '발림성', '제품이 피부에 잘 발리는 정도', cat, 5, true),
      (p_user_id, '흡수력', '피부에 흡수되는 속도와 정도', cat, 5, true),
      (p_user_id, '보습력', '보습 지속 효과', cat, 5, true),
      (p_user_id, '향', '향의 적절성과 지속성', cat, 5, true),
      (p_user_id, '제형', '제형의 적절성', cat, 5, true);
  end loop;
end;
$$ language plpgsql security definer;

-- =============================================
-- 인덱스
-- =============================================

create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_type on public.projects(type);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_created_at on public.projects(created_at desc);
create index if not exists idx_evaluation_criteria_user_id on public.evaluation_criteria(user_id);
create index if not exists idx_evaluation_criteria_category on public.evaluation_criteria(category);

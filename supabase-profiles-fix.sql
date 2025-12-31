-- =============================================
-- 프로필 테이블 RLS 정책 및 역할 수정
-- =============================================

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 2. 새 정책 생성: 인증된 사용자는 모든 프로필 조회 가능
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. 역할 제약 조건 업데이트 (super_admin, admin, manager, member 지원)
-- 먼저 기존 제약 조건 삭제
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 새 제약 조건 추가
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'manager', 'member'));

-- 4. 기존 viewer 역할을 member로 변경 (호환성)
UPDATE public.profiles SET role = 'member' WHERE role = 'viewer';

-- 5. 기본값 확인 (member로 설정)
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'member';

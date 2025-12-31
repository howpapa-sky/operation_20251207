-- =============================================
-- 프로필 테이블 RLS 정책 및 역할 수정 (완전 버전)
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- 2. 새 SELECT 정책: 인증된 사용자는 모든 프로필 조회 가능
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. 기존 UPDATE 정책 삭제
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- 4. 새 UPDATE 정책: 자신의 프로필 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 5. 새 UPDATE 정책: 관리자는 모든 프로필 수정 가능
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 6. 역할 제약 조건 업데이트 (super_admin, admin, manager, member 지원)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'manager', 'member'));

-- 7. 기존 viewer 역할을 member로 변경 (호환성)
UPDATE public.profiles SET role = 'member' WHERE role = 'viewer';

-- 8. 기본값을 member로 설정
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'member';

-- 9. 최고 관리자 역할 설정 (yong@howlab.co.kr)
UPDATE public.profiles SET role = 'super_admin' WHERE email = 'yong@howlab.co.kr';

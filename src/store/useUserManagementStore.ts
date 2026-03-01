import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { handleApiError } from '../lib/apiErrorHandler';
import { User, UserRole, userRoleLevels } from '../types';

interface UserManagementState {
  users: User[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsers: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  canManageUser: (currentUser: User | null, targetUser: User) => boolean;
  canChangeRole: (currentUser: User | null, targetRole: UserRole) => boolean;
  hasPermission: (user: User | null, requiredRole: UserRole) => boolean;
}

// 최고 관리자 이메일
const SUPER_ADMIN_EMAIL = 'yong@howlab.co.kr';

export const useUserManagementStore = create<UserManagementState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('[fetchUsers] Fetching profiles...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      console.log('[fetchUsers] Result:', { data, error });

      if (error) throw error;

      const users: User[] = (data || []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: (profile.role || 'member') as UserRole,
        createdAt: profile.created_at,
        avatar: profile.avatar_url || undefined,
      }));

      console.log('[fetchUsers] Mapped users:', users.length);
      set({ users, isLoading: false });
    } catch (error) {
      handleApiError(error, '사용자 목록 조회');
      console.error('Fetch users error:', error);
      set({ error: '사용자 목록을 불러오는 데 실패했습니다.', isLoading: false });
    }
  },

  updateUserRole: async (userId: string, newRole: UserRole) => {
    try {
      // 최고 관리자 이메일인 경우 역할 변경 불가
      const targetUser = get().users.find((u) => u.id === userId);
      if (targetUser?.email === SUPER_ADMIN_EMAIL) {
        set({ error: '최고 관리자의 권한은 변경할 수 없습니다.' });
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // 로컬 상태 업데이트
      set((state) => ({
        users: state.users.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        ),
      }));

      return true;
    } catch (error) {
      handleApiError(error, '권한 변경');
      console.error('Update user role error:', error);
      set({ error: '권한 변경에 실패했습니다.' });
      return false;
    }
  },

  // 현재 사용자가 대상 사용자를 관리할 수 있는지 확인
  canManageUser: (currentUser: User | null, targetUser: User) => {
    if (!currentUser) return false;

    // 자기 자신은 관리 불가 (자신의 권한 변경 방지)
    if (currentUser.id === targetUser.id) return false;

    // 최고 관리자 이메일은 누구도 관리 불가
    if (targetUser.email === SUPER_ADMIN_EMAIL) return false;

    // 현재 사용자의 권한 레벨이 대상보다 높아야 함
    return userRoleLevels[currentUser.role] > userRoleLevels[targetUser.role];
  },

  // 현재 사용자가 특정 역할로 변경할 수 있는지 확인
  canChangeRole: (currentUser: User | null, targetRole: UserRole) => {
    if (!currentUser) return false;

    // 최고 관리자만 관리자 이상 역할 부여 가능
    if (targetRole === 'super_admin') return false; // 최고 관리자는 부여 불가
    if (targetRole === 'admin' && currentUser.role !== 'super_admin') return false;

    // 현재 사용자의 권한 레벨이 부여하려는 역할보다 높아야 함
    return userRoleLevels[currentUser.role] > userRoleLevels[targetRole];
  },

  // 사용자가 특정 역할 이상의 권한을 가지고 있는지 확인
  hasPermission: (user: User | null, requiredRole: UserRole) => {
    if (!user) return false;
    return userRoleLevels[user.role] >= userRoleLevels[requiredRole];
  },
}));

// 권한 체크 헬퍼 함수들
export const canAccessSettings = (user: User | null): boolean => {
  return useUserManagementStore.getState().hasPermission(user, 'manager');
};

export const canManageUsers = (user: User | null): boolean => {
  return useUserManagementStore.getState().hasPermission(user, 'admin');
};

export const canDeleteProjects = (user: User | null): boolean => {
  return useUserManagementStore.getState().hasPermission(user, 'manager');
};

export const canEditProjects = (user: User | null): boolean => {
  return useUserManagementStore.getState().hasPermission(user, 'member');
};

export const isSuperAdmin = (user: User | null): boolean => {
  return user?.role === 'super_admin';
};

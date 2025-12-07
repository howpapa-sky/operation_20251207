import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  Project,
  EvaluationCriteria,
  Notification,
  FilterOptions,
  SortOptions,
  ProjectStatus,
  ProjectType,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  // 인증
  user: User | null;
  isAuthenticated: boolean;

  // 프로젝트
  projects: Project[];
  selectedProject: Project | null;

  // 평가 항목
  evaluationCriteria: EvaluationCriteria[];

  // 알림
  notifications: Notification[];

  // 필터 및 정렬
  filters: FilterOptions;
  sortOptions: SortOptions;

  // UI 상태
  sidebarCollapsed: boolean;
  currentView: 'list' | 'calendar' | 'board';

  // 액션 - 인증
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;

  // 액션 - 프로젝트
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  selectProject: (project: Project | null) => void;

  // 액션 - 평가 항목
  addEvaluationCriteria: (criteria: Omit<EvaluationCriteria, 'id'>) => void;
  updateEvaluationCriteria: (id: string, updates: Partial<EvaluationCriteria>) => void;
  deleteEvaluationCriteria: (id: string) => void;

  // 액션 - 알림
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  // 액션 - 필터
  setFilters: (filters: FilterOptions) => void;
  clearFilters: () => void;
  setSortOptions: (options: SortOptions) => void;

  // 액션 - UI
  toggleSidebar: () => void;
  setCurrentView: (view: 'list' | 'calendar' | 'board') => void;

  // 통계 헬퍼
  getProjectsByStatus: (status: ProjectStatus) => Project[];
  getProjectsByType: (type: ProjectType) => Project[];
  getFilteredProjects: () => Project[];
  getTotalBudget: () => number;
  getUsedBudget: () => number;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      user: null,
      isAuthenticated: false,
      projects: [],
      selectedProject: null,
      evaluationCriteria: getDefaultEvaluationCriteria(),
      notifications: [],
      filters: {},
      sortOptions: { field: 'createdAt', direction: 'desc' },
      sidebarCollapsed: false,
      currentView: 'list',

      // 인증 액션
      login: async (email: string, password: string) => {
        // 데모용 로그인 (실제로는 API 호출)
        if (email && password.length >= 6) {
          const user: User = {
            id: uuidv4(),
            email,
            name: email.split('@')[0],
            role: 'admin',
            createdAt: new Date().toISOString(),
          };
          set({ user, isAuthenticated: true });
          return true;
        }
        return false;
      },

      register: async (email: string, password: string, name: string) => {
        if (email && password.length >= 6 && name) {
          const user: User = {
            id: uuidv4(),
            email,
            name,
            role: 'member',
            createdAt: new Date().toISOString(),
          };
          set({ user, isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      // 프로젝트 액션
      addProject: (projectData) => {
        const now = new Date().toISOString();
        const project = {
          ...projectData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        } as Project;

        set((state) => ({
          projects: [...state.projects, project],
        }));

        get().addNotification({
          title: '프로젝트 생성',
          message: `"${project.title}" 프로젝트가 생성되었습니다.`,
          type: 'success',
          read: false,
          projectId: project.id,
        });
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ) as Project[],
        }));
      },

      deleteProject: (id) => {
        const project = get().projects.find((p) => p.id === id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          selectedProject:
            state.selectedProject?.id === id ? null : state.selectedProject,
        }));

        if (project) {
          get().addNotification({
            title: '프로젝트 삭제',
            message: `"${project.title}" 프로젝트가 삭제되었습니다.`,
            type: 'info',
            read: false,
          });
        }
      },

      selectProject: (project) => {
        set({ selectedProject: project });
      },

      // 평가 항목 액션
      addEvaluationCriteria: (criteriaData) => {
        const criteria: EvaluationCriteria = {
          ...criteriaData,
          id: uuidv4(),
        };
        set((state) => ({
          evaluationCriteria: [...state.evaluationCriteria, criteria],
        }));
      },

      updateEvaluationCriteria: (id, updates) => {
        set((state) => ({
          evaluationCriteria: state.evaluationCriteria.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteEvaluationCriteria: (id) => {
        set((state) => ({
          evaluationCriteria: state.evaluationCriteria.filter((c) => c.id !== id),
        }));
      },

      // 알림 액션
      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 50),
        }));
      },

      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      // 필터 액션
      setFilters: (filters) => {
        set({ filters });
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      setSortOptions: (options) => {
        set({ sortOptions: options });
      },

      // UI 액션
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setCurrentView: (view) => {
        set({ currentView: view });
      },

      // 헬퍼 함수
      getProjectsByStatus: (status) => {
        return get().projects.filter((p) => p.status === status);
      },

      getProjectsByType: (type) => {
        return get().projects.filter((p) => p.type === type);
      },

      getFilteredProjects: () => {
        const { projects, filters, sortOptions } = get();
        let filtered = [...projects];

        // 상태 필터
        if (filters.status?.length) {
          filtered = filtered.filter((p) => filters.status!.includes(p.status));
        }

        // 타입 필터
        if (filters.type?.length) {
          filtered = filtered.filter((p) => filters.type!.includes(p.type));
        }

        // 우선순위 필터
        if (filters.priority?.length) {
          filtered = filtered.filter((p) => filters.priority!.includes(p.priority));
        }

        // 브랜드 필터
        if (filters.brand?.length) {
          filtered = filtered.filter((p) => {
            if ('brand' in p) {
              return filters.brand!.includes(p.brand);
            }
            return true;
          });
        }

        // 날짜 범위 필터
        if (filters.dateRange) {
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          filtered = filtered.filter((p) => {
            const projectDate = new Date(p.startDate);
            return projectDate >= start && projectDate <= end;
          });
        }

        // 검색어 필터
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.title.toLowerCase().includes(query) ||
              p.notes.toLowerCase().includes(query)
          );
        }

        // 정렬
        filtered.sort((a, b) => {
          const aValue = a[sortOptions.field as keyof Project];
          const bValue = b[sortOptions.field as keyof Project];

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortOptions.direction === 'asc'
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortOptions.direction === 'asc'
              ? aValue - bValue
              : bValue - aValue;
          }

          return 0;
        });

        return filtered;
      },

      getTotalBudget: () => {
        return get().projects.reduce((sum, p) => {
          if ('budget' in p && typeof p.budget === 'number') {
            return sum + p.budget;
          }
          if ('totalAmount' in p && typeof p.totalAmount === 'number') {
            return sum + p.totalAmount;
          }
          return sum;
        }, 0);
      },

      getUsedBudget: () => {
        return get().projects.reduce((sum, p) => {
          if ('actualCost' in p && typeof p.actualCost === 'number') {
            return sum + p.actualCost;
          }
          return sum;
        }, 0);
      },
    }),
    {
      name: 'howpapa-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        projects: state.projects,
        evaluationCriteria: state.evaluationCriteria,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// 기본 평가 항목
function getDefaultEvaluationCriteria(): EvaluationCriteria[] {
  const categories = ['크림', '패드', '로션', '앰플', '세럼', '미스트'] as const;
  const criteria: EvaluationCriteria[] = [];

  categories.forEach((category) => {
    criteria.push(
      {
        id: uuidv4(),
        name: '발림성',
        description: '제품이 피부에 잘 발리는 정도',
        category,
        maxScore: 5,
        isActive: true,
      },
      {
        id: uuidv4(),
        name: '흡수력',
        description: '피부에 흡수되는 속도와 정도',
        category,
        maxScore: 5,
        isActive: true,
      },
      {
        id: uuidv4(),
        name: '보습력',
        description: '보습 지속 효과',
        category,
        maxScore: 5,
        isActive: true,
      },
      {
        id: uuidv4(),
        name: '향',
        description: '향의 적절성과 지속성',
        category,
        maxScore: 5,
        isActive: true,
      },
      {
        id: uuidv4(),
        name: '제형',
        description: '제형의 적절성',
        category,
        maxScore: 5,
        isActive: true,
      }
    );
  });

  return criteria;
}

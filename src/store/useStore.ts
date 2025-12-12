import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { notifySampling } from '../lib/sendNaverWorks';
import {
  User,
  UserRole,
  Project,
  EvaluationCriteria,
  Notification,
  FilterOptions,
  SortOptions,
  ProjectStatus,
  ProjectType,
  ProjectSchedule,
  ScheduleType,
} from '../types';
import type { Json } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  // 인증
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

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
  mobileMenuOpen: boolean;
  currentView: 'list' | 'calendar' | 'board';

  // 액션 - 인증
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;

  // 액션 - 프로젝트
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (project: Project | null) => void;

  // 액션 - 세부 일정
  addSchedule: (projectId: string, schedule: Omit<ProjectSchedule, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSchedule: (projectId: string, scheduleId: string, updates: Partial<ProjectSchedule>) => Promise<void>;
  deleteSchedule: (projectId: string, scheduleId: string) => Promise<void>;
  toggleScheduleComplete: (projectId: string, scheduleId: string) => Promise<void>;
  getUpcomingSchedules: (days?: number) => { schedule: ProjectSchedule; project: Project }[];

  // 액션 - 평가 항목
  fetchEvaluationCriteria: () => Promise<void>;
  addEvaluationCriteria: (criteria: Omit<EvaluationCriteria, 'id'>) => Promise<void>;
  updateEvaluationCriteria: (id: string, updates: Partial<EvaluationCriteria>) => Promise<void>;
  deleteEvaluationCriteria: (id: string) => Promise<void>;

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
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  setCurrentView: (view: 'list' | 'calendar' | 'board') => void;

  // 통계 헬퍼
  getProjectsByStatus: (status: ProjectStatus) => Project[];
  getProjectsByType: (type: ProjectType) => Project[];
  getFilteredProjects: () => Project[];
  getTotalBudget: () => number;
  getUsedBudget: () => number;
}

// DB 레코드를 프로젝트 타입으로 변환
function dbToProject(record: any): Project {
  const base = {
    id: record.id,
    title: record.title,
    type: record.type,
    status: record.status,
    priority: record.priority,
    startDate: record.start_date,
    targetDate: record.target_date,
    completedDate: record.completed_date || undefined,
    assignee: record.assignee || undefined,
    notes: record.notes || '',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };

  // data 필드에서 타입별 추가 데이터 병합
  const data = record.data || {};
  return { ...base, ...data } as Project;
}

// 프로젝트를 DB 레코드로 변환
function projectToDb(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, userId: string) {
  const { title, type, status, priority, startDate, targetDate, completedDate, assignee, notes, ...rest } = project;

  return {
    user_id: userId,
    title,
    type,
    status,
    priority,
    start_date: startDate,
    target_date: targetDate,
    completed_date: completedDate || null,
    assignee: assignee || null,
    notes: notes || null,
    data: JSON.parse(JSON.stringify(rest)) as Json, // 나머지 타입별 데이터를 JSON으로 저장
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      user: null,
      isAuthenticated: false,
      isLoading: true,
      projects: [],
      selectedProject: null,
      evaluationCriteria: [],
      notifications: [],
      filters: {},
      sortOptions: { field: 'createdAt', direction: 'desc' },
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      currentView: 'list',

      // 인증 체크
      checkAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // 프로필 정보 가져오기
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              const user: User = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: (profile.role || 'member') as UserRole,
                createdAt: profile.created_at,
                avatar: profile.avatar_url || undefined,
              };
              set({ user, isAuthenticated: true, isLoading: false });

              // 데이터 로드
              get().fetchProjects();
              get().fetchEvaluationCriteria();
              return;
            }
          }

          set({ user: null, isAuthenticated: false, isLoading: false });
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      // 로그인
      login: async (email: string, password: string) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (data.user) {
            // 프로필 정보 가져오기
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profile) {
              const user: User = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: (profile.role || 'member') as UserRole,
                createdAt: profile.created_at,
                avatar: profile.avatar_url || undefined,
              };
              set({ user, isAuthenticated: true });

              // 데이터 로드
              get().fetchProjects();
              get().fetchEvaluationCriteria();
            }
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      // 회원가입
      register: async (email: string, password: string, name: string) => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
            },
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (data.user) {
            // 회원가입 후 자동 로그인 (이메일 확인 비활성화 시)
            const user: User = {
              id: data.user.id,
              email: email,
              name: name,
              role: 'member',
              createdAt: new Date().toISOString(),
            };
            set({ user, isAuthenticated: true });

            // 기본 평가 항목 생성
            await supabase.rpc('create_default_criteria', { p_user_id: data.user.id });

            // 데이터 로드
            get().fetchEvaluationCriteria();
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      // 로그아웃
      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          isAuthenticated: false,
          projects: [],
          evaluationCriteria: [],
          notifications: [],
        });
      },

      // 사용자 정보 업데이트
      updateUser: async (updates) => {
        const { user } = get();
        if (!user) return;

        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              name: updates.name,
              avatar_url: updates.avatar,
            })
            .eq('id', user.id);

          if (!error) {
            set({ user: { ...user, ...updates } });
          }
        } catch (error) {
          console.error('Update user error:', error);
        }
      },

      // 프로젝트 목록 가져오기 (모든 사용자 공유)
      fetchProjects: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            const projects = data.map(dbToProject);
            set({ projects });
          }
        } catch (error) {
          console.error('Fetch projects error:', error);
        }
      },

      // 프로젝트 추가
      addProject: async (projectData) => {
        const { user } = get();
        if (!user) return;

        try {
          const dbRecord = projectToDb(projectData, user.id);

          const { data, error } = await supabase
            .from('projects')
            .insert(dbRecord)
            .select()
            .single();

          if (!error && data) {
            const project = dbToProject(data);
            set((state) => ({
              projects: [project, ...state.projects],
            }));

            get().addNotification({
              title: '프로젝트 생성',
              message: `"${project.title}" 프로젝트가 생성되었습니다.`,
              type: 'success',
              read: false,
              projectId: project.id,
            });

            // 샘플링 프로젝트인 경우 네이버 웍스 메신저 알림 전송
            if (project.type === 'sampling') {
              notifySampling({
                type: 'new',
                projectName: project.title,
                brandName: 'brand' in project ? (project as any).brand : undefined,
                manufacturerName: 'manufacturer' in project ? (project as any).manufacturer : undefined,
                sampleCode: 'sampleCode' in project ? (project as any).sampleCode : undefined,
                round: 'round' in project ? (project as any).round : undefined,
              }).catch(console.error);
            }
          }
        } catch (error) {
          console.error('Add project error:', error);
        }
      },

      // 프로젝트 업데이트
      updateProject: async (id, updates) => {
        const { user } = get();
        if (!user) return;

        try {
          // 업데이트할 데이터 준비
          const { title, status, priority, startDate, targetDate, completedDate, assignee, notes, ...rest } = updates;

          const dbUpdates: any = {};
          if (title !== undefined) dbUpdates.title = title;
          if (status !== undefined) dbUpdates.status = status;
          if (priority !== undefined) dbUpdates.priority = priority;
          if (startDate !== undefined) dbUpdates.start_date = startDate;
          if (targetDate !== undefined) dbUpdates.target_date = targetDate;
          if (completedDate !== undefined) dbUpdates.completed_date = completedDate || null;
          if (assignee !== undefined) dbUpdates.assignee = assignee || null;
          if (notes !== undefined) dbUpdates.notes = notes || null;

          // 기존 data 필드와 병합
          const currentProject = get().projects.find((p) => p.id === id);
          if (currentProject && Object.keys(rest).length > 0) {
            const existingData = { ...currentProject };
            delete (existingData as any).id;
            delete (existingData as any).title;
            delete (existingData as any).type;
            delete (existingData as any).status;
            delete (existingData as any).priority;
            delete (existingData as any).startDate;
            delete (existingData as any).targetDate;
            delete (existingData as any).completedDate;
            delete (existingData as any).assignee;
            delete (existingData as any).notes;
            delete (existingData as any).createdAt;
            delete (existingData as any).updatedAt;

            dbUpdates.data = { ...existingData, ...rest };
          }

          const { error } = await supabase
            .from('projects')
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id);

          if (!error) {
            set((state) => ({
              projects: state.projects.map((p) =>
                p.id === id
                  ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                  : p
              ) as Project[],
            }));

            // 샘플링 프로젝트 평가 등록 시 네이버 웍스 메신저 알림 전송
            if (currentProject && currentProject.type === 'sampling' && 'averageRating' in updates) {
              const updatedProject = { ...currentProject, ...updates };
              notifySampling({
                type: 'rating',
                projectName: updatedProject.title,
                brandName: 'brand' in updatedProject ? (updatedProject as any).brand : undefined,
                manufacturerName: 'manufacturer' in updatedProject ? (updatedProject as any).manufacturer : undefined,
                sampleCode: 'sampleCode' in updatedProject ? (updatedProject as any).sampleCode : undefined,
                round: 'round' in updatedProject ? (updatedProject as any).round : undefined,
                rating: (updates as any).averageRating,
                evaluator: user.name,
              }).catch(console.error);
            }
          }
        } catch (error) {
          console.error('Update project error:', error);
        }
      },

      // 프로젝트 삭제
      deleteProject: async (id) => {
        const { user } = get();
        if (!user) return;

        const project = get().projects.find((p) => p.id === id);

        try {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (!error) {
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
          }
        } catch (error) {
          console.error('Delete project error:', error);
        }
      },

      selectProject: (project) => {
        set({ selectedProject: project });
      },

      // 세부 일정 추가
      addSchedule: async (projectId, scheduleData) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return;

        const now = new Date().toISOString();
        const newSchedule: ProjectSchedule = {
          ...scheduleData,
          id: uuidv4(),
          projectId,
          createdAt: now,
          updatedAt: now,
        };

        const updatedSchedules = [...(project.schedules || []), newSchedule];
        await get().updateProject(projectId, { schedules: updatedSchedules } as any);

        get().addNotification({
          title: '일정 추가',
          message: `"${project.title}"에 "${newSchedule.title}" 일정이 추가되었습니다.`,
          type: 'success',
          read: false,
          projectId,
        });
      },

      // 세부 일정 업데이트
      updateSchedule: async (projectId, scheduleId, updates) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project || !project.schedules) return;

        const updatedSchedules = project.schedules.map((s) =>
          s.id === scheduleId
            ? { ...s, ...updates, updatedAt: new Date().toISOString() }
            : s
        );

        await get().updateProject(projectId, { schedules: updatedSchedules } as any);
      },

      // 세부 일정 삭제
      deleteSchedule: async (projectId, scheduleId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project || !project.schedules) return;

        const schedule = project.schedules.find((s) => s.id === scheduleId);
        const updatedSchedules = project.schedules.filter((s) => s.id !== scheduleId);

        await get().updateProject(projectId, { schedules: updatedSchedules } as any);

        if (schedule) {
          get().addNotification({
            title: '일정 삭제',
            message: `"${schedule.title}" 일정이 삭제되었습니다.`,
            type: 'info',
            read: false,
            projectId,
          });
        }
      },

      // 세부 일정 완료 토글
      toggleScheduleComplete: async (projectId, scheduleId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project || !project.schedules) return;

        const updatedSchedules = project.schedules.map((s) =>
          s.id === scheduleId
            ? {
                ...s,
                isCompleted: !s.isCompleted,
                completedDate: !s.isCompleted ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString(),
              }
            : s
        );

        await get().updateProject(projectId, { schedules: updatedSchedules } as any);
      },

      // 다가오는 일정 조회 (기본 7일) - 오늘 일정 포함
      getUpcomingSchedules: (days = 7) => {
        const projects = get().projects;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 오늘 시작 시간으로 설정
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        futureDate.setHours(23, 59, 59, 999); // 마지막 날 끝 시간으로 설정

        const upcomingSchedules: { schedule: ProjectSchedule; project: Project }[] = [];

        projects.forEach((project) => {
          if (project.schedules) {
            project.schedules.forEach((schedule) => {
              if (!schedule.isCompleted) {
                const dueDate = new Date(schedule.dueDate);
                dueDate.setHours(0, 0, 0, 0); // 날짜만 비교
                if (dueDate >= today && dueDate <= futureDate) {
                  upcomingSchedules.push({ schedule, project });
                }
              }
            });
          }
        });

        // 날짜순 정렬
        upcomingSchedules.sort((a, b) =>
          new Date(a.schedule.dueDate).getTime() - new Date(b.schedule.dueDate).getTime()
        );

        return upcomingSchedules;
      },

      // 평가 항목 목록 가져오기
      fetchEvaluationCriteria: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .from('evaluation_criteria')
            .select('*')
            .eq('user_id', user.id)
            .order('category', { ascending: true });

          if (!error && data) {
            const criteria: EvaluationCriteria[] = data.map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description || undefined,
              category: c.category as any,
              maxScore: c.max_score,
              isActive: c.is_active,
            }));
            set({ evaluationCriteria: criteria });
          }
        } catch (error) {
          console.error('Fetch criteria error:', error);
        }
      },

      // 평가 항목 추가
      addEvaluationCriteria: async (criteriaData) => {
        const { user } = get();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .from('evaluation_criteria')
            .insert({
              user_id: user.id,
              name: criteriaData.name,
              description: criteriaData.description || null,
              category: criteriaData.category,
              max_score: criteriaData.maxScore,
              is_active: criteriaData.isActive,
            })
            .select()
            .single();

          if (!error && data) {
            const criteria: EvaluationCriteria = {
              id: data.id,
              name: data.name,
              description: data.description || undefined,
              category: data.category as any,
              maxScore: data.max_score,
              isActive: data.is_active,
            };
            set((state) => ({
              evaluationCriteria: [...state.evaluationCriteria, criteria],
            }));
          }
        } catch (error) {
          console.error('Add criteria error:', error);
        }
      },

      // 평가 항목 업데이트
      updateEvaluationCriteria: async (id, updates) => {
        const { user } = get();
        if (!user) return;

        try {
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.description !== undefined) dbUpdates.description = updates.description || null;
          if (updates.category !== undefined) dbUpdates.category = updates.category;
          if (updates.maxScore !== undefined) dbUpdates.max_score = updates.maxScore;
          if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

          const { error } = await supabase
            .from('evaluation_criteria')
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id);

          if (!error) {
            set((state) => ({
              evaluationCriteria: state.evaluationCriteria.map((c) =>
                c.id === id ? { ...c, ...updates } : c
              ),
            }));
          }
        } catch (error) {
          console.error('Update criteria error:', error);
        }
      },

      // 평가 항목 삭제
      deleteEvaluationCriteria: async (id) => {
        const { user } = get();
        if (!user) return;

        try {
          const { error } = await supabase
            .from('evaluation_criteria')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (!error) {
            set((state) => ({
              evaluationCriteria: state.evaluationCriteria.filter((c) => c.id !== id),
            }));
          }
        } catch (error) {
          console.error('Delete criteria error:', error);
        }
      },

      // 알림 액션 (로컬 전용)
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

      toggleMobileMenu: () => {
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
      },

      closeMobileMenu: () => {
        set({ mobileMenuOpen: false });
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
        sidebarCollapsed: state.sidebarCollapsed,
        notifications: state.notifications,
      }),
    }
  )
);

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { handleApiError } from '../lib/apiErrorHandler';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseClient = supabase as any;

// Personal Note
export interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Status Update
export interface StatusUpdate {
  id: string;
  userId: string;
  userName: string;
  projectId?: string;
  projectTitle?: string;
  content: string;
  type: 'progress' | 'blocker' | 'completed' | 'general';
  createdAt: string;
}

// Task Assignment
export interface TaskAssignment {
  id: string;
  projectId: string;
  projectTitle: string;
  projectType: string;
  assignedBy: string;
  assignedTo: string;
  assignedByName: string;
  assignedToName: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

interface PersonalTaskState {
  // Notes
  notes: PersonalNote[];
  notesLoading: boolean;

  // Status Updates
  statusUpdates: StatusUpdate[];
  statusUpdatesLoading: boolean;

  // Task Assignments
  myTasks: TaskAssignment[];
  assignedByMe: TaskAssignment[];
  tasksLoading: boolean;

  // Actions
  fetchNotes: () => Promise<void>;
  addNote: (note: Omit<PersonalNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNote: (id: string, updates: Partial<PersonalNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  fetchStatusUpdates: () => Promise<void>;
  addStatusUpdate: (update: Omit<StatusUpdate, 'id' | 'userId' | 'userName' | 'createdAt'>) => Promise<void>;

  fetchMyTasks: () => Promise<void>;
  fetchAssignedByMe: () => Promise<void>;
  updateTaskStatus: (id: string, status: TaskAssignment['status']) => Promise<void>;
}

export const usePersonalTaskStore = create<PersonalTaskState>((set) => ({
  notes: [],
  notesLoading: false,
  statusUpdates: [],
  statusUpdatesLoading: false,
  myTasks: [],
  assignedByMe: [],
  tasksLoading: false,

  fetchNotes: async () => {
    set({ notesLoading: true });
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        set({ notesLoading: false });
        return;
      }

      const { data, error } = await supabaseClient
        .from('personal_notes')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notes: PersonalNote[] = (data || []).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        content: n.content,
        isPinned: n.is_pinned,
        color: n.color || '#ffffff',
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      }));

      set({ notes, notesLoading: false });
    } catch (error) {
      handleApiError(error, '메모 조회');
      console.error('Fetch notes error:', error);
      set({ notesLoading: false });
    }
  },

  addNote: async (note) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const id = uuidv4();
      const now = new Date().toISOString();

      const { error } = await supabaseClient.from('personal_notes').insert({
        id,
        user_id: session.session.user.id,
        title: note.title,
        content: note.content,
        is_pinned: note.isPinned,
        color: note.color,
        created_at: now,
        updated_at: now,
      });

      if (error) throw error;

      const newNote: PersonalNote = {
        id,
        userId: session.session.user.id,
        title: note.title,
        content: note.content,
        isPinned: note.isPinned,
        color: note.color,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({ notes: [newNote, ...state.notes] }));
    } catch (error) {
      handleApiError(error, '메모 추가');
      console.error('Add note error:', error);
    }
  },

  updateNote: async (id, updates) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabaseClient
        .from('personal_notes')
        .update({
          title: updates.title,
          content: updates.content,
          is_pinned: updates.isPinned,
          color: updates.color,
          updated_at: now,
        })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, ...updates, updatedAt: now } : n
        ),
      }));
    } catch (error) {
      handleApiError(error, '메모 수정');
      console.error('Update note error:', error);
    }
  },

  deleteNote: async (id) => {
    try {
      const { error } = await supabaseClient.from('personal_notes').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));
    } catch (error) {
      handleApiError(error, '메모 삭제');
      console.error('Delete note error:', error);
    }
  },

  fetchStatusUpdates: async () => {
    set({ statusUpdatesLoading: true });
    try {
      const { data, error } = await supabaseClient
        .from('status_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusUpdates: StatusUpdate[] = (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        userName: s.user_name,
        projectId: s.project_id,
        projectTitle: s.project_title,
        content: s.content,
        type: s.type,
        createdAt: s.created_at,
      }));

      set({ statusUpdates, statusUpdatesLoading: false });
    } catch (error) {
      handleApiError(error, '상태 업데이트 조회');
      console.error('Fetch status updates error:', error);
      set({ statusUpdatesLoading: false });
    }
  },

  addStatusUpdate: async (update) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.session.user.id)
        .single();

      const id = uuidv4();
      const now = new Date().toISOString();
      const userName = profile?.name || session.session.user.email || '사용자';

      const { error } = await supabaseClient.from('status_updates').insert({
        id,
        user_id: session.session.user.id,
        user_name: userName,
        project_id: update.projectId,
        project_title: update.projectTitle,
        content: update.content,
        type: update.type,
        created_at: now,
      });

      if (error) throw error;

      const newUpdate: StatusUpdate = {
        id,
        userId: session.session.user.id,
        userName,
        projectId: update.projectId,
        projectTitle: update.projectTitle,
        content: update.content,
        type: update.type,
        createdAt: now,
      };

      set((state) => ({
        statusUpdates: [newUpdate, ...state.statusUpdates],
      }));
    } catch (error) {
      handleApiError(error, '상태 업데이트 추가');
      console.error('Add status update error:', error);
    }
  },

  fetchMyTasks: async () => {
    set({ tasksLoading: true });
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        set({ tasksLoading: false });
        return;
      }

      const userEmail = session.session.user.email || '';

      // Get projects assigned to me
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, type, assignee, status')
        .eq('assignee', userEmail)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const myTasks: TaskAssignment[] = (data || []).map((p) => ({
        id: p.id,
        projectId: p.id,
        projectTitle: p.title,
        projectType: p.type,
        assignedBy: '',
        assignedTo: userEmail,
        assignedByName: '',
        assignedToName: userEmail,
        status: p.status === 'in_progress' ? 'in_progress' : 'pending',
        createdAt: new Date().toISOString(),
      }));

      set({ myTasks, tasksLoading: false });
    } catch (error) {
      handleApiError(error, '내 업무 조회');
      console.error('Fetch my tasks error:', error);
      set({ tasksLoading: false });
    }
  },

  fetchAssignedByMe: async () => {
    // This would require tracking who assigned tasks
    // For now, we'll just return empty array
    set({ assignedByMe: [], tasksLoading: false });
  },

  updateTaskStatus: async (id, status) => {
    try {
      const projectStatus = status === 'completed' ? 'completed' : status === 'in_progress' ? 'in_progress' : 'planning';

      const { error } = await supabase
        .from('projects')
        .update({ status: projectStatus })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        myTasks: state.myTasks.map((t) =>
          t.projectId === id ? { ...t, status } : t
        ),
      }));
    } catch (error) {
      handleApiError(error, '업무 상태 변경');
      console.error('Update task status error:', error);
    }
  },
}));

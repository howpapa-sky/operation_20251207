import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { Json } from '../types/database';
import {
  SeedingProject,
  SeedingInfluencer,
  OutreachTemplate,
  ProductGuide,
  SeedingStatus,
  SeedingType,
  ContentType,
  SeedingPlatform,
  SeedingProjectStatus,
  ShippingInfo,
  SeedingPerformance,
  SeedingStats,
  SeedingProjectStats,
  Brand,
} from '../types';

// ========== 필터 타입 ==========
export interface SeedingFilters {
  projectId: string | 'all';
  status: SeedingStatus | 'all';
  seedingType: SeedingType | 'all';
  contentType: ContentType | 'all';
  platform: SeedingPlatform | 'all';
  brand: Brand | 'all';
  search: string;
  dateRange: { start: string; end: string } | null;
}

// ========== 스토어 인터페이스 ==========
interface SeedingStore {
  // ===== 데이터 =====
  projects: SeedingProject[];
  influencers: SeedingInfluencer[];
  templates: OutreachTemplate[];
  guides: ProductGuide[];

  // ===== 상태 =====
  isLoading: boolean;
  error: string | null;
  filters: SeedingFilters;
  selectedProjectId: string | null;

  // ===== 프로젝트 액션 =====
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<SeedingProject, 'id' | 'created_at' | 'updated_at'>) => Promise<SeedingProject>;
  updateProject: (id: string, updates: Partial<SeedingProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProjectById: (id: string) => SeedingProject | undefined;

  // ===== 인플루언서 액션 =====
  fetchInfluencers: (projectId?: string) => Promise<void>;
  addInfluencer: (influencer: Omit<SeedingInfluencer, 'id' | 'created_at' | 'updated_at'>) => Promise<SeedingInfluencer>;
  addInfluencersBulk: (influencers: Omit<SeedingInfluencer, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
  updateInfluencer: (id: string, updates: Partial<SeedingInfluencer>) => Promise<void>;
  updateInfluencerStatus: (id: string, status: SeedingStatus) => Promise<void>;
  updateShipping: (id: string, shipping: Partial<ShippingInfo>) => Promise<void>;
  updatePerformance: (id: string, performance: Partial<SeedingPerformance>) => Promise<void>;
  deleteInfluencer: (id: string) => Promise<void>;
  deleteInfluencersBulk: (ids: string[]) => Promise<void>;
  deleteInfluencersByProject: (projectId: string) => Promise<void>;
  getInfluencerById: (id: string) => SeedingInfluencer | undefined;

  // ===== 템플릿 액션 =====
  fetchTemplates: () => Promise<void>;
  addTemplate: (template: Omit<OutreachTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => Promise<OutreachTemplate>;
  updateTemplate: (id: string, updates: Partial<OutreachTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  incrementTemplateUsage: (id: string) => Promise<void>;

  // ===== 가이드 액션 =====
  fetchGuides: () => Promise<void>;
  addGuide: (guide: Omit<ProductGuide, 'id' | 'created_at' | 'updated_at'>) => Promise<ProductGuide>;
  updateGuide: (id: string, updates: Partial<ProductGuide>) => Promise<void>;
  deleteGuide: (id: string) => Promise<void>;
  generateGuideLink: (id: string) => Promise<string>;
  getGuideBySlug: (slug: string) => ProductGuide | undefined;

  // ===== 필터 액션 =====
  setFilters: (filters: Partial<SeedingFilters>) => void;
  resetFilters: () => void;
  setSelectedProject: (projectId: string | null) => void;

  // ===== 유틸 =====
  getFilteredInfluencers: () => SeedingInfluencer[];
  getProjectStats: (projectId: string) => SeedingProjectStats;
  getOverallStats: () => SeedingStats;
  getInfluencersByStatus: (status: SeedingStatus) => SeedingInfluencer[];
  getInfluencersByProject: (projectId: string) => SeedingInfluencer[];

  // ===== 내부 =====
  setError: (error: string | null) => void;
  clearError: () => void;
}

// ========== 기본 필터 ==========
const defaultFilters: SeedingFilters = {
  projectId: 'all',
  status: 'all',
  seedingType: 'all',
  contentType: 'all',
  platform: 'all',
  brand: 'all',
  search: '',
  dateRange: null,
};

// ========== DB 변환 함수 ==========
function dbToProject(record: any): SeedingProject {
  return {
    id: record.id,
    name: record.name,
    brand: record.brand,
    product_id: record.product_id || undefined,
    product_name: record.product_name || '',
    start_date: record.start_date,
    end_date: record.end_date,
    target_count: record.target_count || 0,
    cost_price: parseFloat(record.cost_price) || 0,
    selling_price: parseFloat(record.selling_price) || 0,
    status: record.status,
    description: record.description || undefined,
    assignee_id: record.assignee_id || undefined,
    // Google Sheets 동기화 설정
    listup_sheet_url: record.listup_sheet_url || undefined,
    listup_sheet_name: record.listup_sheet_name || 'Sheet1',
    auto_sync_enabled: record.auto_sync_enabled || false,
    last_synced_at: record.last_synced_at || undefined,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function dbToInfluencer(record: any): SeedingInfluencer {
  return {
    id: record.id,
    project_id: record.project_id,
    account_id: record.account_id,
    account_name: record.account_name || undefined,
    platform: record.platform,
    email: record.email || undefined,
    phone: record.phone || undefined,
    follower_count: record.follower_count ?? 0,
    following_count: record.following_count ?? undefined,
    category: record.category || undefined,
    profile_url: record.profile_url || undefined,
    listed_at: record.listed_at ?? undefined,
    seeding_type: record.seeding_type,
    content_type: record.content_type,
    fee: parseFloat(record.fee) ?? 0,
    product_name: record.product_name || undefined,
    product_price: record.product_price != null ? parseFloat(record.product_price) : undefined,
    status: record.status,
    shipping: {
      ...(record.shipping || {}),
      recipient_name: record.shipping?.recipient_name || '',
      phone: record.shipping?.phone || '',
      address: record.shipping?.address || '',
      quantity: record.shipping?.quantity || 1,
      shipped_at: record.shipped_at || record.shipping?.shipped_at || undefined,
    },
    guide_id: record.guide_id || undefined,
    guide_sent_at: record.guide_sent_at || undefined,
    guide_link: record.guide_link || undefined,
    posting_url: record.posting_url || undefined,
    posted_at: record.posted_at || undefined,
    performance: record.performance || {},
    contacted_at: record.contacted_at || undefined,
    accepted_at: record.accepted_at || undefined,
    rejected_at: record.rejected_at || undefined,
    rejection_reason: record.rejection_reason || undefined,
    completed_at: record.completed_at || undefined,
    notes: record.notes || undefined,
    assignee_id: record.assignee_id || undefined,
    sheet_row_index: record.sheet_row_index || undefined,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function dbToTemplate(record: any): OutreachTemplate {
  return {
    id: record.id,
    name: record.name,
    content: record.content,
    seeding_type: record.seeding_type,
    content_type: record.content_type,
    brand: record.brand,
    variables: record.variables || [],
    usage_count: record.usage_count || 0,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function dbToGuide(record: any): ProductGuide {
  return {
    id: record.id,
    product_id: record.product_id || undefined,
    product_name: record.product_name,
    brand: record.brand,
    content_type: record.content_type,
    description: record.description || '',
    key_points: record.key_points || [],
    hashtags: record.hashtags || [],
    mentions: record.mentions || [],
    dos: record.dos || [],
    donts: record.donts || [],
    link_url: record.link_url || undefined,
    image_urls: record.image_urls || [],
    reference_urls: record.reference_urls || [],
    public_slug: record.public_slug || '',
    is_public: record.is_public || false,
    updated_by: record.updated_by || undefined,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

// ========== 빈 통계 생성 ==========
function createEmptyStats(): SeedingStats {
  return {
    total_seedings: 0,
    by_status: {
      listed: 0,
      contacted: 0,
      accepted: 0,
      rejected: 0,
      shipped: 0,
      guide_sent: 0,
      posted: 0,
      completed: 0,
    },
    by_type: { free: 0, paid: 0 },
    by_content: { story: 0, reels: 0, feed: 0, both: 0 },
    acceptance_rate: 0,
    posting_rate: 0,
    total_cost: 0,
    total_value: 0,
    total_fee: 0,
    total_reach: 0,
    total_engagement: 0,
  };
}

// ========== 스토어 생성 ==========
export const useSeedingStore = create<SeedingStore>()(
  persist(
    (set, get) => ({
      // ===== 초기 상태 =====
      projects: [],
      influencers: [],
      templates: [],
      guides: [],
      isLoading: false,
      error: null,
      filters: defaultFilters,
      selectedProjectId: null,

      // ===== 에러 관리 =====
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // ========== 프로젝트 CRUD ==========

      fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('seeding_projects')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const projects = (data || []).map(dbToProject);
          set({ projects, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      addProject: async (project) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('seeding_projects')
            .insert({
              name: project.name,
              brand: project.brand,
              product_id: project.product_id || null,
              product_name: project.product_name,
              start_date: project.start_date,
              end_date: project.end_date,
              target_count: project.target_count,
              cost_price: project.cost_price,
              selling_price: project.selling_price,
              status: project.status,
              description: project.description || null,
              assignee_id: project.assignee_id || null,
            })
            .select()
            .single();

          if (error) throw error;

          const newProject = dbToProject(data);
          set((state) => ({
            projects: [newProject, ...state.projects],
            isLoading: false,
          }));

          return newProject;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateProject: async (id, updates) => {
        const previousProjects = get().projects;

        // 낙관적 업데이트
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
          ),
        }));

        try {
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
          if (updates.product_id !== undefined) dbUpdates.product_id = updates.product_id;
          if (updates.product_name !== undefined) dbUpdates.product_name = updates.product_name;
          if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date;
          if (updates.end_date !== undefined) dbUpdates.end_date = updates.end_date;
          if (updates.target_count !== undefined) dbUpdates.target_count = updates.target_count;
          if (updates.cost_price !== undefined) dbUpdates.cost_price = updates.cost_price;
          if (updates.selling_price !== undefined) dbUpdates.selling_price = updates.selling_price;
          if (updates.status !== undefined) dbUpdates.status = updates.status;
          if (updates.description !== undefined) dbUpdates.description = updates.description;
          if (updates.assignee_id !== undefined) dbUpdates.assignee_id = updates.assignee_id;
          // Google Sheets 동기화 설정
          if (updates.listup_sheet_url !== undefined) dbUpdates.listup_sheet_url = updates.listup_sheet_url;
          if (updates.listup_sheet_name !== undefined) dbUpdates.listup_sheet_name = updates.listup_sheet_name;
          if (updates.auto_sync_enabled !== undefined) dbUpdates.auto_sync_enabled = updates.auto_sync_enabled;
          if (updates.last_synced_at !== undefined) dbUpdates.last_synced_at = updates.last_synced_at;

          const { error } = await supabase
            .from('seeding_projects')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          // 롤백
          set({ projects: previousProjects, error: error.message });
          throw error;
        }
      },

      deleteProject: async (id) => {
        const previousProjects = get().projects;

        // 낙관적 삭제
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          influencers: state.influencers.filter((i) => i.project_id !== id),
        }));

        try {
          const { error } = await supabase
            .from('seeding_projects')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          // 롤백
          set({ projects: previousProjects, error: error.message });
          throw error;
        }
      },

      getProjectById: (id) => {
        return get().projects.find((p) => p.id === id);
      },

      // ========== 인플루언서 CRUD ==========

      fetchInfluencers: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          let query = supabase
            .from('seeding_influencers')
            .select('*')
            .order('created_at', { ascending: false });

          if (projectId) {
            query = query.eq('project_id', projectId);
          }

          const { data, error } = await query;

          if (error) throw error;

          const influencers = (data || []).map(dbToInfluencer);

          if (projectId) {
            // 특정 프로젝트의 인플루언서만 업데이트
            set((state) => ({
              influencers: [
                ...state.influencers.filter((i) => i.project_id !== projectId),
                ...influencers,
              ],
              isLoading: false,
            }));
          } else {
            set({ influencers, isLoading: false });
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      addInfluencer: async (influencer) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('seeding_influencers')
            .insert({
              project_id: influencer.project_id,
              account_id: influencer.account_id,
              account_name: influencer.account_name || null,
              platform: influencer.platform,
              email: influencer.email || null,
              phone: influencer.phone || null,
              follower_count: influencer.follower_count ?? 0,
              following_count: influencer.following_count ?? null,
              category: influencer.category || null,
              profile_url: influencer.profile_url || null,
              listed_at: influencer.listed_at ?? null,
              seeding_type: influencer.seeding_type,
              content_type: influencer.content_type,
              fee: influencer.fee ?? 0,
              product_name: influencer.product_name || null,
              product_price: influencer.product_price ?? null,
              status: influencer.status,
              shipping: influencer.shipping as unknown as Json,
              guide_id: influencer.guide_id || null,
              notes: influencer.notes || null,
              assignee_id: influencer.assignee_id || null,
              sheet_row_index: influencer.sheet_row_index || null,
            })
            .select()
            .single();

          if (error) throw error;

          const newInfluencer = dbToInfluencer(data);
          set((state) => ({
            influencers: [newInfluencer, ...state.influencers],
            isLoading: false,
          }));

          return newInfluencer;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      addInfluencersBulk: async (influencers) => {
        set({ isLoading: true, error: null });

        // 레코드 변환 함수 (|| 대신 ?? 사용으로 0 값 보존)
        const toRecord = (inf: typeof influencers[0], index: number) => {
          const record = {
            project_id: inf.project_id,
            account_id: inf.account_id,
            account_name: inf.account_name || null,
            platform: inf.platform,
            email: inf.email || null,
            phone: inf.phone || null,
            follower_count: inf.follower_count ?? 0,
            following_count: inf.following_count ?? null,
            category: inf.category || null,
            profile_url: inf.profile_url || null,
            listed_at: inf.listed_at ?? null,
            seeding_type: inf.seeding_type,
            content_type: inf.content_type,
            fee: inf.fee ?? 0,
            product_name: inf.product_name || null,
            product_price: inf.product_price ?? null,
            status: inf.status,
            shipping: inf.shipping as unknown as Json,
            guide_id: inf.guide_id || null,
            notes: inf.notes || null,
            assignee_id: inf.assignee_id || null,
            sheet_row_index: inf.sheet_row_index || null,
          };

          // 첫 번째 레코드 디버깅 로그
          if (index === 0) {
            console.log('[addInfluencersBulk] First input:', JSON.stringify({
              listed_at: inf.listed_at,
              following_count: inf.following_count,
              product_price: inf.product_price,
            }));
            console.log('[addInfluencersBulk] First record:', JSON.stringify({
              listed_at: record.listed_at,
              following_count: record.following_count,
              product_price: record.product_price,
            }));
          }

          return record;
        };

        const allRecords = influencers.map((inf, index) => toRecord(inf, index));
        const successfulInfluencers: SeedingInfluencer[] = [];
        const errors: string[] = [];

        // 디버깅: DB insert 직전 데이터 확인
        console.log('[DEBUG] Before DB insert:', {
          listed_at: influencers[0]?.listed_at,
          following_count: influencers[0]?.following_count,
          follower_count: influencers[0]?.follower_count,
          'allRecords[0].listed_at': allRecords[0]?.listed_at,
          'allRecords[0].following_count': allRecords[0]?.following_count,
          'allRecords[0].follower_count': allRecords[0]?.follower_count,
        });

        try {
          // 먼저 벌크 삽입 시도
          const { data, error } = await supabase
            .from('seeding_influencers')
            .insert(allRecords)
            .select();

          if (!error && data) {
            // 벌크 삽입 성공
            const newInfluencers = data.map(dbToInfluencer);
            set((state) => ({
              influencers: [...newInfluencers, ...state.influencers],
              isLoading: false,
            }));
            console.log(`[addInfluencersBulk] Bulk insert success: ${data.length} records`);
            return;
          }

          // 벌크 삽입 실패 시, 개별 삽입으로 폴백 (Partial Success)
          console.warn(`[addInfluencersBulk] Bulk insert failed, falling back to individual inserts:`, error?.message);

          for (let i = 0; i < allRecords.length; i++) {
            const record = allRecords[i];
            try {
              const { data: singleData, error: singleError } = await supabase
                .from('seeding_influencers')
                .insert(record)
                .select()
                .single();

              if (singleError) {
                const errorMsg = `Row ${i + 1} (${record.account_id}): ${singleError.message}`;
                console.error(`[addInfluencersBulk] ${errorMsg}`);
                errors.push(errorMsg);
              } else if (singleData) {
                successfulInfluencers.push(dbToInfluencer(singleData));
              }
            } catch (rowError: any) {
              const errorMsg = `Row ${i + 1} (${record.account_id}): ${rowError.message}`;
              console.error(`[addInfluencersBulk] ${errorMsg}`);
              errors.push(errorMsg);
            }
          }

          // 성공한 레코드들 상태에 추가
          if (successfulInfluencers.length > 0) {
            set((state) => ({
              influencers: [...successfulInfluencers, ...state.influencers],
              isLoading: false,
              error: errors.length > 0 ? `${successfulInfluencers.length}건 성공, ${errors.length}건 실패` : null,
            }));
            console.log(`[addInfluencersBulk] Partial success: ${successfulInfluencers.length}/${allRecords.length} records`);
          } else {
            set({
              isLoading: false,
              error: `모든 레코드 삽입 실패 (${errors.length}건)`
            });
          }

          // 에러가 있어도 성공한 것들은 저장되었으므로, 성공 건수가 있으면 throw하지 않음
          if (successfulInfluencers.length === 0 && errors.length > 0) {
            throw new Error(errors.join('\n'));
          }

        } catch (error: any) {
          console.error('[addInfluencersBulk] Error:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateInfluencer: async (id, updates) => {
        const previousInfluencers = get().influencers;

        // 낙관적 업데이트
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i
          ),
        }));

        try {
          const dbUpdates: any = {};

          // 필드별 매핑
          const fieldMap: Record<string, string> = {
            account_id: 'account_id',
            account_name: 'account_name',
            platform: 'platform',
            email: 'email',
            phone: 'phone',
            follower_count: 'follower_count',
            following_count: 'following_count',
            category: 'category',
            profile_url: 'profile_url',
            listed_at: 'listed_at',
            seeding_type: 'seeding_type',
            content_type: 'content_type',
            fee: 'fee',
            product_name: 'product_name',
            product_price: 'product_price',
            status: 'status',
            shipping: 'shipping',
            guide_id: 'guide_id',
            guide_sent_at: 'guide_sent_at',
            guide_link: 'guide_link',
            posting_url: 'posting_url',
            posted_at: 'posted_at',
            performance: 'performance',
            contacted_at: 'contacted_at',
            accepted_at: 'accepted_at',
            rejected_at: 'rejected_at',
            rejection_reason: 'rejection_reason',
            completed_at: 'completed_at',
            notes: 'notes',
            assignee_id: 'assignee_id',
            sheet_row_index: 'sheet_row_index',
          };

          Object.keys(updates).forEach((key) => {
            if (fieldMap[key] && updates[key as keyof typeof updates] !== undefined) {
              dbUpdates[fieldMap[key]] = updates[key as keyof typeof updates];
            }
          });

          const { error } = await supabase
            .from('seeding_influencers')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          set({ influencers: previousInfluencers, error: error.message });
          throw error;
        }
      },

      updateInfluencerStatus: async (id, status) => {
        const now = new Date().toISOString();
        const updates: Partial<SeedingInfluencer> = { status };

        // 상태에 따른 타임스탬프 업데이트
        switch (status) {
          case 'contacted':
            updates.contacted_at = now;
            break;
          case 'accepted':
            updates.accepted_at = now;
            break;
          case 'rejected':
            updates.rejected_at = now;
            break;
          case 'posted':
            updates.posted_at = now;
            break;
          case 'completed':
            updates.completed_at = now;
            break;
        }

        await get().updateInfluencer(id, updates);
      },

      updateShipping: async (id, shipping) => {
        const influencer = get().influencers.find((i) => i.id === id);
        if (!influencer) return;

        const updatedShipping = { ...influencer.shipping, ...shipping };

        // shipped_at 자동 설정
        if (shipping.tracking_number && !influencer.shipping.shipped_at) {
          updatedShipping.shipped_at = new Date().toISOString();
        }

        await get().updateInfluencer(id, { shipping: updatedShipping });

        // 상태가 아직 shipped가 아니고 송장번호가 있으면 상태 업데이트
        if (shipping.tracking_number && influencer.status === 'accepted') {
          await get().updateInfluencerStatus(id, 'shipped');
        }
      },

      updatePerformance: async (id, performance) => {
        const influencer = get().influencers.find((i) => i.id === id);
        if (!influencer) return;

        const updatedPerformance: SeedingPerformance = {
          ...influencer.performance,
          ...performance,
          measured_at: new Date().toISOString(),
        };

        await get().updateInfluencer(id, { performance: updatedPerformance });
      },

      deleteInfluencer: async (id) => {
        const previousInfluencers = get().influencers;

        set((state) => ({
          influencers: state.influencers.filter((i) => i.id !== id),
        }));

        try {
          const { error } = await supabase
            .from('seeding_influencers')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          set({ influencers: previousInfluencers, error: error.message });
          throw error;
        }
      },

      deleteInfluencersBulk: async (ids) => {
        const previousInfluencers = get().influencers;

        set((state) => ({
          influencers: state.influencers.filter((i) => !ids.includes(i.id)),
        }));

        try {
          // 배치로 삭제 (100개씩)
          const batchSize = 100;
          for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const { error } = await supabase
              .from('seeding_influencers')
              .delete()
              .in('id', batch);

            if (error) throw error;
          }
        } catch (error: any) {
          set({ influencers: previousInfluencers, error: error.message });
          throw error;
        }
      },

      deleteInfluencersByProject: async (projectId) => {
        const previousInfluencers = get().influencers;

        set((state) => ({
          influencers: state.influencers.filter((i) => i.project_id !== projectId),
        }));

        try {
          const { error } = await supabase
            .from('seeding_influencers')
            .delete()
            .eq('project_id', projectId);

          if (error) throw error;
        } catch (error: any) {
          set({ influencers: previousInfluencers, error: error.message });
          throw error;
        }
      },

      getInfluencerById: (id) => {
        return get().influencers.find((i) => i.id === id);
      },

      // ========== 템플릿 CRUD ==========

      fetchTemplates: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('outreach_templates')
            .select('*')
            .order('usage_count', { ascending: false });

          if (error) throw error;

          const templates = (data || []).map(dbToTemplate);
          set({ templates, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      addTemplate: async (template) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('outreach_templates')
            .insert({
              name: template.name,
              content: template.content,
              seeding_type: template.seeding_type,
              content_type: template.content_type,
              brand: template.brand,
              variables: template.variables,
              usage_count: 0,
            })
            .select()
            .single();

          if (error) throw error;

          const newTemplate = dbToTemplate(data);
          set((state) => ({
            templates: [newTemplate, ...state.templates],
            isLoading: false,
          }));

          return newTemplate;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateTemplate: async (id, updates) => {
        const previousTemplates = get().templates;

        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
          ),
        }));

        try {
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.content !== undefined) dbUpdates.content = updates.content;
          if (updates.seeding_type !== undefined) dbUpdates.seeding_type = updates.seeding_type;
          if (updates.content_type !== undefined) dbUpdates.content_type = updates.content_type;
          if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
          if (updates.variables !== undefined) dbUpdates.variables = updates.variables;

          const { error } = await supabase
            .from('outreach_templates')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          set({ templates: previousTemplates, error: error.message });
          throw error;
        }
      },

      deleteTemplate: async (id) => {
        const previousTemplates = get().templates;

        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));

        try {
          const { error } = await supabase
            .from('outreach_templates')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          set({ templates: previousTemplates, error: error.message });
          throw error;
        }
      },

      incrementTemplateUsage: async (id) => {
        const template = get().templates.find((t) => t.id === id);
        if (!template) return;

        const newCount = template.usage_count + 1;

        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, usage_count: newCount } : t
          ),
        }));

        try {
          const { error } = await supabase
            .from('outreach_templates')
            .update({ usage_count: newCount })
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          // 실패해도 크리티컬하지 않음
          console.error('Failed to increment template usage:', error);
        }
      },

      // ========== 가이드 CRUD ==========

      fetchGuides: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('product_guides')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const guides = (data || []).map(dbToGuide);
          set({ guides, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      addGuide: async (guide) => {
        set({ isLoading: true, error: null });
        try {
          // public_slug 생성 (없으면 자동 생성)
          const slug = guide.public_slug || `guide-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

          const { data, error } = await supabase
            .from('product_guides')
            .insert({
              product_id: guide.product_id || null,
              product_name: guide.product_name,
              brand: guide.brand,
              content_type: guide.content_type,
              description: guide.description,
              key_points: guide.key_points,
              hashtags: guide.hashtags,
              mentions: guide.mentions,
              dos: guide.dos,
              donts: guide.donts,
              link_url: guide.link_url || null,
              image_urls: guide.image_urls,
              reference_urls: guide.reference_urls,
              public_slug: slug,
              is_public: guide.is_public,
              updated_by: guide.updated_by || null,
            })
            .select()
            .single();

          if (error) throw error;

          const newGuide = dbToGuide(data);
          set((state) => ({
            guides: [newGuide, ...state.guides],
            isLoading: false,
          }));

          return newGuide;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateGuide: async (id, updates) => {
        const previousGuides = get().guides;

        set((state) => ({
          guides: state.guides.map((g) =>
            g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
          ),
        }));

        try {
          const dbUpdates: any = {};

          const fields = [
            'product_id', 'product_name', 'brand', 'content_type',
            'description', 'key_points', 'hashtags', 'mentions',
            'dos', 'donts', 'link_url', 'image_urls', 'reference_urls',
            'public_slug', 'is_public', 'updated_by'
          ];

          fields.forEach((field) => {
            if (updates[field as keyof ProductGuide] !== undefined) {
              dbUpdates[field] = updates[field as keyof ProductGuide];
            }
          });

          const { error } = await supabase
            .from('product_guides')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          set({ guides: previousGuides, error: error.message });
          throw error;
        }
      },

      deleteGuide: async (id) => {
        const previousGuides = get().guides;

        set((state) => ({
          guides: state.guides.filter((g) => g.id !== id),
        }));

        try {
          const { error } = await supabase
            .from('product_guides')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          set({ guides: previousGuides, error: error.message });
          throw error;
        }
      },

      generateGuideLink: async (id) => {
        const guide = get().guides.find((g) => g.id === id);
        if (!guide) throw new Error('Guide not found');

        // 이미 공개되어 있으면 기존 링크 반환
        if (guide.is_public && guide.public_slug) {
          return `/guide/${guide.public_slug}`;
        }

        // 공개 설정
        await get().updateGuide(id, { is_public: true });

        return `/guide/${guide.public_slug}`;
      },

      getGuideBySlug: (slug) => {
        return get().guides.find((g) => g.public_slug === slug);
      },

      // ========== 필터 액션 ==========

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => {
        set({ filters: defaultFilters });
      },

      setSelectedProject: (projectId) => {
        set({
          selectedProjectId: projectId,
          filters: projectId
            ? { ...get().filters, projectId: projectId }
            : { ...get().filters, projectId: 'all' }
        });
      },

      // ========== 유틸 함수 ==========

      getFilteredInfluencers: () => {
        const { influencers, filters } = get();

        return influencers.filter((inf) => {
          // 프로젝트 필터
          if (filters.projectId !== 'all' && inf.project_id !== filters.projectId) {
            return false;
          }

          // 상태 필터
          if (filters.status !== 'all' && inf.status !== filters.status) {
            return false;
          }

          // 시딩 유형 필터
          if (filters.seedingType !== 'all' && inf.seeding_type !== filters.seedingType) {
            return false;
          }

          // 콘텐츠 유형 필터
          if (filters.contentType !== 'all' && inf.content_type !== filters.contentType) {
            return false;
          }

          // 플랫폼 필터
          if (filters.platform !== 'all' && inf.platform !== filters.platform) {
            return false;
          }

          // 검색어 필터
          if (filters.search) {
            const search = filters.search.toLowerCase();
            const matchAccountId = inf.account_id.toLowerCase().includes(search);
            const matchAccountName = inf.account_name?.toLowerCase().includes(search);
            const matchEmail = inf.email?.toLowerCase().includes(search);
            const matchCategory = inf.category?.toLowerCase().includes(search);

            if (!matchAccountId && !matchAccountName && !matchEmail && !matchCategory) {
              return false;
            }
          }

          return true;
        });
      },

      getProjectStats: (projectId) => {
        const influencers = get().influencers.filter((i) => i.project_id === projectId);
        const project = get().getProjectById(projectId);

        const stats: SeedingProjectStats = {
          project_id: projectId,
          total_influencers: influencers.length,
          by_status: {
            listed: 0,
            contacted: 0,
            accepted: 0,
            rejected: 0,
            shipped: 0,
            guide_sent: 0,
            posted: 0,
            completed: 0,
          },
          by_type: { free: 0, paid: 0 },
          by_content: { story: 0, reels: 0, feed: 0, both: 0 },
          progress_rate: 0,
          total_cost: 0,
          total_fee: 0,
          total_reach: 0,
          total_engagement: 0,
        };

        // 발송 완료 이후 상태 (비용 계산 대상)
        const shippedStatuses = ['shipped', 'guide_sent', 'posted', 'completed'];

        influencers.forEach((inf) => {
          // 상태별 카운트
          stats.by_status[inf.status]++;

          // 유형별 카운트
          stats.by_type[inf.seeding_type]++;

          // 콘텐츠별 카운트
          stats.by_content[inf.content_type]++;

          // 비용 계산 (발송완료 상태인 건만 계산)
          if (shippedStatuses.includes(inf.status)) {
            const quantity = inf.shipping?.quantity || 1;
            // 인플루언서별 제품단가 우선, 없으면 프로젝트 원가 사용
            const productPrice = inf.product_price || project?.cost_price || 0;
            stats.total_cost += quantity * productPrice;
          }
          stats.total_fee += inf.fee || 0;

          // 성과 합산
          if (inf.performance) {
            stats.total_reach += (inf.performance.views || 0) + (inf.performance.story_views || 0);
            stats.total_engagement +=
              (inf.performance.likes || 0) +
              (inf.performance.comments || 0) +
              (inf.performance.saves || 0) +
              (inf.performance.shares || 0);
          }
        });

        // 진행률 계산 (완료 상태 기준)
        const completedCount = stats.by_status.posted + stats.by_status.completed;
        stats.progress_rate = influencers.length > 0
          ? (completedCount / influencers.length) * 100
          : 0;

        return stats;
      },

      getOverallStats: () => {
        const { influencers, projects } = get();
        const stats = createEmptyStats();

        stats.total_seedings = influencers.length;

        // 발송 완료 이후 상태 (비용 계산 대상)
        const shippedStatuses = ['shipped', 'guide_sent', 'posted', 'completed'];

        influencers.forEach((inf) => {
          const project = projects.find((p) => p.id === inf.project_id);

          // 상태별 카운트
          stats.by_status[inf.status]++;

          // 유형별 카운트
          stats.by_type[inf.seeding_type]++;

          // 콘텐츠별 카운트
          stats.by_content[inf.content_type]++;

          // 비용 계산 (발송완료 상태인 건만 계산)
          if (shippedStatuses.includes(inf.status)) {
            const quantity = inf.shipping?.quantity || 1;
            // 인플루언서별 제품단가 우선, 없으면 프로젝트 원가 사용
            const productPrice = inf.product_price || project?.cost_price || 0;
            stats.total_cost += quantity * productPrice;
            stats.total_value += quantity * (project?.selling_price || 0);
          }
          stats.total_fee += inf.fee || 0;

          // 성과 합산
          if (inf.performance) {
            stats.total_reach += (inf.performance.views || 0) + (inf.performance.story_views || 0);
            stats.total_engagement +=
              (inf.performance.likes || 0) +
              (inf.performance.comments || 0) +
              (inf.performance.saves || 0) +
              (inf.performance.shares || 0);
          }
        });

        // 수락률 계산 (연락한 사람 중 수락한 비율)
        const contactedCount = stats.by_status.contacted + stats.by_status.accepted +
                               stats.by_status.rejected + stats.by_status.shipped +
                               stats.by_status.guide_sent + stats.by_status.posted +
                               stats.by_status.completed;
        const acceptedCount = stats.by_status.accepted + stats.by_status.shipped +
                              stats.by_status.guide_sent + stats.by_status.posted +
                              stats.by_status.completed;
        stats.acceptance_rate = contactedCount > 0
          ? (acceptedCount / contactedCount) * 100
          : 0;

        // 포스팅률 계산 (수락한 사람 중 포스팅한 비율)
        const postedCount = stats.by_status.posted + stats.by_status.completed;
        stats.posting_rate = acceptedCount > 0
          ? (postedCount / acceptedCount) * 100
          : 0;

        return stats;
      },

      getInfluencersByStatus: (status) => {
        return get().influencers.filter((i) => i.status === status);
      },

      getInfluencersByProject: (projectId) => {
        return get().influencers.filter((i) => i.project_id === projectId);
      },
    }),
    {
      name: 'seeding-store',
      partialize: (state) => ({
        // 필터와 선택된 프로젝트만 persist
        filters: state.filters,
        selectedProjectId: state.selectedProjectId,
      }),
    }
  )
);

// ========== 셀렉터 훅 ==========
export const useSeedingProjects = () => useSeedingStore((state) => state.projects);
export const useSeedingInfluencers = () => useSeedingStore((state) => state.influencers);
export const useSeedingTemplates = () => useSeedingStore((state) => state.templates);
export const useSeedingGuides = () => useSeedingStore((state) => state.guides);
export const useSeedingFilters = () => useSeedingStore((state) => state.filters);
export const useSeedingLoading = () => useSeedingStore((state) => state.isLoading);
export const useSeedingError = () => useSeedingStore((state) => state.error);

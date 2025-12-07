// 사용자 타입
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
  avatar?: string;
}

// 브랜드 타입
export type Brand = 'howpapa' | 'nuccio';

// 카테고리 타입
export type ProductCategory =
  | '크림'
  | '패드'
  | '로션'
  | '스틱'
  | '앰플'
  | '세럼'
  | '미스트'
  | '클렌저'
  | '선크림'
  | '마스크팩'
  | '기타';

// 제조사 타입
export type Manufacturer = '콜마' | '코스맥스' | '기타';

// 프로젝트 상태
export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold' | 'cancelled';

// 우선순위
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// 기본 프로젝트 인터페이스
export interface BaseProject {
  id: string;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  targetDate: string;
  completedDate?: string;
  assignee?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
  history?: ProjectHistory[];
}

// 프로젝트 타입
export type ProjectType =
  | 'sampling'
  | 'detail_page'
  | 'influencer'
  | 'product_order'
  | 'group_purchase'
  | 'other';

// 첨부파일
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

// 프로젝트 히스토리
export interface ProjectHistory {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
}

// 1. 샘플링 프로젝트
export interface SamplingProject extends BaseProject {
  type: 'sampling';
  brand: Brand;
  category: ProductCategory;
  manufacturer: Manufacturer;
  sampleCode: string;
  round: number; // 1-20
  ratings: SampleRating[];
  averageRating?: number;
}

export interface SampleRating {
  criteriaId: string;
  criteriaName: string;
  score: number; // 1-5 or 1-10
  comment?: string;
}

// 평가 항목 정의
export interface EvaluationCriteria {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  maxScore: number;
  isActive: boolean;
}

// 2. 상세페이지 제작 프로젝트
export interface DetailPageProject extends BaseProject {
  type: 'detail_page';
  brand: Brand;
  category: ProductCategory;
  productName: string;
  productionCompany: string;
  workType: 'new' | 'renewal';
  includesPhotography: boolean;
  includesPlanning: boolean;
  budget: number;
  actualCost?: number;
}

// 3. 인플루언서 협업 프로젝트
export interface InfluencerProject extends BaseProject {
  type: 'influencer';
  collaborationType: 'sponsorship' | 'paid_content';
  influencerName?: string;
  platform?: string;
  budget: number;
  actualCost?: number;
  expectedReach?: number;
  actualReach?: number;
}

// 4. 제품 발주 프로젝트
export interface ProductOrderProject extends BaseProject {
  type: 'product_order';
  brand: Brand;
  manufacturer: Manufacturer;
  containerMaterial: string;
  boxMaterial: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
}

// 5. 공동구매 프로젝트
export interface GroupPurchaseProject extends BaseProject {
  type: 'group_purchase';
  brand: Brand;
  sellerName: string;
  revenue: number;
  contributionProfit: number;
  profitMargin?: number;
}

// 6. 기타 프로젝트
export interface OtherProject extends BaseProject {
  type: 'other';
  customFields?: Record<string, string | number | boolean>;
}

// 모든 프로젝트 유니온 타입
export type Project =
  | SamplingProject
  | DetailPageProject
  | InfluencerProject
  | ProductOrderProject
  | GroupPurchaseProject
  | OtherProject;

// 통계 타입
export interface Statistics {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  onHoldProjects: number;
  totalBudget: number;
  usedBudget: number;
  averageCompletionRate: number;
  projectsByType: Record<ProjectType, number>;
  projectsByStatus: Record<ProjectStatus, number>;
  projectsByMonth: { month: string; count: number }[];
}

// 대시보드 위젯 데이터
export interface DashboardWidget {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: string;
}

// 캘린더 이벤트
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  projectId: string;
  projectType: ProjectType;
  eventType: 'start' | 'target' | 'completed';
  color?: string;
}

// 알림
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
  projectId?: string;
}

// 필터 옵션
export interface FilterOptions {
  status?: ProjectStatus[];
  type?: ProjectType[];
  priority?: Priority[];
  brand?: Brand[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
}

// 정렬 옵션
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

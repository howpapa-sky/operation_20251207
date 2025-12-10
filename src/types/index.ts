// 사용자 역할 타입
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'member';

// 사용자 역할 라벨
export const userRoleLabels: Record<UserRole, string> = {
  super_admin: '최고 관리자',
  admin: '관리자',
  manager: '매니저',
  member: '일반',
};

// 사용자 역할 권한 레벨 (숫자가 높을수록 권한이 높음)
export const userRoleLevels: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  manager: 50,
  member: 10,
};

// 사용자 타입
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
  schedules?: ProjectSchedule[];  // 세부 일정
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

// 세부 일정 타입
export type ScheduleType =
  | 'sample_delivery'    // 샘플 전달
  | 'sample_receipt'     // 샘플 수령
  | 'evaluation'         // 평가
  | 'feedback'           // 피드백 제출
  | 'revision'           // 수정/보완
  | 'approval'           // 승인
  | 'production'         // 양산
  | 'delivery'           // 납품
  | 'meeting'            // 미팅
  | 'other';             // 기타

export const scheduleTypeLabels: Record<ScheduleType, string> = {
  sample_delivery: '샘플 전달',
  sample_receipt: '샘플 수령',
  evaluation: '평가',
  feedback: '피드백 제출',
  revision: '수정/보완',
  approval: '승인',
  production: '양산',
  delivery: '납품',
  meeting: '미팅',
  other: '기타',
};

export const scheduleTypeColors: Record<ScheduleType, string> = {
  sample_delivery: '#6366f1',
  sample_receipt: '#8b5cf6',
  evaluation: '#f59e0b',
  feedback: '#10b981',
  revision: '#f97316',
  approval: '#22c55e',
  production: '#3b82f6',
  delivery: '#14b8a6',
  meeting: '#ec4899',
  other: '#64748b',
};

// 프로젝트 세부 일정
export interface ProjectSchedule {
  id: string;
  projectId: string;
  type: ScheduleType;
  title: string;
  description?: string;
  dueDate: string;           // 예정일
  completedDate?: string;    // 완료일
  isCompleted: boolean;
  reminderDays?: number[];   // 며칠 전에 알림 (예: [1, 3, 7])
  assignee?: string;
  createdAt: string;
  updatedAt: string;
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

// ========== 매출 관리 관련 타입 ==========

// 판매 채널
export type SalesChannel = 'cafe24' | 'naver_smartstore' | 'coupang' | 'other';

// 제품 (매입가 포함)
export interface Product {
  id: string;
  name: string;
  brand: Brand;
  category: ProductCategory;
  sku: string; // 제품 코드
  costPrice: number; // 매입가
  sellingPrice: number; // 판매가
  isActive: boolean;
  createdAt: string;
}

// 매출 기록
export interface SalesRecord {
  id: string;
  date: string; // YYYY-MM-DD
  channel: SalesChannel;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // 판매 단가
  costPrice: number; // 매입 단가
  totalRevenue: number; // 총 매출 (quantity * unitPrice)
  totalCost: number; // 총 매입가 (quantity * costPrice)
  profit: number; // 이익 (totalRevenue - totalCost)
  notes?: string;
  createdAt: string;
}

// 일별 매출 요약
export interface DailySalesSummary {
  date: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  orderCount: number;
  byChannel: Record<SalesChannel, {
    revenue: number;
    cost: number;
    profit: number;
    orderCount: number;
  }>;
}

// 월별 매출 요약
export interface MonthlySalesSummary {
  month: string; // YYYY-MM
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number; // 이익률 (%)
  orderCount: number;
  byChannel: Record<SalesChannel, {
    revenue: number;
    cost: number;
    profit: number;
    orderCount: number;
  }>;
  dailyData: { date: string; revenue: number; profit: number }[];
}

// ========== API 연동 관련 타입 ==========

// API 동기화 상태
export type SyncStatus = 'never' | 'syncing' | 'success' | 'failed';

// 카페24 자격증명
export interface Cafe24Credentials {
  mallId: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

// 네이버 스마트스토어 자격증명
export interface NaverCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

// 쿠팡 자격증명
export interface CoupangCredentials {
  vendorId: string;
  accessKey: string;
  secretKey: string;
}

// API 자격증명 (통합)
export interface ApiCredential {
  id: string;
  channel: SalesChannel;
  isActive: boolean;
  lastSyncAt?: string;
  syncStatus: SyncStatus;
  syncError?: string;

  // 채널별 자격증명 (해당 채널만 값이 있음)
  cafe24?: Cafe24Credentials;
  naver?: NaverCredentials;
  coupang?: CoupangCredentials;

  createdAt: string;
  updatedAt: string;
}

// API 동기화 로그
export interface ApiSyncLog {
  id: string;
  channel: SalesChannel;
  syncType: 'manual' | 'scheduled';
  status: 'started' | 'success' | 'failed';
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

// API 연동 설정 폼 데이터
export interface ApiSettingsFormData {
  cafe24: {
    enabled: boolean;
    mallId: string;
    clientId: string;
    clientSecret: string;
  };
  naver: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
  };
  coupang: {
    enabled: boolean;
    vendorId: string;
    accessKey: string;
    secretKey: string;
  };
}

// ========== 프로젝트 설정 관련 타입 ==========

// 프로젝트 유형 설정
export interface ProjectTypeSetting {
  id: string;
  projectType: ProjectType;
  isVisible: boolean;
  displayOrder: number;
  customName?: string;
  createdAt: string;
  updatedAt: string;
}

// 알림 설정
export interface NotificationSettings {
  id: string;
  ddayEmailEnabled: boolean;
  ddayDaysBefore: number[];
  ddayOverdueEnabled: boolean;
  statusChangeEnabled: boolean;
  weeklySummaryEnabled: boolean;
  notificationEmail?: string;
  createdAt: string;
  updatedAt: string;
}

// 필드 타입
export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea';

// 프로젝트 필드 설정
export interface ProjectFieldSetting {
  id: string;
  projectType: ProjectType;
  fieldKey: string;
  fieldLabel: string;
  fieldType: FieldType;
  fieldOptions?: string[]; // select 타입일 경우 옵션 목록
  isRequired: boolean;
  isVisible: boolean;
  displayOrder: number;
  placeholder?: string;
  defaultValue?: string;
  visibleForBrands?: string[]; // 특정 브랜드에서만 표시 (null/빈배열 = 모든 브랜드)
  createdAt: string;
  updatedAt: string;
}

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
export type Brand = 'howpapa' | 'nucio';

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
  // 요청자 정보
  requesterId?: string;      // 요청자 ID (user.id)
  requester?: string;        // 요청자 이름
  // 담당자 정보
  assigneeId?: string;       // 담당자 ID (user.id)
  assignee?: string;         // 담당자 이름
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
  displayOrder: number;  // 표시 순서
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

// 메타 (Facebook/Instagram) 광고 자격증명
export interface MetaAdsCredentials {
  accessToken: string;
  adAccountId: string;       // act_XXXXXXXXX 형식
  appId?: string;
  appSecret?: string;
  businessId?: string;
  tokenExpiresAt?: string;
}

// 네이버 검색광고 자격증명
export interface NaverSearchAdsCredentials {
  apiLicenseKey: string;     // API License Key
  secretKey: string;         // Secret Key
  customerId: string;        // 광고주 ID
}

// API 자격증명 (통합)
export interface ApiCredential {
  id: string;
  brandId?: string;  // Multi-brand support
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
  // 네이버웍스 알림 설정
  naverWorksEnabled: boolean;
  naverWorksDdayEnabled: boolean;
  naverWorksOverdueEnabled: boolean;
  naverWorksStatusChangeEnabled: boolean;
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

// ========== 제품 마스터 관련 타입 ==========

// 판매 채널 (확장)
export type SalesChannelType =
  | 'cafe24'
  | 'naver_smartstore'
  | 'coupang'
  | 'coupang_rocket'
  | '29cm'
  | 'ably'
  | 'amazon_jp'
  | 'amazon_us'
  | 'allways'
  | 'other';

export const salesChannelLabels: Record<SalesChannelType, string> = {
  cafe24: 'CAFE24',
  naver_smartstore: '네이버 스마트스토어',
  coupang: '쿠팡',
  coupang_rocket: '쿠팡 로켓배송',
  '29cm': '29CM',
  ably: 'ABLY',
  amazon_jp: '아마존 JP',
  amazon_us: '아마존 US',
  allways: '올웨이즈',
  other: '기타',
};

// 인증 정보 타입
export interface CertificationInfo {
  vegan: boolean;           // 비건
  ewgGrade?: string;        // EWG 등급
  dermaTest?: boolean;      // 더마테스트
  safetyChemical?: boolean; // 안전화학
}

// 임상 정보
export interface ClinicalInfo {
  id: string;
  title: string;
  description: string;
  testDate?: string;
  institution?: string;     // 시험 기관
  results?: string;         // 시험 결과
  attachmentUrl?: string;   // 첨부 파일 URL
  attachmentName?: string;  // 첨부 파일명
}

// 제품 옵션
export interface ProductOption {
  id: string;
  name: string;             // 옵션명 (예: 용량)
  value: string;            // 옵션값 (예: 50ml)
  additionalPrice?: number; // 추가 가격
  sku?: string;             // 옵션별 SKU
  barcode?: string;         // 옵션별 바코드
}

// 제품 마스터
export interface ProductMaster {
  id: string;

  // 기본 정보
  name: string;                    // 제품명
  brand: Brand;                    // 브랜드
  category: ProductCategory;       // 카테고리
  description?: string;            // 제품 설명

  // 코드 정보
  skuId?: string;                  // SKU ID
  materialCode?: string;           // 자재번호
  abbreviation?: string;           // 약호
  ampNumber?: string;              // 앰넘버
  mockupCode?: string;             // 모크리코드
  barcode?: string;                // 바코드

  // 제조 정보
  manufacturer: Manufacturer;      // 제조사
  factoryLocation?: string;        // 공장 위치

  // 가격 정보
  costPrice: number;               // 원가 (매입가)
  sellingPrice: number;            // 정상 판매가
  supplyPrice?: number;            // 공급가

  // 인증 정보
  certifications: CertificationInfo;

  // 임상 정보
  clinicalTests: ClinicalInfo[];

  // 판매 정보
  productUrl?: string;             // 제품 URL
  detailPageUrl?: string;          // 상세페이지 URL
  thumbnailUrl?: string;           // 썸네일 이미지 URL

  // 옵션 정보
  options: ProductOption[];

  // 메모
  notes?: string;

  // 상태
  isActive: boolean;

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
}

// ========== 프로모션 구성 관련 타입 ==========

// 프로모션 구성 제품
export interface PromotionProduct {
  id: string;
  productId: string;               // ProductMaster ID
  productName: string;             // 제품명 (캐시)
  quantity: number;                // 수량
  unitPrice: number;               // 개별 가격
  optionId?: string;               // 선택된 옵션 ID
  optionName?: string;             // 선택된 옵션명
}

// 프로모션 구성
export interface PromotionBundle {
  id: string;

  // 기본 정보
  name: string;                    // 구성명
  code?: string;                   // 구성 코드
  description?: string;            // 설명

  // 구성 제품
  products: PromotionProduct[];

  // 가격 정보
  originalPrice: number;           // 정상가 (합계)
  promotionPrice: number;          // 프로모션가
  discountRate?: number;           // 할인율 (%)

  // 기간
  startDate?: string;
  endDate?: string;

  // 연동
  groupPurchaseProjectId?: string; // 공동구매 프로젝트 연동

  // 상태
  isActive: boolean;

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
}

// ========== 주문/매출 데이터 타입 ==========

// 주문 상태
export type OrderStatus = 'normal' | 'cancel' | 'return' | 'exchange' | 'pending';

export const orderStatusLabels: Record<OrderStatus, string> = {
  normal: '정상',
  cancel: '취소',
  return: '반품',
  exchange: '교환',
  pending: '보류',
};

// 주문 데이터 (채널별 주문서)
export interface SalesOrder {
  id: string;

  // 주문 기본 정보
  orderDate: string;               // 주문 날짜
  orderId: string;                 // 주문서 ID (채널별)
  orderStatus: OrderStatus;        // 주문 상태

  // 채널 정보
  channel: SalesChannelType;       // 판매 채널

  // 제품 정보
  brand: Brand;                    // 브랜드
  productId?: string;              // ProductMaster ID (연동 시)
  productName: string;             // 제품명
  optionName?: string;             // 옵션명

  // 금액 정보
  salesAmount: number;             // 매출 금액
  paymentAmount: number;           // 결제 금액
  costAmount?: number;             // 원가 (ProductMaster 연동 시)
  profitAmount?: number;           // 이익

  // 수량
  quantity: number;

  // 기타
  notes?: string;

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
}

// 채널별 매출 요약
export interface ChannelSalesSummary {
  channel: SalesChannelType;
  channelLabel: string;
  totalSales: number;
  totalPayment: number;
  totalCost: number;
  totalProfit: number;
  orderCount: number;
  productCount: number;
}

// 제품별 매출 요약
export interface ProductSalesSummary {
  productId?: string;
  productName: string;
  brand: Brand;
  totalSales: number;
  totalQuantity: number;
  totalProfit: number;
  avgPrice: number;
  channels: SalesChannelType[];
}

// 기간별 매출 요약
export interface PeriodSalesSummary {
  period: string;                  // YYYY-MM-DD 또는 YYYY-MM
  periodType: 'daily' | 'weekly' | 'monthly';
  totalSales: number;
  totalPayment: number;
  totalCost: number;
  totalProfit: number;
  profitRate: number;              // 이익률 (%)
  orderCount: number;
  byChannel: ChannelSalesSummary[];
  byProduct: ProductSalesSummary[];
}

// 매출 대시보드 데이터
export interface SalesDashboardData {
  // 요약 카드
  todaySales: number;
  todayOrders: number;
  monthSales: number;
  monthProfit: number;
  monthProfitRate: number;

  // 전월 대비
  salesChangeRate: number;
  profitChangeRate: number;

  // 채널별 요약
  channelSummary: ChannelSalesSummary[];

  // 제품별 TOP 10
  topProducts: ProductSalesSummary[];

  // 일별 추이 (최근 30일)
  dailyTrend: { date: string; sales: number; profit: number }[];

  // 월별 추이 (최근 12개월)
  monthlyTrend: { month: string; sales: number; profit: number }[];
}

// ========== 프로모션 관리 관련 타입 ==========

// 프로모션 상태
export type PromotionStatus = 'scheduled' | 'active' | 'ended';

export const promotionStatusLabels: Record<PromotionStatus, string> = {
  scheduled: '예정',
  active: '진행중',
  ended: '종료',
};

// 프로모션 구성 제품
export interface PromotionPackProduct {
  id: string;
  productId: string;               // ProductMaster ID
  productName: string;             // 제품명 (캐시)
  optionId?: string;               // 선택된 옵션 ID
  optionName?: string;             // 선택된 옵션명 (예: 쿨링밤, 고보습밤)
  quantity: number;                // 수량
  unitPrice: number;               // 개별 단가
}

// 프로모션 구성 (패키지)
export interface PromotionPack {
  id: string;
  description: string;             // 구성 설명 (예: 크림 2개 + 선크림 1개)
  packSize: number;                // 구성 개수
  products: PromotionPackProduct[]; // 구성 제품 목록
  regularPrice: number;            // 정상가
  discountPrice: number;           // 상시 할인가
  promotionPrice: number;          // 최종 행사가
  discountRate?: number;           // 할인율 (%)
}

// 프로모션
export interface Promotion {
  id: string;
  name: string;                    // 프로모션명
  description?: string;            // 프로모션 설명
  startDate: string;               // 시작일
  endDate: string;                 // 종료일
  status: PromotionStatus;         // 상태
  packs: PromotionPack[];          // 구성 목록
  notes?: string;                  // 메모
  isActive: boolean;               // 활성화 여부
  createdAt: string;
  updatedAt: string;
}

// ========== 인플루언서 시딩 관련 타입 ==========

// 시딩 상태
export type SeedingStatus =
  | 'listed'          // 리스트업
  | 'contacted'       // 연락완료
  | 'accepted'        // 수락
  | 'rejected'        // 거절
  | 'shipped'         // 제품발송
  | 'guide_sent'      // 가이드발송
  | 'posted'          // 포스팅완료
  | 'completed';      // 완료 (성과입력됨)

export const seedingStatusLabels: Record<SeedingStatus, string> = {
  listed: '리스트업',
  contacted: '연락완료',
  accepted: '수락',
  rejected: '거절',
  shipped: '제품발송',
  guide_sent: '가이드발송',
  posted: '포스팅완료',
  completed: '완료',
};

export const seedingStatusColors: Record<SeedingStatus, string> = {
  listed: '#64748b',      // 슬레이트
  contacted: '#3b82f6',   // 블루
  accepted: '#22c55e',    // 그린
  rejected: '#ef4444',    // 레드
  shipped: '#f59e0b',     // 앰버
  guide_sent: '#8b5cf6',  // 퍼플
  posted: '#14b8a6',      // 틸
  completed: '#10b981',   // 에메랄드
};

// 시딩 유형
export type SeedingType = 'free' | 'paid'; // 무가 / 유가

export const seedingTypeLabels: Record<SeedingType, string> = {
  free: '무가',
  paid: '유가',
};

// 콘텐츠 유형
export type ContentType = 'story' | 'reels' | 'feed' | 'both';

export const contentTypeLabels: Record<ContentType, string> = {
  story: '스토리',
  reels: '릴스',
  feed: '피드',
  both: '스토리+릴스',
};

// 시딩 플랫폼
export type SeedingPlatform = 'instagram' | 'youtube' | 'tiktok' | 'blog';

export const seedingPlatformLabels: Record<SeedingPlatform, string> = {
  instagram: '인스타그램',
  youtube: '유튜브',
  tiktok: '틱톡',
  blog: '블로그',
};

// 시딩 프로젝트 상태
export type SeedingProjectStatus = 'planning' | 'active' | 'completed' | 'paused';

export const seedingProjectStatusLabels: Record<SeedingProjectStatus, string> = {
  planning: '기획중',
  active: '진행중',
  completed: '완료',
  paused: '일시중지',
};

// 시딩 프로젝트 (상위)
export interface SeedingProject {
  id: string;
  name: string;                    // 프로젝트명 (예: "리프팅크림 1월 시딩")
  brand: Brand;
  product_id?: string;             // 제품 마스터 연동
  product_name: string;

  // 기간
  start_date: string;
  end_date: string;

  // 목표
  target_count: number;            // 목표 시딩 수

  // 비용 정보 (제품 마스터에서 가져옴)
  cost_price: number;              // 제품 원가
  selling_price: number;           // 제품 판매가

  // 상태
  status: SeedingProjectStatus;

  // Google Sheets 연동
  listup_sheet_url?: string;       // 리스트업 시트 URL
  listup_sheet_name?: string;      // 리스트업 시트명 (기본: Sheet1)
  auto_sync_enabled?: boolean;     // 자동 동기화 활성화
  last_synced_at?: string;         // 마지막 동기화 일시

  // 메타
  description?: string;
  assignee_id?: string;
  created_at: string;
  updated_at: string;
}

// 배송 정보
export interface ShippingInfo {
  recipient_name: string;
  phone: string;
  address: string;
  postal_code?: string;
  quantity: number;
  carrier?: string;                // 택배사
  tracking_number?: string;        // 송장번호
  shipped_at?: string;
  delivered_at?: string;
}

// 성과 정보
export interface SeedingPerformance {
  views?: number;                  // 조회수
  likes?: number;                  // 좋아요
  comments?: number;               // 댓글
  saves?: number;                  // 저장
  shares?: number;                 // 공유
  story_views?: number;            // 스토리 조회수
  link_clicks?: number;            // 링크 클릭수
  screenshot_urls?: string[];      // 성과 스크린샷
  measured_at?: string;            // 측정일시
}

// 시딩 인플루언서 (하위 - 개별 인플루언서)
export interface SeedingInfluencer {
  id: string;
  project_id: string;              // 시딩 프로젝트 연결

  // 계정 정보
  account_id: string;              // @handle
  account_name?: string;           // 실명 또는 닉네임
  platform: SeedingPlatform;
  email?: string;
  phone?: string;
  follower_count: number;
  following_count?: number;        // 팔로잉 수
  category?: string;               // 뷰티, 육아, 라이프스타일 등
  profile_url?: string;
  listed_at?: string;              // 리스트업 날짜

  // 시딩 정보
  seeding_type: SeedingType;       // 무가/유가
  content_type: ContentType;       // 스토리/릴스/피드
  fee?: number;                    // 원고비 (유가인 경우)
  payment?: number;                // 인플루언서 지급비
  product_name?: string;           // 발송 제품명
  product_price?: number;          // 제품 단가
  shipping_cost?: number;          // 배송비
  status: SeedingStatus;

  // 배송 정보
  shipping: ShippingInfo;

  // 가이드 정보
  guide_id?: string;               // 연결된 제품 가이드
  guide_sent_at?: string;
  guide_link?: string;             // 발송된 가이드 링크

  // 포스팅 정보
  posting_url?: string;
  posted_at?: string;

  // 성과 정보
  performance?: SeedingPerformance;

  // 진행 일시
  contacted_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  completed_at?: string;

  // 메타
  notes?: string;
  assignee_id?: string;
  sheet_row_index?: number;        // Google Sheets 동기화용
  created_at: string;
  updated_at: string;
}

// 섭외 문구 템플릿
export interface OutreachTemplate {
  id: string;
  name: string;
  content: string;
  seeding_type: SeedingType | 'all';
  content_type: ContentType | 'all';
  brand: Brand | 'all';
  variables: string[];             // 치환 변수 목록 (예: {{이름}}, {{제품명}})
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// 제품 가이드
export interface ProductGuide {
  id: string;
  product_id?: string;
  product_name: string;
  brand: Brand;
  content_type: ContentType;       // 스토리용/릴스용 가이드 구분

  // 가이드 내용
  description: string;
  key_points: string[];            // 핵심 포인트
  hashtags: string[];              // 해시태그
  mentions: string[];              // 필수 멘션 (@howpapa_official 등)
  dos: string[];                   // 해야 할 것
  donts: string[];                 // 하지 말아야 할 것
  link_url?: string;               // 스토리용 링크

  // 첨부파일
  image_urls: string[];
  reference_urls: string[];        // 참고 콘텐츠 URL

  // 공개 링크
  public_slug: string;             // 공개 페이지 slug
  is_public: boolean;

  // 메타
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// 시딩 통계
export interface SeedingStats {
  total_seedings: number;
  by_status: Record<SeedingStatus, number>;
  by_type: Record<SeedingType, number>;
  by_content: Record<ContentType, number>;
  acceptance_rate: number;         // 수락률 (%)
  posting_rate: number;            // 포스팅률 (%)
  total_cost: number;              // 총 시딩 원가
  total_value: number;             // 총 시딩 가치 (판매가 기준)
  total_fee: number;               // 총 원고비
  total_reach: number;             // 총 도달 (조회수 합)
  total_engagement: number;        // 총 참여 (좋아요+댓글+저장+공유)
}

// 시딩 프로젝트 통계 (프로젝트 단위)
export interface SeedingProjectStats {
  project_id: string;
  total_influencers: number;
  by_status: Record<SeedingStatus, number>;
  by_type: Record<SeedingType, number>;
  by_content: Record<ContentType, number>;
  progress_rate: number;           // 진행률 (완료/전체)
  total_cost: number;              // 총 시딩 원가 (수량 * 제품원가)
  total_fee: number;               // 총 원고비
  total_reach: number;
  total_engagement: number;
}

// 시딩 마케팅비 집계 결과
export interface SeedingMarketingCost {
  productCost: number;    // 제품 원가 합계 (product_price * quantity)
  payment: number;        // 인플루언서 페이 합계
  shippingCost: number;   // 배송비 합계
  total: number;          // 전체 합계
  count: number;          // 대상 인플루언서 수
}

// ========== 매출 이상 알림 설정 ==========

export interface AlertSettings {
  id: string;
  userId: string;
  isEnabled: boolean;
  salesDropThreshold: number;       // 매출 하락 임계값 (%)
  roasTarget: number;               // ROAS 목표값 (%)
  lowStockAlert: boolean;
  notificationEmail: string | null;
  notificationNaverWorks: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== 개발 요청서 ==========

// 개발 요청 브랜드
export type DevRequestBrand = 'howpapa' | 'nucio' | 'common';

export const devRequestBrandLabels: Record<DevRequestBrand, string> = {
  howpapa: 'HOWPAPA',
  nucio: 'NUCCIO',
  common: '공통',
};

// 개발 요청 유형
export type DevRequestType = 'feature' | 'ui' | 'bug' | 'other';

export const devRequestTypeLabels: Record<DevRequestType, string> = {
  feature: '기능 추가',
  ui: 'UI 개선',
  bug: '버그 수정',
  other: '기타',
};

// 개발 요청 우선순위
export type DevRequestPriority = 'urgent' | 'high' | 'normal' | 'low';

export const devRequestPriorityLabels: Record<DevRequestPriority, string> = {
  urgent: '🔴 긴급',
  high: '🟠 높음',
  normal: '🟡 보통',
  low: '🟢 낮음',
};

export const devRequestPriorityColors: Record<DevRequestPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

// 개발 요청 상태
export type DevRequestStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold';

export const devRequestStatusLabels: Record<DevRequestStatus, string> = {
  pending: '⏳ 대기',
  in_progress: '🔄 진행중',
  completed: '✅ 완료',
  on_hold: '⏸️ 보류',
};

export const devRequestStatusColors: Record<DevRequestStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-amber-100 text-amber-700',
};

// 개발 요청서 인터페이스
export interface DevRequest {
  id: string;
  request_date: string;            // 요청일
  requester: string;               // 요청자
  brand: DevRequestBrand;          // 브랜드
  request_type: DevRequestType;    // 요청 유형
  title: string;                   // 요청 제목
  description: string;             // 상세 내용
  priority: DevRequestPriority;    // 우선순위
  due_date?: string;               // 희망 완료일
  status: DevRequestStatus;        // 처리 상태
  completed_at?: string;           // 처리 완료일
  notes?: string;                  // 비고
  created_at: string;
  updated_at: string;
}

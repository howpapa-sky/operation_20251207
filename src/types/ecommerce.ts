// 이커머스 수익성 관리 시스템 타입 정의

// =====================================================
// SKU 마스터
// =====================================================
export interface SKUMaster {
  id: string;
  skuCode: string;
  productName: string;
  brand: 'howpapa' | 'nuccio';
  category?: string;
  costPrice: number;  // 원가 (VAT 포함)
  sellingPrice: number;  // 기본 판매가
  effectiveDate: string;  // 원가 적용 시작일
  barcode?: string;
  supplier?: string;  // 공급업체
  minStock?: number;  // 최소 재고
  currentStock?: number;  // 현재 재고
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SKUCostHistory {
  id: string;
  skuId: string;
  previousCost?: number;
  newCost: number;
  changeReason?: string;
  effectiveDate: string;
  changedBy?: string;
  createdAt: string;
}

export interface ChannelOptionMapping {
  id: string;
  skuId: string;
  channel: SalesChannel;
  optionName: string;
  channelProductId?: string;
  channelOptionId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// 판매 채널
// =====================================================
export type SalesChannel = 'smartstore' | 'coupang' | 'coupang_rocket' | 'cafe24' | 'qoo10';

export interface SalesChannelSettings {
  id: string;
  channel: SalesChannel;
  channelName: string;
  feeRate: number;  // 수수료율 (%)
  shippingFee: number;
  isActive: boolean;
  apiCredentials?: Record<string, string>;
  lastSyncAt?: string;
  syncStatus: 'pending' | 'syncing' | 'success' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export const salesChannelLabels: Record<SalesChannel, string> = {
  smartstore: '스마트스토어',
  coupang: '쿠팡',
  coupang_rocket: '쿠팡 제트배송',
  cafe24: 'Cafe24',
  qoo10: '큐텐 재팬',
};

export const salesChannelFeeRates: Record<SalesChannel, number> = {
  smartstore: 5.5,
  coupang: 12.0,
  coupang_rocket: 35.0,
  cafe24: 3.0,
  qoo10: 10.0,
};

// =====================================================
// 주문 데이터
// =====================================================
export interface OrderRaw {
  id: string;
  channel: SalesChannel;
  orderId: string;
  orderDate: string;
  orderDatetime?: string;
  productName?: string;
  optionName?: string;
  skuId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  shippingFee: number;
  discountAmount: number;
  channelFee: number;
  costPrice: number;
  profit: number;
  orderStatus?: string;
  buyerName?: string;
  buyerPhone?: string;
  shippingAddress?: string;
  currency: string;
  exchangeRate: number;
  rawData?: Record<string, unknown>;
  createdAt: string;
}

// =====================================================
// 일별 통계
// =====================================================
export interface DailyChannelStats {
  id: string;
  date: string;
  channel: SalesChannel | 'all';
  brand?: 'howpapa' | 'nuccio';
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;  // 총 결제금액
  totalCost: number;  // 총 원가
  totalShipping: number;
  totalFee: number;  // 총 수수료
  totalDiscount: number;
  grossProfit: number;  // 매출총이익
  avgOrderValue: number;  // 평균 객단가
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// 광고 성과
// =====================================================
export type AdChannel = 'naver_gfa' | 'naver_sa' | 'meta' | 'coupang_ads';

export interface AdPerformance {
  id: string;
  date: string;
  channel: AdChannel;
  campaignId?: string;
  campaignName?: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;  // 클릭률 (%)
  cpc: number;  // 클릭당 비용
  roas: number;  // 광고수익률 (%)
  rawData?: Record<string, unknown>;
  createdAt: string;
}

export interface DailyAdStats {
  id: string;
  date: string;
  channel?: AdChannel;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  totalConversionValue: number;
  avgCtr: number;
  avgCpc: number;
  overallRoas: number;
  createdAt: string;
}

export const adChannelLabels: Record<AdChannel, string> = {
  naver_gfa: '네이버 GFA',
  naver_sa: '네이버 검색광고',
  meta: '메타 (FB/IG)',
  coupang_ads: '쿠팡 광고',
};

// =====================================================
// 공동구매
// =====================================================
export type GroupPurchaseStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface GroupPurchaseRound {
  id: string;
  roundNumber: number;
  title: string;
  brand: 'howpapa' | 'nuccio';
  influencerName?: string;
  influencerHandle?: string;
  platform?: string;
  startDate: string;
  endDate: string;
  status: GroupPurchaseStatus;
  totalRevenue: number;
  totalOrders: number;
  totalCost: number;
  contributionProfit: number;
  notes?: string;
  seedingProjectId?: string;  // 시딩 프로젝트 연동
  createdAt: string;
  updatedAt: string;
  // Relations
  sets?: GroupPurchaseSet[];
  events?: GroupPurchaseEvent[];
}

export interface GroupPurchaseSet {
  id: string;
  roundId: string;
  setName: string;
  setDescription?: string;
  regularPrice: number;
  salePrice: number;
  discountRate?: number;
  totalCost: number;
  marginRate: number;
  stockQuantity: number;
  soldQuantity: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  // Relations
  items?: GroupPurchaseSetItem[];
}

export interface GroupPurchaseSetItem {
  id: string;
  setId: string;
  skuId: string;
  quantity: number;
  createdAt: string;
  // Joined
  sku?: SKUMaster;
}

export interface GroupPurchaseEvent {
  id: string;
  roundId: string;
  eventType: 'gift' | 'discount' | 'payment_benefit' | 'shipping' | 'other';
  title: string;
  description?: string;
  conditionText?: string;
  isActive: boolean;
  createdAt: string;
}

export const groupPurchaseStatusLabels: Record<GroupPurchaseStatus, string> = {
  planned: '예정',
  active: '진행중',
  completed: '완료',
  cancelled: '취소',
};

export const groupPurchaseEventTypeLabels: Record<string, string> = {
  gift: '사은품',
  discount: '추가 할인',
  payment_benefit: '결제 혜택',
  shipping: '배송 혜택',
  other: '기타',
};

// =====================================================
// 리포트/알림
// =====================================================
export interface DailyReportSettings {
  id: string;
  reportType: 'kakao_alimtalk' | 'naver_works' | 'email';
  isActive: boolean;
  sendTime: string;
  recipients?: Array<{
    name: string;
    phone?: string;
    email?: string;
  }>;
  templateId?: string;
  channelId?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// 대시보드 통계 타입
// =====================================================
export interface SalesDashboardStats {
  // KPI 요약
  totalRevenue: number;
  totalOrders: number;
  totalAdCost: number;
  totalConversionValue: number;
  roas: number;
  contributionProfit: number;
  profitRate: number;

  // 전일/전주/전월 대비
  revenueChange: number;
  ordersChange: number;
  profitChange: number;

  // 채널별 통계
  byChannel: DailyChannelStats[];

  // 광고 통계
  adStats: DailyAdStats;
}

// =====================================================
// 공헌이익 계산 (씨그로 방식)
// =====================================================
export function calculateContributionProfit(params: {
  revenue: number;  // 결제금액
  cost: number;  // 원가
  shippingFee: number;  // 배송비
  channelFee: number;  // 수수료
  adCost: number;  // 광고비
  discount?: number;  // 할인
  vat?: number;  // VAT (보통 매출의 10%)
}): number {
  const { revenue, cost, shippingFee, channelFee, adCost, discount = 0, vat = 0 } = params;
  return revenue - cost - shippingFee - channelFee - adCost - discount - vat;
}

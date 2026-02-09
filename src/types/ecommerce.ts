// 이커머스 수익성 관리 시스템 타입 정의

// =====================================================
// 브랜드 (Multi-brand Support)
// =====================================================
export type BrandCode = 'howpapa' | 'nucio';

export interface Brand {
  id: string;
  code: BrandCode;
  name: string;                    // 한글명: '하우파파', '누씨오'
  displayName?: string;            // 표시명
  primaryColor?: string;           // 브랜드 컬러
  logoUrl?: string;
  isActive: boolean;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const brandLabels: Record<BrandCode, string> = {
  howpapa: '하우파파',
  nucio: '누씨오',
};

export const brandColors: Record<BrandCode, string> = {
  howpapa: '#f97316',  // orange-500
  nucio: '#22c55e',    // green-500
};

// =====================================================
// 광고 계정 (Ad Accounts)
// =====================================================
export type AdPlatform = 'naver_sa' | 'naver_gfa' | 'meta' | 'coupang_ads';

export interface AdAccount {
  id: string;
  brandId: string;
  platform: AdPlatform;
  accountName?: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncStatus: 'never' | 'syncing' | 'success' | 'failed';
  syncError?: string;

  // 네이버 검색광고
  naverCustomerId?: string;
  naverApiKey?: string;
  naverSecretKey?: string;

  // 네이버 GFA
  naverGfaCustomerId?: string;
  naverGfaApiKey?: string;
  naverGfaSecretKey?: string;

  // 메타 (Facebook/Instagram)
  metaAppId?: string;
  metaAppSecret?: string;
  metaAccessToken?: string;
  metaTokenExpiresAt?: string;
  metaAdAccountId?: string;
  metaBusinessId?: string;

  // 쿠팡 광고
  coupangAdsVendorId?: string;
  coupangAdsAccessKey?: string;
  coupangAdsSecretKey?: string;

  createdAt: string;
  updatedAt: string;
}

export const adPlatformLabels: Record<AdPlatform, string> = {
  naver_sa: '네이버 검색광고',
  naver_gfa: '네이버 GFA',
  meta: '메타 (FB/IG)',
  coupang_ads: '쿠팡 광고',
};

// =====================================================
// 일별 광고비 (Ad Spend Daily)
// =====================================================
export interface AdSpendDaily {
  id: string;
  brandId: string;
  date: string;
  platform: AdPlatform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  roas: number;
  syncedAt?: string;
  rawData?: Record<string, unknown>;
  createdAt: string;
}

// =====================================================
// 브랜드별 이익 요약 (Brand Profit Summary)
// =====================================================
export interface BrandProfitSummary {
  brandId: string;
  brandCode: BrandCode;
  dateRange: { start: string; end: string };

  // 매출
  totalRevenue: number;
  orderCount: number;

  // 비용
  costOfGoods: number;
  channelFees: number;
  shippingFees: number;
  adSpend: number;
  variableCosts: number;
  fixedCosts: number;

  // 이익
  grossProfit: number;           // 매출총이익
  grossProfitRate: number;       // 매출총이익률 (%)
  contributionProfit: number;    // 공헌이익
  contributionProfitRate: number; // 공헌이익률 (%)
  operatingProfit: number;       // 영업이익
  operatingProfitRate: number;   // 영업이익률 (%)
  netProfit: number;             // 순이익
  netProfitRate: number;         // 순이익률 (%)

  // 광고 지표
  roas: number;                  // 광고수익률 (%)
  cpa: number;                   // 전환당 비용
}

// =====================================================
// SKU 마스터
// =====================================================
export interface SKUMaster {
  id: string;
  skuCode: string;
  productName: string;
  brand: 'howpapa' | 'nucio';
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
  brand?: 'howpapa' | 'nucio';
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
export type AdChannel = AdPlatform;  // Alias for backward compatibility

export interface AdPerformance {
  id: string;
  brandId?: string;                // Multi-brand support
  adAccountId?: string;            // Ad account reference
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
  brandId?: string;                // Multi-brand support
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
  brand: 'howpapa' | 'nucio';
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
// 3단계 이익 분석 (씨그로 방식)
// =====================================================

/** 3단계 이익 분석 결과 */
export interface ProfitBreakdown {
  // 매출총이익 (Gross Profit)
  revenue: number;           // 결제금액
  costOfGoods: number;       // 매출원가 (원가)
  vat: number;               // 부가세
  grossProfit: number;       // 매출총이익 = 결제금액 - 매출원가 - VAT
  grossProfitRate: number;   // 매출총이익률 (%)

  // 공헌이익 (Contribution Margin)
  shippingFee: number;       // 배송비
  channelFee: number;        // 채널 수수료
  adCost: number;            // 광고비
  variableCost: number;      // 변동판관비 합계
  contributionProfit: number;  // 공헌이익 = 매출총이익 - 배송비 - 수수료 - 광고비 - 변동판관비
  contributionProfitRate: number;  // 공헌이익률 (%)

  // 순이익 (Net Profit)
  fixedCost: number;         // 고정판관비 합계
  fixedCostVat: number;      // 고정비 VAT
  netProfit: number;         // 순이익 = 공헌이익 - 고정판관비 - 고정비VAT
  netProfitRate: number;     // 순이익률 (%)
}

/** 이익 설정 (localStorage 저장) */
export interface ProfitSettings {
  // VAT 설정
  vatEnabled: boolean;
  vatRate: number;  // 기본 10%

  // 변동판관비 항목
  variableCosts: VariableCostItem[];

  // 고정판관비 항목
  fixedCosts: FixedCostItem[];

  // 고정비 VAT 적용 여부
  fixedCostVatEnabled: boolean;
}

export interface VariableCostItem {
  id: string;
  name: string;
  type: 'rate' | 'fixed_per_order';  // 매출 비율 or 건당 고정금액
  value: number;  // rate이면 %, fixed_per_order이면 원
  isActive: boolean;
}

export interface FixedCostItem {
  id: string;
  name: string;
  monthlyAmount: number;  // 월 고정금액
  isActive: boolean;
}

/** 채널별 요약 + 이전 기간 비교 */
export interface ChannelSummaryWithComparison {
  channel: SalesChannel;
  channelName: string;

  // 현재 기간
  current: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    channelFee: number;
    grossProfit: number;
    grossProfitRate: number;
  };

  // 이전 기간
  previous: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    channelFee: number;
    grossProfit: number;
    grossProfitRate: number;
  };

  // 변화율 (%)
  changes: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    channelFee: number;
    grossProfit: number;
  };
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

/** 3단계 이익 계산 */
export function calculateProfitBreakdown(params: {
  revenue: number;
  costOfGoods: number;
  shippingFee: number;
  channelFee: number;
  adCost: number;
  settings: ProfitSettings;
  orderCount: number;
  periodDays: number;
}): ProfitBreakdown {
  const { revenue, costOfGoods, shippingFee, channelFee, adCost, settings, orderCount, periodDays } = params;

  // 1. 매출총이익
  const vat = settings.vatEnabled ? revenue * (settings.vatRate / 100) / (1 + settings.vatRate / 100) : 0;
  const grossProfit = revenue - costOfGoods - vat;
  const grossProfitRate = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // 2. 공헌이익
  const variableCost = settings.variableCosts
    .filter(v => v.isActive)
    .reduce((sum, v) => {
      if (v.type === 'rate') return sum + revenue * (v.value / 100);
      return sum + v.value * orderCount;
    }, 0);

  const contributionProfit = grossProfit - shippingFee - channelFee - adCost - variableCost;
  const contributionProfitRate = revenue > 0 ? (contributionProfit / revenue) * 100 : 0;

  // 3. 순이익
  const dailyFixedCost = settings.fixedCosts
    .filter(f => f.isActive)
    .reduce((sum, f) => sum + f.monthlyAmount / 30, 0);
  const fixedCost = dailyFixedCost * periodDays;
  const fixedCostVat = settings.fixedCostVatEnabled ? fixedCost * (settings.vatRate / 100) / (1 + settings.vatRate / 100) : 0;

  const netProfit = contributionProfit - fixedCost - fixedCostVat;
  const netProfitRate = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue,
    costOfGoods,
    vat,
    grossProfit,
    grossProfitRate,
    shippingFee,
    channelFee,
    adCost,
    variableCost,
    contributionProfit,
    contributionProfitRate,
    fixedCost,
    fixedCostVat,
    netProfit,
    netProfitRate,
  };
}

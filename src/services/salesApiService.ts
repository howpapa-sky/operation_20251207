/**
 * 판매 채널 API 서비스
 *
 * 주의: 실제 API 호출은 보안상의 이유로 서버 사이드(Edge Functions)에서 처리해야 합니다.
 * 이 파일은 API 연동의 구조와 인터페이스를 정의합니다.
 *
 * 각 채널별 API 문서:
 * - 카페24: https://developers.cafe24.com/
 * - 네이버 스마트스토어: https://apicenter.commerce.naver.com/
 * - 쿠팡: https://developers.coupangcorp.com/
 */

import { SalesChannel, SalesRecord } from '../types';

// API 주문 데이터 (각 채널에서 가져온 원본 데이터를 변환)
export interface ApiOrderData {
  orderId: string;
  orderDate: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  totalCount?: number;
}

// 주문 조회 파라미터
export interface FetchOrdersParams {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  page?: number;
  limit?: number;
}

/**
 * 판매 채널 API 서비스 인터페이스
 */
export interface SalesApiService {
  channel: SalesChannel;

  // 연결 테스트
  testConnection(): Promise<ApiResponse<boolean>>;

  // 주문 목록 조회
  fetchOrders(params: FetchOrdersParams): Promise<ApiResponse<ApiOrderData[]>>;

  // API 주문을 SalesRecord 형식으로 변환
  convertToSalesRecord(order: ApiOrderData, costPrice: number): Omit<SalesRecord, 'id' | 'createdAt'>;
}

/**
 * 카페24 API 서비스
 *
 * API 문서: https://developers.cafe24.com/docs/ko/api/admin/
 * 필요 권한: mall.read_order, mall.read_product
 */
export const cafe24Service: SalesApiService = {
  channel: 'cafe24',

  async testConnection(): Promise<ApiResponse<boolean>> {
    // TODO: Edge Function을 통해 실제 API 호출
    // POST /api/cafe24/test-connection
    console.log('[Cafe24] Test connection - requires Edge Function implementation');
    return {
      success: false,
      error: 'Edge Function 구현 필요',
    };
  },

  async fetchOrders(params: FetchOrdersParams): Promise<ApiResponse<ApiOrderData[]>> {
    // TODO: Edge Function을 통해 실제 API 호출
    // GET /api/cafe24/orders?start_date=...&end_date=...
    console.log('[Cafe24] Fetch orders:', params);
    return {
      success: false,
      error: 'Edge Function 구현 필요',
      data: [],
    };
  },

  convertToSalesRecord(order: ApiOrderData, costPrice: number) {
    const totalRevenue = order.totalAmount;
    const totalCost = order.quantity * costPrice;
    return {
      date: order.orderDate.split('T')[0],
      channel: 'cafe24' as SalesChannel,
      productId: '',
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      costPrice,
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      notes: `주문번호: ${order.orderId}`,
    };
  },
};

/**
 * 네이버 스마트스토어 API 서비스
 *
 * API 문서: https://apicenter.commerce.naver.com/ko/basic/commerce-api
 * 필요 권한: 주문 조회
 */
export const naverService: SalesApiService = {
  channel: 'naver_smartstore',

  async testConnection(): Promise<ApiResponse<boolean>> {
    // TODO: Edge Function을 통해 실제 API 호출
    console.log('[Naver] Test connection - requires Edge Function implementation');
    return {
      success: false,
      error: 'Edge Function 구현 필요',
    };
  },

  async fetchOrders(params: FetchOrdersParams): Promise<ApiResponse<ApiOrderData[]>> {
    // TODO: Edge Function을 통해 실제 API 호출
    // GET /api/naver/orders?start_date=...&end_date=...
    console.log('[Naver] Fetch orders:', params);
    return {
      success: false,
      error: 'Edge Function 구현 필요',
      data: [],
    };
  },

  convertToSalesRecord(order: ApiOrderData, costPrice: number) {
    const totalRevenue = order.totalAmount;
    const totalCost = order.quantity * costPrice;
    return {
      date: order.orderDate.split('T')[0],
      channel: 'naver_smartstore' as SalesChannel,
      productId: '',
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      costPrice,
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      notes: `주문번호: ${order.orderId}`,
    };
  },
};

/**
 * 쿠팡 API 서비스
 *
 * API 문서: https://developers.coupangcorp.com/hc/ko
 * HMAC 서명 필요
 */
export const coupangService: SalesApiService = {
  channel: 'coupang',

  async testConnection(): Promise<ApiResponse<boolean>> {
    // TODO: Edge Function을 통해 실제 API 호출
    console.log('[Coupang] Test connection - requires Edge Function implementation');
    return {
      success: false,
      error: 'Edge Function 구현 필요',
    };
  },

  async fetchOrders(params: FetchOrdersParams): Promise<ApiResponse<ApiOrderData[]>> {
    // TODO: Edge Function을 통해 실제 API 호출
    // GET /api/coupang/orders?start_date=...&end_date=...
    console.log('[Coupang] Fetch orders:', params);
    return {
      success: false,
      error: 'Edge Function 구현 필요',
      data: [],
    };
  },

  convertToSalesRecord(order: ApiOrderData, costPrice: number) {
    const totalRevenue = order.totalAmount;
    const totalCost = order.quantity * costPrice;
    return {
      date: order.orderDate.split('T')[0],
      channel: 'coupang' as SalesChannel,
      productId: '',
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      costPrice,
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      notes: `주문번호: ${order.orderId}`,
    };
  },
};

/**
 * 채널별 서비스 가져오기
 */
export function getApiService(channel: SalesChannel): SalesApiService | null {
  switch (channel) {
    case 'cafe24':
      return cafe24Service;
    case 'naver_smartstore':
      return naverService;
    case 'coupang':
      return coupangService;
    default:
      return null;
  }
}

/**
 * 채널 정보
 */
export const channelInfo: Record<SalesChannel, {
  name: string;
  description: string;
  docUrl: string;
  requiredFields: string[];
}> = {
  cafe24: {
    name: '카페24',
    description: '카페24 쇼핑몰 API 연동',
    docUrl: 'https://developers.cafe24.com/',
    requiredFields: ['mallId', 'clientId', 'clientSecret'],
  },
  naver_smartstore: {
    name: '네이버 스마트스토어',
    description: '네이버 커머스 API 연동',
    docUrl: 'https://apicenter.commerce.naver.com/',
    requiredFields: ['clientId', 'clientSecret'],
  },
  coupang: {
    name: '쿠팡',
    description: '쿠팡 오픈API 연동',
    docUrl: 'https://developers.coupangcorp.com/',
    requiredFields: ['vendorId', 'accessKey', 'secretKey'],
  },
  other: {
    name: '기타',
    description: '수동 입력',
    docUrl: '',
    requiredFields: [],
  },
};

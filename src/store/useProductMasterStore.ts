import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ProductMaster,
  PromotionBundle,
  SalesOrder,
  Brand,
  ProductCategory,
  SalesChannelType,
  ChannelSalesSummary,
  ProductSalesSummary,
  PeriodSalesSummary,
  SalesDashboardData,
  CertificationInfo,
  ClinicalInfo,
  ProductOption,
  PromotionProduct,
  OrderStatus,
  salesChannelLabels,
} from '../types';

interface ProductMasterState {
  // 제품 마스터
  products: ProductMaster[];

  // 프로모션 구성
  promotions: PromotionBundle[];

  // 주문/매출 데이터
  salesOrders: SalesOrder[];

  // 로딩 상태
  isLoading: boolean;

  // 제품 마스터 CRUD
  addProduct: (product: Omit<ProductMaster, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<ProductMaster>) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => ProductMaster | undefined;
  getProductsByBrand: (brand: Brand) => ProductMaster[];
  getProductsByCategory: (category: ProductCategory) => ProductMaster[];

  // 임상 정보 관리
  addClinicalTest: (productId: string, clinicalInfo: Omit<ClinicalInfo, 'id'>) => void;
  updateClinicalTest: (productId: string, clinicalId: string, updates: Partial<ClinicalInfo>) => void;
  deleteClinicalTest: (productId: string, clinicalId: string) => void;

  // 옵션 관리
  addOption: (productId: string, option: Omit<ProductOption, 'id'>) => void;
  updateOption: (productId: string, optionId: string, updates: Partial<ProductOption>) => void;
  deleteOption: (productId: string, optionId: string) => void;

  // 프로모션 구성 CRUD
  addPromotion: (promotion: Omit<PromotionBundle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePromotion: (id: string, updates: Partial<PromotionBundle>) => void;
  deletePromotion: (id: string) => void;
  getPromotionById: (id: string) => PromotionBundle | undefined;

  // 주문/매출 CRUD
  addSalesOrder: (order: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addSalesOrders: (orders: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  updateSalesOrder: (id: string, updates: Partial<SalesOrder>) => void;
  deleteSalesOrder: (id: string) => void;

  // 매출 통계
  getSalesByChannel: (startDate: string, endDate: string) => ChannelSalesSummary[];
  getSalesByProduct: (startDate: string, endDate: string) => ProductSalesSummary[];
  getSalesByPeriod: (startDate: string, endDate: string, periodType: 'daily' | 'monthly') => PeriodSalesSummary[];
  getDashboardData: () => SalesDashboardData;

  // 연동 헬퍼
  linkProductToOrder: (orderId: string, productId: string) => void;
  calculateProfitForOrder: (orderId: string) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useProductMasterStore = create<ProductMasterState>()(
  persist(
    (set, get) => ({
      products: [],
      promotions: [],
      salesOrders: [],
      isLoading: false,

      // ========== 제품 마스터 CRUD ==========

      addProduct: (product) => {
        const newProduct: ProductMaster = {
          ...product,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          products: [...state.products, newProduct],
        }));
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },

      getProductById: (id) => {
        return get().products.find((p) => p.id === id);
      },

      getProductsByBrand: (brand) => {
        return get().products.filter((p) => p.brand === brand && p.isActive);
      },

      getProductsByCategory: (category) => {
        return get().products.filter((p) => p.category === category && p.isActive);
      },

      // ========== 임상 정보 관리 ==========

      addClinicalTest: (productId, clinicalInfo) => {
        const newClinical: ClinicalInfo = {
          ...clinicalInfo,
          id: generateId(),
        };
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  clinicalTests: [...p.clinicalTests, newClinical],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateClinicalTest: (productId, clinicalId, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  clinicalTests: p.clinicalTests.map((c) =>
                    c.id === clinicalId ? { ...c, ...updates } : c
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      deleteClinicalTest: (productId, clinicalId) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  clinicalTests: p.clinicalTests.filter((c) => c.id !== clinicalId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      // ========== 옵션 관리 ==========

      addOption: (productId, option) => {
        const newOption: ProductOption = {
          ...option,
          id: generateId(),
        };
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  options: [...p.options, newOption],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateOption: (productId, optionId, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  options: p.options.map((o) =>
                    o.id === optionId ? { ...o, ...updates } : o
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      deleteOption: (productId, optionId) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  options: p.options.filter((o) => o.id !== optionId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      // ========== 프로모션 구성 CRUD ==========

      addPromotion: (promotion) => {
        const newPromotion: PromotionBundle = {
          ...promotion,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          promotions: [...state.promotions, newPromotion],
        }));
      },

      updatePromotion: (id, updates) => {
        set((state) => ({
          promotions: state.promotions.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      deletePromotion: (id) => {
        set((state) => ({
          promotions: state.promotions.filter((p) => p.id !== id),
        }));
      },

      getPromotionById: (id) => {
        return get().promotions.find((p) => p.id === id);
      },

      // ========== 주문/매출 CRUD ==========

      addSalesOrder: (order) => {
        const newOrder: SalesOrder = {
          ...order,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          salesOrders: [...state.salesOrders, newOrder],
        }));
      },

      addSalesOrders: (orders) => {
        const newOrders: SalesOrder[] = orders.map((order) => ({
          ...order,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        set((state) => ({
          salesOrders: [...state.salesOrders, ...newOrders],
        }));
      },

      updateSalesOrder: (id, updates) => {
        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === id
              ? { ...o, ...updates, updatedAt: new Date().toISOString() }
              : o
          ),
        }));
      },

      deleteSalesOrder: (id) => {
        set((state) => ({
          salesOrders: state.salesOrders.filter((o) => o.id !== id),
        }));
      },

      // ========== 매출 통계 ==========

      getSalesByChannel: (startDate, endDate) => {
        const orders = get().salesOrders.filter(
          (o) => o.orderDate >= startDate && o.orderDate <= endDate && o.orderStatus === 'normal'
        );

        const channelMap = new Map<SalesChannelType, ChannelSalesSummary>();

        orders.forEach((order) => {
          const existing = channelMap.get(order.channel);
          if (existing) {
            existing.totalSales += order.salesAmount;
            existing.totalPayment += order.paymentAmount;
            existing.totalCost += order.costAmount || 0;
            existing.totalProfit += order.profitAmount || 0;
            existing.orderCount += 1;
          } else {
            channelMap.set(order.channel, {
              channel: order.channel,
              channelLabel: salesChannelLabels[order.channel],
              totalSales: order.salesAmount,
              totalPayment: order.paymentAmount,
              totalCost: order.costAmount || 0,
              totalProfit: order.profitAmount || 0,
              orderCount: 1,
              productCount: 0,
            });
          }
        });

        return Array.from(channelMap.values());
      },

      getSalesByProduct: (startDate, endDate) => {
        const orders = get().salesOrders.filter(
          (o) => o.orderDate >= startDate && o.orderDate <= endDate && o.orderStatus === 'normal'
        );

        const productMap = new Map<string, ProductSalesSummary>();

        orders.forEach((order) => {
          const key = order.productName;
          const existing = productMap.get(key);
          if (existing) {
            existing.totalSales += order.salesAmount;
            existing.totalQuantity += order.quantity;
            existing.totalProfit += order.profitAmount || 0;
            if (!existing.channels.includes(order.channel)) {
              existing.channels.push(order.channel);
            }
          } else {
            productMap.set(key, {
              productId: order.productId,
              productName: order.productName,
              brand: order.brand,
              totalSales: order.salesAmount,
              totalQuantity: order.quantity,
              totalProfit: order.profitAmount || 0,
              avgPrice: order.salesAmount / order.quantity,
              channels: [order.channel],
            });
          }
        });

        // 평균 가격 재계산
        productMap.forEach((summary) => {
          summary.avgPrice = summary.totalSales / summary.totalQuantity;
        });

        return Array.from(productMap.values()).sort((a, b) => b.totalSales - a.totalSales);
      },

      getSalesByPeriod: (startDate, endDate, periodType) => {
        const orders = get().salesOrders.filter(
          (o) => o.orderDate >= startDate && o.orderDate <= endDate && o.orderStatus === 'normal'
        );

        const periodMap = new Map<string, PeriodSalesSummary>();

        orders.forEach((order) => {
          const period = periodType === 'daily'
            ? order.orderDate
            : order.orderDate.substring(0, 7);

          const existing = periodMap.get(period);
          if (existing) {
            existing.totalSales += order.salesAmount;
            existing.totalPayment += order.paymentAmount;
            existing.totalCost += order.costAmount || 0;
            existing.totalProfit += order.profitAmount || 0;
            existing.orderCount += 1;
          } else {
            periodMap.set(period, {
              period,
              periodType,
              totalSales: order.salesAmount,
              totalPayment: order.paymentAmount,
              totalCost: order.costAmount || 0,
              totalProfit: order.profitAmount || 0,
              profitRate: 0,
              orderCount: 1,
              byChannel: [],
              byProduct: [],
            });
          }
        });

        // 이익률 계산
        periodMap.forEach((summary) => {
          summary.profitRate = summary.totalSales > 0
            ? (summary.totalProfit / summary.totalSales) * 100
            : 0;
        });

        return Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));
      },

      getDashboardData: () => {
        const orders = get().salesOrders;
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = today.substring(0, 7);
        const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);

        // 오늘 매출
        const todayOrders = orders.filter((o) => o.orderDate === today && o.orderStatus === 'normal');
        const todaySales = todayOrders.reduce((sum, o) => sum + o.salesAmount, 0);

        // 이번 달 매출
        const monthOrders = orders.filter((o) => o.orderDate.startsWith(currentMonth) && o.orderStatus === 'normal');
        const monthSales = monthOrders.reduce((sum, o) => sum + o.salesAmount, 0);
        const monthProfit = monthOrders.reduce((sum, o) => sum + (o.profitAmount || 0), 0);

        // 지난 달 매출
        const lastMonthOrders = orders.filter((o) => o.orderDate.startsWith(lastMonth) && o.orderStatus === 'normal');
        const lastMonthSales = lastMonthOrders.reduce((sum, o) => sum + o.salesAmount, 0);
        const lastMonthProfit = lastMonthOrders.reduce((sum, o) => sum + (o.profitAmount || 0), 0);

        // 변화율 계산
        const salesChangeRate = lastMonthSales > 0
          ? ((monthSales - lastMonthSales) / lastMonthSales) * 100
          : 0;
        const profitChangeRate = lastMonthProfit > 0
          ? ((monthProfit - lastMonthProfit) / lastMonthProfit) * 100
          : 0;

        // 최근 30일 일별 추이
        const last30Days: { date: string; sales: number; profit: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayOrders = orders.filter((o) => o.orderDate === dateStr && o.orderStatus === 'normal');
          last30Days.push({
            date: dateStr,
            sales: dayOrders.reduce((sum, o) => sum + o.salesAmount, 0),
            profit: dayOrders.reduce((sum, o) => sum + (o.profitAmount || 0), 0),
          });
        }

        // 최근 12개월 월별 추이
        const last12Months: { month: string; sales: number; profit: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStr = date.toISOString().substring(0, 7);
          const monthOrders = orders.filter((o) => o.orderDate.startsWith(monthStr) && o.orderStatus === 'normal');
          last12Months.push({
            month: monthStr,
            sales: monthOrders.reduce((sum, o) => sum + o.salesAmount, 0),
            profit: monthOrders.reduce((sum, o) => sum + (o.profitAmount || 0), 0),
          });
        }

        return {
          todaySales,
          todayOrders: todayOrders.length,
          monthSales,
          monthProfit,
          monthProfitRate: monthSales > 0 ? (monthProfit / monthSales) * 100 : 0,
          salesChangeRate,
          profitChangeRate,
          channelSummary: get().getSalesByChannel(
            new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
            today
          ),
          topProducts: get().getSalesByProduct(
            new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
            today
          ).slice(0, 10),
          dailyTrend: last30Days,
          monthlyTrend: last12Months,
        };
      },

      // ========== 연동 헬퍼 ==========

      linkProductToOrder: (orderId, productId) => {
        const product = get().getProductById(productId);
        if (!product) return;

        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  productId,
                  costAmount: product.costPrice * o.quantity,
                  profitAmount: o.salesAmount - (product.costPrice * o.quantity),
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
        }));
      },

      calculateProfitForOrder: (orderId) => {
        const order = get().salesOrders.find((o) => o.id === orderId);
        if (!order || !order.productId) return;

        const product = get().getProductById(order.productId);
        if (!product) return;

        const costAmount = product.costPrice * order.quantity;
        const profitAmount = order.salesAmount - costAmount;

        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? { ...o, costAmount, profitAmount, updatedAt: new Date().toISOString() }
              : o
          ),
        }));
      },
    }),
    {
      name: 'product-master-storage',
    }
  )
);

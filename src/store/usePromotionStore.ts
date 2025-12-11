import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Promotion,
  PromotionStatus,
  PromotionPack,
} from '../types';

interface PromotionState {
  promotions: Promotion[];

  // CRUD Operations
  addPromotion: (promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePromotion: (id: string, updates: Partial<Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deletePromotion: (id: string) => void;
  getPromotionById: (id: string) => Promotion | undefined;

  // Pack Operations
  addPack: (promotionId: string, pack: Omit<PromotionPack, 'id'>) => void;
  updatePack: (promotionId: string, packId: string, updates: Partial<Omit<PromotionPack, 'id'>>) => void;
  deletePack: (promotionId: string, packId: string) => void;

  // Filtering
  getPromotionsByStatus: (status: PromotionStatus) => Promotion[];
  getActivePromotions: () => Promotion[];

  // Status Management
  updatePromotionStatuses: () => void;
}

const generateId = () => `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const usePromotionStore = create<PromotionState>()(
  persist(
    (set, get) => ({
      promotions: [],

      // 프로모션 추가
      addPromotion: (promotionData) => {
        const now = new Date().toISOString();
        const newPromotion: Promotion = {
          ...promotionData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          promotions: [...state.promotions, newPromotion],
        }));
      },

      // 프로모션 수정
      updatePromotion: (id, updates) => {
        set((state) => ({
          promotions: state.promotions.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      // 프로모션 삭제
      deletePromotion: (id) => {
        set((state) => ({
          promotions: state.promotions.filter((p) => p.id !== id),
        }));
      },

      // ID로 프로모션 조회
      getPromotionById: (id) => {
        return get().promotions.find((p) => p.id === id);
      },

      // 구성 추가
      addPack: (promotionId, packData) => {
        const newPack: PromotionPack = {
          ...packData,
          id: `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        set((state) => ({
          promotions: state.promotions.map((p) =>
            p.id === promotionId
              ? {
                  ...p,
                  packs: [...p.packs, newPack],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      // 구성 수정
      updatePack: (promotionId, packId, updates) => {
        set((state) => ({
          promotions: state.promotions.map((p) =>
            p.id === promotionId
              ? {
                  ...p,
                  packs: p.packs.map((pack) =>
                    pack.id === packId ? { ...pack, ...updates } : pack
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      // 구성 삭제
      deletePack: (promotionId, packId) => {
        set((state) => ({
          promotions: state.promotions.map((p) =>
            p.id === promotionId
              ? {
                  ...p,
                  packs: p.packs.filter((pack) => pack.id !== packId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      // 상태별 프로모션 조회
      getPromotionsByStatus: (status) => {
        return get().promotions.filter((p) => p.status === status);
      },

      // 활성 프로모션 조회
      getActivePromotions: () => {
        return get().promotions.filter((p) => p.status === 'active' && p.isActive);
      },

      // 프로모션 상태 자동 업데이트
      updatePromotionStatuses: () => {
        const today = new Date().toISOString().split('T')[0];

        set((state) => ({
          promotions: state.promotions.map((p) => {
            let newStatus: PromotionStatus = p.status;

            if (p.startDate > today) {
              newStatus = 'scheduled';
            } else if (p.endDate < today) {
              newStatus = 'ended';
            } else {
              newStatus = 'active';
            }

            if (newStatus !== p.status) {
              return { ...p, status: newStatus, updatedAt: new Date().toISOString() };
            }
            return p;
          }),
        }));
      },
    }),
    {
      name: 'promotion-storage',
      version: 1,
    }
  )
);

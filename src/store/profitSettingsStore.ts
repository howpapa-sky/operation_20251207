import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProfitSettings, VariableCostItem, FixedCostItem } from '../types/ecommerce';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_SETTINGS: ProfitSettings = {
  vatEnabled: true,
  vatRate: 10,
  variableCosts: [],
  fixedCosts: [],
  fixedCostVatEnabled: false,
};

interface ProfitSettingsState {
  settings: ProfitSettings;

  // VAT
  setVatEnabled: (enabled: boolean) => void;
  setVatRate: (rate: number) => void;

  // 변동판관비
  addVariableCost: (item: Omit<VariableCostItem, 'id'>) => void;
  updateVariableCost: (id: string, updates: Partial<VariableCostItem>) => void;
  removeVariableCost: (id: string) => void;

  // 고정판관비
  addFixedCost: (item: Omit<FixedCostItem, 'id'>) => void;
  updateFixedCost: (id: string, updates: Partial<FixedCostItem>) => void;
  removeFixedCost: (id: string) => void;

  // 고정비 VAT
  setFixedCostVatEnabled: (enabled: boolean) => void;

  // 전체 리셋
  resetToDefaults: () => void;
}

export const useProfitSettingsStore = create<ProfitSettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      setVatEnabled: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, vatEnabled: enabled },
        })),

      setVatRate: (rate) =>
        set((state) => ({
          settings: { ...state.settings, vatRate: rate },
        })),

      addVariableCost: (item) =>
        set((state) => ({
          settings: {
            ...state.settings,
            variableCosts: [
              ...state.settings.variableCosts,
              { ...item, id: generateId() },
            ],
          },
        })),

      updateVariableCost: (id, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            variableCosts: state.settings.variableCosts.map((v) =>
              v.id === id ? { ...v, ...updates } : v
            ),
          },
        })),

      removeVariableCost: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            variableCosts: state.settings.variableCosts.filter((v) => v.id !== id),
          },
        })),

      addFixedCost: (item) =>
        set((state) => ({
          settings: {
            ...state.settings,
            fixedCosts: [
              ...state.settings.fixedCosts,
              { ...item, id: generateId() },
            ],
          },
        })),

      updateFixedCost: (id, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            fixedCosts: state.settings.fixedCosts.map((f) =>
              f.id === id ? { ...f, ...updates } : f
            ),
          },
        })),

      removeFixedCost: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            fixedCosts: state.settings.fixedCosts.filter((f) => f.id !== id),
          },
        })),

      setFixedCostVatEnabled: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, fixedCostVatEnabled: enabled },
        })),

      resetToDefaults: () =>
        set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'profit-settings-storage',
    }
  )
);

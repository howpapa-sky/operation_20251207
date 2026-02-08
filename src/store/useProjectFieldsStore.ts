import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ProjectFieldSetting, ProjectType, FieldType } from '../types';

// 기본 필드 설정 (DB에 데이터가 없을 때 사용)
export const defaultFieldSettings: Record<ProjectType, Omit<ProjectFieldSetting, 'id' | 'createdAt' | 'updatedAt'>[]> = {
  sampling: [
    { projectType: 'sampling', fieldKey: 'brand', fieldLabel: '브랜드', fieldType: 'select', fieldOptions: ['howpapa', 'nuccio'], isRequired: true, isVisible: true, displayOrder: 1 },
    { projectType: 'sampling', fieldKey: 'category', fieldLabel: '카테고리', fieldType: 'select', fieldOptions: ['크림', '패드', '로션', '스틱', '앰플', '세럼', '미스트', '클렌저', '선크림', '마스크팩', '기타'], isRequired: true, isVisible: true, displayOrder: 2 },
    { projectType: 'sampling', fieldKey: 'manufacturer', fieldLabel: '제조사', fieldType: 'select', fieldOptions: ['콜마', '코스맥스', '기타'], isRequired: true, isVisible: true, displayOrder: 3 },
    { projectType: 'sampling', fieldKey: 'sampleCode', fieldLabel: '샘플 코드', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 4 },
    { projectType: 'sampling', fieldKey: 'round', fieldLabel: '회차', fieldType: 'number', isRequired: false, isVisible: true, displayOrder: 5 },
  ],
  detail_page: [
    { projectType: 'detail_page', fieldKey: 'brand', fieldLabel: '브랜드', fieldType: 'select', fieldOptions: ['howpapa', 'nuccio'], isRequired: true, isVisible: true, displayOrder: 1 },
    { projectType: 'detail_page', fieldKey: 'category', fieldLabel: '카테고리', fieldType: 'select', fieldOptions: ['크림', '패드', '로션', '스틱', '앰플', '세럼', '미스트', '클렌저', '선크림', '마스크팩', '기타'], isRequired: true, isVisible: true, displayOrder: 2 },
    { projectType: 'detail_page', fieldKey: 'productName', fieldLabel: '제품명', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 3 },
    { projectType: 'detail_page', fieldKey: 'productionCompany', fieldLabel: '제작 업체', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 4 },
    { projectType: 'detail_page', fieldKey: 'workType', fieldLabel: '업무 구분', fieldType: 'select', fieldOptions: ['신규', '리뉴얼'], isRequired: false, isVisible: true, displayOrder: 5 },
    { projectType: 'detail_page', fieldKey: 'budget', fieldLabel: '예산', fieldType: 'number', isRequired: false, isVisible: true, displayOrder: 6 },
    { projectType: 'detail_page', fieldKey: 'includesPhotography', fieldLabel: '촬영 포함', fieldType: 'checkbox', isRequired: false, isVisible: true, displayOrder: 7 },
    { projectType: 'detail_page', fieldKey: 'includesPlanning', fieldLabel: '기획 포함', fieldType: 'checkbox', isRequired: false, isVisible: true, displayOrder: 8 },
  ],
  influencer: [
    { projectType: 'influencer', fieldKey: 'collaborationType', fieldLabel: '협업 유형', fieldType: 'select', fieldOptions: ['제품 협찬', '유가 콘텐츠'], isRequired: true, isVisible: true, displayOrder: 1 },
    { projectType: 'influencer', fieldKey: 'influencerName', fieldLabel: '인플루언서', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 2 },
    { projectType: 'influencer', fieldKey: 'platform', fieldLabel: '플랫폼', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 3 },
    { projectType: 'influencer', fieldKey: 'budget', fieldLabel: '예산', fieldType: 'number', isRequired: false, isVisible: true, displayOrder: 4 },
  ],
  product_order: [
    { projectType: 'product_order', fieldKey: 'brand', fieldLabel: '브랜드', fieldType: 'select', fieldOptions: ['howpapa', 'nuccio'], isRequired: true, isVisible: true, displayOrder: 1 },
    { projectType: 'product_order', fieldKey: 'manufacturer', fieldLabel: '제조사', fieldType: 'select', fieldOptions: ['콜마', '코스맥스', '기타'], isRequired: true, isVisible: true, displayOrder: 2 },
    { projectType: 'product_order', fieldKey: 'containerMaterial', fieldLabel: '용기 부자재', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 3 },
    { projectType: 'product_order', fieldKey: 'boxMaterial', fieldLabel: '단상자 부자재', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 4 },
    { projectType: 'product_order', fieldKey: 'quantity', fieldLabel: '수량', fieldType: 'number', isRequired: false, isVisible: true, displayOrder: 5 },
    { projectType: 'product_order', fieldKey: 'unitPrice', fieldLabel: '단가', fieldType: 'number', isRequired: false, isVisible: true, displayOrder: 6 },
  ],
  group_purchase: [
    { projectType: 'group_purchase', fieldKey: 'brand', fieldLabel: '브랜드', fieldType: 'select', fieldOptions: ['howpapa', 'nuccio'], isRequired: true, isVisible: true, displayOrder: 1 },
    { projectType: 'group_purchase', fieldKey: 'sellerName', fieldLabel: '셀러', fieldType: 'text', isRequired: false, isVisible: true, displayOrder: 2 },
    { projectType: 'group_purchase', fieldKey: 'revenue', fieldLabel: '매출', fieldType: 'number', isRequired: false, isVisible: true, displayOrder: 3 },
    { projectType: 'group_purchase', fieldKey: 'contributionProfit', fieldLabel: '공헌 이익', fieldType: 'number', isRequired: false, isVisible: true, displayOrder: 4 },
  ],
  other: [],
};

// 필드 타입 레이블
export const fieldTypeLabels: Record<FieldType, string> = {
  text: '텍스트',
  number: '숫자',
  select: '선택 (드롭다운)',
  checkbox: '체크박스',
  date: '날짜',
  textarea: '긴 텍스트',
};

interface ProjectFieldsState {
  fieldSettings: ProjectFieldSetting[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFieldSettings: (projectType?: ProjectType) => Promise<void>;
  getFieldsForType: (projectType: ProjectType, selectedBrand?: string) => ProjectFieldSetting[];
  addField: (field: Omit<ProjectFieldSetting, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateField: (id: string, updates: Partial<ProjectFieldSetting>) => Promise<boolean>;
  deleteField: (id: string) => Promise<boolean>;
  reorderFields: (projectType: ProjectType, orderedIds: string[]) => Promise<boolean>;
  updateFieldOptions: (id: string, options: string[]) => Promise<boolean>;
}

export const useProjectFieldsStore = create<ProjectFieldsState>((set, get) => ({
  fieldSettings: [],
  isLoading: false,
  error: null,

  fetchFieldSettings: async (projectType?: ProjectType) => {
    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // 로그인 안 된 경우 기본값 사용
        const allDefaults: ProjectFieldSetting[] = [];
        Object.entries(defaultFieldSettings).forEach(([type, fields]) => {
          fields.forEach((field, index) => {
            allDefaults.push({
              ...field,
              id: `default-${type}-${field.fieldKey}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as ProjectFieldSetting);
          });
        });
        set({ fieldSettings: allDefaults, isLoading: false });
        return;
      }

      let query = supabase
        .from('project_field_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (projectType) {
        query = query.eq('project_type', projectType);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const settings: ProjectFieldSetting[] = data.map((row) => ({
          id: row.id,
          projectType: row.project_type as ProjectType,
          fieldKey: row.field_key,
          fieldLabel: row.field_label,
          fieldType: row.field_type as FieldType,
          fieldOptions: row.field_options ? (typeof row.field_options === 'string' ? JSON.parse(row.field_options) : row.field_options) : undefined,
          isRequired: row.is_required,
          isVisible: row.is_visible,
          displayOrder: row.display_order,
          placeholder: row.placeholder || undefined,
          defaultValue: row.default_value || undefined,
          visibleForBrands: row.visible_for_brands ? (typeof row.visible_for_brands === 'string' ? JSON.parse(row.visible_for_brands) : row.visible_for_brands) : undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        set({ fieldSettings: settings, isLoading: false });
      } else {
        // DB에 데이터가 없으면 기본값 사용
        const allDefaults: ProjectFieldSetting[] = [];
        Object.entries(defaultFieldSettings).forEach(([type, fields]) => {
          fields.forEach((field) => {
            allDefaults.push({
              ...field,
              id: `default-${type}-${field.fieldKey}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as ProjectFieldSetting);
          });
        });
        set({ fieldSettings: allDefaults, isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching field settings:', error);
      set({ error: '필드 설정을 불러오는 데 실패했습니다.', isLoading: false });
    }
  },

  getFieldsForType: (projectType: ProjectType, selectedBrand?: string) => {
    const { fieldSettings } = get();
    let fieldsForType = fieldSettings.filter((f) => f.projectType === projectType && f.isVisible);

    if (fieldsForType.length === 0) {
      // 해당 유형의 필드가 없으면 기본값 반환
      fieldsForType = (defaultFieldSettings[projectType] || []).map((field) => ({
        ...field,
        id: `default-${projectType}-${field.fieldKey}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ProjectFieldSetting));
    }

    // 브랜드 필터링 적용
    if (selectedBrand) {
      fieldsForType = fieldsForType.filter((field) => {
        // 브랜드 필드는 항상 표시
        if (field.fieldKey === 'brand') return true;
        // visibleForBrands가 없거나 빈 배열이면 모든 브랜드에서 표시
        if (!field.visibleForBrands || field.visibleForBrands.length === 0) return true;
        // 선택된 브랜드가 visibleForBrands에 포함되면 표시
        return field.visibleForBrands.includes(selectedBrand);
      });
    }

    return fieldsForType.sort((a, b) => a.displayOrder - b.displayOrder);
  },

  addField: async (field) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('project_field_settings')
        .insert({
          user_id: user.id,
          project_type: field.projectType,
          field_key: field.fieldKey,
          field_label: field.fieldLabel,
          field_type: field.fieldType,
          field_options: field.fieldOptions ? JSON.stringify(field.fieldOptions) : null,
          is_required: field.isRequired,
          is_visible: field.isVisible,
          display_order: field.displayOrder,
          placeholder: field.placeholder || null,
          default_value: field.defaultValue || null,
          visible_for_brands: field.visibleForBrands && field.visibleForBrands.length > 0 ? JSON.stringify(field.visibleForBrands) : null,
        })
        .select()
        .single();

      if (error) throw error;

      const newField: ProjectFieldSetting = {
        id: data.id,
        projectType: data.project_type as ProjectType,
        fieldKey: data.field_key,
        fieldLabel: data.field_label,
        fieldType: data.field_type as FieldType,
        fieldOptions: data.field_options ? (typeof data.field_options === 'string' ? JSON.parse(data.field_options) : data.field_options) : undefined,
        isRequired: data.is_required,
        isVisible: data.is_visible,
        displayOrder: data.display_order,
        placeholder: data.placeholder || undefined,
        defaultValue: data.default_value || undefined,
        visibleForBrands: data.visible_for_brands ? (typeof data.visible_for_brands === 'string' ? JSON.parse(data.visible_for_brands) : data.visible_for_brands) : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      set((state) => ({
        fieldSettings: [...state.fieldSettings, newField],
      }));

      return true;
    } catch (error) {
      console.error('Error adding field:', error);
      return false;
    }
  },

  updateField: async (id, updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // ID가 default-로 시작하면 새로 생성
      if (id.startsWith('default-')) {
        const currentField = get().fieldSettings.find((f) => f.id === id);
        if (!currentField) return false;

        const { data, error } = await supabase
          .from('project_field_settings')
          .insert({
            user_id: user.id,
            project_type: currentField.projectType,
            field_key: currentField.fieldKey,
            field_label: updates.fieldLabel || currentField.fieldLabel,
            field_type: updates.fieldType || currentField.fieldType,
            field_options: updates.fieldOptions ? JSON.stringify(updates.fieldOptions) : (currentField.fieldOptions ? JSON.stringify(currentField.fieldOptions) : null),
            is_required: updates.isRequired !== undefined ? updates.isRequired : currentField.isRequired,
            is_visible: updates.isVisible !== undefined ? updates.isVisible : currentField.isVisible,
            display_order: updates.displayOrder !== undefined ? updates.displayOrder : currentField.displayOrder,
            placeholder: updates.placeholder || currentField.placeholder || null,
            default_value: updates.defaultValue || currentField.defaultValue || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newField: ProjectFieldSetting = {
          id: data.id,
          projectType: data.project_type as ProjectType,
          fieldKey: data.field_key,
          fieldLabel: data.field_label,
          fieldType: data.field_type as FieldType,
          fieldOptions: data.field_options ? (typeof data.field_options === 'string' ? JSON.parse(data.field_options) : data.field_options) : undefined,
          isRequired: data.is_required,
          isVisible: data.is_visible,
          displayOrder: data.display_order,
          placeholder: data.placeholder || undefined,
          defaultValue: data.default_value || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        set((state) => ({
          fieldSettings: state.fieldSettings.map((f) => (f.id === id ? newField : f)),
        }));

        return true;
      }

      const updateData: Record<string, unknown> = {};
      if (updates.fieldLabel !== undefined) updateData.field_label = updates.fieldLabel;
      if (updates.fieldType !== undefined) updateData.field_type = updates.fieldType;
      if (updates.fieldOptions !== undefined) updateData.field_options = JSON.stringify(updates.fieldOptions);
      if (updates.isRequired !== undefined) updateData.is_required = updates.isRequired;
      if (updates.isVisible !== undefined) updateData.is_visible = updates.isVisible;
      if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
      if (updates.placeholder !== undefined) updateData.placeholder = updates.placeholder;
      if (updates.defaultValue !== undefined) updateData.default_value = updates.defaultValue;
      if (updates.visibleForBrands !== undefined) updateData.visible_for_brands = updates.visibleForBrands && updates.visibleForBrands.length > 0 ? JSON.stringify(updates.visibleForBrands) : null;

      const { error } = await supabase
        .from('project_field_settings')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set((state) => ({
        fieldSettings: state.fieldSettings.map((f) =>
          f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
        ),
      }));

      return true;
    } catch (error) {
      console.error('Error updating field:', error);
      return false;
    }
  },

  deleteField: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // ID가 default-로 시작하면 그냥 숨김 처리
      if (id.startsWith('default-')) {
        const currentField = get().fieldSettings.find((f) => f.id === id);
        if (!currentField) return false;

        // DB에 is_visible = false로 저장
        const { error } = await supabase
          .from('project_field_settings')
          .insert({
            user_id: user.id,
            project_type: currentField.projectType,
            field_key: currentField.fieldKey,
            field_label: currentField.fieldLabel,
            field_type: currentField.fieldType,
            field_options: currentField.fieldOptions ? JSON.stringify(currentField.fieldOptions) : null,
            is_required: currentField.isRequired,
            is_visible: false,
            display_order: currentField.displayOrder,
          });

        if (error) throw error;

        set((state) => ({
          fieldSettings: state.fieldSettings.filter((f) => f.id !== id),
        }));

        return true;
      }

      const { error } = await supabase
        .from('project_field_settings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set((state) => ({
        fieldSettings: state.fieldSettings.filter((f) => f.id !== id),
      }));

      return true;
    } catch (error) {
      console.error('Error deleting field:', error);
      return false;
    }
  },

  reorderFields: async (projectType, orderedIds) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // 순서 업데이트
      const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        if (update.id.startsWith('default-')) continue;

        await supabase
          .from('project_field_settings')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
          .eq('user_id', user.id);
      }

      set((state) => ({
        fieldSettings: state.fieldSettings.map((f) => {
          const index = orderedIds.indexOf(f.id);
          if (index !== -1 && f.projectType === projectType) {
            return { ...f, displayOrder: index + 1 };
          }
          return f;
        }),
      }));

      return true;
    } catch (error) {
      console.error('Error reordering fields:', error);
      return false;
    }
  },

  updateFieldOptions: async (id, options) => {
    return get().updateField(id, { fieldOptions: options });
  },
}));

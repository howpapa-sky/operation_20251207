import { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Star,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Link2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  List,
  Users as UsersIcon,
  Crown,
} from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useStore } from '../store/useStore';
import { useApiCredentialsStore } from '../store/useApiCredentialsStore';
import { useProjectSettingsStore, defaultProjectTypeLabels } from '../store/useProjectSettingsStore';
import { useProjectFieldsStore, fieldTypeLabels, defaultFieldSettings } from '../store/useProjectFieldsStore';
import { useUserManagementStore, canManageUsers } from '../store/useUserManagementStore';
import { EvaluationCriteria, ProductCategory, SalesChannel, SyncStatus, ProjectType, ProjectFieldSetting, FieldType, UserRole, userRoleLabels } from '../types';
import { channelInfo } from '../services/salesApiService';
import {
  Beaker,
  FileImage,
  Users,
  Package,
  ShoppingCart,
  FolderOpen,
  GripVertical,
  Mail,
} from 'lucide-react';

const categories: ProductCategory[] = [
  '크림', '패드', '로션', '스틱', '앰플', '세럼', '미스트', '클렌저', '선크림', '마스크팩', '기타'
];

export default function SettingsPage() {
  const {
    user,
    updateUser,
    evaluationCriteria,
    addEvaluationCriteria,
    updateEvaluationCriteria,
    deleteEvaluationCriteria,
    reorderEvaluationCriteria,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'criteria' | 'project_types' | 'project_fields' | 'api' | 'notifications' | 'user_management'>('profile');

  // User management state
  const {
    users,
    isLoading: isUsersLoading,
    fetchUsers,
    updateUserRole,
    canManageUser,
    canChangeRole,
  } = useUserManagementStore();

  // Project settings state
  const {
    projectTypeSettings,
    notificationSettings,
    fetchProjectTypeSettings,
    fetchNotificationSettings,
    updateProjectTypeSetting,
    toggleProjectTypeVisibility,
    updateNotificationSettings,
  } = useProjectSettingsStore();

  // Project fields state
  const {
    fieldSettings,
    fetchFieldSettings,
    getFieldsForType,
    addField,
    updateField,
    deleteField,
  } = useProjectFieldsStore();

  const [selectedFieldType, setSelectedFieldType] = useState<ProjectType>('sampling');
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<ProjectFieldSetting | null>(null);
  const [fieldFormData, setFieldFormData] = useState({
    fieldKey: '',
    fieldLabel: '',
    fieldType: 'text' as FieldType,
    fieldOptions: [] as string[],
    isRequired: false,
    placeholder: '',
    visibleForBrands: [] as string[],
  });
  const [newOptionText, setNewOptionText] = useState('');
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectTypeSettings();
    fetchNotificationSettings();
    fetchFieldSettings();
    if (canManageUsers(user)) {
      fetchUsers();
    }
  }, [fetchProjectTypeSettings, fetchNotificationSettings, fetchFieldSettings, fetchUsers, user]);

  // 프로젝트 유형 아이콘 매핑
  const projectTypeIcons: Record<ProjectType, React.ReactNode> = {
    sampling: <Beaker className="w-5 h-5" />,
    detail_page: <FileImage className="w-5 h-5" />,
    influencer: <Users className="w-5 h-5" />,
    product_order: <Package className="w-5 h-5" />,
    group_purchase: <ShoppingCart className="w-5 h-5" />,
    other: <FolderOpen className="w-5 h-5" />,
  };

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Criteria modal state
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<EvaluationCriteria | null>(null);
  const [criteriaName, setCriteriaName] = useState('');
  const [criteriaDescription, setCriteriaDescription] = useState('');
  const [criteriaCategory, setCriteriaCategory] = useState<ProductCategory>('크림');
  const [criteriaMaxScore, setCriteriaMaxScore] = useState(5);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  // Drag and drop state for criteria reordering
  const [draggedCriteriaId, setDraggedCriteriaId] = useState<string | null>(null);
  const [dragOverCriteriaId, setDragOverCriteriaId] = useState<string | null>(null);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<ProductCategory | ''>('');

  // API credentials state
  const {
    credentials,
    isLoading: apiLoading,
    testingChannel,
    syncingChannel,
    fetchCredentials,
    saveCredential,
    deleteCredential,
    toggleActive,
    testConnection,
    syncOrders,
  } = useApiCredentialsStore();

  const [showApiModal, setShowApiModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<SalesChannel | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ channel: SalesChannel; success: boolean; message: string } | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncChannel, setSyncChannel] = useState<SalesChannel | null>(null);
  const [syncDateRange, setSyncDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // API Form state
  const [apiFormData, setApiFormData] = useState({
    cafe24: { mallId: '', clientId: '', clientSecret: '' },
    naver: { clientId: '', clientSecret: '' },
    coupang: { vendorId: '', accessKey: '', secretKey: '' },
  });

  const [cafe24OAuthStatus, setCafe24OAuthStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Cafe24 OAuth 콜백 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cafe24Callback = params.get('cafe24_callback');
    const code = params.get('code');

    if (cafe24Callback && code) {
      // URL에서 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname);

      // API 탭으로 전환
      setActiveTab('api');
      setCafe24OAuthStatus('인증 코드를 교환하는 중...');

      // DB에서 cafe24 자격증명 가져와서 토큰 교환
      (async () => {
        try {
          // credentials가 아직 로드되지 않았을 수 있으므로 fetchCredentials 후 최신 상태 확인
          await fetchCredentials();
          const latestCreds = useApiCredentialsStore.getState().credentials;
          const updatedCred = latestCreds.find((c) => c.channel === 'cafe24');
          const cafe24 = updatedCred?.cafe24;

          if (!cafe24?.mallId || !cafe24?.clientId || !cafe24?.clientSecret) {
            setCafe24OAuthStatus('Cafe24 자격증명이 저장되어 있지 않습니다. 먼저 API 설정에서 저장해주세요.');
            return;
          }

          const redirectUri = `${window.location.origin}/settings?cafe24_callback=true`;
          const res = await fetch('/.netlify/functions/commerce-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'cafe24-exchange-token',
              mallId: cafe24.mallId,
              clientId: cafe24.clientId,
              clientSecret: cafe24.clientSecret,
              code,
              redirectUri,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setCafe24OAuthStatus('Cafe24 OAuth 인증이 완료되었습니다!');
            await fetchCredentials();
          } else {
            setCafe24OAuthStatus(`인증 실패: ${data.error || '알 수 없는 오류'}`);
          }
        } catch (err) {
          setCafe24OAuthStatus(`인증 처리 중 오류: ${(err as Error).message}`);
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProfile = () => {
    updateUser({ name, email });
  };

  const openCriteriaModal = (criteria?: EvaluationCriteria) => {
    if (criteria) {
      setEditingCriteria(criteria);
      setCriteriaName(criteria.name);
      setCriteriaDescription(criteria.description || '');
      setCriteriaCategory(criteria.category);
      setCriteriaMaxScore(criteria.maxScore);
    } else {
      setEditingCriteria(null);
      setCriteriaName('');
      setCriteriaDescription('');
      setCriteriaCategory('크림');
      setCriteriaMaxScore(5);
    }
    setShowCriteriaModal(true);
  };

  const handleSaveCriteria = () => {
    if (!criteriaName.trim()) return;

    if (editingCriteria) {
      updateEvaluationCriteria(editingCriteria.id, {
        name: criteriaName,
        description: criteriaDescription,
        category: criteriaCategory,
        maxScore: criteriaMaxScore,
      });
    } else {
      // Calculate next displayOrder
      const maxOrder = evaluationCriteria.reduce((max, c) => Math.max(max, c.displayOrder || 0), 0);
      addEvaluationCriteria({
        name: criteriaName,
        description: criteriaDescription,
        category: criteriaCategory,
        maxScore: criteriaMaxScore,
        isActive: true,
        displayOrder: maxOrder + 1,
      });
    }

    setShowCriteriaModal(false);
  };

  const handleToggleCriteria = (id: string, isActive: boolean) => {
    updateEvaluationCriteria(id, { isActive: !isActive });
  };

  const handleDeleteCriteria = (id: string) => {
    deleteEvaluationCriteria(id);
    setDeleteModalId(null);
  };

  // Sort criteria by displayOrder first
  const sortedCriteria = [...evaluationCriteria].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const filteredCriteria = filterCategory
    ? sortedCriteria.filter((c) => c.category === filterCategory)
    : sortedCriteria;

  const groupedCriteria = filteredCriteria.reduce((acc, criteria) => {
    if (!acc[criteria.category]) {
      acc[criteria.category] = [];
    }
    acc[criteria.category].push(criteria);
    return acc;
  }, {} as Record<string, EvaluationCriteria[]>);

  // Criteria drag handlers
  const handleCriteriaDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCriteriaId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCriteriaDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedCriteriaId) {
      setDragOverCriteriaId(id);
    }
  };

  const handleCriteriaDragLeave = () => {
    setDragOverCriteriaId(null);
  };

  const handleCriteriaDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedCriteriaId || draggedCriteriaId === targetId) {
      setDraggedCriteriaId(null);
      setDragOverCriteriaId(null);
      return;
    }

    // Reorder the criteria list
    const currentIds = sortedCriteria.map((c) => c.id);
    const draggedIndex = currentIds.indexOf(draggedCriteriaId);
    const targetIndex = currentIds.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at target position
    currentIds.splice(draggedIndex, 1);
    currentIds.splice(targetIndex, 0, draggedCriteriaId);

    // Update order in database
    await reorderEvaluationCriteria(currentIds);

    setDraggedCriteriaId(null);
    setDragOverCriteriaId(null);
  };

  const handleCriteriaDragEnd = () => {
    setDraggedCriteriaId(null);
    setDragOverCriteriaId(null);
  };

  // API handlers
  const openApiModal = (channel: SalesChannel) => {
    setEditingChannel(channel);
    const existing = credentials.find((c) => c.channel === channel);

    if (channel === 'cafe24') {
      setApiFormData((prev) => ({
        ...prev,
        cafe24: {
          mallId: existing?.cafe24?.mallId || '',
          clientId: existing?.cafe24?.clientId || '',
          clientSecret: existing?.cafe24?.clientSecret || '',
        },
      }));
    } else if (channel === 'naver_smartstore') {
      setApiFormData((prev) => ({
        ...prev,
        naver: {
          clientId: existing?.naver?.clientId || '',
          clientSecret: existing?.naver?.clientSecret || '',
        },
      }));
    } else if (channel === 'coupang') {
      setApiFormData((prev) => ({
        ...prev,
        coupang: {
          vendorId: existing?.coupang?.vendorId || '',
          accessKey: existing?.coupang?.accessKey || '',
          secretKey: existing?.coupang?.secretKey || '',
        },
      }));
    }

    setShowApiModal(true);
  };

  const handleSaveApiCredential = async () => {
    if (!editingChannel) return;

    let data = {};
    if (editingChannel === 'cafe24') {
      data = { cafe24: apiFormData.cafe24, isActive: true };
    } else if (editingChannel === 'naver_smartstore') {
      data = { naver: apiFormData.naver, isActive: true };
    } else if (editingChannel === 'coupang') {
      data = { coupang: apiFormData.coupang, isActive: true };
    }

    const success = await saveCredential(editingChannel, data);
    if (success) {
      setShowApiModal(false);
      setEditingChannel(null);
    }
  };

  const handleTestConnection = async (channel: SalesChannel) => {
    setTestResult(null);
    const result = await testConnection(channel);
    setTestResult({ channel, ...result });

    // 5초 후 결과 메시지 숨김
    setTimeout(() => {
      setTestResult(null);
    }, 5000);
  };

  const openSyncModal = (channel: SalesChannel) => {
    setSyncChannel(channel);
    setSyncResult(null);
    setSyncDateRange({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
    setShowSyncModal(true);
  };

  const handleSyncOrders = async () => {
    if (!syncChannel) return;
    setSyncResult(null);
    const result = await syncOrders(syncChannel, syncDateRange.startDate, syncDateRange.endDate);
    setSyncResult({ success: result.success, message: result.message });
  };

  const getSyncStatusBadge = (status: SyncStatus) => {
    switch (status) {
      case 'success':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />연동됨</Badge>;
      case 'failed':
        return <Badge variant="danger" className="flex items-center gap-1"><XCircle className="w-3 h-3" />오류</Badge>;
      case 'syncing':
        return <Badge variant="warning" className="flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />동기화 중</Badge>;
      default:
        return <Badge variant="gray" className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />미연동</Badge>;
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 필드 모달 열기
  const openFieldModal = (field?: ProjectFieldSetting) => {
    if (field) {
      setEditingField(field);
      setFieldFormData({
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        fieldOptions: field.fieldOptions || [],
        isRequired: field.isRequired,
        placeholder: field.placeholder || '',
        visibleForBrands: field.visibleForBrands || [],
      });
    } else {
      setEditingField(null);
      setFieldFormData({
        fieldKey: '',
        fieldLabel: '',
        fieldType: 'text',
        fieldOptions: [],
        isRequired: false,
        placeholder: '',
        visibleForBrands: [],
      });
    }
    setShowFieldModal(true);
  };

  // 필드 저장
  const handleSaveField = async () => {
    if (!fieldFormData.fieldKey.trim() || !fieldFormData.fieldLabel.trim()) return;

    const fieldData = {
      projectType: selectedFieldType,
      fieldKey: fieldFormData.fieldKey.trim().replace(/\s+/g, '_'),
      fieldLabel: fieldFormData.fieldLabel.trim(),
      fieldType: fieldFormData.fieldType,
      fieldOptions: fieldFormData.fieldType === 'select' ? fieldFormData.fieldOptions : undefined,
      isRequired: fieldFormData.isRequired,
      isVisible: true,
      displayOrder: editingField?.displayOrder || (getFieldsForType(selectedFieldType).length + 1),
      placeholder: fieldFormData.placeholder || undefined,
      visibleForBrands: fieldFormData.visibleForBrands.length > 0 ? fieldFormData.visibleForBrands : undefined,
    };

    let success = false;
    if (editingField) {
      success = await updateField(editingField.id, fieldData);
    } else {
      success = await addField(fieldData);
    }

    if (success) {
      setShowFieldModal(false);
      setEditingField(null);
    }
  };

  // 옵션 추가
  const handleAddOption = () => {
    if (newOptionText.trim()) {
      setFieldFormData((prev) => ({
        ...prev,
        fieldOptions: [...prev.fieldOptions, newOptionText.trim()],
      }));
      setNewOptionText('');
    }
  };

  // 옵션 삭제
  const handleRemoveOption = (index: number) => {
    setFieldFormData((prev) => ({
      ...prev,
      fieldOptions: prev.fieldOptions.filter((_, i) => i !== index),
    }));
  };

  // 필드 삭제
  const handleDeleteField = async (id: string) => {
    const success = await deleteField(id);
    if (success) {
      setDeleteFieldId(null);
    }
  };

  // 현재 선택된 프로젝트 유형의 필드 목록
  const currentFields = getFieldsForType(selectedFieldType);

  const baseTabs = [
    { id: 'profile', label: '프로필', icon: User },
    { id: 'criteria', label: '평가 항목 관리', icon: Star },
    { id: 'project_types', label: '프로젝트 유형 관리', icon: FolderOpen },
    { id: 'project_fields', label: '프로젝트 필드 관리', icon: List },
    { id: 'api', label: 'API 연동', icon: Link2 },
    { id: 'notifications', label: '알림 설정', icon: Bell },
  ];

  // 관리자 이상만 사용자 관리 탭 표시
  const tabs = canManageUsers(user)
    ? [...baseTabs, { id: 'user_management', label: '사용자 권한 관리', icon: Shield }]
    : baseTabs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Settings className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-500">계정 및 앱 설정 관리</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit" padding="sm">
          <nav className="space-y-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader title="프로필 설정" subtitle="계정 정보를 수정합니다" />
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">{user?.name}</p>
                    <p className="text-gray-500">{user?.email}</p>
                    <Badge
                      variant={
                        user?.role === 'super_admin' ? 'warning'
                          : user?.role === 'admin' ? 'primary'
                          : user?.role === 'manager' ? 'info'
                          : 'gray'
                      }
                      className="mt-2"
                    >
                      {user?.role ? userRoleLabels[user.role] : '일반'}
                    </Badge>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">이름</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">이메일</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSaveProfile} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'criteria' && (
            <>
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">샘플 평가 항목 관리</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      카테고리별 평가 항목을 추가, 수정, 삭제할 수 있습니다
                    </p>
                  </div>
                  <button
                    onClick={() => openCriteriaModal()}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    새 평가 항목
                  </button>
                </div>

                {/* Filter */}
                <div className="mb-6">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as ProductCategory | '')}
                    className="select-field w-48"
                  >
                    <option value="">모든 카테고리</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Criteria List */}
                <div className="space-y-6">
                  {Object.entries(groupedCriteria).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {items.map((criteria) => (
                          <div
                            key={criteria.id}
                            draggable
                            onDragStart={(e) => handleCriteriaDragStart(e, criteria.id)}
                            onDragOver={(e) => handleCriteriaDragOver(e, criteria.id)}
                            onDragLeave={handleCriteriaDragLeave}
                            onDrop={(e) => handleCriteriaDrop(e, criteria.id)}
                            onDragEnd={handleCriteriaDragEnd}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                              criteria.isActive
                                ? 'bg-white border-gray-200'
                                : 'bg-gray-50 border-gray-100 opacity-60'
                            } ${
                              draggedCriteriaId === criteria.id
                                ? 'opacity-50 scale-95'
                                : ''
                            } ${
                              dragOverCriteriaId === criteria.id
                                ? 'border-primary-400 border-2 bg-primary-50'
                                : ''
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <button
                                onClick={() => handleToggleCriteria(criteria.id, criteria.isActive)}
                                className={`w-10 h-6 rounded-full transition-all ${
                                  criteria.isActive ? 'bg-primary-500' : 'bg-gray-300'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 bg-white rounded-full transition-all ${
                                    criteria.isActive ? 'ml-5' : 'ml-1'
                                  }`}
                                />
                              </button>
                              <div>
                                <p className="font-medium text-gray-900">{criteria.name}</p>
                                {criteria.description && (
                                  <p className="text-sm text-gray-500">{criteria.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="gray">최대 {criteria.maxScore}점</Badge>
                              <button
                                onClick={() => openCriteriaModal(criteria)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteModalId(criteria.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {filteredCriteria.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      평가 항목이 없습니다. 새 평가 항목을 추가해주세요.
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}

          {activeTab === 'project_types' && (
            <Card>
              <CardHeader
                title="프로젝트 유형 관리"
                subtitle="프로젝트 유형별 메뉴 노출 여부와 이름을 설정합니다"
              />
              <div className="space-y-3">
                {projectTypeSettings
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((setting) => (
                    <div
                      key={setting.projectType}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        setting.isVisible
                          ? 'bg-white border-gray-200'
                          : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-gray-400">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="text-gray-600">
                          {projectTypeIcons[setting.projectType]}
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={setting.customName || defaultProjectTypeLabels[setting.projectType]}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateProjectTypeSetting(setting.projectType, {
                                customName: value === defaultProjectTypeLabels[setting.projectType] ? undefined : value,
                              });
                            }}
                            className="font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                          />
                          <p className="text-xs text-gray-400 mt-0.5">
                            기본: {defaultProjectTypeLabels[setting.projectType]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-sm text-gray-600">메뉴 표시</span>
                          <button
                            onClick={() => toggleProjectTypeVisibility(setting.projectType)}
                            className={`w-10 h-6 rounded-full transition-all ${
                              setting.isVisible ? 'bg-primary-500' : 'bg-gray-300'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full transition-all ${
                                setting.isVisible ? 'ml-5' : 'ml-1'
                              }`}
                            />
                          </button>
                        </label>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                체크를 해제하면 해당 프로젝트 유형이 사이드바 메뉴에서 숨겨집니다.
                이름을 클릭하여 직접 수정할 수 있습니다.
              </div>
            </Card>
          )}

          {activeTab === 'project_fields' && (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">프로젝트 필드 관리</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    각 프로젝트 유형별 입력 필드를 추가, 수정, 삭제할 수 있습니다
                  </p>
                </div>
                <button
                  onClick={() => openFieldModal()}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  새 필드 추가
                </button>
              </div>

              {/* 프로젝트 유형 선택 */}
              <div className="mb-6">
                <label className="label">프로젝트 유형 선택</label>
                <select
                  value={selectedFieldType}
                  onChange={(e) => setSelectedFieldType(e.target.value as ProjectType)}
                  className="select-field w-64"
                >
                  {(['sampling', 'detail_page', 'influencer', 'product_order', 'group_purchase', 'other'] as ProjectType[]).map((type) => (
                    <option key={type} value={type}>
                      {defaultProjectTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* 필드 목록 */}
              <div className="space-y-2">
                {currentFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-gray-400">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{field.fieldLabel}</p>
                          {field.isRequired && (
                            <Badge variant="danger" className="text-xs">필수</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          키: {field.fieldKey} | 타입: {fieldTypeLabels[field.fieldType]}
                          {field.fieldOptions && field.fieldOptions.length > 0 && (
                            <span className="ml-2">| 옵션: {field.fieldOptions.length}개</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFieldModal(field)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteFieldId(field.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {currentFields.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    이 프로젝트 유형에 등록된 필드가 없습니다.
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                필드를 추가하면 해당 프로젝트 유형 등록/수정 화면에 입력란이 추가됩니다.
                드래그하여 순서를 변경할 수 있습니다.
              </div>
            </Card>
          )}

          {activeTab === 'api' && (
            <Card>
              <CardHeader
                title="API 연동 설정"
                subtitle="판매 채널 API를 연동하여 매출 데이터를 자동으로 가져옵니다"
              />
              <div className="space-y-4">
                {/* 안내 메시지 */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">API 연동 안내</p>
                      <p>
                        네이버 스마트스토어, Cafe24 주문 동기화를 지원합니다.
                        자격증명을 설정한 후 '연결 테스트'로 연결을 확인하고 '주문 동기화'로 데이터를 가져오세요.
                        Cafe24는 OAuth 인증이 추가로 필요합니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cafe24 OAuth 콜백 결과 */}
                {cafe24OAuthStatus && (
                  <div className={`rounded-xl p-4 text-sm flex items-center gap-2 ${
                    cafe24OAuthStatus.includes('완료') ? 'bg-green-50 border border-green-200 text-green-800' :
                    cafe24OAuthStatus.includes('실패') || cafe24OAuthStatus.includes('오류') ? 'bg-red-50 border border-red-200 text-red-800' :
                    'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  }`}>
                    {cafe24OAuthStatus.includes('완료') ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> :
                     cafe24OAuthStatus.includes('실패') || cafe24OAuthStatus.includes('오류') ? <XCircle className="w-4 h-4 flex-shrink-0" /> :
                     <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />}
                    {cafe24OAuthStatus}
                  </div>
                )}

                {/* 채널 목록 */}
                {(['cafe24', 'naver_smartstore', 'coupang'] as SalesChannel[]).map((channel) => {
                  const info = channelInfo[channel];
                  const credential = credentials.find((c) => c.channel === channel);
                  const isConfigured = !!credential;

                  return (
                    <div
                      key={channel}
                      className={`border rounded-xl p-5 transition-all ${
                        isConfigured ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{info.name}</h4>
                            {isConfigured && getSyncStatusBadge(credential.syncStatus)}
                          </div>
                          <p className="text-sm text-gray-500 mb-3">{info.description}</p>

                          {isConfigured && credential.lastSyncAt && (
                            <p className="text-xs text-gray-400">
                              마지막 동기화: {new Date(credential.lastSyncAt).toLocaleString('ko-KR')}
                            </p>
                          )}
                          {isConfigured && credential.syncError && (
                            <p className="text-xs text-red-500 mt-1">오류: {credential.syncError}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {info.docUrl && (
                            <a
                              href={info.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="API 문서"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {isConfigured && (
                            <button
                              onClick={() => handleTestConnection(channel)}
                              disabled={testingChannel === channel}
                              className="btn-secondary flex items-center gap-2"
                            >
                              {testingChannel === channel ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  테스트 중...
                                </>
                              ) : (
                                '연결 테스트'
                              )}
                            </button>
                          )}
                          {isConfigured && channel === 'naver_smartstore' && (
                            <button
                              onClick={() => openSyncModal(channel)}
                              disabled={syncingChannel === channel}
                              className="btn-primary flex items-center gap-2"
                            >
                              {syncingChannel === channel ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  동기화 중...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  주문 동기화
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => openApiModal(channel)}
                            className={isConfigured ? 'btn-secondary' : 'btn-primary'}
                          >
                            {isConfigured ? '설정 수정' : '연동하기'}
                          </button>
                        </div>
                      </div>

                      {/* Toggle Active */}
                      {isConfigured && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-sm text-gray-600">자동 동기화 활성화</span>
                          <button
                            onClick={() => toggleActive(channel, !credential.isActive)}
                            className={`w-10 h-6 rounded-full transition-all ${
                              credential.isActive ? 'bg-primary-500' : 'bg-gray-300'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full transition-all ${
                                credential.isActive ? 'ml-5' : 'ml-1'
                              }`}
                            />
                          </button>
                        </div>
                      )}

                      {/* 테스트 결과 메시지 */}
                      {testResult && testResult.channel === channel && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${
                          testResult.success
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            {testResult.success ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            {testResult.message}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <>
              {/* 네이버웍스 메신저 알림 */}
              <Card>
                <CardHeader
                  title="네이버웍스 메신저 알림"
                  subtitle="네이버웍스 봇을 통해 실시간 알림을 받습니다"
                />
                <div className="space-y-4">
                  {/* 마스터 토글 */}
                  <div className="flex items-center justify-between p-4 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">네이버웍스 알림 활성화</p>
                        <p className="text-sm text-gray-500">봇을 통해 팀 채널로 알림을 전송합니다</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateNotificationSettings({
                        naverWorksEnabled: !notificationSettings?.naverWorksEnabled
                      })}
                      className={`w-12 h-7 rounded-full transition-all ${
                        notificationSettings?.naverWorksEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-all ${
                          notificationSettings?.naverWorksEnabled ? 'ml-6' : 'ml-1'
                        }`}
                      />
                    </button>
                  </div>

                  {notificationSettings?.naverWorksEnabled && (
                    <>
                      {/* D-DAY 알림 */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-gray-900">마감일 알림</p>
                            <p className="text-sm text-gray-500">D-DAY 당일 오전 10시에 알림 전송</p>
                          </div>
                        </div>
                        <button
                          onClick={() => updateNotificationSettings({
                            naverWorksDdayEnabled: !notificationSettings?.naverWorksDdayEnabled
                          })}
                          className={`w-10 h-6 rounded-full transition-all ${
                            notificationSettings?.naverWorksDdayEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-all ${
                              notificationSettings?.naverWorksDdayEnabled ? 'ml-5' : 'ml-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 지연 프로젝트 알림 */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium text-gray-900">지연 프로젝트 알림</p>
                            <p className="text-sm text-gray-500">마감일이 지난 프로젝트를 매일 알림</p>
                          </div>
                        </div>
                        <button
                          onClick={() => updateNotificationSettings({
                            naverWorksOverdueEnabled: !notificationSettings?.naverWorksOverdueEnabled
                          })}
                          className={`w-10 h-6 rounded-full transition-all ${
                            notificationSettings?.naverWorksOverdueEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-all ${
                              notificationSettings?.naverWorksOverdueEnabled ? 'ml-5' : 'ml-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 상태 변경 알림 */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-gray-900">상태 변경 알림</p>
                            <p className="text-sm text-gray-500">프로젝트 상태가 변경되면 즉시 알림</p>
                          </div>
                        </div>
                        <button
                          onClick={() => updateNotificationSettings({
                            naverWorksStatusChangeEnabled: !notificationSettings?.naverWorksStatusChangeEnabled
                          })}
                          className={`w-10 h-6 rounded-full transition-all ${
                            notificationSettings?.naverWorksStatusChangeEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-all ${
                              notificationSettings?.naverWorksStatusChangeEnabled ? 'ml-5' : 'ml-1'
                            }`}
                          />
                        </button>
                      </div>
                    </>
                  )}

                  {/* 네이버웍스 연동 안내 */}
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-800 mb-1">네이버웍스 연동 완료</p>
                        <p className="text-green-700">
                          매일 오전 10시에 D-DAY 및 지연 프로젝트 알림이 자동 전송됩니다.
                          봇이 등록된 채널로 알림이 발송됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* D-DAY 이메일 알림 */}
              <Card>
                <CardHeader
                  title="D-DAY 이메일 알림"
                  subtitle="프로젝트 마감일 관련 이메일 알림을 설정합니다"
                />
                <div className="space-y-4">
                  {/* 마감일 알림 활성화 */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">마감일 알림 이메일</p>
                        <p className="text-sm text-gray-500">마감일이 다가오면 이메일로 알림을 받습니다</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateNotificationSettings({
                        ddayEmailEnabled: !notificationSettings?.ddayEmailEnabled
                      })}
                      className={`w-10 h-6 rounded-full transition-all ${
                        notificationSettings?.ddayEmailEnabled ? 'bg-primary-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-all ${
                          notificationSettings?.ddayEmailEnabled ? 'ml-5' : 'ml-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 마감일 지난 프로젝트 알림 */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="font-medium text-gray-900">마감일 초과 알림</p>
                        <p className="text-sm text-gray-500">D-DAY가 지난 미완료 프로젝트 알림</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateNotificationSettings({
                        ddayOverdueEnabled: !notificationSettings?.ddayOverdueEnabled
                      })}
                      className={`w-10 h-6 rounded-full transition-all ${
                        notificationSettings?.ddayOverdueEnabled ? 'bg-primary-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-all ${
                          notificationSettings?.ddayOverdueEnabled ? 'ml-5' : 'ml-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 알림 받을 D-DAY 선택 */}
                  {notificationSettings?.ddayEmailEnabled && (
                    <div className="p-4 rounded-xl border border-gray-200">
                      <p className="font-medium text-gray-900 mb-3">알림 받을 시점</p>
                      <div className="flex flex-wrap gap-2">
                        {[7, 3, 1, 0].map((day) => {
                          const isSelected = notificationSettings?.ddayDaysBefore?.includes(day);
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const current = notificationSettings?.ddayDaysBefore || [];
                                const updated = isSelected
                                  ? current.filter((d) => d !== day)
                                  : [...current, day].sort((a, b) => b - a);
                                updateNotificationSettings({ ddayDaysBefore: updated });
                              }}
                              className={`px-4 py-2 rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {day === 0 ? 'D-DAY' : `D-${day}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 알림 이메일 주소 */}
                  <div className="p-4 rounded-xl border border-gray-200">
                    <label className="label">알림 받을 이메일 주소</label>
                    <input
                      type="email"
                      value={notificationSettings?.notificationEmail || user?.email || ''}
                      onChange={(e) => updateNotificationSettings({ notificationEmail: e.target.value })}
                      className="input-field"
                      placeholder="이메일 주소 입력"
                    />
                    <p className="text-xs text-gray-400 mt-1">비워두면 로그인 이메일로 발송됩니다</p>
                  </div>
                </div>
              </Card>

              {/* 기타 알림 */}
              <Card>
                <CardHeader title="기타 알림" subtitle="기타 알림 설정" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">상태 변경 알림</p>
                      <p className="text-sm text-gray-500">프로젝트 상태가 변경되면 알림</p>
                    </div>
                    <button
                      onClick={() => updateNotificationSettings({
                        statusChangeEnabled: !notificationSettings?.statusChangeEnabled
                      })}
                      className={`w-10 h-6 rounded-full transition-all ${
                        notificationSettings?.statusChangeEnabled ? 'bg-primary-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-all ${
                          notificationSettings?.statusChangeEnabled ? 'ml-5' : 'ml-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">주간 요약 이메일</p>
                      <p className="text-sm text-gray-500">매주 월요일 프로젝트 현황 요약</p>
                    </div>
                    <button
                      onClick={() => updateNotificationSettings({
                        weeklySummaryEnabled: !notificationSettings?.weeklySummaryEnabled
                      })}
                      className={`w-10 h-6 rounded-full transition-all ${
                        notificationSettings?.weeklySummaryEnabled ? 'bg-primary-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-all ${
                          notificationSettings?.weeklySummaryEnabled ? 'ml-5' : 'ml-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </Card>

              {/* 안내 메시지 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">이메일 알림 준비 중</p>
                    <p>
                      현재 알림 설정 저장 기능만 제공됩니다.
                      실제 이메일 발송은 서버 측 구현(Edge Functions) 완료 후 사용 가능합니다.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'user_management' && canManageUsers(user) && (
            <Card>
              <CardHeader
                title="사용자 권한 관리"
                subtitle="사용자별 권한을 설정합니다. 관리자 이상만 이 페이지에 접근할 수 있습니다."
              />
              <div className="space-y-4">
                {isUsersLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">사용자 목록 로딩 중...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">등록된 사용자가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((targetUser) => {
                      const isSuperAdmin = targetUser.email === 'yong@howlab.co.kr';
                      const canManage = canManageUser(user, targetUser);

                      return (
                        <div
                          key={targetUser.id}
                          className={`p-4 rounded-xl border ${
                            isSuperAdmin ? 'border-amber-200 bg-amber-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isSuperAdmin
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-primary-100 text-primary-600'
                              }`}>
                                {isSuperAdmin ? (
                                  <Crown className="w-5 h-5" />
                                ) : (
                                  <span className="font-semibold">
                                    {targetUser.name?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{targetUser.name}</p>
                                  {isSuperAdmin && (
                                    <Badge variant="warning" size="sm">최고 관리자</Badge>
                                  )}
                                  {targetUser.id === user?.id && (
                                    <Badge variant="primary" size="sm">나</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">{targetUser.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {canManage ? (
                                <select
                                  value={targetUser.role}
                                  onChange={(e) => updateUserRole(targetUser.id, e.target.value as UserRole)}
                                  className="input-field py-2 w-32"
                                >
                                  {(['member', 'manager', 'admin'] as UserRole[]).map((role) => (
                                    <option
                                      key={role}
                                      value={role}
                                      disabled={!canChangeRole(user, role)}
                                    >
                                      {userRoleLabels[role]}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <Badge
                                  variant={
                                    targetUser.role === 'super_admin' ? 'warning'
                                      : targetUser.role === 'admin' ? 'primary'
                                      : targetUser.role === 'manager' ? 'info'
                                      : 'gray'
                                  }
                                >
                                  {userRoleLabels[targetUser.role]}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 권한 설명 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-3">권한 등급 설명</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">최고 관리자</Badge>
                      <span className="text-gray-600">모든 권한 (변경 불가)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" size="sm">관리자</Badge>
                      <span className="text-gray-600">사용자 권한 관리, 모든 설정 변경</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info" size="sm">매니저</Badge>
                      <span className="text-gray-600">프로젝트 삭제, 설정 변경</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="gray" size="sm">일반</Badge>
                      <span className="text-gray-600">프로젝트 생성/수정, 조회</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Criteria Modal */}
      <Modal
        isOpen={showCriteriaModal}
        onClose={() => setShowCriteriaModal(false)}
        title={editingCriteria ? '평가 항목 수정' : '새 평가 항목'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">항목명 *</label>
            <input
              type="text"
              value={criteriaName}
              onChange={(e) => setCriteriaName(e.target.value)}
              className="input-field"
              placeholder="예: 발림성, 흡수력"
            />
          </div>
          <div>
            <label className="label">설명</label>
            <input
              type="text"
              value={criteriaDescription}
              onChange={(e) => setCriteriaDescription(e.target.value)}
              className="input-field"
              placeholder="평가 항목에 대한 설명"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">카테고리 *</label>
              <select
                value={criteriaCategory}
                onChange={(e) => setCriteriaCategory(e.target.value as ProductCategory)}
                className="select-field"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">최대 점수</label>
              <select
                value={criteriaMaxScore}
                onChange={(e) => setCriteriaMaxScore(Number(e.target.value))}
                className="select-field"
              >
                <option value={5}>5점</option>
                <option value={10}>10점</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowCriteriaModal(false)} className="btn-secondary">
            취소
          </button>
          <button onClick={handleSaveCriteria} className="btn-primary">
            {editingCriteria ? '수정' : '추가'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        title="평가 항목 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 평가 항목을 삭제하시겠습니까?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteModalId(null)} className="btn-secondary">
            취소
          </button>
          <button
            onClick={() => handleDeleteCriteria(deleteModalId!)}
            className="btn-danger"
          >
            삭제
          </button>
        </div>
      </Modal>

      {/* API Credential Modal */}
      <Modal
        isOpen={showApiModal}
        onClose={() => {
          setShowApiModal(false);
          setEditingChannel(null);
        }}
        title={`${editingChannel ? channelInfo[editingChannel].name : ''} API 설정`}
        size="md"
      >
        <div className="space-y-4">
          {/* 카페24 */}
          {editingChannel === 'cafe24' && (
            <>
              {/* 앱 등록 안내 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium mb-1">Cafe24 앱 등록이 필요합니다</p>
                <p className="text-xs text-amber-700">
                  <a
                    href="https://developers.cafe24.com/app/front/app/develop/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Cafe24 개발자센터
                  </a>
                  에서 앱을 등록하면 Client ID와 Client Secret이 발급됩니다.
                  몰 ID와 Client ID는 서로 다른 값입니다.
                </p>
              </div>

              <div>
                <label className="label">몰 ID *</label>
                <input
                  type="text"
                  value={apiFormData.cafe24.mallId}
                  onChange={(e) =>
                    setApiFormData((prev) => ({
                      ...prev,
                      cafe24: { ...prev.cafe24, mallId: e.target.value },
                    }))
                  }
                  className="input-field"
                  placeholder="your-mall-id"
                />
                <p className="text-xs text-gray-400 mt-1">쇼핑몰 주소의 서브도메인 (예: howpapa.cafe24.com → howpapa)</p>
              </div>
              <div>
                <label className="label">Client ID * <span className="text-xs text-gray-400 font-normal">(몰 ID와 다름)</span></label>
                <input
                  type="text"
                  value={apiFormData.cafe24.clientId}
                  onChange={(e) =>
                    setApiFormData((prev) => ({
                      ...prev,
                      cafe24: { ...prev.cafe24, clientId: e.target.value },
                    }))
                  }
                  className="input-field"
                  placeholder="예: AbCdEfGhIjKlMn (개발자센터에서 발급)"
                />
                <p className="text-xs text-gray-400 mt-1">개발자센터 &gt; 앱 관리에서 확인 가능한 앱 Client ID</p>
              </div>
              <div>
                <label className="label">Client Secret *</label>
                <div className="relative">
                  <input
                    type={showSecrets['cafe24_secret'] ? 'text' : 'password'}
                    value={apiFormData.cafe24.clientSecret}
                    onChange={(e) =>
                      setApiFormData((prev) => ({
                        ...prev,
                        cafe24: { ...prev.cafe24, clientSecret: e.target.value },
                      }))
                    }
                    className="input-field pr-10"
                    placeholder="앱 Client Secret"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('cafe24_secret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets['cafe24_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* OAuth 인증 상태 및 버튼 */}
              {(() => {
                const cafe24Cred = credentials.find((c) => c.channel === 'cafe24');
                const hasToken = !!cafe24Cred?.cafe24?.accessToken;
                return (
                  <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {hasToken ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 font-medium">OAuth 인증 완료</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-700">OAuth 인증이 필요합니다</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      자격증명을 저장한 후, 아래 버튼으로 Cafe24 OAuth 인증을 진행하세요.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const { mallId, clientId } = apiFormData.cafe24;
                        if (!mallId || !clientId) {
                          alert('몰 ID와 Client ID를 먼저 입력해주세요.');
                          return;
                        }
                        try {
                          const redirectUri = `${window.location.origin}/settings?cafe24_callback=true`;
                          const res = await fetch('/.netlify/functions/commerce-proxy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'cafe24-auth-url',
                              mallId,
                              clientId,
                              redirectUri,
                            }),
                          });
                          const data = await res.json();
                          if (data.success && data.authUrl) {
                            window.location.href = data.authUrl;
                          } else {
                            alert(data.error || 'OAuth URL 생성에 실패했습니다.');
                          }
                        } catch {
                          alert('서버 연결에 실패했습니다.');
                        }
                      }}
                      className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {hasToken ? 'OAuth 재인증하기' : 'Cafe24 OAuth 인증하기'}
                    </button>
                  </div>
                );
              })()}
            </>
          )}

          {/* 네이버 스마트스토어 */}
          {editingChannel === 'naver_smartstore' && (
            <>
              <div>
                <label className="label">Client ID (애플리케이션 ID) *</label>
                <input
                  type="text"
                  value={apiFormData.naver.clientId}
                  onChange={(e) =>
                    setApiFormData((prev) => ({
                      ...prev,
                      naver: { ...prev.naver, clientId: e.target.value },
                    }))
                  }
                  className="input-field"
                  placeholder="네이버 커머스 API 애플리케이션 ID"
                />
              </div>
              <div>
                <label className="label">Client Secret *</label>
                <div className="relative">
                  <input
                    type={showSecrets['naver_secret'] ? 'text' : 'password'}
                    value={apiFormData.naver.clientSecret}
                    onChange={(e) =>
                      setApiFormData((prev) => ({
                        ...prev,
                        naver: { ...prev.naver, clientSecret: e.target.value },
                      }))
                    }
                    className="input-field pr-10"
                    placeholder="애플리케이션 Secret"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('naver_secret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets['naver_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 쿠팡 */}
          {editingChannel === 'coupang' && (
            <>
              <div>
                <label className="label">Vendor ID *</label>
                <input
                  type="text"
                  value={apiFormData.coupang.vendorId}
                  onChange={(e) =>
                    setApiFormData((prev) => ({
                      ...prev,
                      coupang: { ...prev.coupang, vendorId: e.target.value },
                    }))
                  }
                  className="input-field"
                  placeholder="쿠팡 Wing 판매자 ID"
                />
              </div>
              <div>
                <label className="label">Access Key *</label>
                <div className="relative">
                  <input
                    type={showSecrets['coupang_access'] ? 'text' : 'password'}
                    value={apiFormData.coupang.accessKey}
                    onChange={(e) =>
                      setApiFormData((prev) => ({
                        ...prev,
                        coupang: { ...prev.coupang, accessKey: e.target.value },
                      }))
                    }
                    className="input-field pr-10"
                    placeholder="API Access Key"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('coupang_access')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets['coupang_access'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Secret Key *</label>
                <div className="relative">
                  <input
                    type={showSecrets['coupang_secret'] ? 'text' : 'password'}
                    value={apiFormData.coupang.secretKey}
                    onChange={(e) =>
                      setApiFormData((prev) => ({
                        ...prev,
                        coupang: { ...prev.coupang, secretKey: e.target.value },
                      }))
                    }
                    className="input-field pr-10"
                    placeholder="API Secret Key"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('coupang_secret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets['coupang_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 안내 */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p>API 키는 안전하게 암호화되어 저장됩니다.</p>
            <p className="mt-1">
              API 키 발급 방법은{' '}
              <a
                href={editingChannel ? channelInfo[editingChannel].docUrl : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                공식 문서
              </a>
              를 참고하세요.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowApiModal(false);
              setEditingChannel(null);
            }}
            className="btn-secondary"
          >
            취소
          </button>
          <button onClick={handleSaveApiCredential} className="btn-primary">
            저장
          </button>
        </div>
      </Modal>

      {/* Field Modal */}
      <Modal
        isOpen={showFieldModal}
        onClose={() => {
          setShowFieldModal(false);
          setEditingField(null);
        }}
        title={editingField ? '필드 수정' : '새 필드 추가'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">필드명 (표시용) *</label>
            <input
              type="text"
              value={fieldFormData.fieldLabel}
              onChange={(e) => setFieldFormData((prev) => ({ ...prev, fieldLabel: e.target.value }))}
              className="input-field"
              placeholder="예: 브랜드, 카테고리, 예산"
            />
          </div>
          <div>
            <label className="label">필드 키 (시스템용) *</label>
            <input
              type="text"
              value={fieldFormData.fieldKey}
              onChange={(e) => setFieldFormData((prev) => ({ ...prev, fieldKey: e.target.value }))}
              className="input-field"
              placeholder="예: brand, category, budget"
              disabled={!!editingField}
            />
            <p className="text-xs text-gray-400 mt-1">영문, 숫자, 언더스코어만 사용 가능합니다</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">필드 타입 *</label>
              <select
                value={fieldFormData.fieldType}
                onChange={(e) => setFieldFormData((prev) => ({ ...prev, fieldType: e.target.value as FieldType }))}
                className="select-field"
              >
                {(Object.keys(fieldTypeLabels) as FieldType[]).map((type) => (
                  <option key={type} value={type}>{fieldTypeLabels[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">필수 여부</label>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setFieldFormData((prev) => ({ ...prev, isRequired: !prev.isRequired }))}
                  className={`w-10 h-6 rounded-full transition-all ${
                    fieldFormData.isRequired ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-all ${
                      fieldFormData.isRequired ? 'ml-5' : 'ml-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-600">{fieldFormData.isRequired ? '필수' : '선택'}</span>
              </div>
            </div>
          </div>

          {/* 선택 타입일 경우 옵션 관리 */}
          {fieldFormData.fieldType === 'select' && (
            <div>
              <label className="label">선택 옵션</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  className="input-field flex-1"
                  placeholder="새 옵션 입력"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="btn-secondary"
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {fieldFormData.fieldOptions.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full"
                  >
                    <span className="text-sm text-gray-700">{option}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {fieldFormData.fieldOptions.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">옵션을 추가해주세요</p>
              )}
            </div>
          )}

          <div>
            <label className="label">플레이스홀더</label>
            <input
              type="text"
              value={fieldFormData.placeholder}
              onChange={(e) => setFieldFormData((prev) => ({ ...prev, placeholder: e.target.value }))}
              className="input-field"
              placeholder="예: 값을 입력하세요..."
            />
          </div>

          {/* 브랜드별 표시 설정 */}
          {(() => {
            // 현재 프로젝트 유형에서 brand 필드의 옵션 가져오기
            const brandField = currentFields.find((f) => f.fieldKey === 'brand');
            const brandOptions = brandField?.fieldOptions || [];

            // 브랜드 필드가 없거나 옵션이 없으면 표시하지 않음
            if (brandOptions.length === 0) return null;

            return (
              <div>
                <label className="label">브랜드별 표시</label>
                <p className="text-xs text-gray-400 mb-2">선택하지 않으면 모든 브랜드에서 표시됩니다</p>
                <div className="flex flex-wrap gap-3">
                  {brandOptions.map((brand) => (
                    <label key={brand} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fieldFormData.visibleForBrands.includes(brand)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFieldFormData((prev) => ({
                              ...prev,
                              visibleForBrands: [...prev.visibleForBrands, brand],
                            }));
                          } else {
                            setFieldFormData((prev) => ({
                              ...prev,
                              visibleForBrands: prev.visibleForBrands.filter((b) => b !== brand),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{brand}</span>
                    </label>
                  ))}
                </div>
                {fieldFormData.visibleForBrands.length > 0 && (
                  <p className="text-xs text-primary-600 mt-2">
                    선택한 브랜드: {fieldFormData.visibleForBrands.join(', ')}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowFieldModal(false);
              setEditingField(null);
            }}
            className="btn-secondary"
          >
            취소
          </button>
          <button onClick={handleSaveField} className="btn-primary">
            {editingField ? '수정' : '추가'}
          </button>
        </div>
      </Modal>

      {/* Delete Field Confirmation Modal */}
      <Modal
        isOpen={!!deleteFieldId}
        onClose={() => setDeleteFieldId(null)}
        title="필드 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 이 필드를 삭제하시겠습니까? 삭제하면 해당 필드가 프로젝트 등록 화면에서 사라집니다.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteFieldId(null)} className="btn-secondary">
            취소
          </button>
          <button
            onClick={() => handleDeleteField(deleteFieldId!)}
            className="btn-danger"
          >
            삭제
          </button>
        </div>
      </Modal>

      {/* 주문 동기화 모달 */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => {
          setShowSyncModal(false);
          setSyncChannel(null);
          setSyncResult(null);
        }}
        title={`${syncChannel ? channelInfo[syncChannel].name : ''} 주문 동기화`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            지정한 기간의 주문 데이터를 가져옵니다. 기존 데이터는 자동으로 업데이트됩니다.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={syncDateRange.startDate}
                onChange={(e) => setSyncDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={syncDateRange.endDate}
                onChange={(e) => setSyncDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                className="input w-full"
              />
            </div>
          </div>

          {syncResult && (
            <div className={`p-3 rounded-lg text-sm ${
              syncResult.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {syncResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {syncResult.message}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowSyncModal(false);
                setSyncChannel(null);
                setSyncResult(null);
              }}
              className="btn-secondary"
            >
              닫기
            </button>
            <button
              onClick={handleSyncOrders}
              disabled={syncingChannel !== null}
              className="btn-primary flex items-center gap-2"
            >
              {syncingChannel ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  동기화 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  동기화 시작
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

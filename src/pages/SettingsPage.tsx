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
} from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useStore } from '../store/useStore';
import { useApiCredentialsStore } from '../store/useApiCredentialsStore';
import { useProjectSettingsStore, defaultProjectTypeLabels } from '../store/useProjectSettingsStore';
import { EvaluationCriteria, ProductCategory, SalesChannel, SyncStatus, ProjectType } from '../types';
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
  } = useStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'criteria' | 'project_types' | 'api' | 'notifications'>('profile');

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

  useEffect(() => {
    fetchProjectTypeSettings();
    fetchNotificationSettings();
  }, [fetchProjectTypeSettings, fetchNotificationSettings]);

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

  // Filter state
  const [filterCategory, setFilterCategory] = useState<ProductCategory | ''>('');

  // API credentials state
  const {
    credentials,
    isLoading: apiLoading,
    testingChannel,
    fetchCredentials,
    saveCredential,
    deleteCredential,
    toggleActive,
    testConnection,
  } = useApiCredentialsStore();

  const [showApiModal, setShowApiModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<SalesChannel | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ channel: SalesChannel; success: boolean; message: string } | null>(null);

  // API Form state
  const [apiFormData, setApiFormData] = useState({
    cafe24: { mallId: '', clientId: '', clientSecret: '' },
    naver: { clientId: '', clientSecret: '' },
    coupang: { vendorId: '', accessKey: '', secretKey: '' },
  });

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

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
      addEvaluationCriteria({
        name: criteriaName,
        description: criteriaDescription,
        category: criteriaCategory,
        maxScore: criteriaMaxScore,
        isActive: true,
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

  const filteredCriteria = filterCategory
    ? evaluationCriteria.filter((c) => c.category === filterCategory)
    : evaluationCriteria;

  const groupedCriteria = filteredCriteria.reduce((acc, criteria) => {
    if (!acc[criteria.category]) {
      acc[criteria.category] = [];
    }
    acc[criteria.category].push(criteria);
    return acc;
  }, {} as Record<string, EvaluationCriteria[]>);

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

    // 3초 후 결과 메시지 숨김
    setTimeout(() => {
      setTestResult(null);
    }, 5000);
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

  const tabs = [
    { id: 'profile', label: '프로필', icon: User },
    { id: 'criteria', label: '평가 항목 관리', icon: Star },
    { id: 'project_types', label: '프로젝트 유형 관리', icon: FolderOpen },
    { id: 'api', label: 'API 연동', icon: Link2 },
    { id: 'notifications', label: '알림 설정', icon: Bell },
  ];

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
                    <Badge variant="primary" className="mt-2">
                      {user?.role === 'admin' ? '관리자' : user?.role === 'member' ? '멤버' : '뷰어'}
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
                            className={`flex items-center justify-between p-4 rounded-xl border ${
                              criteria.isActive
                                ? 'bg-white border-gray-200'
                                : 'bg-gray-50 border-gray-100 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-4">
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

          {activeTab === 'api' && (
            <Card>
              <CardHeader
                title="API 연동 설정"
                subtitle="판매 채널 API를 연동하여 매출 데이터를 자동으로 가져옵니다"
              />
              <div className="space-y-4">
                {/* 안내 메시지 */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">API 연동 준비 중</p>
                      <p>
                        현재 API 자격증명 설정 기능만 제공됩니다.
                        실제 데이터 동기화는 서버 측 구현(Edge Functions) 완료 후 사용 가능합니다.
                      </p>
                    </div>
                  </div>
                </div>

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
                <p className="text-xs text-gray-400 mt-1">카페24 관리자에서 확인할 수 있습니다</p>
              </div>
              <div>
                <label className="label">Client ID *</label>
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
                  placeholder="앱 Client ID"
                />
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
    </div>
  );
}

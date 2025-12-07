import { useState } from 'react';
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
} from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useStore } from '../store/useStore';
import { EvaluationCriteria, ProductCategory } from '../types';

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

  const [activeTab, setActiveTab] = useState<'profile' | 'criteria' | 'notifications'>('profile');

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

  const tabs = [
    { id: 'profile', label: '프로필', icon: User },
    { id: 'criteria', label: '평가 항목 관리', icon: Star },
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

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader title="알림 설정" subtitle="알림 수신 여부를 설정합니다" />
              <div className="space-y-4">
                {[
                  { id: 'deadline', label: '마감일 알림', desc: '프로젝트 마감일 D-3, D-1일 알림' },
                  { id: 'status', label: '상태 변경 알림', desc: '프로젝트 상태가 변경되면 알림' },
                  { id: 'mention', label: '멘션 알림', desc: '누군가 나를 멘션하면 알림' },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <button className="w-10 h-6 bg-primary-500 rounded-full">
                      <div className="w-4 h-4 bg-white rounded-full ml-5" />
                    </button>
                  </div>
                ))}
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
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, CheckCircle, AlertCircle, Clock, MessageCircle, Send } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { usePersonalTaskStore, StatusUpdate } from '../store/usePersonalTaskStore';
import { useStore } from '../store/useStore';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const updateTypes = [
  { value: 'progress', label: '진행 상황', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: '완료', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  { value: 'blocker', label: '이슈/차단', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
  { value: 'general', label: '일반', icon: MessageCircle, color: 'bg-gray-100 text-gray-700' },
] as const;

export default function StatusUpdatesPage() {
  const navigate = useNavigate();
  const { statusUpdates, statusUpdatesLoading, fetchStatusUpdates, addStatusUpdate } = usePersonalTaskStore();
  const { projects } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    type: 'progress' as StatusUpdate['type'],
    projectId: '',
    projectTitle: '',
  });

  useEffect(() => {
    fetchStatusUpdates();
  }, [fetchStatusUpdates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    await addStatusUpdate({
      content: formData.content,
      type: formData.type,
      projectId: formData.projectId || undefined,
      projectTitle: formData.projectTitle || undefined,
    });

    setIsModalOpen(false);
    setFormData({
      content: '',
      type: 'progress',
      projectId: '',
      projectTitle: '',
    });
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setFormData({
      ...formData,
      projectId,
      projectTitle: project?.title || '',
    });
  };

  const getUpdateTypeInfo = (type: StatusUpdate['type']) => {
    return updateTypes.find((t) => t.value === type) || updateTypes[3];
  };

  const groupedUpdates = statusUpdates.reduce((groups, update) => {
    const date = format(parseISO(update.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(update);
    return groups;
  }, {} as Record<string, StatusUpdate[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상태 업데이트</h1>
            <p className="text-gray-500">팀원들과 진행 상황을 공유하세요</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          상태 업데이트
        </button>
      </div>

      {/* Updates Timeline */}
      {statusUpdatesLoading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : statusUpdates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">상태 업데이트가 없습니다</h3>
            <p className="text-gray-500 mb-4">첫 번째 상태 업데이트를 작성해보세요</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              상태 업데이트 작성
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedUpdates).map(([date, updates]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {format(parseISO(date), 'M월 d일 (EEEE)', { locale: ko })}
              </h3>
              <div className="space-y-4">
                {updates.map((update) => {
                  const typeInfo = getUpdateTypeInfo(update.type);
                  const Icon = typeInfo.icon;

                  return (
                    <Card key={update.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeInfo.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{update.userName}</span>
                            <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(parseISO(update.createdAt), {
                                addSuffix: true,
                                locale: ko,
                              })}
                            </span>
                          </div>
                          {update.projectTitle && (
                            <p className="text-sm text-gray-500 mb-2">
                              프로젝트: {update.projectTitle}
                            </p>
                          )}
                          <p className="text-gray-700 whitespace-pre-wrap">{update.content}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Update Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="상태 업데이트"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
            <div className="flex flex-wrap gap-2">
              {updateTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                      formData.type === type.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              관련 프로젝트 (선택)
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="select-field"
            >
              <option value="">프로젝트 선택 (선택사항)</option>
              {projects
                .filter((p) => p.status !== 'completed' && p.status !== 'cancelled')
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input-field min-h-[120px]"
              placeholder="상태 업데이트를 입력하세요..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              취소
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Send className="w-4 h-4" />
              공유
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

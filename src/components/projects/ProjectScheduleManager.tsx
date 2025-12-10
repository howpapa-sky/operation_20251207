import { useState } from 'react';
import {
  Plus,
  Calendar,
  Check,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { useStore } from '../../store/useStore';
import {
  ProjectSchedule,
  ScheduleType,
  scheduleTypeLabels,
  scheduleTypeColors,
} from '../../types';
import { formatDate, getDdayText } from '../../utils/helpers';

interface ProjectScheduleManagerProps {
  projectId: string;
  schedules?: ProjectSchedule[];
  readOnly?: boolean;
}

const scheduleTypes: ScheduleType[] = [
  'sample_delivery',
  'sample_receipt',
  'evaluation',
  'feedback',
  'revision',
  'approval',
  'production',
  'delivery',
  'meeting',
  'other',
];

const reminderOptions = [
  { value: 0, label: '당일' },
  { value: 1, label: '1일 전' },
  { value: 3, label: '3일 전' },
  { value: 7, label: '7일 전' },
];

export default function ProjectScheduleManager({
  projectId,
  schedules = [],
  readOnly = false,
}: ProjectScheduleManagerProps) {
  const { addSchedule, updateSchedule, deleteSchedule, toggleScheduleComplete } = useStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProjectSchedule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    type: 'other' as ScheduleType,
    title: '',
    description: '',
    dueDate: '',
    reminderDays: [] as number[],
    assignee: '',
  });

  const resetForm = () => {
    setFormData({
      type: 'other',
      title: '',
      description: '',
      dueDate: '',
      reminderDays: [],
      assignee: '',
    });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setEditingSchedule(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (schedule: ProjectSchedule) => {
    setFormData({
      type: schedule.type,
      title: schedule.title,
      description: schedule.description || '',
      dueDate: schedule.dueDate.split('T')[0],
      reminderDays: schedule.reminderDays || [],
      assignee: schedule.assignee || '',
    });
    setEditingSchedule(schedule);
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.dueDate) return;

    if (editingSchedule) {
      await updateSchedule(projectId, editingSchedule.id, {
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        dueDate: new Date(formData.dueDate).toISOString(),
        reminderDays: formData.reminderDays.length > 0 ? formData.reminderDays : undefined,
        assignee: formData.assignee || undefined,
      });
    } else {
      await addSchedule(projectId, {
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        dueDate: new Date(formData.dueDate).toISOString(),
        isCompleted: false,
        reminderDays: formData.reminderDays.length > 0 ? formData.reminderDays : undefined,
        assignee: formData.assignee || undefined,
      });
    }

    setShowAddModal(false);
    resetForm();
    setEditingSchedule(null);
  };

  const handleDelete = async (scheduleId: string) => {
    await deleteSchedule(projectId, scheduleId);
    setDeleteConfirmId(null);
  };

  const handleToggleComplete = async (scheduleId: string) => {
    await toggleScheduleComplete(projectId, scheduleId);
  };

  const toggleReminder = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      reminderDays: prev.reminderDays.includes(day)
        ? prev.reminderDays.filter((d) => d !== day)
        : [...prev.reminderDays, day],
    }));
  };

  // 일정 정렬 (미완료 먼저, 날짜순)
  const sortedSchedules = [...schedules].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getScheduleStatus = (schedule: ProjectSchedule) => {
    if (schedule.isCompleted) return 'completed';
    const dueDate = new Date(schedule.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'today';

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return 'soon';
    return 'upcoming';
  };

  const statusStyles = {
    completed: 'bg-green-50 border-green-200',
    overdue: 'bg-red-50 border-red-200',
    today: 'bg-yellow-50 border-yellow-200',
    soon: 'bg-orange-50 border-orange-200',
    upcoming: 'bg-gray-50 border-gray-200',
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">세부 일정</h3>
          <span className="text-sm text-gray-500">
            ({schedules.filter((s) => !s.isCompleted).length}개 진행중)
          </span>
        </div>
        {!readOnly && (
          <button
            onClick={handleOpenAddModal}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            일정 추가
          </button>
        )}
      </div>

      {sortedSchedules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>등록된 세부 일정이 없습니다.</p>
          {!readOnly && (
            <button
              onClick={handleOpenAddModal}
              className="mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              첫 번째 일정 추가하기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSchedules.map((schedule) => {
            const status = getScheduleStatus(schedule);
            const dday = getDdayText(schedule.dueDate);

            return (
              <div
                key={schedule.id}
                className={`p-4 rounded-xl border transition-all ${statusStyles[status]} ${
                  schedule.isCompleted ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 완료 체크박스 */}
                  {!readOnly && (
                    <button
                      onClick={() => handleToggleComplete(schedule.id)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        schedule.isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-primary-500'
                      }`}
                    >
                      {schedule.isCompleted && <Check className="w-3 h-3" />}
                    </button>
                  )}

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${scheduleTypeColors[schedule.type]}20`,
                          color: scheduleTypeColors[schedule.type],
                        }}
                      >
                        {scheduleTypeLabels[schedule.type]}
                      </span>
                      <span
                        className={`font-medium ${
                          schedule.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {schedule.title}
                      </span>
                      {schedule.reminderDays && schedule.reminderDays.length > 0 && (
                        <Bell className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>

                    {schedule.description && (
                      <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-gray-500">
                        {formatDate(schedule.dueDate)}
                      </span>
                      {!schedule.isCompleted && (
                        <Badge
                          variant={
                            status === 'overdue'
                              ? 'danger'
                              : status === 'today'
                              ? 'warning'
                              : status === 'soon'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {dday}
                        </Badge>
                      )}
                      {schedule.isCompleted && schedule.completedDate && (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {formatDate(schedule.completedDate)} 완료
                        </span>
                      )}
                      {schedule.assignee && (
                        <span className="text-gray-500">담당: {schedule.assignee}</span>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(schedule)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(schedule.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 일정 추가/수정 모달 */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSchedule(null);
          resetForm();
        }}
        title={editingSchedule ? '일정 수정' : '새 일정 추가'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              일정 유형 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as ScheduleType }))}
              className="select-field w-full"
            >
              {scheduleTypes.map((type) => (
                <option key={type} value={type}>
                  {scheduleTypeLabels[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              일정 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="예: 1차 샘플 전달"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              예정일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명 (선택)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="일정에 대한 추가 설명"
              rows={2}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자 (선택)
            </label>
            <input
              type="text"
              value={formData.assignee}
              onChange={(e) => setFormData((prev) => ({ ...prev, assignee: e.target.value }))}
              placeholder="담당자 이름"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              알림 설정
            </label>
            <div className="flex flex-wrap gap-2">
              {reminderOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleReminder(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    formData.reminderDays.includes(option.value)
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Bell className={`w-3.5 h-3.5 inline mr-1 ${
                    formData.reminderDays.includes(option.value) ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowAddModal(false);
              setEditingSchedule(null);
              resetForm();
            }}
            className="btn-secondary"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.title || !formData.dueDate}
            className="btn-primary"
          >
            {editingSchedule ? '수정' : '추가'}
          </button>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="일정 삭제"
        size="sm"
      >
        <div className="flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-gray-600">
            이 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary">
            취소
          </button>
          <button
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            className="btn-danger"
          >
            삭제
          </button>
        </div>
      </Modal>
    </Card>
  );
}

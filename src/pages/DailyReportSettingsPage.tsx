import { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Save,
  Clock,
  User,
  Phone,
  Mail,
  Send,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  BarChart3,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

// Type workaround
const db = supabase as any;

interface Recipient {
  name: string;
  phone?: string;
  email?: string;
}

interface DailyReportSetting {
  id: string;
  reportType: 'kakao_alimtalk' | 'naver_works' | 'email';
  isActive: boolean;
  sendTime: string;
  recipients: Recipient[];
  templateId?: string;
  channelId?: string;
  createdAt: string;
  updatedAt: string;
}

const reportTypeLabels = {
  kakao_alimtalk: '카카오 알림톡',
  naver_works: '네이버웍스',
  email: '이메일',
};

const reportTypeIcons = {
  kakao_alimtalk: MessageSquare,
  naver_works: Send,
  email: Mail,
};

// 시간 옵션 생성 (00:00 ~ 23:00)
const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00:00`, label: `${hour}시 00분` };
});

export default function DailyReportSettingsPage() {
  const [settings, setSettings] = useState<DailyReportSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<DailyReportSetting | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    reportType: 'kakao_alimtalk' as DailyReportSetting['reportType'],
    isActive: true,
    sendTime: '09:00:00',
    recipients: [{ name: '', phone: '', email: '' }] as Recipient[],
    templateId: '',
    channelId: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from('daily_report_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: DailyReportSetting[] = (data || []).map((record: any) => ({
        id: record.id,
        reportType: record.report_type,
        isActive: record.is_active,
        sendTime: record.send_time,
        recipients: record.recipients || [],
        templateId: record.template_id,
        channelId: record.channel_id,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      }));

      setSettings(formatted);
    } catch (error) {
      console.error('Fetch settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (setting?: DailyReportSetting) => {
    if (setting) {
      setEditingSetting(setting);
      setFormData({
        reportType: setting.reportType,
        isActive: setting.isActive,
        sendTime: setting.sendTime,
        recipients: setting.recipients.length > 0 ? setting.recipients : [{ name: '', phone: '', email: '' }],
        templateId: setting.templateId || '',
        channelId: setting.channelId || '',
      });
    } else {
      setEditingSetting(null);
      setFormData({
        reportType: 'kakao_alimtalk',
        isActive: true,
        sendTime: '09:00:00',
        recipients: [{ name: '', phone: '', email: '' }],
        templateId: '',
        channelId: '',
      });
    }
    setShowAddModal(true);
  };

  const handleSave = async () => {
    const validRecipients = formData.recipients.filter(r => r.name && (r.phone || r.email));

    if (validRecipients.length === 0) {
      alert('최소 1명의 수신자가 필요합니다.');
      return;
    }

    try {
      const dbData = {
        report_type: formData.reportType,
        is_active: formData.isActive,
        send_time: formData.sendTime,
        recipients: validRecipients,
        template_id: formData.templateId || null,
        channel_id: formData.channelId || null,
      };

      if (editingSetting) {
        const { error } = await db
          .from('daily_report_settings')
          .update(dbData)
          .eq('id', editingSetting.id);

        if (error) throw error;
      } else {
        const { error } = await db
          .from('daily_report_settings')
          .insert(dbData);

        if (error) throw error;
      }

      setShowAddModal(false);
      fetchSettings();
    } catch (error) {
      console.error('Save setting error:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 알림 설정을 삭제하시겠습니까?')) return;

    try {
      const { error } = await db
        .from('daily_report_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSettings();
    } catch (error) {
      console.error('Delete setting error:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await db
        .from('daily_report_settings')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchSettings();
    } catch (error) {
      console.error('Toggle active error:', error);
    }
  };

  const addRecipient = () => {
    setFormData({
      ...formData,
      recipients: [...formData.recipients, { name: '', phone: '', email: '' }],
    });
  };

  const removeRecipient = (index: number) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((_, i) => i !== index),
    });
  };

  const updateRecipient = (index: number, field: keyof Recipient, value: string) => {
    const newRecipients = [...formData.recipients];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    setFormData({ ...formData, recipients: newRecipients });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">일일 리포트 설정</h1>
            <p className="text-gray-500">카카오 알림톡으로 일일 매출 리포트 발송</p>
          </div>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          알림 추가
        </button>
      </div>

      {/* 알림톡 미리보기 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 설정 목록 */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <Card>
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            </Card>
          ) : settings.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-4">등록된 알림 설정이 없습니다.</p>
                <button onClick={() => openModal()} className="btn-primary">
                  알림 추가하기
                </button>
              </div>
            </Card>
          ) : (
            settings.map((setting) => {
              const Icon = reportTypeIcons[setting.reportType];
              return (
                <Card key={setting.id}>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      setting.reportType === 'kakao_alimtalk' && "bg-yellow-100",
                      setting.reportType === 'naver_works' && "bg-green-100",
                      setting.reportType === 'email' && "bg-blue-100",
                    )}>
                      <Icon className={cn(
                        "w-6 h-6",
                        setting.reportType === 'kakao_alimtalk' && "text-yellow-600",
                        setting.reportType === 'naver_works' && "text-green-600",
                        setting.reportType === 'email' && "text-blue-600",
                      )} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {reportTypeLabels[setting.reportType]}
                        </h3>
                        <Badge variant={setting.isActive ? 'success' : 'gray'}>
                          {setting.isActive ? '활성' : '비활성'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          매일 {setting.sendTime.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {setting.recipients.length}명
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {setting.recipients.map((r, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                            {r.name} {r.phone && `(${r.phone})`}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(setting.id, setting.isActive)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                          setting.isActive
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        )}
                      >
                        {setting.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => openModal(setting)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(setting.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* 알림톡 미리보기 */}
        <div>
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-yellow-500" />
              알림톡 미리보기
            </h3>
            <div className="bg-yellow-50 rounded-2xl p-4 text-sm">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="font-bold text-gray-900 mb-3">[전체]</p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-600 font-medium">
                    <DollarSign className="w-4 h-4" />
                    판매 실적
                  </div>

                  <div className="ml-4 space-y-1 text-gray-700">
                    <p className="font-medium">-판매채널1</p>
                    <p className="text-gray-500 ml-2">결제금액: 0원</p>
                    <p className="text-gray-500 ml-2">매출총이익: 0원</p>
                    <p className="font-medium mt-2">-판매채널2</p>
                    <p className="text-gray-500 ml-2">결제금액: 0원</p>
                    <p className="text-gray-500 ml-2">매출총이익: 0원</p>
                    <p>...</p>
                  </div>

                  <div className="flex items-center gap-2 text-purple-600 font-medium mt-4">
                    <BarChart3 className="w-4 h-4" />
                    광고 실적
                  </div>

                  <div className="ml-4 space-y-1 text-gray-700">
                    <p className="font-medium">-광고 채널1</p>
                    <p className="text-gray-500 ml-2">광고비: 0원</p>
                    <p className="text-gray-500 ml-2">전환값: 0원</p>
                    <p className="text-gray-500 ml-2">ROAS: 0원</p>
                    <p className="font-medium mt-2">-광고 채널2</p>
                    <p className="text-gray-500 ml-2">광고비: 0원</p>
                    <p className="text-gray-500 ml-2">전환값: 0원</p>
                    <p className="text-gray-500 ml-2">ROAS: 0원</p>
                    <p>...</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">발송 안내</p>
                  <ul className="list-disc ml-4 text-xs space-y-1">
                    <li>판매채널 상위 3개, 전체 합계</li>
                    <li>광고채널 상위 3개, 전체 합계</li>
                    <li>매일 설정한 시간에 자동 발송</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingSetting ? '알림 설정 수정' : '새 알림 추가'}
        size="md"
      >
        <div className="space-y-4">
          {/* 메신저 선택 */}
          <div>
            <label className="label">메신저</label>
            <select
              value={formData.reportType}
              onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
              className="select-field"
            >
              <option value="kakao_alimtalk">카카오 알림톡</option>
              <option value="naver_works">네이버웍스</option>
              <option value="email">이메일</option>
            </select>
          </div>

          {/* 발송 시간 */}
          <div>
            <label className="label">발송 시간</label>
            <select
              value={formData.sendTime}
              onChange={(e) => setFormData({ ...formData, sendTime: e.target.value })}
              className="select-field"
            >
              {timeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 템플릿/채널 ID (카카오/네이버웍스) */}
          {formData.reportType === 'kakao_alimtalk' && (
            <div>
              <label className="label">템플릿 ID (선택)</label>
              <input
                type="text"
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                className="input-field"
                placeholder="카카오 비즈메시지 템플릿 ID"
              />
            </div>
          )}

          {formData.reportType === 'naver_works' && (
            <div>
              <label className="label">채널 ID (선택)</label>
              <input
                type="text"
                value={formData.channelId}
                onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                className="input-field"
                placeholder="네이버웍스 채널 ID"
              />
            </div>
          )}

          {/* 수신자 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">수신자</label>
              <button
                type="button"
                onClick={addRecipient}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                + 추가
              </button>
            </div>
            <div className="space-y-3">
              {formData.recipients.map((recipient, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                    className="input-field flex-1"
                    placeholder="이름"
                  />
                  {(formData.reportType === 'kakao_alimtalk' || formData.reportType === 'naver_works') && (
                    <input
                      type="text"
                      value={recipient.phone || ''}
                      onChange={(e) => updateRecipient(index, 'phone', e.target.value)}
                      className="input-field flex-1"
                      placeholder="전화번호 (-없이)"
                    />
                  )}
                  {formData.reportType === 'email' && (
                    <input
                      type="email"
                      value={recipient.email || ''}
                      onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                      className="input-field flex-1"
                      placeholder="이메일"
                    />
                  )}
                  {formData.recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecipient(index)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 활성 상태 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm text-gray-700">활성화 (즉시 발송 시작)</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowAddModal(false)} className="btn-secondary">
            취소
          </button>
          <button onClick={handleSave} className="btn-primary">
            {editingSetting ? '수정' : '추가'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

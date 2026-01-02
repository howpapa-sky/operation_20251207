import { useState } from 'react';
import { X, UserPlus, FileSpreadsheet, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import {
  SeedingInfluencer,
  SeedingType,
  ContentType,
  SeedingPlatform,
  seedingTypeLabels,
  contentTypeLabels,
  seedingPlatformLabels,
} from '../../types';

interface SeedingAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onAddSingle: (data: Omit<SeedingInfluencer, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onAddBulk: (data: Omit<SeedingInfluencer, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
}

type TabType = 'single' | 'bulk';

interface SingleFormData {
  account_id: string;
  account_name: string;
  platform: SeedingPlatform;
  email: string;
  phone: string;
  follower_count: string;
  category: string;
  seeding_type: SeedingType;
  content_type: ContentType;
  fee: string;
  notes: string;
}

const defaultSingleForm: SingleFormData = {
  account_id: '',
  account_name: '',
  platform: 'instagram',
  email: '',
  phone: '',
  follower_count: '',
  category: '',
  seeding_type: 'free',
  content_type: 'story',
  fee: '',
  notes: '',
};

export default function SeedingAddModal({
  isOpen,
  onClose,
  projectId,
  onAddSingle,
  onAddBulk,
}: SeedingAddModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('single');
  const [singleForm, setSingleForm] = useState<SingleFormData>(defaultSingleForm);
  const [bulkText, setBulkText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkPreview, setBulkPreview] = useState<{ valid: number; invalid: number; data: any[] }>({
    valid: 0,
    invalid: 0,
    data: [],
  });

  const validateSingleForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!singleForm.account_id.trim()) {
      newErrors.account_id = '계정 ID를 입력하세요.';
    }
    if (singleForm.seeding_type === 'paid' && (!singleForm.fee || Number(singleForm.fee) <= 0)) {
      newErrors.fee = '유가 시딩의 경우 원고비를 입력하세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSingleForm()) return;

    setIsLoading(true);
    try {
      await onAddSingle({
        project_id: projectId,
        account_id: singleForm.account_id.trim().replace(/^@/, ''),
        account_name: singleForm.account_name.trim() || undefined,
        platform: singleForm.platform,
        email: singleForm.email.trim() || undefined,
        phone: singleForm.phone.trim() || undefined,
        follower_count: Number(singleForm.follower_count) || 0,
        category: singleForm.category.trim() || undefined,
        seeding_type: singleForm.seeding_type,
        content_type: singleForm.content_type,
        fee: singleForm.seeding_type === 'paid' ? Number(singleForm.fee) : 0,
        status: 'listed',
        shipping: {
          recipient_name: '',
          phone: '',
          address: '',
          quantity: 1,
        },
        notes: singleForm.notes.trim() || undefined,
      });
      setSingleForm(defaultSingleForm);
      onClose();
    } catch (error) {
      console.error('Failed to add influencer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseBulkText = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim());
    const parsed: any[] = [];
    let invalid = 0;

    lines.forEach((line, index) => {
      // 탭 또는 쉼표로 구분된 데이터 파싱
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');

      if (parts.length >= 1 && parts[0].trim()) {
        parsed.push({
          account_id: parts[0].trim().replace(/^@/, ''),
          account_name: parts[1]?.trim() || '',
          follower_count: parseInt(parts[2]?.trim().replace(/[^0-9]/g, '') || '0'),
          email: parts[3]?.trim() || '',
          phone: parts[4]?.trim() || '',
          line: index + 1,
        });
      } else {
        invalid++;
      }
    });

    setBulkPreview({
      valid: parsed.length,
      invalid,
      data: parsed.slice(0, 5), // 미리보기는 5개만
    });
  };

  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    if (text.trim()) {
      parseBulkText(text);
    } else {
      setBulkPreview({ valid: 0, invalid: 0, data: [] });
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkPreview.valid === 0) return;

    setIsLoading(true);
    try {
      const lines = bulkText.split('\n').filter((line) => line.trim());
      const influencers = lines.map((line) => {
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        return {
          project_id: projectId,
          account_id: parts[0].trim().replace(/^@/, ''),
          account_name: parts[1]?.trim() || undefined,
          platform: 'instagram' as SeedingPlatform,
          email: parts[3]?.trim() || undefined,
          phone: parts[4]?.trim() || undefined,
          follower_count: parseInt(parts[2]?.trim().replace(/[^0-9]/g, '') || '0'),
          seeding_type: 'free' as SeedingType,
          content_type: 'story' as ContentType,
          fee: 0,
          status: 'listed' as const,
          shipping: {
            recipient_name: '',
            phone: '',
            address: '',
            quantity: 1,
          },
        };
      });

      await onAddBulk(influencers);
      setBulkText('');
      setBulkPreview({ valid: 0, invalid: 0, data: [] });
      onClose();
    } catch (error) {
      console.error('Failed to add influencers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">인플루언서 추가</h2>
                <p className="text-sm text-gray-500">시딩할 인플루언서를 등록합니다</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'single'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              단일 추가
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bulk'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              일괄 추가
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'single' ? (
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                {/* Account ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    계정 ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={singleForm.account_id}
                    onChange={(e) => setSingleForm({ ...singleForm, account_id: e.target.value })}
                    placeholder="@username"
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${
                      errors.account_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.account_id && <p className="mt-1 text-sm text-red-500">{errors.account_id}</p>}
                </div>

                {/* Name & Followers */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <input
                      type="text"
                      value={singleForm.account_name}
                      onChange={(e) => setSingleForm({ ...singleForm, account_name: e.target.value })}
                      placeholder="실명 또는 닉네임"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">팔로워 수</label>
                    <input
                      type="number"
                      value={singleForm.follower_count}
                      onChange={(e) => setSingleForm({ ...singleForm, follower_count: e.target.value })}
                      placeholder="10000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Platform & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">플랫폼</label>
                    <select
                      value={singleForm.platform}
                      onChange={(e) => setSingleForm({ ...singleForm, platform: e.target.value as SeedingPlatform })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    >
                      {Object.entries(seedingPlatformLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                    <input
                      type="text"
                      value={singleForm.category}
                      onChange={(e) => setSingleForm({ ...singleForm, category: e.target.value })}
                      placeholder="뷰티, 육아, 라이프스타일..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Seeding Type & Content Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시딩 유형</label>
                    <div className="flex gap-2">
                      {(['free', 'paid'] as SeedingType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSingleForm({ ...singleForm, seeding_type: type })}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
                            singleForm.seeding_type === type
                              ? type === 'free'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-violet-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {seedingTypeLabels[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">콘텐츠 유형</label>
                    <select
                      value={singleForm.content_type}
                      onChange={(e) => setSingleForm({ ...singleForm, content_type: e.target.value as ContentType })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    >
                      {Object.entries(contentTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fee (for paid) */}
                {singleForm.seeding_type === 'paid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      원고비 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₩</span>
                      <input
                        type="number"
                        value={singleForm.fee}
                        onChange={(e) => setSingleForm({ ...singleForm, fee: e.target.value })}
                        placeholder="100000"
                        className={`w-full pl-8 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${
                          errors.fee ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.fee && <p className="mt-1 text-sm text-red-500">{errors.fee}</p>}
                  </div>
                )}

                {/* Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input
                      type="email"
                      value={singleForm.email}
                      onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                    <input
                      type="text"
                      value={singleForm.phone}
                      onChange={(e) => setSingleForm({ ...singleForm, phone: e.target.value })}
                      placeholder="010-0000-0000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                  <textarea
                    value={singleForm.notes}
                    onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                    rows={2}
                    placeholder="특이사항..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  추가하기
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Instructions */}
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-700">
                    엑셀이나 스프레드시트에서 복사한 데이터를 붙여넣으세요.<br />
                    <span className="text-xs text-blue-600">
                      형식: 계정ID, 이름, 팔로워수, 이메일, 전화번호 (탭 또는 쉼표 구분)
                    </span>
                  </p>
                </div>

                {/* Text Area */}
                <textarea
                  value={bulkText}
                  onChange={(e) => handleBulkTextChange(e.target.value)}
                  rows={8}
                  placeholder="@username1, 홍길동, 10000, email@example.com, 010-1234-5678
@username2, 김철수, 25000, ..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 font-mono text-sm resize-none"
                />

                {/* Preview */}
                {bulkPreview.valid > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{bulkPreview.valid}개 유효</span>
                      </div>
                      {bulkPreview.invalid > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span>{bulkPreview.invalid}개 오류</span>
                        </div>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">계정</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">이름</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">팔로워</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {bulkPreview.data.map((item, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-gray-900">@{item.account_id}</td>
                              <td className="px-3 py-2 text-gray-600">{item.account_name || '-'}</td>
                              <td className="px-3 py-2 text-gray-600">{item.follower_count.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bulkPreview.valid > 5 && (
                        <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                          +{bulkPreview.valid - 5}개 더...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleBulkSubmit}
                  disabled={isLoading || bulkPreview.valid === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {bulkPreview.valid > 0 ? `${bulkPreview.valid}명 일괄 추가` : '일괄 추가'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

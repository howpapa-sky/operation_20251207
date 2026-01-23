import { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Package,
  MapPin,
  Phone,
  Mail,
  Copy,
  Check,
  Edit2,
  Save,
  ChevronRight,
  List,
  Send,
  CheckCircle,
  XCircle,
  BookOpen,
  Image,
  Award,
} from 'lucide-react';
import {
  SeedingInfluencer,
  SeedingStatus,
  ShippingInfo,
  SeedingPerformance,
  seedingStatusLabels,
  seedingTypeLabels,
  contentTypeLabels,
  seedingPlatformLabels,
} from '../../types';
import PerformanceInputForm from './PerformanceInputForm';

interface SeedingDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  influencer: SeedingInfluencer | null;
  onStatusChange: (id: string, status: SeedingStatus) => Promise<void>;
  onShippingUpdate: (id: string, shipping: Partial<ShippingInfo>) => Promise<void>;
  onPerformanceUpdate: (id: string, performance: Partial<SeedingPerformance>) => Promise<void>;
  onInfluencerUpdate: (id: string, updates: Partial<SeedingInfluencer>) => Promise<void>;
}

// 상태별 설정
const statusConfig: Record<SeedingStatus, { color: string; bgColor: string; icon: React.ElementType }> = {
  listed: { color: 'text-slate-600', bgColor: 'bg-slate-100', icon: List },
  contacted: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Send },
  accepted: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  rejected: { color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  shipped: { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Package },
  guide_sent: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: BookOpen },
  posted: { color: 'text-pink-600', bgColor: 'bg-pink-100', icon: Image },
  completed: { color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Award },
};

// 상태 진행 순서
const statusFlow: SeedingStatus[] = [
  'listed',
  'contacted',
  'accepted',
  'shipped',
  'guide_sent',
  'posted',
  'completed',
];

export default function SeedingDetailPanel({
  isOpen,
  onClose,
  influencer,
  onStatusChange,
  onShippingUpdate,
  onPerformanceUpdate,
  onInfluencerUpdate,
}: SeedingDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'shipping' | 'performance' | 'timeline'>('info');
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [shippingForm, setShippingForm] = useState<ShippingInfo | null>(null);
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (influencer) {
      setShippingForm(influencer.shipping);
      setNotes(influencer.notes || '');
    }
  }, [influencer]);

  if (!isOpen || !influencer) return null;

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleStatusChange = async (status: SeedingStatus) => {
    setIsSaving(true);
    try {
      await onStatusChange(influencer.id, status);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShipping = async () => {
    if (!shippingForm) return;
    setIsSaving(true);
    try {
      await onShippingUpdate(influencer.id, shippingForm);
      setIsEditingShipping(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await onInfluencerUpdate(influencer.id, { notes });
      setIsEditingNotes(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePerformanceSave = async (performance: SeedingPerformance) => {
    setIsSaving(true);
    try {
      await onPerformanceUpdate(influencer.id, performance);
    } finally {
      setIsSaving(false);
    }
  };

  // 프로필 URL
  const getProfileUrl = () => {
    if (influencer.profile_url) return influencer.profile_url;
    if (influencer.platform === 'instagram') {
      return `https://instagram.com/${influencer.account_id.replace('@', '')}`;
    }
    return null;
  };

  const profileUrl = getProfileUrl();
  const StatusIcon = statusConfig[influencer.status].icon;

  // 타임라인 데이터
  const timeline = [
    { status: 'listed', date: influencer.created_at, label: '리스트업' },
    influencer.contacted_at && { status: 'contacted', date: influencer.contacted_at, label: '연락완료' },
    influencer.accepted_at && { status: 'accepted', date: influencer.accepted_at, label: '수락' },
    influencer.rejected_at && { status: 'rejected', date: influencer.rejected_at, label: '거절', reason: influencer.rejection_reason },
    influencer.shipping?.shipped_at && { status: 'shipped', date: influencer.shipping.shipped_at, label: '제품발송' },
    influencer.guide_sent_at && { status: 'guide_sent', date: influencer.guide_sent_at, label: '가이드발송' },
    influencer.posted_at && { status: 'posted', date: influencer.posted_at, label: '포스팅완료' },
    influencer.completed_at && { status: 'completed', date: influencer.completed_at, label: '완료' },
  ].filter(Boolean) as { status: string; date: string; label: string; reason?: string }[];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transform transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-lg font-medium">
              {influencer.account_id.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {influencer.account_id.startsWith('@') ? influencer.account_id : `@${influencer.account_id}`}
                </h2>
                {profileUrl && (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-primary-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {influencer.account_name && <span>{influencer.account_name}</span>}
                <span>•</span>
                <span>{formatFollowers(influencer.follower_count)} 팔로워</span>
                {influencer.following_count !== undefined && influencer.following_count > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatFollowers(influencer.following_count)} 팔로잉</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status & Quick Actions */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusConfig[influencer.status].bgColor}`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig[influencer.status].color}`} />
              </div>
              <div>
                <div className="text-sm text-gray-500">현재 상태</div>
                <div className={`font-semibold ${statusConfig[influencer.status].color}`}>
                  {seedingStatusLabels[influencer.status]}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  influencer.seeding_type === 'free'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-violet-100 text-violet-700'
                }`}
              >
                {seedingTypeLabels[influencer.seeding_type]}
                {influencer.seeding_type === 'paid' && influencer.fee && ` ${formatCurrency(influencer.fee)}`}
              </span>
              <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                {contentTypeLabels[influencer.content_type]}
              </span>
            </div>
          </div>

          {/* Status Flow Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {statusFlow.map((status, index) => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const isCurrent = influencer.status === status;
              const isPast = statusFlow.indexOf(influencer.status) > index;

              return (
                <button
                  key={status}
                  onClick={() => !isSaving && handleStatusChange(status)}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isCurrent
                      ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current`
                      : isPast
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {seedingStatusLabels[status]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'info', label: '기본정보' },
            { id: 'shipping', label: '배송정보' },
            { id: 'performance', label: '성과입력' },
            { id: 'timeline', label: '타임라인' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">연락처</h3>
                <div className="space-y-2">
                  {influencer.email && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{influencer.email}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(influencer.email!, 'email')}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        {copied === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                  {influencer.phone && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{influencer.phone}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(influencer.phone!, 'phone')}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        {copied === 'phone' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                  {!influencer.email && !influencer.phone && (
                    <p className="text-sm text-gray-400">등록된 연락처가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">메모</h3>
                  {isEditingNotes ? (
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Save className="w-4 h-4" />
                      저장
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 className="w-4 h-4" />
                      수정
                    </button>
                  )}
                </div>
                {isEditingNotes ? (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    placeholder="메모를 입력하세요..."
                  />
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {notes || '메모가 없습니다.'}
                  </p>
                )}
              </div>

              {/* Posting Info */}
              {influencer.posting_url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">포스팅 정보</h3>
                  <a
                    href={influencer.posting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-primary-600 hover:bg-gray-100"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm truncate">{influencer.posting_url}</span>
                  </a>
                  {influencer.posted_at && (
                    <p className="mt-2 text-xs text-gray-500">
                      포스팅 일시: {formatDate(influencer.posted_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Shipping Tab */}
          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">배송 정보</h3>
                {isEditingShipping ? (
                  <button
                    onClick={handleSaveShipping}
                    disabled={isSaving}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingShipping(true)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <Edit2 className="w-4 h-4" />
                    수정
                  </button>
                )}
              </div>

              {isEditingShipping && shippingForm ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">수령인</label>
                    <input
                      type="text"
                      value={shippingForm.recipient_name}
                      onChange={(e) => setShippingForm({ ...shippingForm, recipient_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">연락처</label>
                    <input
                      type="text"
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">주소</label>
                    <input
                      type="text"
                      value={shippingForm.address}
                      onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">택배사</label>
                      <input
                        type="text"
                        value={shippingForm.carrier || ''}
                        onChange={(e) => setShippingForm({ ...shippingForm, carrier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">송장번호</label>
                      <input
                        type="text"
                        value={shippingForm.tracking_number || ''}
                        onChange={(e) => setShippingForm({ ...shippingForm, tracking_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">수량</label>
                    <input
                      type="number"
                      min={1}
                      value={shippingForm.quantity}
                      onChange={(e) => setShippingForm({ ...shippingForm, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{influencer.shipping?.recipient_name || '-'}</span>
                    </div>
                    <p className="text-sm text-gray-500 pl-6">{influencer.shipping?.address || '주소 미입력'}</p>
                    <p className="text-sm text-gray-500 pl-6">{influencer.shipping?.phone || ''}</p>
                  </div>
                  {influencer.shipping?.tracking_number && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{influencer.shipping.carrier || '택배'}</span>
                        <span className="font-mono text-gray-900">{influencer.shipping.tracking_number}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <PerformanceInputForm
              performance={influencer.performance || {}}
              onSave={handlePerformanceSave}
              isSaving={isSaving}
            />
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">상태 변경 이력</h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-4">
                  {timeline.map((item, index) => {
                    const config = statusConfig[item.status as SeedingStatus];
                    const Icon = config?.icon || List;

                    return (
                      <div key={index} className="relative flex gap-4 pl-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config?.bgColor || 'bg-gray-100'} z-10`}>
                          <Icon className={`w-4 h-4 ${config?.color || 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="font-medium text-gray-900">{item.label}</div>
                          <div className="text-xs text-gray-500">{formatDate(item.date)}</div>
                          {item.reason && (
                            <div className="mt-1 text-sm text-red-600">사유: {item.reason}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

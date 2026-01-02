import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  MoreHorizontal,
  Truck,
  Package,
  MapPin,
} from 'lucide-react';
import { SeedingInfluencer, SeedingProject, seedingStatusLabels, seedingStatusColors } from '../../types';

// 택배사 목록
export const carriers = [
  { value: 'cj', label: 'CJ대한통운', trackingUrl: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=' },
  { value: 'hanjin', label: '한진택배', trackingUrl: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession=&inv_no=' },
  { value: 'lotte', label: '롯데택배', trackingUrl: 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=' },
  { value: 'logen', label: '로젠택배', trackingUrl: 'https://www.ilogen.com/web/personal/trace/' },
  { value: 'post', label: '우체국택배', trackingUrl: 'https://service.epost.go.kr/trace.RetrieveDomRi498.parcel?sid1=' },
  { value: 'coupang', label: '쿠팡 로켓배송', trackingUrl: null },
  { value: 'other', label: '기타', trackingUrl: null },
];

interface ShippingTableRowProps {
  influencer: SeedingInfluencer;
  project?: SeedingProject;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onUpdateShipping: (
    id: string,
    carrier: string,
    trackingNumber: string
  ) => Promise<void>;
  onCopyAddress: (influencer: SeedingInfluencer) => void;
}

type ShippingDisplayStatus = 'pending' | 'shipping' | 'delivered';

function getShippingStatus(influencer: SeedingInfluencer): ShippingDisplayStatus {
  if (influencer.shipping?.delivered_at) return 'delivered';
  if (influencer.status === 'shipped' || influencer.shipping?.tracking_number) return 'shipping';
  return 'pending';
}

export default function ShippingTableRow({
  influencer,
  project,
  isSelected,
  onSelect,
  onUpdateShipping,
  onCopyAddress,
}: ShippingTableRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [carrier, setCarrier] = useState(influencer.shipping?.carrier || '');
  const [trackingNumber, setTrackingNumber] = useState(influencer.shipping?.tracking_number || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onUpdateShipping(influencer.id, carrier, trackingNumber);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save shipping info:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCarrier(influencer.shipping?.carrier || '');
      setTrackingNumber(influencer.shipping?.tracking_number || '');
    }
  };

  const handleCopyAddress = () => {
    onCopyAddress(influencer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setShowMenu(false);
  };

  const getTrackingUrl = () => {
    if (!trackingNumber || !carrier) return null;
    const carrierInfo = carriers.find((c) => c.value === carrier);
    if (!carrierInfo?.trackingUrl) return null;
    return carrierInfo.trackingUrl + trackingNumber;
  };

  const formatAddress = () => {
    const shipping = influencer.shipping;
    if (!shipping) return '-';
    const parts = [shipping.postal_code, shipping.address].filter(Boolean);
    return parts.join(' ') || '-';
  };

  const shippingStatus = getShippingStatus(influencer);

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <tr className="hover:bg-gray-50 group">
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(influencer.id, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      </td>

      {/* Status Badge */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            shippingStatus === 'delivered'
              ? 'bg-green-100 text-green-700'
              : shippingStatus === 'shipping'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {shippingStatus === 'delivered' ? (
            <Check className="w-3 h-3" />
          ) : shippingStatus === 'shipping' ? (
            <Truck className="w-3 h-3" />
          ) : (
            <Package className="w-3 h-3" />
          )}
          {shippingStatus === 'delivered'
            ? '배송완료'
            : shippingStatus === 'shipping'
            ? '배송중'
            : '발송대기'}
        </span>
      </td>

      {/* Account */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {influencer.account_id.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              @{influencer.account_id.replace('@', '')}
            </div>
            <div className="text-xs text-gray-500">
              {formatFollowers(influencer.follower_count)} 팔로워
            </div>
          </div>
        </div>
      </td>

      {/* Recipient */}
      <td className="px-4 py-3">
        <div className="text-sm text-gray-900">
          {influencer.shipping?.recipient_name || '-'}
        </div>
        <div className="text-xs text-gray-500">
          {influencer.shipping?.phone || ''}
        </div>
      </td>

      {/* Address */}
      <td className="px-4 py-3 max-w-[200px]">
        <div className="flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-600 truncate" title={formatAddress()}>
            {formatAddress()}
          </span>
        </div>
      </td>

      {/* Quantity */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-gray-900">
          {influencer.shipping?.quantity || 1}
        </span>
      </td>

      {/* Carrier & Tracking */}
      <td className="px-4 py-3 min-w-[260px]">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">택배사</option>
              {carriers.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              ref={inputRef}
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="송장번호 입력"
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {influencer.shipping?.tracking_number ? (
              <>
                <span className="text-xs text-gray-500">
                  {carriers.find((c) => c.value === influencer.shipping?.carrier)?.label || influencer.shipping?.carrier}
                </span>
                <span className="text-sm font-mono text-gray-900">
                  {influencer.shipping.tracking_number}
                </span>
                {getTrackingUrl() && (
                  <a
                    href={getTrackingUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-primary-600"
                    title="배송 조회"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-gray-400 hover:text-primary-600"
              >
                + 송장번호 입력
              </button>
            )}
            {influencer.shipping?.tracking_number && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-gray-400 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                수정
              </button>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    복사됨!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    주소 복사
                  </>
                )}
              </button>
              {influencer.profile_url && (
                <a
                  href={influencer.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  프로필 보기
                </a>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

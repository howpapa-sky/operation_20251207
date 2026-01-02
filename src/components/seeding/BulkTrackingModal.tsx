import { useState, useEffect } from 'react';
import { X, Upload, Truck, AlertCircle, Check, Loader2 } from 'lucide-react';
import { SeedingInfluencer } from '../../types';
import { carriers } from './ShippingTableRow';

interface BulkTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInfluencers: SeedingInfluencer[];
  onBulkUpdate: (
    updates: { id: string; carrier: string; trackingNumber: string }[]
  ) => Promise<void>;
}

interface TrackingEntry {
  id: string;
  accountId: string;
  carrier: string;
  trackingNumber: string;
  isValid: boolean;
}

export default function BulkTrackingModal({
  isOpen,
  onClose,
  selectedInfluencers,
  onBulkUpdate,
}: BulkTrackingModalProps) {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [defaultCarrier, setDefaultCarrier] = useState('cj');
  const [isSaving, setIsSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Initialize entries when modal opens
  useEffect(() => {
    if (isOpen) {
      setEntries(
        selectedInfluencers.map((inf) => ({
          id: inf.id,
          accountId: inf.account_id,
          carrier: inf.shipping?.carrier || defaultCarrier,
          trackingNumber: inf.shipping?.tracking_number || '',
          isValid: true,
        }))
      );
      setParseError(null);
    }
  }, [isOpen, selectedInfluencers, defaultCarrier]);

  const handleEntryChange = (
    index: number,
    field: 'carrier' | 'trackingNumber',
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? {
              ...entry,
              [field]: value,
              isValid: field === 'trackingNumber' ? value.trim().length > 0 : entry.isValid,
            }
          : entry
      )
    );
  };

  const handleBulkPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const lines = text.split('\n').filter((line) => line.trim());

    setParseError(null);

    if (lines.length === 0) return;

    // Try to parse as: accountId\ttrackingNumber or just trackingNumber per line
    const newEntries = [...entries];
    let matchCount = 0;

    lines.forEach((line, lineIndex) => {
      const parts = line.split(/[\t,]/).map((p) => p.trim());

      if (parts.length >= 2) {
        // Format: accountId, trackingNumber
        const [accountId, trackingNumber] = parts;
        const entryIndex = newEntries.findIndex(
          (e) =>
            e.accountId.toLowerCase().replace('@', '') ===
            accountId.toLowerCase().replace('@', '')
        );
        if (entryIndex >= 0) {
          newEntries[entryIndex].trackingNumber = trackingNumber;
          newEntries[entryIndex].isValid = trackingNumber.length > 0;
          matchCount++;
        }
      } else if (parts.length === 1 && lineIndex < newEntries.length) {
        // Just tracking number, apply to entries in order
        newEntries[lineIndex].trackingNumber = parts[0];
        newEntries[lineIndex].isValid = parts[0].length > 0;
        matchCount++;
      }
    });

    if (matchCount === 0) {
      setParseError('일치하는 인플루언서를 찾을 수 없습니다. 형식: @계정ID, 송장번호');
    } else {
      setEntries(newEntries);
    }
  };

  const handleApplyDefaultCarrier = () => {
    setEntries((prev) =>
      prev.map((entry) => ({
        ...entry,
        carrier: defaultCarrier,
      }))
    );
  };

  const handleSave = async () => {
    const validEntries = entries.filter((e) => e.trackingNumber.trim());

    if (validEntries.length === 0) {
      setParseError('최소 하나의 송장번호를 입력하세요.');
      return;
    }

    setIsSaving(true);
    try {
      await onBulkUpdate(
        validEntries.map((e) => ({
          id: e.id,
          carrier: e.carrier,
          trackingNumber: e.trackingNumber.trim(),
        }))
      );
      onClose();
    } catch (error) {
      console.error('Failed to save bulk tracking:', error);
      setParseError('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const validCount = entries.filter((e) => e.trackingNumber.trim()).length;

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
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  일괄 송장번호 등록
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedInfluencers.length}명 선택됨
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Default Carrier */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  기본 택배사
                </label>
                <select
                  value={defaultCarrier}
                  onChange={(e) => setDefaultCarrier(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                >
                  {carriers.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleApplyDefaultCarrier}
                className="mt-6 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                전체 적용
              </button>
            </div>

            {/* Bulk Paste */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                일괄 붙여넣기
              </label>
              <textarea
                onChange={handleBulkPaste}
                placeholder="@계정ID, 송장번호 형식으로 여러 줄 입력
예:
@influencer1, 1234567890
@influencer2, 0987654321

또는 송장번호만 순서대로 입력:
1234567890
0987654321"
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 resize-none text-sm font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">
                탭 또는 쉼표로 구분된 데이터를 붙여넣으세요
              </p>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {parseError}
              </div>
            )}

            {/* Entry List */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                송장번호 목록
              </label>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        인플루언서
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-32">
                        택배사
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        송장번호
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <span className="font-medium text-gray-900">
                            @{entry.accountId.replace('@', '')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={entry.carrier}
                            onChange={(e) =>
                              handleEntryChange(index, 'carrier', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            {carriers.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={entry.trackingNumber}
                              onChange={(e) =>
                                handleEntryChange(index, 'trackingNumber', e.target.value)
                              }
                              placeholder="송장번호 입력"
                              className={`w-full px-2 py-1 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                                entry.trackingNumber
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-300'
                              }`}
                            />
                            {entry.trackingNumber && (
                              <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            <span className="text-sm text-gray-600">
              <span className="font-medium text-primary-600">{validCount}</span>건 입력됨
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || validCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Upload className="w-4 h-4" />
                {validCount}건 등록
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

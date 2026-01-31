import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Store,
  Save,
  ArrowLeft,
  RefreshCw,
  Percent,
  Truck,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChannelSettingsStore } from '@/store/channelSettingsStore';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export default function SalesChannelSettingsPage() {
  const navigate = useNavigate();
  const { channels, isLoading, error, fetchChannels, updateChannel } = useChannelSettingsStore();
  const [editingValues, setEditingValues] = useState<Record<string, { feeRate?: number; shippingFee?: number }>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleFeeRateChange = (id: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setEditingValues(prev => ({
        ...prev,
        [id]: { ...prev[id], feeRate: num },
      }));
      setHasChanges(true);
    }
  };

  const handleShippingFeeChange = (id: string, value: string) => {
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(num) && num >= 0) {
      setEditingValues(prev => ({
        ...prev,
        [id]: { ...prev[id], shippingFee: num },
      }));
      setHasChanges(true);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const [id, updates] of Object.entries(editingValues)) {
        await updateChannel(id, updates);
      }
      setEditingValues({});
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const getFeeRate = (ch: typeof channels[0]): number => {
    return editingValues[ch.id]?.feeRate ?? ch.feeRate;
  };

  const getShippingFee = (ch: typeof channels[0]): number => {
    return editingValues[ch.id]?.shippingFee ?? ch.shippingFee;
  };

  const channelColors: Record<string, string> = {
    smartstore: 'border-l-green-500',
    coupang: 'border-l-orange-500',
    coupang_rocket: 'border-l-orange-400',
    cafe24: 'border-l-blue-500',
    qoo10: 'border-l-purple-500',
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales-dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Store className="w-7 h-7 text-green-500" />
              채널 수수료 설정
            </h1>
            <p className="text-gray-500 mt-1">판매 채널별 수수료율과 배송비를 관리합니다</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchChannels()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
            새로고침
          </Button>
          {hasChanges && (
            <Button onClick={handleSaveAll} disabled={saving}>
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              변경사항 저장
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 채널 설정 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="w-5 h-5 text-gray-500" />
            판매 채널 수수료 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {channels.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">채널</TableHead>
                  <TableHead className="w-20 text-center">상태</TableHead>
                  <TableHead className="w-36 text-right">수수료율 (%)</TableHead>
                  <TableHead className="w-36 text-right">기본 배송비 (원)</TableHead>
                  <TableHead className="text-right">마지막 동기화</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((ch) => {
                  const isEdited = ch.id in editingValues;
                  return (
                    <TableRow
                      key={ch.id}
                      className={cn(
                        'border-l-4',
                        channelColors[ch.channel] || 'border-l-gray-300'
                      )}
                    >
                      <TableCell className="font-medium">
                        {ch.channelName}
                      </TableCell>
                      <TableCell className="text-center">
                        {ch.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            활성
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 mr-1" />
                            비활성
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={getFeeRate(ch)}
                          onChange={(e) => handleFeeRateChange(ch.id, e.target.value)}
                          className={cn(
                            'w-24 text-right ml-auto',
                            isEdited && 'border-blue-400 bg-blue-50'
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          value={formatCurrency(getShippingFee(ch))}
                          onChange={(e) => handleShippingFeeChange(ch.id, e.target.value)}
                          className={cn(
                            'w-28 text-right ml-auto',
                            isEdited && 'border-blue-400 bg-blue-50'
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {ch.lastSyncAt
                          ? new Date(ch.lastSyncAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-30" />
              <p>채널 설정을 불러오는 중...</p>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">등록된 채널이 없습니다</p>
              <p className="text-sm mt-1">
                데이터베이스에 sales_channel_settings 테이블이 필요합니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수수료 설명 */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-500" />
            수수료 계산 방식
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>- 채널 수수료 = 결제금액 x 수수료율(%)</p>
            <p>- 배송비는 주문 건당 기본 배송비가 적용됩니다</p>
            <p>- 실제 수수료는 주문 데이터에서 자동 계산된 값이 우선 적용됩니다</p>
            <p>- 여기서 설정한 수수료율은 원가/이익 시뮬레이션에 활용됩니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

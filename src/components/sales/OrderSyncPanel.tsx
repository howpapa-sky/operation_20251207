import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Wifi,
} from 'lucide-react';
import { syncOrders, testChannelConnection } from '@/services/orderSyncService';
import type { SyncResult } from '@/services/orderSyncService';
import { cn } from '@/lib/utils';

const CHANNELS = [
  { value: 'smartstore', label: '네이버 스마트스토어' },
  { value: 'coupang', label: '쿠팡 (준비중)', disabled: true },
  { value: 'cafe24', label: 'Cafe24 (준비중)', disabled: true },
];

export default function OrderSyncPanel({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [channel, setChannel] = useState('smartstore');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    const result = await syncOrders({ channel, startDate, endDate });
    setSyncResult(result);
    setIsSyncing(false);

    if (result.success && onSyncComplete) {
      onSyncComplete();
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const result = await testChannelConnection(channel);
    setTestResult(result);
    setIsTesting(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-500" />
          주문 데이터 동기화
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 채널 선택 */}
        <div className="flex items-center gap-3">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((ch) => (
                <SelectItem key={ch.value} value={ch.value} disabled={ch.disabled}>
                  {ch.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Wifi className="w-4 h-4 mr-1" />
            )}
            연결 테스트
          </Button>
        </div>

        {/* 연결 테스트 결과 */}
        {testResult && (
          <div className={cn(
            'p-3 rounded-lg text-sm flex items-center gap-2',
            testResult.success
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          )}>
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {testResult.message}
          </div>
        )}

        {/* 날짜 범위 */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <span className="text-gray-400">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>

        {/* 동기화 버튼 */}
        <Button
          onClick={handleSync}
          disabled={isSyncing || !startDate || !endDate}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              동기화 중...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              주문 데이터 가져오기
            </>
          )}
        </Button>

        {/* 동기화 결과 */}
        {syncResult && (
          <div className={cn(
            'p-4 rounded-lg border',
            syncResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          )}>
            <div className="flex items-start gap-2">
              {syncResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={cn(
                  'font-medium',
                  syncResult.success ? 'text-green-800' : 'text-red-800'
                )}>
                  {syncResult.success
                    ? syncResult.message || '동기화 완료'
                    : syncResult.error || '동기화 실패'
                  }
                </p>

                {syncResult.success && (syncResult.synced !== undefined || syncResult.skipped !== undefined) && (
                  <div className="flex items-center gap-3 mt-2">
                    {syncResult.synced !== undefined && (
                      <Badge variant="default" className="bg-green-600">
                        {syncResult.synced}건 동기화
                      </Badge>
                    )}
                    {(syncResult.skipped ?? 0) > 0 && (
                      <Badge variant="secondary">
                        {syncResult.skipped}건 스킵
                      </Badge>
                    )}
                    {syncResult.total !== undefined && (
                      <span className="text-sm text-gray-500">
                        총 {syncResult.total}건 중
                      </span>
                    )}
                  </div>
                )}

                {/* 오류 목록 */}
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-medium text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      검증 오류:
                    </p>
                    <ul className="text-xs text-amber-600 space-y-0.5 max-h-32 overflow-y-auto">
                      {syncResult.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>- {err}</li>
                      ))}
                      {syncResult.errors.length > 10 && (
                        <li className="text-gray-500">
                          ... 외 {syncResult.errors.length - 10}건
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

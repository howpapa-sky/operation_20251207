import { useState, useEffect, useRef } from 'react';
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
  ToggleLeft,
  ToggleRight,
  Clock,
  Timer,
  Zap,
} from 'lucide-react';
import { syncOrders, testChannelConnection } from '@/services/orderSyncService';
import type { SyncResult, SyncProgress } from '@/services/orderSyncService';
import { useAutoSync } from '@/hooks/useAutoSync';
import { cn } from '@/lib/utils';

const CHANNELS = [
  { value: 'smartstore', label: '네이버 스마트스토어' },
  { value: 'cafe24', label: 'Cafe24' },
  { value: 'coupang', label: '쿠팡 (준비중)', disabled: true },
];

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function formatElapsedTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}초`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}분 ${remainSecs}초`;
}

export default function OrderSyncPanel({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [channel, setChannel] = useState('smartstore');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [syncResult, setSyncResult] = useState<(SyncResult & { elapsedMs?: number }) | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 실시간 경과 시간 타이머
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const autoSync = useAutoSync(channel, onSyncComplete);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncProgress(null);
    startTimer();

    const result = await syncOrders({
      channel,
      startDate,
      endDate,
      onProgress: (progress) => setSyncProgress(progress),
    });

    stopTimer();
    setSyncResult(result);
    setSyncProgress(null);
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

  const progressPercent = syncProgress
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            주문 데이터 동기화
          </CardTitle>

          {/* 자동 동기화 토글 */}
          <div className="flex items-center gap-3">
            {autoSync.lastSyncAt && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                마지막 동기화: {formatRelativeTime(autoSync.lastSyncAt)}
              </span>
            )}
            {autoSync.isSyncing && (
              <Badge variant="secondary" className="text-xs gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                자동 동기화 중
              </Badge>
            )}
            <button
              onClick={() => autoSync.setEnabled(!autoSync.enabled)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors',
                autoSync.enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {autoSync.enabled ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              자동 동기화 {autoSync.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
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
            disabled={isTesting || isSyncing}
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
            'p-3 rounded-lg text-sm flex items-center gap-2 transition-all duration-300',
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
            disabled={isSyncing}
          />
          <span className="text-gray-400">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
            disabled={isSyncing}
          />
        </div>

        {/* 동기화 버튼 */}
        <div className="relative">
          <Button
            onClick={handleSync}
            disabled={isSyncing || !startDate || !endDate}
            className={cn(
              'w-full h-12 text-sm font-medium transition-all duration-200',
              isSyncing && 'bg-blue-600'
            )}
          >
            {isSyncing ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {syncProgress
                    ? `${syncProgress.dateRange} (${syncProgress.current}/${syncProgress.total})`
                    : '연결 중...'}
                </span>
              </div>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                주문 데이터 가져오기
              </>
            )}
          </Button>

          {/* 진행률 바 (버튼 하단) */}
          {isSyncing && syncProgress && syncProgress.total > 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-200 rounded-b-md overflow-hidden">
              <div
                className="h-full bg-white/40 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* 실시간 경과 시간 + 진행 상세 */}
        {isSyncing && (
          <div className="flex items-center justify-between px-1 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                경과: <span className="font-mono font-medium text-gray-700">{formatElapsedTime(elapsedMs)}</span>
              </span>
              {syncProgress && syncProgress.syncedSoFar > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  누적: <span className="font-medium text-gray-700">{syncProgress.syncedSoFar.toLocaleString()}건</span>
                </span>
              )}
            </div>
            {syncProgress && syncProgress.total > 1 && (
              <span className="text-xs font-medium text-blue-600">
                {progressPercent}%
              </span>
            )}
          </div>
        )}

        {/* 동기화 결과 */}
        {syncResult && (
          <div className={cn(
            'p-4 rounded-lg border transition-all duration-300 animate-in slide-in-from-top-2',
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

                {/* 성공 시 상세 정보 */}
                {syncResult.success && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {syncResult.synced !== undefined && (
                      <Badge variant="default" className="bg-green-600 text-xs">
                        {syncResult.synced.toLocaleString()}건 동기화
                      </Badge>
                    )}
                    {(syncResult.skipped ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {syncResult.skipped}건 스킵
                      </Badge>
                    )}
                    {syncResult.elapsedMs !== undefined && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {formatElapsedTime(syncResult.elapsedMs)}
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

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Wifi,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApiCredentialsStore } from '@/store/useApiCredentialsStore';
import { useAdAccountStore } from '@/store/useAdAccountStore';
import type { SalesChannel, SyncStatus } from '@/types';
import type { AdPlatform } from '@/types/ecommerce';
import { channelInfo } from '@/services/salesApiService';
import { adPlatformLabels } from '@/types/ecommerce';
import { toast } from '@/hooks/use-toast';

interface ChannelStatus {
  channel: string;
  name: string;
  configured: boolean;
  status: SyncStatus | 'not_configured';
  lastSync?: string;
  error?: string;
  tokenExpiry?: string;
}

function getStatusIcon(status: SyncStatus | 'not_configured') {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'syncing':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'not_configured':
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
    default:
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  }
}

function getStatusLabel(status: SyncStatus | 'not_configured'): string {
  switch (status) {
    case 'success': return '연결됨';
    case 'failed': return '오류';
    case 'syncing': return '동기화 중';
    case 'not_configured': return '미설정';
    default: return '대기';
  }
}

function getStatusVariant(status: SyncStatus | 'not_configured'): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'success': return 'default';
    case 'failed': return 'destructive';
    case 'not_configured': return 'outline';
    default: return 'secondary';
  }
}

export function ApiStatusMonitor() {
  const {
    credentials,
    testingChannel,
    testConnection,
    fetchCredentials,
  } = useApiCredentialsStore();

  const {
    accounts: adAccounts,
    testingPlatform,
    testConnection: testAdConnection,
  } = useAdAccountStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const salesChannels: SalesChannel[] = ['cafe24', 'naver_smartstore', 'coupang'];

  const channelStatuses: ChannelStatus[] = salesChannels.map((channel) => {
    const credential = credentials.find((c) => c.channel === channel);
    const info = channelInfo[channel];

    if (!credential) {
      return {
        channel,
        name: info.name,
        configured: false,
        status: 'not_configured' as const,
      };
    }

    let tokenExpiry: string | undefined;
    if (channel === 'cafe24' && credential.cafe24?.tokenExpiresAt) {
      const expiry = new Date(credential.cafe24.tokenExpiresAt);
      if (expiry < new Date()) {
        tokenExpiry = '토큰 만료됨';
      } else {
        const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        tokenExpiry = `${days}일 후 갱신 필요`;
      }
    }

    return {
      channel,
      name: info.name,
      configured: true,
      status: credential.syncStatus ?? 'idle',
      lastSync: credential.lastSyncAt,
      error: credential.syncError,
      tokenExpiry,
    };
  });

  const adPlatforms: AdPlatform[] = ['naver_sa', 'naver_gfa', 'meta', 'coupang_ads'];

  const adStatuses = adPlatforms.map((platform) => {
    const account = adAccounts.find((a) => a.platform === platform);
    return {
      platform,
      name: adPlatformLabels[platform] ?? platform,
      configured: !!account,
      isActive: account?.isActive ?? false,
    };
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await fetchCredentials();
    setIsRefreshing(false);
  };

  const handleTestChannel = async (channel: SalesChannel) => {
    const result = await testConnection(channel);
    toast({
      title: result.success ? '연결 성공' : '연결 실패',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });
  };

  const handleTestAd = async (platform: AdPlatform) => {
    const result = await testAdConnection(platform);
    toast({
      title: result.success ? '연결 성공' : '연결 실패',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          API 연결 상태
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 판매 채널 */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">판매 채널</h4>
          <div className="space-y-2">
            {channelStatuses.map((ch) => (
              <div
                key={ch.channel}
                className="flex items-center justify-between p-3 rounded-lg border bg-white"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(ch.status)}
                  <div>
                    <span className="font-medium text-sm">{ch.name}</span>
                    {ch.lastSync && (
                      <p className="text-xs text-gray-400">
                        마지막 동기화: {new Date(ch.lastSync).toLocaleString('ko-KR')}
                      </p>
                    )}
                    {ch.error && (
                      <p className="text-xs text-red-500">{ch.error}</p>
                    )}
                    {ch.tokenExpiry && (
                      <p className="text-xs text-yellow-600">{ch.tokenExpiry}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(ch.status)}>
                    {getStatusLabel(ch.status)}
                  </Badge>
                  {ch.configured && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestChannel(ch.channel as SalesChannel)}
                      disabled={testingChannel === ch.channel}
                    >
                      {testingChannel === ch.channel ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        '테스트'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 광고 플랫폼 */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">광고 플랫폼</h4>
          <div className="space-y-2">
            {adStatuses.map((ad) => (
              <div
                key={ad.platform}
                className="flex items-center justify-between p-3 rounded-lg border bg-white"
              >
                <div className="flex items-center gap-3">
                  {ad.configured && ad.isActive ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : ad.configured ? (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium text-sm">{ad.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ad.configured && ad.isActive ? 'default' : ad.configured ? 'secondary' : 'outline'}>
                    {ad.configured && ad.isActive ? '활성' : ad.configured ? '비활성' : '미설정'}
                  </Badge>
                  {ad.configured && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestAd(ad.platform)}
                      disabled={testingPlatform === ad.platform}
                    >
                      {testingPlatform === ad.platform ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        '테스트'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ApiStatusMonitor;

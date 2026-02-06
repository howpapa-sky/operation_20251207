/**
 * 광고 비용 데이터 동기화 서비스
 *
 * 지원 플랫폼:
 * - Meta Ads (Facebook/Instagram)
 * - 네이버 검색광고
 *
 * 실제 API 호출은 NCP 프록시 서버를 경유합니다.
 * 프록시 서버에 광고 API 엔드포인트 구현 후 활성화됩니다.
 */

import { supabase } from '../lib/supabase';
import type { AdPlatform, AdSpendDaily } from '../types/ecommerce';

// 동기화 진행 콜백
export interface AdSyncProgressCallback {
  onProgress: (message: string, percent: number) => void;
  onComplete: (result: AdSyncResult) => void;
  onError: (error: string) => void;
}

// 동기화 결과
export interface AdSyncResult {
  success: boolean;
  platform: AdPlatform;
  message: string;
  recordsCreated: number;
  recordsUpdated: number;
  dateRange: { start: string; end: string };
}

/**
 * Meta Ads 광고비 동기화
 *
 * Meta Marketing API를 통해 일별 광고비 데이터를 가져옵니다.
 * API: GET /v19.0/act_{ad_account_id}/insights
 */
export async function syncMetaAds(
  brandId: string,
  startDate: string,
  endDate: string,
  callback?: AdSyncProgressCallback
): Promise<AdSyncResult> {
  try {
    callback?.onProgress('Meta Ads 데이터 조회 중...', 10);

    // NCP 프록시 서버를 통한 Meta Ads API 호출
    // 프록시 서버에 /api/meta/insights 엔드포인트 구현 필요
    const response = await fetch('/.netlify/functions/commerce-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ad-sync',
        platform: 'meta',
        brandId,
        startDate,
        endDate,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      const errorMsg = result.error || 'Meta Ads 동기화 실패';
      callback?.onError(errorMsg);
      return {
        success: false,
        platform: 'meta',
        message: errorMsg,
        recordsCreated: 0,
        recordsUpdated: 0,
        dateRange: { start: startDate, end: endDate },
      };
    }

    // 결과 데이터를 ad_spend_daily에 upsert
    const records = result.data || [];
    callback?.onProgress(`${records.length}개 레코드 저장 중...`, 70);

    let created = 0;
    let updated = 0;

    for (const record of records) {
      const { error } = await (supabase as any)
        .from('ad_spend_daily')
        .upsert({
          brand_id: brandId,
          date: record.date,
          platform: 'meta',
          spend: record.spend || 0,
          impressions: record.impressions || 0,
          clicks: record.clicks || 0,
          conversions: record.conversions || 0,
          conversion_value: record.conversionValue || 0,
          ctr: record.ctr || 0,
          cpc: record.cpc || 0,
          roas: record.roas || 0,
          raw_data: record.rawData || null,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'brand_id,date,platform',
        });

      if (!error) {
        created++;
      }
    }

    callback?.onProgress('완료', 100);

    const syncResult: AdSyncResult = {
      success: true,
      platform: 'meta',
      message: `Meta Ads ${records.length}일 데이터 동기화 완료`,
      recordsCreated: created,
      recordsUpdated: updated,
      dateRange: { start: startDate, end: endDate },
    };

    callback?.onComplete(syncResult);
    return syncResult;
  } catch (error) {
    const errorMsg = `Meta Ads 동기화 오류: ${(error as Error).message}`;
    callback?.onError(errorMsg);
    return {
      success: false,
      platform: 'meta',
      message: errorMsg,
      recordsCreated: 0,
      recordsUpdated: 0,
      dateRange: { start: startDate, end: endDate },
    };
  }
}

/**
 * 네이버 검색광고 광고비 동기화
 *
 * 네이버 검색광고 API를 통해 일별 광고비 데이터를 가져옵니다.
 * API: GET /stats
 */
export async function syncNaverSearchAds(
  brandId: string,
  startDate: string,
  endDate: string,
  callback?: AdSyncProgressCallback
): Promise<AdSyncResult> {
  try {
    callback?.onProgress('네이버 검색광고 데이터 조회 중...', 10);

    // NCP 프록시 서버를 통한 네이버 검색광고 API 호출
    // 프록시 서버에 /api/naver-sa/stats 엔드포인트 구현 필요
    const response = await fetch('/.netlify/functions/commerce-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ad-sync',
        platform: 'naver_sa',
        brandId,
        startDate,
        endDate,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      const errorMsg = result.error || '네이버 검색광고 동기화 실패';
      callback?.onError(errorMsg);
      return {
        success: false,
        platform: 'naver_sa',
        message: errorMsg,
        recordsCreated: 0,
        recordsUpdated: 0,
        dateRange: { start: startDate, end: endDate },
      };
    }

    const records = result.data || [];
    callback?.onProgress(`${records.length}개 레코드 저장 중...`, 70);

    let created = 0;
    let updated = 0;

    for (const record of records) {
      const { error } = await (supabase as any)
        .from('ad_spend_daily')
        .upsert({
          brand_id: brandId,
          date: record.date,
          platform: 'naver_sa',
          spend: record.spend || 0,
          impressions: record.impressions || 0,
          clicks: record.clicks || 0,
          conversions: record.conversions || 0,
          conversion_value: record.conversionValue || 0,
          ctr: record.ctr || 0,
          cpc: record.cpc || 0,
          roas: record.roas || 0,
          raw_data: record.rawData || null,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'brand_id,date,platform',
        });

      if (!error) {
        created++;
      }
    }

    callback?.onProgress('완료', 100);

    const syncResult: AdSyncResult = {
      success: true,
      platform: 'naver_sa',
      message: `네이버 검색광고 ${records.length}일 데이터 동기화 완료`,
      recordsCreated: created,
      recordsUpdated: updated,
      dateRange: { start: startDate, end: endDate },
    };

    callback?.onComplete(syncResult);
    return syncResult;
  } catch (error) {
    const errorMsg = `네이버 검색광고 동기화 오류: ${(error as Error).message}`;
    callback?.onError(errorMsg);
    return {
      success: false,
      platform: 'naver_sa',
      message: errorMsg,
      recordsCreated: 0,
      recordsUpdated: 0,
      dateRange: { start: startDate, end: endDate },
    };
  }
}

/**
 * 플랫폼별 광고 동기화 디스패처
 */
export async function syncAdSpend(
  platform: AdPlatform,
  brandId: string,
  startDate: string,
  endDate: string,
  callback?: AdSyncProgressCallback
): Promise<AdSyncResult> {
  switch (platform) {
    case 'meta':
      return syncMetaAds(brandId, startDate, endDate, callback);
    case 'naver_sa':
      return syncNaverSearchAds(brandId, startDate, endDate, callback);
    default:
      return {
        success: false,
        platform,
        message: `${platform} 플랫폼은 아직 지원되지 않습니다.`,
        recordsCreated: 0,
        recordsUpdated: 0,
        dateRange: { start: startDate, end: endDate },
      };
  }
}

/**
 * 브랜드별 일별 광고비 합계 조회
 */
export async function getAdSpendByDateRange(
  brandId: string,
  startDate: string,
  endDate: string,
  platform?: AdPlatform
): Promise<AdSpendDaily[]> {
  try {
    let query = (supabase as any)
      .from('ad_spend_daily')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      brandId: row.brand_id as string,
      date: row.date as string,
      platform: row.platform as AdPlatform,
      spend: Number(row.spend) || 0,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      conversions: Number(row.conversions) || 0,
      conversionValue: Number(row.conversion_value) || 0,
      ctr: Number(row.ctr) || 0,
      cpc: Number(row.cpc) || 0,
      roas: Number(row.roas) || 0,
      syncedAt: row.synced_at as string | undefined,
      rawData: row.raw_data as Record<string, unknown> | undefined,
      createdAt: row.created_at as string,
    }));
  } catch (error) {
    console.error('Get ad spend error:', error);
    return [];
  }
}

/**
 * 브랜드별 기간 총 광고비 조회
 */
export async function getTotalAdSpend(
  brandId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const data = await getAdSpendByDateRange(brandId, startDate, endDate);
  return data.reduce((sum, item) => sum + item.spend, 0);
}

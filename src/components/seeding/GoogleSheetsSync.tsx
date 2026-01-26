import { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { googleSheetsService, PreviewResult, ImportResult } from '../../services/googleSheetsService';
import { useSeedingStore } from '../../store/seedingStore';
import { SeedingProject, SeedingInfluencer } from '../../types';

// ========== 프론트엔드 데이터 변환 유틸리티 ==========

// 현재 연도 가져오기
const CURRENT_YEAR = new Date().getFullYear();

// 날짜 문자열을 ISO 형식(YYYY-MM-DD)으로 변환
// 지원 형식: YYYY-MM-DD, MM/DD/YYYY, YYYY.MM.DD, MM/DD, 12월4일, 12/4 등
function parseDateToISO(value: any): string | undefined {
  if (!value) return undefined;

  const str = String(value).trim();
  if (!str) return undefined;

  // 이미 ISO 형식인 경우 (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0];
  }

  // YYYY.MM.DD 또는 YYYY/MM/DD 형식
  const yyyymmddMatch = str.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YYYY 형식
  const mmddyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD/MM/YYYY 형식 (유럽식) - 일이 12보다 크면 DD/MM으로 처리
  const ddmmyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, first, second, year] = ddmmyyyyMatch;
    const firstNum = parseInt(first);
    if (firstNum > 12) {
      // DD/MM/YYYY
      return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
    }
  }

  // MM/DD 형식 (연도 없음 - 현재 연도 사용)
  const mmddMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mmddMatch) {
    const [, month, day] = mmddMatch;
    return `${CURRENT_YEAR}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 한글 형식: 12월4일, 12월 4일, 1월15일 등
  const koreanMatch = str.match(/^(\d{1,2})월\s*(\d{1,2})일?$/);
  if (koreanMatch) {
    const [, month, day] = koreanMatch;
    return `${CURRENT_YEAR}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 한글 형식 with 연도: 2025년12월4일, 2025년 12월 4일
  const koreanFullMatch = str.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일?$/);
  if (koreanFullMatch) {
    const [, year, month, day] = koreanFullMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYYMMDD 형식 (구분자 없음)
  const compactMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, year, month, day] = compactMatch;
    return `${year}-${month}-${day}`;
  }

  // Google Sheets 시리얼 날짜 (숫자)
  const num = parseFloat(str);
  if (!isNaN(num) && num > 25000 && num < 100000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Date 객체로 파싱 시도 (최후의 수단)
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // 무시
  }

  console.warn(`[parseDateToISO] Failed to parse date: "${str}"`);
  return undefined;
}

// 숫자 파싱 (K, M, 만, 억 단위 지원)
// 값이 없으면 undefined 반환 (0도 유효한 값으로 처리하기 위해)
function parseNumber(value: any): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  if (!str || str === '-') return undefined;

  // K 단위 (4.4K, 293K → 4400, 293000)
  const kMatch = str.match(/^([\d,.]+)\s*k$/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(/,/g, ''));
    return isNaN(num) ? undefined : Math.round(num * 1000);
  }

  // M 단위 (1.2M → 1200000)
  const mMatch = str.match(/^([\d,.]+)\s*m$/i);
  if (mMatch) {
    const num = parseFloat(mMatch[1].replace(/,/g, ''));
    return isNaN(num) ? undefined : Math.round(num * 1000000);
  }

  // 만 단위 (29.3만 → 293000)
  const manMatch = str.match(/^([\d,.]+)\s*만$/);
  if (manMatch) {
    const num = parseFloat(manMatch[1].replace(/,/g, ''));
    return isNaN(num) ? undefined : Math.round(num * 10000);
  }

  // 억 단위 (1.2억 → 120000000)
  const ukMatch = str.match(/^([\d,.]+)\s*억$/);
  if (ukMatch) {
    const num = parseFloat(ukMatch[1].replace(/,/g, ''));
    return isNaN(num) ? undefined : Math.round(num * 100000000);
  }

  // 소수점 포함 숫자 (79.2 등)
  if (str.includes('.')) {
    const num = parseFloat(str.replace(/,/g, ''));
    return isNaN(num) ? undefined : Math.round(num);
  }

  // 일반 숫자 (쉼표, 공백 제거)
  const num = parseInt(str.replace(/[,\s]/g, ''), 10);
  return isNaN(num) ? undefined : num;
}

// 가격 파싱 (빈 값은 undefined)
function parsePrice(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = parseNumber(value);
  return num !== undefined && num > 0 ? num : undefined;
}

// 여러 필드명에서 값 찾기 (대소문자 무시, 공백/특수문자 무시)
function findFieldValue(item: any, ...fieldNames: string[]): any {
  // 정규화 함수: 소문자 변환, 공백/특수문자 제거
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_\.]/g, '');

  for (const name of fieldNames) {
    // 1. 정확히 일치
    if (item[name] !== undefined && item[name] !== null && item[name] !== '') {
      return item[name];
    }
  }

  // 2. 대소문자/공백 무시하고 검색
  const normalizedNames = fieldNames.map(normalize);
  for (const key of Object.keys(item)) {
    const normalizedKey = normalize(key);
    for (const normalizedName of normalizedNames) {
      if (normalizedKey === normalizedName && item[key] !== undefined && item[key] !== null && item[key] !== '') {
        return item[key];
      }
    }
  }

  // 3. 부분 일치 검색 (키가 필드명을 포함하거나 반대)
  for (const key of Object.keys(item)) {
    const normalizedKey = normalize(key);
    for (const normalizedName of normalizedNames) {
      if ((normalizedKey.includes(normalizedName) || normalizedName.includes(normalizedKey)) &&
          item[key] !== undefined && item[key] !== null && item[key] !== '') {
        return item[key];
      }
    }
  }

  return undefined;
}

// Yes/No 값을 boolean으로 변환
function parseYesNo(value: any): boolean {
  if (!value) return false;
  const str = String(value).trim().toLowerCase();
  return str === 'yes' || str === 'y' || str === 'o' || str === '예' || str === '네' || str === 'true' || str === '1';
}

// 상태 결정 (Yes/No 필드들로부터)
function determineStatus(item: any): string {
  // Upload completed → posted
  const uploadCompleted = findFieldValue(item, '_upload_completed', 'Upload completed', '업로드완료');
  if (parseYesNo(uploadCompleted)) return 'posted';

  // Product Shipment → shipped
  const shipped = findFieldValue(item, '_product_shipped', 'Product Shipment (Yes/No)', 'Product Shipment', '발송', '발송여부', '제품발송');
  if (parseYesNo(shipped)) return 'shipped';

  // acceptance → accepted or rejected
  const acceptance = findFieldValue(item, '_acceptance', 'acceptance (Yes/No)', 'acceptance', '수락', '수락여부');
  if (acceptance !== undefined && acceptance !== null && acceptance !== '') {
    if (parseYesNo(acceptance)) return 'accepted';
    // "No"인 경우 rejected
    const str = String(acceptance).trim().toLowerCase();
    if (str === 'no' || str === 'n' || str === 'x' || str === '아니오' || str === '거절') return 'rejected';
  }

  // Response received → contacted
  const response = findFieldValue(item, '_response_received', 'Response received (Yes/No)', 'Response received', '응답여부', '응답');
  if (parseYesNo(response)) return 'contacted';

  // DM sent → contacted
  const dmSent = findFieldValue(item, '_dm_sent', 'DM sent (Yes/No)', 'DM sent', 'DM발송', 'dm발송');
  if (parseYesNo(dmSent)) return 'contacted';

  // 기본값
  return item.status || 'listed';
}

// 인플루언서 데이터 정규화 (프론트엔드에서 추가 변환)
// Google Sheets 1열 헤더 전체 매핑 지원
// 중요: Netlify Function에서 이미 필드명이 DB 필드명으로 변환되어 올 수 있음
function normalizeInfluencerData(data: any[]): any[] {
  console.log('========== [normalizeInfluencerData] START ==========');
  console.log('[normalizeInfluencerData] Total records:', data.length);
  console.log('[normalizeInfluencerData] Input data keys:', data.length > 0 ? Object.keys(data[0]) : 'empty');
  console.log('[normalizeInfluencerData] First item RAW:', JSON.stringify(data[0], null, 2));

  return data.map((item, index) => {
    // ===== 기본 정보 =====
    // Netlify Function에서 이미 DB 필드명으로 변환되어 왔을 수 있으므로 직접 접근 우선
    const listedAtRaw = item.listed_at ?? findFieldValue(item, 'Date', 'date', '날짜', '등록일');
    const followerRaw = item.follower_count ?? findFieldValue(item, 'Follower', 'follower', '팔로워', 'Followers');
    const followingRaw = item.following_count ?? findFieldValue(item, 'Following', 'following', '팔로잉');
    const emailRaw = item.email ?? findFieldValue(item, 'E-mail', 'Email', 'e-mail', '이메일');
    const profileUrlRaw = item.profile_url ?? findFieldValue(item, 'URL(youtube, instagram)', 'URL', 'url', '프로필URL', '링크');

    // ===== 제품 정보 =====
    const productNameRaw = item.product_name ?? findFieldValue(item, 'Product', 'product', '제품명', '제품', '상품명');
    const priceRaw = item.product_price ?? findFieldValue(item, 'price', 'Price', 'Cost', 'cost', '가격', '제품단가', '단가');
    const feeRaw = item.fee ?? findFieldValue(item, 'Fee', '원고비');

    // ===== 날짜 정보 =====
    const postedAtRaw = item.posted_at ?? findFieldValue(item, 'upload date (MM/DD)', 'upload date', '업로드일', '포스팅일');

    // ===== 메모 =====
    const notesRaw = item.notes ?? findFieldValue(item, 'NOTE', 'note', 'Notes', 'Memo', '메모', '비고');

    // ===== 상태 결정 =====
    const status = determineStatus(item);

    // 디버깅: Raw 데이터 확인
    if (index === 0) {
      console.log('[DEBUG] Raw data:', {
        listedAtRaw,
        followingRaw,
        followerRaw,
        'item.listed_at': item.listed_at,
        'item.following_count': item.following_count,
        'item.follower_count': item.follower_count,
        'item keys': Object.keys(item),
      });
    }

    // 첫 번째 행 상세 디버깅
    if (index === 0) {
      console.log('---------- Row 0 Debug ----------');
      console.log('item.listed_at:', item.listed_at, '(직접)');
      console.log('listedAtRaw:', listedAtRaw, '→ parseDateToISO:', parseDateToISO(listedAtRaw));
      console.log('item.follower_count:', item.follower_count, '(직접)');
      console.log('followerRaw:', followerRaw, '→ parseNumber:', parseNumber(followerRaw));
      console.log('item.following_count:', item.following_count, '(직접)');
      console.log('followingRaw:', followingRaw, '→ parseNumber:', followingRaw != null ? parseNumber(followingRaw) : 'undefined');
      console.log('item.product_price:', item.product_price, '(직접)');
      console.log('priceRaw:', priceRaw, '→ parsePrice:', parsePrice(priceRaw));
      console.log('status:', status);
      console.log('----------------------------------');
    }

    // 날짜 처리: 이미 ISO 형식이면 그대로 사용
    const processedListedAt = listedAtRaw != null && listedAtRaw !== ''
      ? (typeof listedAtRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(listedAtRaw)
          ? listedAtRaw.split('T')[0]
          : parseDateToISO(listedAtRaw))
      : undefined;

    const processedPostedAt = postedAtRaw != null && postedAtRaw !== ''
      ? (typeof postedAtRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(postedAtRaw)
          ? postedAtRaw.split('T')[0]
          : parseDateToISO(postedAtRaw))
      : undefined;

    // 숫자 처리: 이미 숫자면 그대로 사용
    const processedFollowerCount = typeof followerRaw === 'number'
      ? followerRaw
      : parseNumber(followerRaw);

    // following_count는 값이 있을 때만 설정 (0도 유효한 값)
    let processedFollowingCount: number | undefined = undefined;
    if (followingRaw != null && followingRaw !== '') {
      processedFollowingCount = typeof followingRaw === 'number'
        ? followingRaw
        : parseNumber(followingRaw);
    }

    // product_price는 값이 있을 때만 설정
    let processedProductPrice: number | undefined = undefined;
    if (priceRaw != null && priceRaw !== '') {
      const priceNum = typeof priceRaw === 'number' ? priceRaw : parseNumber(priceRaw);
      if (priceNum !== undefined && priceNum > 0) {
        processedProductPrice = priceNum;
      }
    }

    const result = {
      ...item,
      // 날짜 필드 변환
      listed_at: processedListedAt,
      posted_at: processedPostedAt,
      // 숫자 필드 변환 (0도 유효한 값으로 유지)
      follower_count: processedFollowerCount,
      following_count: processedFollowingCount,
      // 가격 필드 변환
      product_price: processedProductPrice,
      fee: typeof feeRaw === 'number' ? feeRaw : parseNumber(feeRaw),
      // 문자열 필드
      email: emailRaw ? String(emailRaw).trim() : undefined,
      profile_url: profileUrlRaw ? String(profileUrlRaw).trim() : undefined,
      product_name: productNameRaw ? String(productNameRaw).trim() : undefined,
      notes: notesRaw ? String(notesRaw).trim() : undefined,
      // 상태
      status,
    };

    if (index === 0) {
      console.log('[normalizeInfluencerData] First item RESULT:', JSON.stringify(result, null, 2));
      console.log('========== [normalizeInfluencerData] END ==========');
    }

    return result;
  });
}

interface GoogleSheetsSyncProps {
  isOpen: boolean;
  onClose: () => void;
  project: SeedingProject;
  onSyncComplete?: () => void;
}

type SyncDirection = 'import' | 'export';
type SyncStep = 'config' | 'preview' | 'syncing' | 'result';

export default function GoogleSheetsSync({
  isOpen,
  onClose,
  project,
  onSyncComplete,
}: GoogleSheetsSyncProps) {
  // 폼 상태
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [direction, setDirection] = useState<SyncDirection>('import');
  const [step, setStep] = useState<SyncStep>('config');

  // 미리보기 상태
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // 동기화 상태
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  } | null>(null);

  // 에러 상태
  const [error, setError] = useState<string | null>(null);

  // 스토어
  const { addInfluencersBulk, deleteInfluencersByProject, getInfluencersByProject, updateProject } = useSeedingStore();

  // 모달 열릴 때 초기화 및 저장된 URL 로드
  useEffect(() => {
    if (isOpen) {
      setStep('config');
      setPreview(null);
      setSyncResult(null);
      setError(null);
      setSyncProgress(0);

      // 저장된 시트 URL 불러오기
      if (project.listup_sheet_url) {
        setSpreadsheetUrl(project.listup_sheet_url);
      }
      if (project.listup_sheet_name) {
        setSheetName(project.listup_sheet_name);
      }
    }
  }, [isOpen, project.listup_sheet_url, project.listup_sheet_name]);

  // 미리보기 실행
  const handlePreview = async () => {
    if (!spreadsheetUrl.trim()) {
      setError('스프레드시트 URL을 입력하세요.');
      return;
    }

    setIsLoadingPreview(true);
    setError(null);

    try {
      const result = await googleSheetsService.previewImport({
        spreadsheetId: spreadsheetUrl,
        sheetName,
      });
      setPreview(result);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || '미리보기 로드에 실패했습니다.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // 동기화 실행
  const handleSync = async () => {
    setStep('syncing');
    setIsSyncing(true);
    setError(null);
    setSyncProgress(0);

    try {
      if (direction === 'import') {
        // 가져오기
        setSyncProgress(10);

        // 기존 데이터 삭제 (중복 방지)
        await deleteInfluencersByProject(project.id);

        setSyncProgress(30);

        const result = await googleSheetsService.importFromSheets({
          spreadsheetId: spreadsheetUrl,
          sheetName,
          projectId: project.id,
        });

        setSyncProgress(60);

        // 디버깅: Netlify Function 응답 전체 확인
        console.log('========== [DEBUG] Netlify Function Response ==========');
        const debugInfo = (result as any).debug;
        console.log('[DEBUG] result.debug:', debugInfo);
        if (debugInfo) {
          console.log('[DEBUG] 시트 헤더:', debugInfo.headers);
          console.log('[DEBUG] 필드 매핑:', debugInfo.fieldIndex);
          console.log('[DEBUG] 첫 행 원본:', debugInfo.firstRow);
          console.log('[DEBUG] 첫 레코드:', debugInfo.firstRecord);
        }
        console.log('=======================================================');

        if (result.data && result.data.length > 0) {
          // 디버깅: Netlify Function에서 반환된 데이터 확인
          console.log('[handleSync] First record from Netlify:', JSON.stringify(result.data[0], null, 2));
          console.log('[handleSync] Keys:', Object.keys(result.data[0]));
          console.log('[handleSync] listed_at:', result.data[0]?.listed_at);
          console.log('[handleSync] following_count:', result.data[0]?.following_count);
          console.log('[handleSync] product_price:', result.data[0]?.product_price);

          // 프론트엔드에서 데이터 정규화 (날짜/숫자 형식 보정)
          const normalizedData = normalizeInfluencerData(result.data);

          // 디버깅: 저장 직전 데이터 확인
          console.log('[GoogleSheetsSync] 저장할 데이터 샘플:', {
            첫번째: normalizedData[0],
            listed_at: normalizedData[0]?.listed_at,
            following_count: normalizedData[0]?.following_count,
            follower_count: normalizedData[0]?.follower_count,
            product_price: normalizedData[0]?.product_price,
          });

          await addInfluencersBulk(normalizedData);
        }

        setSyncProgress(100);

        setSyncResult({
          success: true,
          added: result.added,
          updated: result.updated,
          errors: result.errors,
        });
      } else {
        // 내보내기
        setSyncProgress(20);

        const influencers = getInfluencersByProject(project.id);

        setSyncProgress(40);

        await googleSheetsService.exportToSheets({
          spreadsheetId: spreadsheetUrl,
          sheetName,
          projectId: project.id,
          data: influencers,
        });

        setSyncProgress(100);

        setSyncResult({
          success: true,
          added: 0,
          updated: influencers.length,
          errors: [],
        });
      }

      // 시트 URL 저장 (다음에 자동으로 불러오기 위해)
      await updateProject(project.id, {
        listup_sheet_url: spreadsheetUrl,
        listup_sheet_name: sheetName,
        last_synced_at: new Date().toISOString(),
      });

      setStep('result');
      onSyncComplete?.();
    } catch (err: any) {
      setError(err.message || '동기화에 실패했습니다.');
      setSyncResult({
        success: false,
        added: 0,
        updated: 0,
        errors: [err.message],
      });
      setStep('result');
    } finally {
      setIsSyncing(false);
    }
  };

  // 뒤로 가기
  const handleBack = () => {
    if (step === 'preview') {
      setStep('config');
    } else if (step === 'result') {
      setStep('config');
      setSyncResult(null);
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
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Google Sheets 연동
                </h2>
                <p className="text-sm text-gray-500">{project.name}</p>
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
          <div className="p-6">
            {/* Step 1: 설정 */}
            {step === 'config' && (
              <div className="space-y-6">
                {/* 스프레드시트 URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    스프레드시트 URL 또는 ID
                  </label>
                  <input
                    type="text"
                    value={spreadsheetUrl}
                    onChange={(e) => setSpreadsheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Google 스프레드시트 URL을 붙여넣거나 스프레드시트 ID를 입력하세요
                  </p>
                </div>

                {/* 시트명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시트명
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* 자동 동기화 설정 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        매일 오전 9시 자동 가져오기
                      </div>
                      <div className="text-xs text-gray-500">
                        {project.last_synced_at
                          ? `마지막 동기화: ${new Date(project.last_synced_at).toLocaleString('ko-KR')}`
                          : '아직 동기화된 적 없음'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await updateProject(project.id, {
                        auto_sync_enabled: !project.auto_sync_enabled,
                        listup_sheet_url: spreadsheetUrl || project.listup_sheet_url,
                        listup_sheet_name: sheetName || project.listup_sheet_name,
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      project.auto_sync_enabled ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        project.auto_sync_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 동기화 방향 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    동기화 유형
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDirection('import')}
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${
                        direction === 'import'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        direction === 'import' ? 'bg-primary-100' : 'bg-gray-100'
                      }`}>
                        <Download className={`w-5 h-5 ${
                          direction === 'import' ? 'text-primary-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="text-center">
                        <div className={`font-medium text-sm ${
                          direction === 'import' ? 'text-primary-900' : 'text-gray-700'
                        }`}>
                          리스트 가져오기
                        </div>
                        <div className="text-xs text-gray-500">
                          Sheets → DB
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setDirection('export')}
                      className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${
                        direction === 'export'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        direction === 'export' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Upload className={`w-5 h-5 ${
                          direction === 'export' ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="text-center">
                        <div className={`font-medium text-sm ${
                          direction === 'export' ? 'text-blue-900' : 'text-gray-700'
                        }`}>
                          내보내기
                        </div>
                        <div className="text-xs text-gray-500">
                          DB → Sheets
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 컬럼 매핑 안내 */}
                <div className="p-4 rounded-xl bg-blue-50">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      <div className="text-sm font-medium mb-1 text-blue-900">
                        컬럼 매핑 안내
                      </div>
                      <div className="text-xs space-y-1 text-blue-700">
                        <p>스프레드시트 헤더가 다음과 일치해야 합니다:</p>
                        <p className="font-mono bg-blue-100 px-2 py-1 rounded">
                          계정ID, 이메일, 팔로워, 제품명, 제품단가, 배송여부 ...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 에러 메시지 */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: 미리보기 */}
            {step === 'preview' && preview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">미리보기</h3>
                  <span className="text-sm text-gray-500">
                    총 {preview.totalRows}개 행
                  </span>
                </div>

                {/* 매핑 상태 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">매핑된 컬럼</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {preview.mappedFields.slice(0, 6).map((field) => (
                        <span
                          key={field}
                          className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded"
                        >
                          {field}
                        </span>
                      ))}
                      {preview.mappedFields.length > 6 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                          +{preview.mappedFields.length - 6}
                        </span>
                      )}
                    </div>
                  </div>

                  {preview.unmappedHeaders.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-700 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">무시되는 컬럼</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {preview.unmappedHeaders.slice(0, 4).map((header) => (
                          <span
                            key={header}
                            className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded"
                          >
                            {header}
                          </span>
                        ))}
                        {preview.unmappedHeaders.length > 4 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                            +{preview.unmappedHeaders.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 데이터 미리보기 테이블 */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {preview.headers.slice(0, 6).map((header) => (
                            <th
                              key={header}
                              className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.rows.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {preview.headers.slice(0, 6).map((header) => (
                              <td
                                key={header}
                                className="px-3 py-2 text-gray-700 whitespace-nowrap"
                              >
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 동기화 중 */}
            {step === 'syncing' && (
              <div className="py-8 text-center">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {direction === 'import'
                    ? '데이터 가져오는 중...'
                    : '데이터 내보내는 중...'}
                </h3>
                <p className="text-sm text-gray-500 mb-6">잠시만 기다려주세요</p>

                {/* 프로그레스 바 */}
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-500">{syncProgress}%</div>
              </div>
            )}

            {/* Step 4: 결과 */}
            {step === 'result' && syncResult && (
              <div className="py-6">
                {syncResult.success ? (
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      동기화 완료!
                    </h3>
                    <p className="text-sm text-gray-500">
                      {direction === 'import'
                        ? '스프레드시트에서 데이터를 가져왔습니다.'
                        : '스프레드시트로 데이터를 내보냈습니다.'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      동기화 실패
                    </h3>
                    <p className="text-sm text-gray-500">
                      오류가 발생했습니다. 설정을 확인해주세요.
                    </p>
                  </div>
                )}

                {/* 결과 요약 */}
                {syncResult.success && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {direction === 'import' ? (
                      <>
                        <div className="text-center p-4 bg-green-50 rounded-xl">
                          <div className="text-2xl font-bold text-green-600">
                            {syncResult.added}
                          </div>
                          <div className="text-sm text-green-700">추가됨</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                          <div className="text-2xl font-bold text-blue-600">
                            {syncResult.updated}
                          </div>
                          <div className="text-sm text-blue-700">수정됨</div>
                        </div>
                        <div className="text-center p-4 bg-amber-50 rounded-xl">
                          <div className="text-2xl font-bold text-amber-600">
                            {syncResult.errors.length}
                          </div>
                          <div className="text-sm text-amber-700">오류</div>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-3 text-center p-4 bg-blue-50 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600">
                          {syncResult.updated}
                        </div>
                        <div className="text-sm text-blue-700">행 내보내기 완료</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 에러 목록 */}
                {syncResult.errors.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-xl">
                    <div className="text-sm font-medium text-red-800 mb-2">
                      오류 목록 ({syncResult.errors.length}건)
                    </div>
                    <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                      {syncResult.errors.map((err, index) => (
                        <li key={index}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            {step === 'config' ? (
              <>
                <a
                  href="https://docs.google.com/spreadsheets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  스프레드시트 열기
                </a>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={isLoadingPreview || !spreadsheetUrl.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {isLoadingPreview ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    미리보기
                  </button>
                </div>
              </>
            ) : step === 'preview' ? (
              <>
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  ← 뒤로
                </button>
                <button
                  onClick={handleSync}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                >
                  {direction === 'import' ? (
                    <>
                      <Download className="w-4 h-4" />
                      가져오기 실행
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      내보내기 실행
                    </>
                  )}
                </button>
              </>
            ) : step === 'result' ? (
              <>
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  ← 처음으로
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  완료
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

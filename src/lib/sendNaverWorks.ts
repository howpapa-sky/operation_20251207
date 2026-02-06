// 네이버 웍스 메신저 알림 전송

export interface NaverWorksMessageParams {
  message: string;
  channelId?: string; // 기본 채널이 아닌 다른 채널에 보낼 경우
}

export interface NaverWorksFlexParams {
  flexContent: {
    type: 'flex';
    altText: string;
    contents: object;
  };
  channelId?: string;
}

export interface NaverWorksResult {
  success: boolean;
  error?: string;
}

// 텍스트 메시지 전송
export async function sendNaverWorksMessage(params: NaverWorksMessageParams): Promise<NaverWorksResult> {
  try {
    const response = await fetch('/.netlify/functions/send-naver-works', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: params.message,
        messageType: 'text',
        channelId: params.channelId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || '메시지 전송 실패' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' };
  }
}

// 사이트 URL (환경에 따라 변경)
const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://howpapa.netlify.app';

// 샘플링 프로젝트 알림 메시지 생성
export function createSamplingNotification(params: {
  type: 'new' | 'updated' | 'completed' | 'rating';
  projectId?: string;
  projectName: string;
  brandName?: string;
  manufacturerName?: string;
  sampleCode?: string;
  round?: number;
  rating?: number;
  evaluator?: string;
  comment?: string;
}): string {
  const { type, projectId, projectName, brandName, manufacturerName, sampleCode, round, rating, evaluator, comment } = params;

  let emoji = '';
  let title = '';
  let details: string[] = [];

  switch (type) {
    case 'new':
      emoji = '🆕';
      title = '새로운 샘플링 프로젝트';
      break;
    case 'updated':
      emoji = '📝';
      title = '샘플링 프로젝트 업데이트';
      break;
    case 'completed':
      emoji = '✅';
      title = '샘플링 프로젝트 완료';
      break;
    case 'rating':
      emoji = '⭐';
      title = '샘플 평가 등록';
      break;
  }

  details.push(`📋 프로젝트: ${projectName}`);

  if (brandName) details.push(`🏷️ 브랜드: ${brandName}`);
  if (manufacturerName) details.push(`🏭 제조사: ${manufacturerName}`);
  if (sampleCode) details.push(`🔢 샘플코드: ${sampleCode}`);
  if (round) details.push(`🔄 회차: ${round}차`);
  if (rating) details.push(`⭐ 평점: ${rating}점`);
  if (evaluator) details.push(`👤 평가자: ${evaluator}`);
  if (comment) details.push(`💬 의견: ${comment}`);

  // 프로젝트 바로가기 URL 추가
  if (projectId) {
    details.push(`\n🔗 바로가기: ${SITE_URL}/sampling/${projectId}`);
  }

  return `${emoji} [${title}]\n\n${details.join('\n')}\n\n📅 ${new Date().toLocaleString('ko-KR')}`;
}

// 이메일 발송 알림 메시지 생성
export function createEmailSentNotification(params: {
  recipientEmail: string;
  subject: string;
  projectName: string;
  emailType: 'approval' | 'feedback' | 'revision';
}): string {
  const { recipientEmail, subject, projectName, emailType } = params;

  const typeEmoji = {
    approval: '✅',
    feedback: '💬',
    revision: '🔄'
  };

  const typeName = {
    approval: '승인',
    feedback: '피드백',
    revision: '수정요청'
  };

  return `📧 [이메일 발송 완료]

${typeEmoji[emailType]} 유형: ${typeName[emailType]}
📋 프로젝트: ${projectName}
📬 수신자: ${recipientEmail}
📝 제목: ${subject}

📅 ${new Date().toLocaleString('ko-KR')}`;
}

// 일반 알림 메시지 전송 헬퍼
export async function notifySampling(params: {
  type: 'new' | 'updated' | 'completed' | 'rating';
  projectId?: string;
  projectName: string;
  brandName?: string;
  manufacturerName?: string;
  sampleCode?: string;
  round?: number;
  rating?: number;
  evaluator?: string;
  comment?: string;
}): Promise<NaverWorksResult> {
  const message = createSamplingNotification(params);
  return sendNaverWorksMessage({ message });
}

// 이메일 발송 알림 전송 헬퍼
export async function notifyEmailSent(params: {
  recipientEmail: string;
  subject: string;
  projectName: string;
  emailType: 'approval' | 'feedback' | 'revision';
}): Promise<NaverWorksResult> {
  const message = createEmailSentNotification(params);
  return sendNaverWorksMessage({ message });
}

// 개발요청서 완료 알림 채널 ID
const DEV_REQUEST_CHANNEL_ID = '556d52cf-b97d-0496-ca54-ad035999ea4a';

// 개발요청서 완료 알림 메시지 생성
export function createDevRequestCompletedNotification(params: {
  title: string;
  requester: string;
  brand: string;
  requestType: string;
  completedAt: string;
}): string {
  const { title, requester, brand, requestType, completedAt } = params;

  const brandLabel: Record<string, string> = {
    howpapa: '하우파파',
    nucio: '누씨오',
    common: '공통',
  };

  const typeLabel: Record<string, string> = {
    feature: '기능 추가',
    ui: 'UI/UX 개선',
    bug: '버그 수정',
    other: '기타',
  };

  return `✅ [개발요청 완료]

📋 제목: ${title}
👤 요청자: ${requester}
🏷️ 브랜드: ${brandLabel[brand] || brand}
📂 유형: ${typeLabel[requestType] || requestType}

🎉 요청하신 개발이 완료되었습니다!

📅 완료일시: ${new Date(completedAt).toLocaleString('ko-KR')}`;
}

// 개발요청서 완료 알림 전송 헬퍼
export async function notifyDevRequestCompleted(params: {
  title: string;
  requester: string;
  brand: string;
  requestType: string;
  completedAt: string;
}): Promise<NaverWorksResult> {
  const message = createDevRequestCompletedNotification(params);
  return sendNaverWorksMessage({ message, channelId: DEV_REQUEST_CHANNEL_ID });
}

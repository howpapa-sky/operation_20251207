import { supabase } from './supabase'

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

interface SendEmailResult {
  success: boolean
  message?: string
  recipients?: string[]
  error?: string
}

/**
 * Supabase Edge Function을 통해 이메일을 발송합니다.
 * 네이버 웍스 SMTP를 사용합니다.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params
    })

    if (error) {
      console.error('이메일 발송 오류:', error)
      return {
        success: false,
        error: error.message || '이메일 발송에 실패했습니다.'
      }
    }

    return data as SendEmailResult
  } catch (err) {
    console.error('이메일 발송 예외:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

/**
 * 샘플링 프로젝트 이메일 발송
 */
export async function sendSamplingEmail(
  to: string,
  projectTitle: string,
  emailType: 'feedback' | 'approval' | 'revision',
  content: string
): Promise<SendEmailResult> {
  const subjectMap = {
    feedback: '샘플 평가 피드백',
    approval: '샘플 승인 안내',
    revision: '샘플 수정 요청'
  }

  const subject = `[하우파파] ${projectTitle} - ${subjectMap[emailType]}`

  // 텍스트를 HTML로 변환 (줄바꿈 처리)
  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin: 0 0 10px 0;">${subjectMap[emailType]}</h2>
        <p style="color: #666; margin: 0;">프로젝트: ${projectTitle}</p>
      </div>
      <div style="line-height: 1.8; color: #333; white-space: pre-wrap;">
${content}
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
        <p>본 메일은 하우파파 프로젝트 관리 시스템에서 자동 발송되었습니다.</p>
        <p>© Howlab Co., Ltd.</p>
      </div>
    </div>
  `

  return sendEmail({
    to,
    subject,
    html,
    text: content
  })
}

/**
 * 프로젝트 알림 이메일 발송
 */
export async function sendNotificationEmail(
  to: string | string[],
  title: string,
  message: string,
  projectLink?: string
): Promise<SendEmailResult> {
  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #4F46E5; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">🔔 알림</h2>
      </div>
      <div style="background-color: #fff; padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
        <h3 style="color: #333; margin: 0 0 15px 0;">${title}</h3>
        <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        ${projectLink ? `
          <a href="${projectLink}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
            프로젝트 보기
          </a>
        ` : ''}
      </div>
      <div style="margin-top: 20px; color: #999; font-size: 12px; text-align: center;">
        <p>하우파파 프로젝트 관리 시스템</p>
      </div>
    </div>
  `

  return sendEmail({
    to,
    subject: `[하우파파] ${title}`,
    html,
    text: message
  })
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, text }: EmailRequest = await req.json()

    // 네이버 웍스 SMTP 설정
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.worksmobile.com",
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get('SMTP_USER') || "yong@howlab.co.kr",
          password: Deno.env.get('SMTP_PASS')!,
        },
      },
    })

    // 수신자 배열 처리
    const recipients = Array.isArray(to) ? to : [to]

    await client.send({
      from: `하우파파 <${Deno.env.get('SMTP_USER') || "yong@howlab.co.kr"}>`,
      to: recipients,
      subject: subject,
      content: text || "이메일을 보려면 HTML을 지원하는 메일 클라이언트를 사용하세요.",
      html: html,
    })

    await client.close()

    console.log(`이메일 발송 성공: ${recipients.join(', ')}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: '이메일이 성공적으로 발송되었습니다.',
        recipients: recipients
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('이메일 발송 실패:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

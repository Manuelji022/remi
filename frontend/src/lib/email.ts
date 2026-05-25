import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const otpEmailFrom = process.env.OTP_EMAIL_FROM

const resend = resendApiKey ? new Resend(resendApiKey) : null

function getOtpEmailHtml({ appName, otp }: { appName: string; otp: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f0eee6;font-family:'Bricolage Grotesque',system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0eee6;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:430px;background-color:#fff8e6;border:3px solid #1a1a2e;border-radius:18px;box-shadow:8px 8px 0 #4072fd;">
          <tr>
            <td style="padding:32px 24px;text-align:center;">
              <h1 style="margin:0 0 8px;font-family:'Jersey 25','Bricolage Grotesque',system-ui,sans-serif;font-size:48px;font-weight:400;line-height:0.95;letter-spacing:-0.06em;color:#1a1a2e;">${appName}</h1>
              <p style="margin:0 0 24px;font-size:17px;line-height:1.47;color:#1a1a2e;opacity:0.78;">Your verification code</p>
              <div style="display:inline-block;padding:16px 32px;border:2px solid #1a1a2e;border-radius:11px;background:#ffffff;font-size:36px;font-weight:700;letter-spacing:0.15em;color:#1a1a2e;">${otp}</div>
              <p style="margin:24px 0 0;font-size:14px;line-height:1.43;color:#1a1a2e;opacity:0.78;">This code expires in <strong>3 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#1a1a2e;opacity:0.5;">&copy; ${new Date().getFullYear()} ${appName}</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendOtpEmail({
  appName,
  otp,
  to,
}: {
  appName: string
  otp: string
  to: string
}) {
  if (!resend || !otpEmailFrom) {
    throw new Error('Missing RESEND_API_KEY or OTP_EMAIL_FROM')
  }

  await resend.emails.send({
    from: otpEmailFrom,
    to,
    subject: `${appName} verification code`,
    text: `Your ${appName} verification code is ${otp}. It expires in 3 minutes. If you did not request this code, you can ignore this email.`,
    html: getOtpEmailHtml({ appName, otp }),
  })
}

export async function sendResetPasswordEmail({
  appName,
  to,
  url,
}: {
  appName: string
  to: string
  url: string
}) {
  if (!resend || !otpEmailFrom) {
    throw new Error('Missing RESEND_API_KEY or OTP_EMAIL_FROM')
  }

  await resend.emails.send({
    from: otpEmailFrom,
    to,
    subject: `${appName} - Reset your password`,
    text: `Click the following link to reset your password: ${url}\n\nIf you did not request this, you can safely ignore it.`,
  })
}

import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const otpEmailFrom = process.env.OTP_EMAIL_FROM

const resend = resendApiKey ? new Resend(resendApiKey) : null

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character] ?? character
  })
}

function getEmailLayout({
  appName,
  content,
}: {
  appName: string
  content: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,system-ui,sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:400px;background-color:#ffffff;border:1px solid rgba(29,29,31,0.08);border-radius:16px;box-shadow:0 1px 2px rgba(29,29,31,0.04),0 4px 16px rgba(29,29,31,0.04);">
          <tr>
            <td style="padding:32px 24px;text-align:center;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.2;letter-spacing:-0.01em;color:#1d1d1f;">${escapeHtml(appName)}</h1>
              ${content}
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.35;color:#6e6e73;">&copy; ${new Date().getFullYear()} ${escapeHtml(appName)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getOtpEmailHtml({ appName, otp }: { appName: string; otp: string }) {
  return getEmailLayout({
    appName,
    content: `<p style="margin:0 0 24px;font-size:15px;line-height:1.4;color:#6e6e73;">Your verification code</p>
              <div style="display:inline-block;padding:16px 24px;border:1px solid #d2d2d7;border-radius:12px;background:#f5f5f7;font-size:32px;font-weight:700;letter-spacing:0.15em;color:#1d1d1f;font-variant-numeric:tabular-nums;">${escapeHtml(otp)}</div>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.4;color:#6e6e73;">This code expires in <strong style="color:#1d1d1f;">3 minutes</strong>. If you did not request this, you can safely ignore this email.</p>`,
  })
}

function getResetPasswordEmailHtml({
  appName,
  url,
}: {
  appName: string
  url: string
}) {
  return getEmailLayout({
    appName,
    content: `<p style="margin:0 0 24px;font-size:15px;line-height:1.4;color:#6e6e73;">Click below to reset your password.</p>
              <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#0071e3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:1.4;">Reset password</a>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.4;color:#6e6e73;">If you did not request this, you can safely ignore this email.</p>`,
  })
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
    html: getResetPasswordEmailHtml({ appName, url }),
  })
}

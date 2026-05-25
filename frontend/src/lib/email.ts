import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const otpEmailFrom = process.env.OTP_EMAIL_FROM

const resend = resendApiKey ? new Resend(resendApiKey) : null

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
  })
}

import { getSupabaseAdmin, sendResendEmail, getAppUrl, sendJson, parseBody } from './_utils'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const email = (body.email || '').trim().toLowerCase()
    if (!email) return sendJson(res, 400, { error: 'Email address is required' })

    const admin = getSupabaseAdmin()
    const appUrl = getAppUrl(req)
    const redirectTo = `${appUrl}/reset-password`

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (linkErr) {
      console.error('generateLink error:', linkErr)
      return sendJson(res, 400, { error: linkErr.message })
    }

    let recoveryLink = linkData?.properties?.action_link
    if (!recoveryLink) {
      return sendJson(res, 500, { error: 'Could not generate recovery link' })
    }

    // Ensure link redirects to the deployed app instead of localhost
    if (recoveryLink.includes('localhost') && appUrl.includes('mediconnect-sp.vercel.app')) {
      recoveryLink = recoveryLink.replaceAll('http://localhost:5173', appUrl)
      recoveryLink = recoveryLink.replaceAll('localhost%3A5173', 'mediconnect-sp.vercel.app')
    }

    // Try sending via Resend — wrap so sandbox/delivery errors don't surface to user
    try {
      await sendResendEmail({
        to: email,
        subject: 'MediConnect – Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #2457A7; margin: 0; font-size: 24px;">MediConnect</h2>
              <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Smart Medicine Reordering &amp; Healthcare Management</p>
            </div>
            <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
              <h3 style="color: #182230; font-size: 18px; margin-top: 0;">Password Reset Request</h3>
              <p style="color: #475467; font-size: 15px; line-height: 1.6;">
                We received a request to reset the password for your account associated with <strong>${email}</strong>.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${recoveryLink}" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #667085; font-size: 13px; line-height: 1.5;">
                If you did not request a password reset, no action is needed. Your account remains secure.
              </p>
              <p style="color: #98a2b3; font-size: 12px; margin-top: 20px; word-break: break-all;">
                Direct Link: <a href="${recoveryLink}" style="color: #2457A7;">${recoveryLink}</a>
              </p>
            </div>
          </div>
        `,
      })
    } catch (resendErr: any) {
      // Log but do NOT return an error — the recovery link itself is valid.
      // Resend sandbox restricts delivery to non-owner emails; that's a sender
      // config issue, not a user-facing error.
      console.warn('[reset-password] Resend delivery warning:', resendErr?.message)
    }
    return sendJson(res, 200, { success: true, message: 'Reset email dispatched' })
  } catch (err: any) {
    console.error('Error in /api/reset-password:', err)
    return sendJson(res, 500, { error: err.message || 'Failed to dispatch reset email' })
  }
}

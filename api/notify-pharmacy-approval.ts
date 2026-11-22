import { sendEmail, getAppUrl, sendJson, parseBody } from './_utils.ts'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const { pharmacyEmail, pharmacyName } = body
    if (!pharmacyEmail) return sendJson(res, 400, { error: 'pharmacyEmail is required' })

    const appUrl = getAppUrl(req)
    const loginUrl = `${appUrl}/login`

    await sendEmail({
      to: pharmacyEmail,
      subject: `MediConnect – Pharmacy Registration Approved! Welcome Aboard 🎉`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect</h2>
            <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Pharmacy Partner Network Accreditation</p>
          </div>
          <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="display: inline-block; background-color: #E8F5EF; color: #16865B; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 13px;">
                ✓ Registration Approved
              </span>
            </div>
            <h3 style="color: #182230; font-size: 19px; margin-top: 0; text-align: center;">Congratulations, ${pharmacyName || 'Pharmacy Partner'}! 🎉</h3>
            <p style="color: #475467; font-size: 15px; line-height: 1.6;">
              We are pleased to inform you that your pharmacy registration and drug license credentials have been thoroughly reviewed and <strong>approved</strong> by the MediConnect Administration.
            </p>
            <p style="color: #475467; font-size: 15px; line-height: 1.6;">
              <strong>Thank you for connecting with MediConnect!</strong> Your pharmacy is now active on our network and visible to patients in your region.
            </p>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #1E293B; font-size: 14px;">Next steps on your pharmacy portal:</p>
              <ul style="margin: 0; padding-left: 20px; color: #475467; font-size: 13px; line-height: 1.6;">
                <li>Sign in using your registered credentials (${pharmacyEmail})</li>
                <li>Add &amp; update your available medicine inventory</li>
                <li>Receive and fulfill automated prescription refill orders from patients</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${loginUrl}" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                Sign In to Pharmacy Portal &rarr;
              </a>
            </div>
            <p style="color: #667085; font-size: 13px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center;">
              Need help onboarding? Contact admin support anytime at <a href="mailto:satya2006prakash@gmail.com" style="color: #2457A7;">satya2006prakash@gmail.com</a>.
            </p>
          </div>
        </div>
      `,
    })

    return sendJson(res, 200, { success: true })
  } catch (err: any) {
    console.error('Error in /api/notify-pharmacy-approval:', err)
    return sendJson(res, 500, { error: err.message || 'Failed to dispatch approval notification' })
  }
}

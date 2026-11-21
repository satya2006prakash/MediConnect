import { sendResendEmail, getAppUrl, sendJson, parseBody } from './_utils'

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

    await sendResendEmail({
      to: pharmacyEmail,
      subject: 'MediConnect – Pharmacy Account Approved & Activated!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #159A91; margin: 0; font-size: 24px;">MediConnect Pharmacy Network</h2>
            <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Accreditation & Approval Confirmation</p>
          </div>
          <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
            <h3 style="color: #16865B; font-size: 18px; margin-top: 0;">Congratulations! Your Pharmacy is Verified</h3>
            <p style="color: #475467; font-size: 15px; line-height: 1.6;">
              Dear <strong>${pharmacyName || 'Pharmacy Partner'}</strong>,<br/><br/>
              Your drug license and registration details have been verified and approved by the MediConnect Administration.
            </p>
            <p style="color: #475467; font-size: 15px; line-height: 1.6;">
              You can now sign in to your dashboard to manage live inventory, review refill requests, and fulfill patient orders.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${loginUrl}" style="background-color: #159A91; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                Sign In to Pharmacy Portal
              </a>
            </div>
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

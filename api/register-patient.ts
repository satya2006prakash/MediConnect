import { getSupabaseAdmin, sendEmail, getAppUrl, sendJson, parseBody } from './_utils.ts'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const { fullName, email, password, phone } = body

    const normalizedEmail = (email || '').trim().toLowerCase()
    if (!normalizedEmail || !password || !fullName) {
      return sendJson(res, 400, { error: 'Name, email, and password are required' })
    }

    const admin = getSupabaseAdmin()

    // 1. Check existing users
    const { data: usersData } = await admin.auth.admin.listUsers()
    const existingUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    if (existingUser) {
      const { data: prof } = await admin
        .from('profiles')
        .select('*')
        .eq('id', existingUser.id)
        .maybeSingle()

      return sendJson(res, 400, {
        error: 'already_registered',
        message: 'This email is already registered on MediConnect.',
        role: prof?.role || existingUser.user_metadata?.role || 'patient',
      })
    }

    const appUrl = getAppUrl(req)
    const redirectTo = `${appUrl}/login?verified=true`

    // 2. Generate Supabase Signup Verification Auth Link (creates user & returns action_link)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: normalizedEmail,
      password,
      options: {
        redirectTo,
        data: {
          role: 'patient',
          full_name: fullName,
          phone: phone || null,
        },
      },
    })

    if (linkErr) {
      console.error('Error generating patient signup link:', linkErr)
      return sendJson(res, 400, { error: linkErr.message })
    }

    const userId = linkData.user.id
    let verifyLink = linkData?.properties?.action_link || `${appUrl}/login`

    // Ensure redirect in verification link points to production when deployed
    if (verifyLink.includes('localhost') && appUrl.includes('mediconnect-sp.vercel.app')) {
      verifyLink = verifyLink.replaceAll('http://localhost:5173', appUrl)
      verifyLink = verifyLink.replaceAll('localhost%3A5173', 'mediconnect-sp.vercel.app')
    }

    // 3. Upsert profile record
    await admin.from('profiles').upsert({
      id: userId,
      role: 'patient',
      full_name: fullName,
      phone: phone || null,
    })

    // 4. Dispatch Email Verification Link to Patient's Gmail
    sendEmail({
      to: normalizedEmail,
      subject: 'Confirm your MediConnect Account – Verify Your Email ✉️',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect</h2>
            <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Smart Medicine Reordering &amp; Healthcare Management</p>
          </div>
          <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
            <h3 style="color: #182230; font-size: 18px; margin-top: 0;">Welcome to MediConnect, ${fullName}! 👋</h3>
            <p style="color: #475467; font-size: 15px; line-height: 1.6;">
              Thank you for registering on MediConnect. To verify your email address and activate your account, please click the button below:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${verifyLink}" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                Verify Email &amp; Activate Account
              </a>
            </div>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin: 20px 0;">
              <p style="margin: 0; color: #667085; font-size: 12px; line-height: 1.5; word-break: break-all;">
                If the button doesn't work, copy and paste this link in your browser:<br/>
                <a href="${verifyLink}" style="color: #2457A7;">${verifyLink}</a>
              </p>
            </div>
            <p style="color: #667085; font-size: 13px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
              If you did not create an account on MediConnect, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    }).catch((err) => console.warn('Could not dispatch patient email verification link:', err.message))

    return sendJson(res, 200, {
      success: true,
      requiresVerification: true,
      userId,
      email: normalizedEmail,
      verifyLink,
    })
  } catch (err: any) {
    console.error('Error in /api/register-patient:', err)
    return sendJson(res, 500, { error: err.message || 'Internal server error' })
  }
}

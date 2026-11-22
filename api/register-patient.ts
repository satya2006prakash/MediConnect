import { getSupabaseAdmin, sendEmail, getAppUrl, sendJson, parseBody } from './_utils'

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

    // 2. Create user with email_confirm = true (bypasses Supabase email confirmation rate limits)
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'patient',
        full_name: fullName,
        phone: phone || null,
      },
    })

    if (createErr) {
      console.error('Error creating patient:', createErr)
      return sendJson(res, 400, { error: createErr.message })
    }

    const userId = newUser.user.id

    // 3. Upsert profile record
    await admin.from('profiles').upsert({
      id: userId,
      role: 'patient',
      full_name: fullName,
      phone: phone || null,
    })

    const appUrl = getAppUrl(req)

    // 4. Send Welcome Confirmation Email to Patient
    sendEmail({
      to: normalizedEmail,
      subject: 'Welcome to MediConnect – Registration Successful! 🎉',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect</h2>
            <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Smart Medicine Reordering & Healthcare Management</p>
          </div>
          <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
            <h3 style="color: #182230; font-size: 18px; margin-top: 0;">Welcome to MediConnect, ${fullName}! 👋</h3>
            <p style="color: #475467; font-size: 15px; line-height: 1.6;">
              Thank you for registering on <strong>MediConnect</strong>. Your patient account has been created successfully and is ready to use.
            </p>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #1E293B; font-size: 14px;">Here is what you can do with your account:</p>
              <ul style="margin: 0; padding-left: 20px; color: #475467; font-size: 14px; line-height: 1.6;">
                <li>Search &amp; discover verified local pharmacies in your area</li>
                <li>Order medicines online &amp; schedule recurring prescription refills</li>
                <li>Track dosage schedules &amp; never run out of vital medications</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${appUrl}/login" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                Sign In to Your Account
              </a>
            </div>
            <p style="color: #667085; font-size: 13px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
              If you have any questions or need support, reply to this email or reach us at <a href="mailto:satya2006prakash@gmail.com" style="color: #2457A7;">satya2006prakash@gmail.com</a>.
            </p>
          </div>
        </div>
      `,
    }).catch((err) => console.warn('Could not dispatch patient registration welcome email:', err.message))

    return sendJson(res, 200, {
      success: true,
      userId,
      email: normalizedEmail,
    })
  } catch (err: any) {
    console.error('Error in /api/register-patient:', err)
    return sendJson(res, 500, { error: err.message || 'Internal server error' })
  }
}

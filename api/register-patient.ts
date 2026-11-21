import { getSupabaseAdmin, sendJson, parseBody } from './_utils'

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

import { getSupabaseAdmin, sendJson, parseBody } from './_utils.ts'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const email = (body.email || '').trim().toLowerCase()
    if (!email) return sendJson(res, 200, { exists: false })

    const admin = getSupabaseAdmin()

    const { data: usersData } = await admin.auth.admin.listUsers()
    const existingAuthUser = usersData?.users?.find((u) => u.email?.toLowerCase() === email)

    if (existingAuthUser) {
      const { data: prof } = await admin
        .from('profiles')
        .select('*')
        .eq('id', existingAuthUser.id)
        .maybeSingle()

      const role = prof?.role || existingAuthUser.user_metadata?.role || 'patient'
      return sendJson(res, 200, {
        exists: true,
        email,
        role,
        name: prof?.full_name || existingAuthUser.user_metadata?.full_name,
      })
    }

    const { data: existingPharm } = await admin
      .from('pharmacies')
      .select('id, name, email')
      .ilike('email', email)
      .maybeSingle()

    if (existingPharm) {
      return sendJson(res, 200, {
        exists: true,
        email,
        role: 'pharmacy_admin',
        name: existingPharm.name,
      })
    }

    return sendJson(res, 200, { exists: false })
  } catch (err: any) {
    console.error('Error in /api/check-email:', err)
    return sendJson(res, 500, { error: err.message || 'Internal server error' })
  }
}

import { getSupabaseAdmin, sendJson, parseBody } from './_utils.ts'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const { targetGenre, userId, title, body: notifBody, type } = body

    if (!title || !title.trim()) {
      return sendJson(res, 400, { error: 'Broadcast title is required' })
    }

    if (!notifBody || !notifBody.trim()) {
      return sendJson(res, 400, { error: 'Broadcast message body is required' })
    }

    const admin = getSupabaseAdmin()
    let targetUserIds: string[] = []

    if (targetGenre === 'specific_user') {
      if (!userId) {
        return sendJson(res, 400, { error: 'userId is required when targetGenre is specific_user' })
      }
      targetUserIds = [userId]
    } else if (targetGenre === 'patient') {
      const { data: patients, error: pErr } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'patient')
      if (pErr) throw pErr
      targetUserIds = (patients || []).map((p) => p.id)
    } else if (targetGenre === 'pharmacy_admin') {
      const { data: pharmacies, error: phErr } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'pharmacy_admin')
      if (phErr) throw phErr
      targetUserIds = (pharmacies || []).map((p) => p.id)
    } else {
      // 'all' - all users
      const { data: allUsers, error: aErr } = await admin
        .from('profiles')
        .select('id')
      if (aErr) throw aErr
      targetUserIds = (allUsers || []).map((p) => p.id)
    }

    if (targetUserIds.length === 0) {
      return sendJson(res, 200, {
        success: true,
        message: 'No active recipients found for the selected genre.',
        recipientCount: 0,
      })
    }

    // Insert notifications in batches of 100 to avoid payload limits
    const notificationRows = targetUserIds.map((uid) => ({
      user_id: uid,
      type: type || 'broadcast',
      title: title.trim(),
      body: notifBody.trim(),
      is_read: false,
    }))

    const batchSize = 100
    let insertedTotal = 0

    for (let i = 0; i < notificationRows.length; i += batchSize) {
      const batch = notificationRows.slice(i, i + batchSize)
      const { data, error: insErr } = await admin.from('notifications').insert(batch).select('id')
      if (insErr) {
        console.error('Error inserting broadcast batch:', insErr)
        throw insErr
      }
      insertedTotal += data?.length ?? batch.length
    }

    return sendJson(res, 200, {
      success: true,
      message: `Notification broadcasted to ${insertedTotal} recipient(s).`,
      recipientCount: insertedTotal,
      targetGenre: targetGenre || 'all',
    })
  } catch (err: any) {
    console.error('Exception in /api/broadcast-notification:', err)
    return sendJson(res, 500, { error: err.message || 'Internal server error' })
  }
}

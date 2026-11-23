import { getSupabaseAdmin, sendJson, parseBody } from './_utils.ts'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const { userId, userIds, type, title, body: notifBody, referenceId } = body

    const recipients: string[] = []
    if (userId && typeof userId === 'string') {
      recipients.push(userId)
    }
    if (Array.isArray(userIds)) {
      recipients.push(...userIds.filter((id) => typeof id === 'string' && id))
    }

    if (recipients.length === 0) {
      return sendJson(res, 400, { error: 'userId or userIds array is required' })
    }

    if (!title || !title.trim()) {
      return sendJson(res, 400, { error: 'Notification title is required' })
    }

    const admin = getSupabaseAdmin()

    const rows = recipients.map((uid) => ({
      user_id: uid,
      type: type || 'order_update',
      title: title.trim(),
      body: notifBody ? String(notifBody).trim() : null,
      reference_id: referenceId || null,
      is_read: false,
    }))

    const { data, error } = await admin
      .from('notifications')
      .insert(rows)
      .select('id, user_id, title, type, created_at')

    if (error) {
      console.error('Error inserting notifications in /api/send-notification:', error)
      return sendJson(res, 500, { error: error.message })
    }

    return sendJson(res, 200, {
      success: true,
      count: data?.length ?? 0,
      notifications: data,
    })
  } catch (err: any) {
    console.error('Exception in /api/send-notification:', err)
    return sendJson(res, 500, { error: err.message || 'Internal server error' })
  }
}

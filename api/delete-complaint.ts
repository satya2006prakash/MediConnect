import { getSupabaseAdmin, sendJson, parseBody } from './_utils.ts'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const { complaintId } = body

    if (!complaintId) {
      return sendJson(res, 400, { error: 'complaintId is required' })
    }

    const admin = getSupabaseAdmin()

    // 1. Clean up notifications linked to this complaint
    try {
      await admin.from('notifications').delete().eq('reference_id', complaintId)
    } catch (notifErr) {
      console.warn('Could not clean up notifications for complaint:', notifErr)
    }

    // 2. Permanently delete the complaint record bypassing RLS with service_role
    const { data, error } = await admin
      .from('complaints')
      .delete()
      .eq('id', complaintId)
      .select()

    if (error) {
      console.error('Error deleting complaint from database:', error)
      return sendJson(res, 500, { error: error.message })
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Complaint permanently deleted from database',
      deleted: data,
    })
  } catch (err: any) {
    console.error('Error in /api/delete-complaint:', err)
    return sendJson(res, 500, { error: err.message || 'Internal server error' })
  }
}

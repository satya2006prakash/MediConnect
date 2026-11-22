import { getSupabaseAdmin, sendJson, parseBody } from './_utils.ts'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const { userId } = body

    if (!userId) {
      return sendJson(res, 400, { error: 'userId is required' })
    }

    const admin = getSupabaseAdmin()

    // 1. Fetch user to verify existence and protect the superadmin account
    const { data: userData, error: getUserErr } = await admin.auth.admin.getUserById(userId)
    if (getUserErr || !userData?.user) {
      return sendJson(res, 404, { error: 'User not found' })
    }

    const userEmail = userData.user.email?.toLowerCase()
    if (userEmail === 'satya2006prakash@gmail.com') {
      return sendJson(res, 403, { error: 'Cannot delete the primary platform administrator account' })
    }

    // 2. Cascade cleanup related data
    // A. Clean up pharmacies owned by this user
    const { data: ownedPharmacies } = await admin
      .from('pharmacies')
      .select('id')
      .eq('owner_id', userId)

    if (ownedPharmacies && ownedPharmacies.length > 0) {
      const pharmacyIds = ownedPharmacies.map((p) => p.id)

      // Delete complaints referencing these pharmacies
      await admin.from('complaints').delete().in('against_pharmacy', pharmacyIds)

      // Delete orders referencing these pharmacies (bills and order_items cascade automatically from orders)
      await admin.from('orders').delete().in('pharmacy_id', pharmacyIds)

      // Delete pharmacy inventory
      await admin.from('pharmacy_inventory').delete().in('pharmacy_id', pharmacyIds)

      // Delete the pharmacy records
      await admin.from('pharmacies').delete().in('id', pharmacyIds)
    }

    // B. Clean up patient data
    await admin.from('complaints').delete().eq('filed_by', userId)
    await admin.from('orders').delete().eq('patient_id', userId)
    await admin.from('medicines').delete().eq('user_id', userId)
    await admin.from('notifications').delete().eq('user_id', userId)

    // C. Delete profile row
    await admin.from('profiles').delete().eq('id', userId)

    // D. Delete Supabase Auth user permanently
    const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(userId)
    if (deleteAuthErr) {
      console.error('Error deleting auth user:', deleteAuthErr)
      return sendJson(res, 500, { error: deleteAuthErr.message })
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Account and all associated records permanently deleted',
    })
  } catch (err: any) {
    console.error('Error in /api/delete-account:', err)
    return sendJson(res, 500, { error: err.message || 'Internal server error' })
  }
}

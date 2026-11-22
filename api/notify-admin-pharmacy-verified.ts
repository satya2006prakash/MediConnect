import { getSupabaseAdmin, sendEmail, getAppUrl, sendJson, parseBody } from './_utils.ts'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const { userId, email } = body

    if (!userId && !email) {
      return sendJson(res, 400, { error: 'userId or email is required' })
    }

    const admin = getSupabaseAdmin()

    // 1. Locate the Supabase Auth user
    let authUser: any = null
    if (userId) {
      const { data } = await admin.auth.admin.getUserById(userId)
      authUser = data?.user
    } else if (email) {
      const normalizedEmail = email.toLowerCase().trim()
      const { data: usersData } = await admin.auth.admin.listUsers()
      authUser = usersData?.users?.find(
        (u: any) => u.email?.toLowerCase().trim() === normalizedEmail
      )
    }

    if (!authUser) {
      return sendJson(res, 404, { error: 'User account not found' })
    }

    // 2. CRITICAL GATE: Verify that the pharmacy owner has actually confirmed their email!
    if (!authUser.email_confirmed_at) {
      console.log(`[notify-admin-pharmacy-verified] Pharmacy user ${authUser.email} has NOT verified email yet. Admin alert suppressed.`)
      return sendJson(res, 200, {
        success: false,
        notified: false,
        reason: 'email_not_confirmed',
        message: 'Owner email is not confirmed yet. Admin will only be notified after verification.',
      })
    }

    // 3. Idempotency Gate: Check if admin was already notified for this pharmacy
    if (authUser.user_metadata?.admin_verified_notified_at) {
      return sendJson(res, 200, {
        success: true,
        alreadyNotified: true,
        notifiedAt: authUser.user_metadata.admin_verified_notified_at,
        message: 'Admin has already been alerted for this pharmacy registration.',
      })
    }

    // 4. Fetch the pharmacy record
    const { data: pharmacy, error: pharmErr } = await admin
      .from('pharmacies')
      .select('*')
      .eq('owner_id', authUser.id)
      .maybeSingle()

    if (pharmErr || !pharmacy) {
      return sendJson(res, 404, { error: 'Pharmacy record not found for this user' })
    }

    // 5. Update pharmacy to mark email as verified
    await admin
      .from('pharmacies')
      .update({ document_url: 'email_verified' })
      .eq('id', pharmacy.id)

    // If pharmacy is already verified, no need to alert admin
    if (pharmacy.status === 'verified') {
      await admin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...authUser.user_metadata,
          admin_verified_notified_at: new Date().toISOString(),
          email_verified: true,
        },
      })
      return sendJson(res, 200, {
        success: true,
        alreadyApproved: true,
        message: 'Pharmacy is already approved.',
      })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    const appUrl = getAppUrl(req)
    const pharmacyName = pharmacy.name || 'New Pharmacy'
    const ownerName = profile?.full_name || authUser.user_metadata?.full_name || 'Pharmacy Owner'
    const licenseNumber = pharmacy.license_number || 'Pending review'
    const phone = pharmacy.phone || profile?.phone || '—'
    const location = [pharmacy.address, pharmacy.city, pharmacy.pincode ? `(${pharmacy.pincode})` : '']
      .filter(Boolean)
      .join(', ')

    // 6. Send the approval request email to Admin (ONLY AFTER pharmacy verified email)
    await sendEmail({
      to: 'satya2006prakash@gmail.com',
      subject: `[Action Required] New Pharmacy Registration (Email Verified): ${pharmacyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect Admin</h2>
            <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Pharmacy Registry Verification Request</p>
          </div>
          <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
            <div style="margin-bottom: 16px;">
              <span style="display: inline-block; background-color: #E8F5EF; color: #16865B; padding: 4px 12px; border-radius: 16px; font-weight: 600; font-size: 12px;">
                ✓ Owner Email Verified
              </span>
            </div>
            <h3 style="color: #182230; font-size: 18px; margin-top: 0;">New Pharmacy Awaiting Review &amp; Approval</h3>
            <p style="color: #475467; font-size: 14px; line-height: 1.6;">
              The pharmacy owner has confirmed their email authentication. The pharmacy details are now verified and ready for administrative approval:
            </p>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Pharmacy:</strong> ${pharmacyName}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Owner:</strong> ${ownerName}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Drug License:</strong> ${licenseNumber}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Registered Email:</strong> ${authUser.email}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Phone:</strong> ${phone}</p>
              <p style="margin: 0; font-size: 14px; color: #1E293B;"><strong>Address:</strong> ${location || '—'}</p>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${appUrl}/admin/pharmacies" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                Review in Pharmacy Registry &rarr;
              </a>
            </div>
          </div>
        </div>
      `,
    })

    // 7. Record that admin has been notified so this is never duplicated
    await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...authUser.user_metadata,
        admin_verified_notified_at: new Date().toISOString(),
        email_verified: true,
      },
    })

    return sendJson(res, 200, {
      success: true,
      notified: true,
      message: 'Admin has been notified of verified pharmacy registration.',
    })
  } catch (err: any) {
    console.error('Error in /api/notify-admin-pharmacy-verified:', err)
    return sendJson(res, 500, { error: err.message || 'Failed to notify admin' })
  }
}

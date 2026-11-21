import { getSupabaseAdmin, sendResendEmail, getAppUrl, sendJson, parseBody } from './_utils'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)
    const {
      ownerName,
      pharmacyName,
      email,
      phone,
      licenseNumber,
      address,
      city,
      pincode,
      password,
    } = body

    const normalizedEmail = (email || '').trim().toLowerCase()
    if (!normalizedEmail || !password || !pharmacyName) {
      return sendJson(res, 400, { error: 'Missing required registration fields' })
    }

    const admin = getSupabaseAdmin()

    const { data: usersData } = await admin.auth.admin.listUsers()
    const existingUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )
    let userId = existingUser?.id

    if (existingUser) {
      const { data: prof } = await admin
        .from('profiles')
        .select('*')
        .eq('id', existingUser.id)
        .maybeSingle()

      const { data: existingPharm } = await admin
        .from('pharmacies')
        .select('*')
        .eq('owner_id', existingUser.id)
        .maybeSingle()

      if (existingPharm) {
        return sendJson(res, 400, {
          error: 'already_registered',
          message: 'This email is already registered as a pharmacy on MediConnect.',
          role: 'pharmacy_admin',
        })
      }

      if (prof && prof.role === 'patient') {
        return sendJson(res, 400, {
          error: 'already_registered',
          message: 'This email is already registered as a patient account.',
          role: 'patient',
        })
      }

      if (prof && prof.role === 'admin') {
        return sendJson(res, 400, {
          error: 'already_registered',
          message: 'This email is registered as an administrator account.',
          role: 'admin',
        })
      }

      await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          role: 'pharmacy_admin',
          full_name: ownerName,
          pharmacy_name: pharmacyName,
          phone,
          city,
          pincode,
          address,
          license_number: licenseNumber,
        },
      })
    } else {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'pharmacy_admin',
          full_name: ownerName,
          pharmacy_name: pharmacyName,
          phone,
          city,
          pincode,
          address,
          license_number: licenseNumber,
        },
      })

      if (createError) {
        return sendJson(res, 400, { error: createError.message })
      }
      userId = newUser.user.id
    }

    await admin.from('profiles').upsert({
      id: userId,
      role: 'pharmacy_admin',
      full_name: ownerName,
      phone,
      city,
      pincode,
      address,
    })

    const { data: currentPharm } = await admin
      .from('pharmacies')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (currentPharm) {
      const { error: updErr } = await admin
        .from('pharmacies')
        .update({
          name: pharmacyName,
          license_number: licenseNumber,
          phone,
          email: normalizedEmail,
          address,
          city,
          pincode,
          status: 'pending',
        })
        .eq('id', currentPharm.id)

      if (updErr) return sendJson(res, 500, { error: updErr.message })
    } else {
      const { error: insErr } = await admin.from('pharmacies').insert({
        owner_id: userId,
        name: pharmacyName,
        license_number: licenseNumber,
        phone,
        email: normalizedEmail,
        address,
        city,
        pincode,
        status: 'pending',
      })

      if (insErr) return sendJson(res, 500, { error: insErr.message })
    }

    const appUrl = getAppUrl(req)

    // Notify pharmacy owner via Resend (fire and forget)
    sendResendEmail({
      to: normalizedEmail,
      subject: 'MediConnect – Pharmacy Registration Received (Under Review)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #2457A7; margin-top: 0;">Registration Received</h2>
          <p style="color: #475467; font-size: 15px; line-height: 1.6;">
            Hello <strong>${ownerName}</strong>,<br/><br/>
            Your registration for <strong>${pharmacyName}</strong> has been received by MediConnect.
          </p>
          <p style="color: #475467; font-size: 14px;">
            Our compliance team is reviewing your drug license (<strong>${licenseNumber}</strong>). You will receive an approval email as soon as your store is verified.
          </p>
        </div>
      `,
    }).catch((err) => console.warn('Could not dispatch pharmacy registration email:', err.message))

    // Alert admin
    sendResendEmail({
      to: 'satya2006prakash@gmail.com',
      subject: `MediConnect Action Required – New Pharmacy Verification: ${pharmacyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #2457A7; margin-top: 0;">New Pharmacy Awaiting Approval</h2>
          <p style="font-size: 15px; color: #475467;">
            <strong>Pharmacy:</strong> ${pharmacyName}<br/>
            <strong>Owner:</strong> ${ownerName}<br/>
            <strong>License:</strong> ${licenseNumber}<br/>
            <strong>Email:</strong> ${normalizedEmail}<br/>
            <strong>City:</strong> ${city || ''} (${pincode || ''})
          </p>
          <p style="margin-top: 24px;">
            <a href="${appUrl}/admin/pharmacies" style="background:#2457A7; color:#fff; text-decoration:none; padding:10px 20px; border-radius:6px; font-weight:600;">
              Review in Pharmacy Registry
            </a>
          </p>
        </div>
      `,
    }).catch((err) => console.warn('Could not dispatch admin alert email:', err.message))

    return sendJson(res, 200, {
      success: true,
      userId,
      email: normalizedEmail,
    })
  } catch (err: any) {
    console.error('Error in /api/register-pharmacy:', err)
    return sendJson(res, 500, { error: err.message || 'Pharmacy registration failed' })
  }
}

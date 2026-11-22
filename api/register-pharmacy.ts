import { getSupabaseAdmin, sendEmail, getAppUrl, sendJson, parseBody } from './_utils.ts'

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
      const appUrl = getAppUrl(req)
      const { data: linkData, error: createError } = await admin.auth.admin.generateLink({
        type: 'signup',
        email: normalizedEmail,
        password,
        options: {
          redirectTo: `${appUrl}/login?verified=true`,
          data: {
            role: 'pharmacy_admin',
            full_name: ownerName,
            pharmacy_name: pharmacyName,
            phone,
            city,
            pincode,
            address,
            license_number: licenseNumber,
          },
        },
      })

      if (createError) {
        return sendJson(res, 400, { error: createError.message })
      }
      userId = linkData.user.id
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
    const redirectTo = `${appUrl}/login?verified=true`

    // Generate action verification link for pharmacy owner
    let verifyLink = `${appUrl}/login`
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: { redirectTo },
      })
      if (linkData?.properties?.action_link) {
        verifyLink = linkData.properties.action_link
      }
    } catch (e) {
      console.warn('Could not generate pharmacy magiclink:', e)
    }

    if (verifyLink.includes('localhost') && appUrl.includes('mediconnect-sp.vercel.app')) {
      verifyLink = verifyLink.replaceAll('http://localhost:5173', appUrl)
      verifyLink = verifyLink.replaceAll('localhost%3A5173', 'mediconnect-sp.vercel.app')
    }

    // 1. Notify pharmacy owner with Verification Link & Confirmation
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: `Verify your Pharmacy Registration – ${pharmacyName} ✉️`,
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect</h2>
            <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Pharmacy Partner Network</p>
          </div>
          <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
            <h3 style="color: #182230; font-size: 18px; margin-top: 0;">Registration Received – Verify Your Email 📋</h3>
            <p style="color: #475467; font-size: 15px; line-height: 1.6;">
              Hello <strong>${ownerName}</strong>,<br/><br/>
              Thank you for connecting with <strong>MediConnect</strong> and registering <strong>${pharmacyName}</strong> on our platform.
            </p>
            <p style="color: #475467; font-size: 15px; line-height: 1.6;">
              Please click the button below to verify your email address and confirm your registration:
            </p>
            <div style="text-align: center; margin: 26px 0;">
              <a href="${verifyLink}" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                Verify Email &amp; Confirm Registration
              </a>
            </div>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #1E293B; font-size: 14px;">Submitted Store Details:</p>
              <p style="margin: 0 0 4px 0; color: #475467; font-size: 13px;"><strong>Pharmacy:</strong> ${pharmacyName}</p>
              <p style="margin: 0 0 4px 0; color: #475467; font-size: 13px;"><strong>Drug License:</strong> ${licenseNumber}</p>
              <p style="margin: 0 0 4px 0; color: #475467; font-size: 13px;"><strong>Location:</strong> ${city || ''} (${pincode || ''})</p>
              <p style="margin: 0; color: #475467; font-size: 13px;"><strong>Registered Email:</strong> ${normalizedEmail}</p>
            </div>
            <p style="color: #475467; font-size: 14px; line-height: 1.6;">
              Our compliance team is currently verifying your drug license and store credentials. As soon as your store is verified, you will receive an approval email and immediate access to your Pharmacy Management Portal.
            </p>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin: 20px 0;">
              <p style="margin: 0; color: #667085; font-size: 12px; line-height: 1.5; word-break: break-all;">
                Direct verification link:<br/>
                <a href="${verifyLink}" style="color: #2457A7;">${verifyLink}</a>
              </p>
            </div>
            <p style="color: #667085; font-size: 13px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
              Need help? Reach out to the administration at <a href="mailto:satya2006prakash@gmail.com" style="color: #2457A7;">satya2006prakash@gmail.com</a>.
            </p>
          </div>
        </div>
      `,
      })
    } catch (err: any) {
      console.warn('Could not dispatch pharmacy registration email:', err?.message)
    }

    // 2. Alert admin of new pending registration
    try {
      await sendEmail({
        to: 'satya2006prakash@gmail.com',
        subject: `[Action Required] New Pharmacy Registration: ${pharmacyName}`,
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect Admin</h2>
            <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Pharmacy Registry Verification Request</p>
          </div>
          <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
            <h3 style="color: #182230; font-size: 18px; margin-top: 0;">New Pharmacy Awaiting Review</h3>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Pharmacy:</strong> ${pharmacyName}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Owner:</strong> ${ownerName}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Drug License:</strong> ${licenseNumber}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Email:</strong> ${normalizedEmail}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1E293B;"><strong>Phone:</strong> ${phone || '—'}</p>
              <p style="margin: 0; font-size: 14px; color: #1E293B;"><strong>Address:</strong> ${address || ''}, ${city || ''} (${pincode || ''})</p>
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
    } catch (err: any) {
      console.warn('Could not dispatch admin alert email:', err?.message)
    }

    return sendJson(res, 200, {
      success: true,
      requiresVerification: true,
      userId,
      email: normalizedEmail,
    })
  } catch (err: any) {
    console.error('Error in /api/register-pharmacy:', err)
    return sendJson(res, 500, { error: err.message || 'Pharmacy registration failed' })
  }
}

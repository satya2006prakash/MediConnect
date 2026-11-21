import type { Plugin, ViteDevServer, PreviewServer } from 'vite'
import { loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'

export function mediConnectApiPlugin(): Plugin {
  let env: Record<string, string> = {}

  return {
    name: 'mediconnect-api-plugin',
    configResolved(config) {
      env = loadEnv(config.mode, process.cwd(), '')
    },
    configureServer(server: ViteDevServer) {
      attachApiRoutes(server.middlewares, env)
    },
    configurePreviewServer(server: PreviewServer) {
      attachApiRoutes(server.middlewares, env)
    },
  }
}

async function sendResendEmail(
  env: Record<string, string>,
  {
    to,
    subject,
    html,
    text,
  }: {
    to: string | string[]
    subject: string
    html: string
    text?: string
  }
) {
  const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY || ''
  const from = env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'MediConnect <onboarding@resend.dev>'

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  })

  const data = (await res.json()) as any
  if (!res.ok) {
    console.error('Resend API dispatch error:', data)
    throw new Error(data?.message || 'Failed to dispatch email via Resend')
  }
  return data
}

function attachApiRoutes(middlewares: any, env: Record<string, string>) {
  middlewares.use(async (req: any, res: any, next: any) => {
    const url = req.url?.split('?')[0]

    // ── 1. Check Email Uniqueness ──
    if (url === '/api/check-email' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        const email = (body.email || '').trim().toLowerCase()
        if (!email) return sendJson(res, 200, { exists: false })

        const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
        const secretKey = env.SUPABASE_SECRET_KEY
        if (!supabaseUrl || !secretKey) return sendJson(res, 200, { exists: false })

        const admin = createClient(supabaseUrl, secretKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
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

    // ── 2. Password Reset via Resend (Bypasses Supabase 3-4 mail/hour limit) ──
    if (url === '/api/reset-password' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        const email = (body.email || '').trim().toLowerCase()
        if (!email) return sendJson(res, 400, { error: 'Email address is required' })

        const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
        const secretKey = env.SUPABASE_SECRET_KEY
        if (!supabaseUrl || !secretKey) return sendJson(res, 500, { error: 'Database configuration missing' })

        const admin = createClient(supabaseUrl, secretKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        const origin = req.headers.origin || 'http://localhost:5173'
        const redirectTo = `${origin}/reset-password`

        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo },
        })

        if (linkErr) {
          console.error('generateLink error:', linkErr)
          return sendJson(res, 400, { error: linkErr.message })
        }

        const recoveryLink = linkData?.properties?.action_link
        if (!recoveryLink) {
          return sendJson(res, 500, { error: 'Could not generate recovery link' })
        }

        // Dispatch via Resend
        await sendResendEmail(env, {
          to: email,
          subject: 'MediConnect – Reset Your Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #2457A7; margin: 0; font-size: 24px;">MediConnect</h2>
                <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Smart Medicine Reordering & Healthcare Management</p>
              </div>
              <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
                <h3 style="color: #182230; font-size: 18px; margin-top: 0;">Password Reset Request</h3>
                <p style="color: #475467; font-size: 15px; line-height: 1.6;">
                  We received a request to reset the password for your account associated with <strong>${email}</strong>.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${recoveryLink}" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #667085; font-size: 13px; line-height: 1.5;">
                  If you did not request a password reset, no action is needed. Your account remains secure.
                </p>
                <p style="color: #98a2b3; font-size: 12px; margin-top: 20px; word-break: break-all;">
                  Button not displaying? Copy and paste this link:<br/>
                  <a href="${recoveryLink}" style="color: #2457A7;">${recoveryLink}</a>
                </p>
              </div>
            </div>
          `,
        })

        return sendJson(res, 200, { success: true, message: 'Reset email delivered via Resend' })
      } catch (err: any) {
        console.error('Error in /api/reset-password:', err)
        return sendJson(res, 500, { error: err.message || 'Failed to dispatch reset email' })
      }
    }

    // ── 3. Pharmacy Approval Notification via Resend ──
    if (url === '/api/notify-pharmacy-approval' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        const { pharmacyEmail, pharmacyName } = body
        if (!pharmacyEmail) return sendJson(res, 400, { error: 'pharmacyEmail is required' })

        const origin = req.headers.origin || 'http://localhost:5173'
        const loginUrl = `${origin}/login`

        await sendResendEmail(env, {
          to: pharmacyEmail,
          subject: 'MediConnect – Pharmacy Account Approved & Activated!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #159A91; margin: 0; font-size: 24px;">MediConnect Pharmacy Network</h2>
                <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Accreditation & Approval Confirmation</p>
              </div>
              <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
                <h3 style="color: #16865B; font-size: 18px; margin-top: 0;">Congratulations! Your Pharmacy is Verified</h3>
                <p style="color: #475467; font-size: 15px; line-height: 1.6;">
                  Dear <strong>${pharmacyName || 'Pharmacy Partner'}</strong>,<br/><br/>
                  Your drug license and registration details have been verified and approved by the MediConnect Administration.
                </p>
                <p style="color: #475467; font-size: 15px; line-height: 1.6;">
                  You can now sign in to your dashboard to manage live inventory, review refill requests, and fulfill patient orders.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${loginUrl}" style="background-color: #159A91; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                    Sign In to Pharmacy Portal
                  </a>
                </div>
              </div>
            </div>
          `,
        })

        return sendJson(res, 200, { success: true })
      } catch (err: any) {
        console.error('Error in /api/notify-pharmacy-approval:', err)
        return sendJson(res, 500, { error: err.message || 'Failed to dispatch approval notification' })
      }
    }

    // ── 4. Pharmacy Registration ──
    if (url === '/api/register-pharmacy' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req)
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

        const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
        const secretKey = env.SUPABASE_SECRET_KEY
        if (!supabaseUrl || !secretKey) {
          return sendJson(res, 500, { error: 'Supabase server credentials not configured' })
        }

        const admin = createClient(supabaseUrl, secretKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

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

        // Send registration receipt via Resend (fire and forget)
        sendResendEmail(env, {
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
                Our administrative compliance team is reviewing your drug license (<strong>${licenseNumber}</strong>). You will receive an approval email as soon as your store is verified.
              </p>
            </div>
          `,
        }).catch((err) => console.warn('Could not dispatch pharmacy registration email:', err.message))

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

    next()
  })
}

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: any) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: any, status: number, data: any) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

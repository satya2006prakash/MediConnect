import type { Plugin, ViteDevServer, PreviewServer } from 'vite'
import { loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

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

async function sendEmail(
  env: Record<string, string>,
  options: {
    to: string | string[]
    subject: string
    html: string
    text?: string
  }
) {
  const gmailUser = env.GMAIL_USER || process.env.GMAIL_USER || 'satya2006prakash@gmail.com'
  const gmailPass = (
    env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    Buffer.from('ZWZwam95ZW5zeHdnZm90ZA==', 'base64').toString('utf8')
  ).replace(/\s+/g, '')
  const recipient = Array.isArray(options.to) ? options.to[0] : options.to

  // 1. Gmail SMTP (works for all recipients, no domain needed)
  if (gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      })

      await transporter.sendMail({
        from: `MediConnect <${gmailUser}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      console.log('[apiPlugin:sendEmail] Dispatched via Gmail SMTP to:', options.to)
      return { success: true, method: 'gmail' }
    } catch (gmailErr: any) {
      console.warn('[apiPlugin:sendEmail] Gmail dispatch failed, falling back to Resend:', gmailErr?.message)
    }
  }

  // 2. Resend API
  try {
    const res = await sendResendEmail(env, options)
    console.log('[apiPlugin:sendEmail] Dispatched via Resend to:', options.to)
    return { success: true, method: 'resend', data: res }
  } catch (resendErr: any) {
    console.warn('[apiPlugin:sendEmail] Resend dispatch error:', resendErr?.message)

    // 3. Sandbox Sandbox Fallback
    if (
      resendErr?.message?.includes('testing emails to your own email address') ||
      resendErr?.message?.includes('validation_error') ||
      resendErr?.message?.includes('403')
    ) {
      console.log(`[apiPlugin:sendEmail] Resend sandbox restriction: routing email intended for ${recipient} to satya2006prakash@gmail.com`)
      const sandboxBanner = `
        <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #92400E; line-height: 1.5;">
          <p style="margin: 0 0 6px 0; font-weight: 700; font-size: 14px;">⚠️ Resend Sandbox Delivery Notice</p>
          <p style="margin: 0 0 4px 0;">This email was intended for: <strong style="color: #78350F;">${recipient}</strong></p>
          <p style="margin: 0; font-size: 12px; color: #B45309;">
            Because Resend uses test domain <code>onboarding@resend.dev</code>, emails are delivered to the registered admin account (<code>satya2006prakash@gmail.com</code>).
            To deliver directly to any user's personal inbox, add a 16-character <strong>GMAIL_APP_PASSWORD</strong> in your settings.
          </p>
        </div>
      `
      try {
        await sendResendEmail(env, {
          to: 'satya2006prakash@gmail.com',
          subject: `[For: ${recipient}] ${options.subject}`,
          html: sandboxBanner + options.html,
          text: options.text,
        })
        return { success: true, method: 'resend_sandbox_routed' }
      } catch (sandboxErr: any) {
        console.error('[apiPlugin:sendEmail] Sandbox fallback also failed:', sandboxErr?.message)
      }
    }

    throw resendErr
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

    // ── 1.5. Patient Registration (Bypasses email confirmation limits) ──
    if (url === '/api/register-patient' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        const { fullName, email, password, phone } = body

        const normalizedEmail = (email || '').trim().toLowerCase()
        if (!normalizedEmail || !password || !fullName) {
          return sendJson(res, 400, { error: 'Name, email, and password are required' })
        }

        const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
        const secretKey = env.SUPABASE_SECRET_KEY
        if (!supabaseUrl || !secretKey) {
          return sendJson(res, 500, { error: 'Supabase configuration missing' })
        }

        const admin = createClient(supabaseUrl, secretKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

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

        const origin =
          (req.headers.origin && !req.headers.origin.includes('localhost') ? req.headers.origin : null) ||
          (req.headers.referer && !req.headers.referer.includes('localhost') ? new URL(req.headers.referer).origin : null) ||
          'https://mediconnect-sp.vercel.app'
        const redirectTo = `${origin}/login?verified=true`

        // Generate Supabase Signup Verification Link
        const { data: linkData, error: createErr } = await admin.auth.admin.generateLink({
          type: 'signup',
          email: normalizedEmail,
          password,
          options: {
            redirectTo,
            data: {
              role: 'patient',
              full_name: fullName,
              phone: phone || null,
            },
          },
        })

        if (createErr) {
          return sendJson(res, 400, { error: createErr.message })
        }

        const userId = linkData.user.id
        let verifyLink = linkData?.properties?.action_link || `${origin}/login`

        if (verifyLink.includes('localhost') && origin.includes('mediconnect-sp.vercel.app')) {
          verifyLink = verifyLink.replaceAll('http://localhost:5173', origin)
          verifyLink = verifyLink.replaceAll('localhost%3A5173', 'mediconnect-sp.vercel.app')
        }

        await admin.from('profiles').upsert({
          id: userId,
          role: 'patient',
          full_name: fullName,
          phone: phone || null,
        })

        // Dispatch verification link email to patient
        sendEmail(env, {
          to: normalizedEmail,
          subject: 'Confirm your MediConnect Account – Verify Your Email ✉️',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect</h2>
                <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Smart Medicine Reordering &amp; Healthcare Management</p>
              </div>
              <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
                <h3 style="color: #182230; font-size: 18px; margin-top: 0;">Welcome to MediConnect, ${fullName}! 👋</h3>
                <p style="color: #475467; font-size: 15px; line-height: 1.6;">
                  Thank you for registering on MediConnect. To verify your email address and activate your account, please click the button below:
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${verifyLink}" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                    Verify Email &amp; Activate Account
                  </a>
                </div>
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin: 20px 0;">
                  <p style="margin: 0; color: #667085; font-size: 12px; line-height: 1.5; word-break: break-all;">
                    Direct verification link:<br/>
                    <a href="${verifyLink}" style="color: #2457A7;">${verifyLink}</a>
                  </p>
                </div>
                <p style="color: #667085; font-size: 13px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
                  If you did not create an account on MediConnect, you can safely ignore this email.
                </p>
              </div>
            </div>
          `,
        }).catch((err) => console.warn('Could not dispatch patient registration email:', err?.message))

        return sendJson(res, 200, {
          success: true,
          requiresVerification: true,
          userId,
          email: normalizedEmail,
          verifyLink,
        })
      } catch (err: any) {
        console.error('Error in /api/register-patient:', err)
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

        const origin =
          (req.headers.origin && !req.headers.origin.includes('localhost') ? req.headers.origin : null) ||
          (req.headers.referer && !req.headers.referer.includes('localhost') ? new URL(req.headers.referer).origin : null) ||
          (req.headers.host && !req.headers.host.includes('localhost') ? `https://${req.headers.host}` : null) ||
          'https://mediconnect-sp.vercel.app'
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

        let recoveryLink = linkData?.properties?.action_link
        if (!recoveryLink) {
          return sendJson(res, 500, { error: 'Could not generate recovery link' })
        }

        // Replace any Supabase localhost defaults with the deployed app URL
        if (recoveryLink.includes('localhost:5173') && origin.includes('mediconnect-sp.vercel.app')) {
          recoveryLink = recoveryLink.replaceAll('http://localhost:5173', 'https://mediconnect-sp.vercel.app')
          recoveryLink = recoveryLink.replaceAll('localhost%3A5173', 'mediconnect-sp.vercel.app')
        }

        // Dispatch via sendEmail (Gmail SMTP or Resend with sandbox fallback)
        try {
          await sendEmail(env, {
            to: email,
            subject: 'MediConnect – Reset Your Password 🔐',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect</h2>
                  <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Smart Medicine Reordering &amp; Healthcare Management</p>
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
        } catch (resendErr: any) {
          console.warn('[reset-password] delivery warning:', resendErr?.message)
        }

        return sendJson(res, 200, { success: true, message: 'Reset email dispatched', recoveryLink })
      } catch (err: any) {
        console.error('Error in /api/reset-password:', err)
        return sendJson(res, 500, { error: err.message || 'Failed to dispatch reset email' })
      }
    }

    // ── 3. Pharmacy Approval Notification ──
    if (url === '/api/notify-pharmacy-approval' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        const { pharmacyEmail, pharmacyName } = body
        if (!pharmacyEmail) return sendJson(res, 400, { error: 'pharmacyEmail is required' })

        const origin =
          (req.headers.origin && !req.headers.origin.includes('localhost') ? req.headers.origin : null) ||
          (req.headers.referer && !req.headers.referer.includes('localhost') ? new URL(req.headers.referer).origin : null) ||
          'https://mediconnect-sp.vercel.app'
        const loginUrl = `${origin}/login`

        await sendEmail(env, {
          to: pharmacyEmail,
          subject: `MediConnect – Pharmacy Registration Approved! Welcome Aboard 🎉`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5eaf0; border-radius: 12px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #2457A7; margin: 0; font-size: 24px; font-weight: 700;">MediConnect</h2>
                <p style="color: #667085; font-size: 13px; margin: 4px 0 0 0;">Pharmacy Partner Network Accreditation</p>
              </div>
              <div style="border-top: 1px solid #e5eaf0; padding-top: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="display: inline-block; background-color: #E8F5EF; color: #16865B; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 13px;">
                    ✓ Registration Approved
                  </span>
                </div>
                <h3 style="color: #182230; font-size: 19px; margin-top: 0; text-align: center;">Congratulations, ${pharmacyName || 'Pharmacy Partner'}! 🎉</h3>
                <p style="color: #475467; font-size: 15px; line-height: 1.6;">
                  We are pleased to inform you that your pharmacy registration and drug license credentials have been thoroughly reviewed and <strong>approved</strong> by the MediConnect Administration.
                </p>
                <p style="color: #475467; font-size: 15px; line-height: 1.6;">
                  <strong>Thank you for connecting with MediConnect!</strong> Your pharmacy is now active on our network and visible to patients in your region.
                </p>
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0 0 8px 0; font-weight: 600; color: #1E293B; font-size: 14px;">Next steps on your pharmacy portal:</p>
                  <ul style="margin: 0; padding-left: 20px; color: #475467; font-size: 13px; line-height: 1.6;">
                    <li>Sign in using your registered credentials (${pharmacyEmail})</li>
                    <li>Add &amp; update your available medicine inventory</li>
                    <li>Receive and fulfill automated prescription refill orders from patients</li>
                  </ul>
                </div>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${loginUrl}" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                    Sign In to Pharmacy Portal &rarr;
                  </a>
                </div>
                <p style="color: #667085; font-size: 13px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center;">
                  Need help onboarding? Contact admin support anytime at <a href="mailto:satya2006prakash@gmail.com" style="color: #2457A7;">satya2006prakash@gmail.com</a>.
                </p>
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
          const origin =
            (req.headers.origin && !req.headers.origin.includes('localhost') ? req.headers.origin : null) ||
            (req.headers.referer && !req.headers.referer.includes('localhost') ? new URL(req.headers.referer).origin : null) ||
            'https://mediconnect-sp.vercel.app'
          const redirectTo = `${origin}/login?verified=true`

          const { data: linkData, error: createError } = await admin.auth.admin.generateLink({
            type: 'signup',
            email: normalizedEmail,
            password,
            options: {
              redirectTo,
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

        const origin =
          (req.headers.origin && !req.headers.origin.includes('localhost') ? req.headers.origin : null) ||
          (req.headers.referer && !req.headers.referer.includes('localhost') ? new URL(req.headers.referer).origin : null) ||
          'https://mediconnect-sp.vercel.app'
        const redirectTo = `${origin}/login?verified=true`

        let verifyLink = `${origin}/login`
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
          console.warn('Could not generate pharmacy magiclink in apiPlugin:', e)
        }

        if (verifyLink.includes('localhost') && origin.includes('mediconnect-sp.vercel.app')) {
          verifyLink = verifyLink.replaceAll('http://localhost:5173', origin)
          verifyLink = verifyLink.replaceAll('localhost%3A5173', 'mediconnect-sp.vercel.app')
        }

        // 1. Notify pharmacy owner (confirmation & verification link)
        sendEmail(env, {
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
        }).catch((err) => console.warn('Could not dispatch pharmacy registration email:', err?.message))

        // 2. Alert admin of new pending registration
        sendEmail(env, {
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
                  <a href="${origin}/admin/pharmacies" style="background-color: #2457A7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                    Review in Pharmacy Registry &rarr;
                  </a>
                </div>
              </div>
            </div>
          `,
        }).catch((err) => console.warn('Could not dispatch admin alert email:', err?.message))

        return sendJson(res, 200, {
          success: true,
          requiresVerification: true,
          userId,
          email: normalizedEmail,
          verifyLink,
        })
      } catch (err: any) {
        console.error('Error in /api/register-pharmacy:', err)
        return sendJson(res, 500, { error: err.message || 'Pharmacy registration failed' })
      }
    }

    // ── 5. Permanent Account Deletion ──
    if (url === '/api/delete-account' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        const { userId } = body
        if (!userId) return sendJson(res, 400, { error: 'userId is required' })

        const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
        const secretKey = env.SUPABASE_SECRET_KEY
        if (!supabaseUrl || !secretKey) {
          return sendJson(res, 500, { error: 'Supabase credentials not configured' })
        }

        const admin = createClient(supabaseUrl, secretKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        // Protect primary admin account
        const { data: userData, error: getUserErr } = await admin.auth.admin.getUserById(userId)
        if (getUserErr || !userData?.user) {
          return sendJson(res, 404, { error: 'User not found' })
        }

        if (userData.user.email?.toLowerCase() === 'satya2006prakash@gmail.com') {
          return sendJson(res, 403, { error: 'Cannot delete primary platform administrator account' })
        }

        // Clean up pharmacy data
        const { data: ownedPharmacies } = await admin
          .from('pharmacies')
          .select('id')
          .eq('owner_id', userId)

        if (ownedPharmacies && ownedPharmacies.length > 0) {
          const pIds = ownedPharmacies.map((p) => p.id)
          await admin.from('complaints').delete().in('against_pharmacy', pIds)
          await admin.from('orders').delete().in('pharmacy_id', pIds)
          await admin.from('pharmacy_inventory').delete().in('pharmacy_id', pIds)
          await admin.from('pharmacies').delete().in('id', pIds)
        }

        // Clean up patient data
        await admin.from('complaints').delete().eq('filed_by', userId)
        await admin.from('orders').delete().eq('patient_id', userId)
        await admin.from('medicines').delete().eq('user_id', userId)
        await admin.from('notifications').delete().eq('user_id', userId)

        // Delete profile and auth user
        await admin.from('profiles').delete().eq('id', userId)
        const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId)
        if (delAuthErr) {
          return sendJson(res, 500, { error: delAuthErr.message })
        }

        return sendJson(res, 200, { success: true, message: 'Account permanently deleted' })
      } catch (err: any) {
        console.error('Error in /api/delete-account:', err)
        return sendJson(res, 500, { error: err.message || 'Account deletion failed' })
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

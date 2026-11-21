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

function attachApiRoutes(middlewares: any, env: Record<string, string>) {
  middlewares.use(async (req: any, res: any, next: any) => {
    const url = req.url?.split('?')[0]

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

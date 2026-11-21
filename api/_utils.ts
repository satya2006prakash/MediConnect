import { createClient } from '@supabase/supabase-js'

export function getAppUrl(req?: any): string {
  // 1. Check incoming request headers
  const origin = req?.headers?.origin || req?.headers?.referer
  if (origin && typeof origin === 'string') {
    try {
      const u = new URL(origin)
      if (u.host && !u.host.includes('localhost')) {
        return `${u.protocol}//${u.host}`
      }
    } catch {}
  }

  // 2. Check Vercel environment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL
  }
  if (process.env.VITE_APP_URL) {
    return process.env.VITE_APP_URL
  }

  // 3. Fallback to production Vercel deployment URL
  if (req?.headers?.host && !req.headers.host.includes('localhost')) {
    return `https://${req.headers.host}`
  }

  return 'https://mediconnect-sp.vercel.app'
}

export function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://zhenijqolswpsifqtaxr.supabase.co'

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''

  if (!supabaseUrl || !secretKey) {
    throw new Error('Supabase admin configuration missing (SUPABASE_SECRET_KEY)')
  }

  return createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function sendResendEmail(options: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}) {
  const apiKey = process.env.RESEND_API_KEY || ''
  const from = process.env.RESEND_FROM_EMAIL || 'MediConnect <onboarding@resend.dev>'

  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured')
    return null
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  })

  const data = (await res.json()) as any
  if (!res.ok) {
    console.error('Resend dispatch error:', data)
    throw new Error(data?.message || 'Failed to dispatch email via Resend')
  }
  return data
}

export function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === 'function') {
    return res.status(status).json(data)
  }
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: any) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

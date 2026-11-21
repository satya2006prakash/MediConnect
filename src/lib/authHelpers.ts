import { supabase } from '@/lib/supabase'

export interface EmailCheckResult {
  exists: boolean
  email?: string
  role?: 'patient' | 'pharmacy_admin' | 'admin' | string
  name?: string
}

/**
 * Checks whether an email address is already registered on MediConnect,
 * and if so, returns the existing role (patient, pharmacy_admin, or admin).
 */
export async function checkEmailRegistered(email: string): Promise<EmailCheckResult> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { exists: false }

  // 1. Try local server endpoint first (fast, bypasses RLS, checks auth & public tables)
  try {
    const res = await fetch('/api/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized }),
    })
    if (res.ok) {
      const result = await res.json()
      if (result && typeof result.exists === 'boolean') {
        return result as EmailCheckResult
      }
    }
  } catch (err) {
    console.debug('/api/check-email endpoint unavailable, falling back to database RPC:', err)
  }

  // 2. Database RPC fallback
  try {
    const { data, error } = await supabase.rpc('check_email_registered', {
      lookup_email: normalized,
    })

    if (!error && data && typeof data === 'object') {
      return data as EmailCheckResult
    }
  } catch (err) {
    console.debug('check_email_registered RPC lookup skipped or unavailable:', err)
  }

  return { exists: false }
}

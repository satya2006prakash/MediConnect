import { supabase } from '@/lib/supabase'
import type { NotificationType } from '@/types/database'

export interface NotificationPayload {
  userId: string | string[]
  type?: NotificationType | string
  title: string
  body?: string | null
  referenceId?: string | null
}

/**
 * Dispatch an in-app notification reliably.
 * First calls the serverless API endpoint (bypasses RLS using service_role),
 * with a graceful fallback to direct client-side Supabase insert.
 */
export async function sendAppNotification(payload: NotificationPayload): Promise<boolean> {
  const recipients = Array.isArray(payload.userId) ? payload.userId : [payload.userId]
  if (recipients.length === 0 || !payload.title?.trim()) return false

  try {
    // 1. Primary: Serverless admin endpoint (works reliably across all user roles)
    const res = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds: recipients,
        type: payload.type || 'order_update',
        title: payload.title.trim(),
        body: payload.body?.trim() || null,
        referenceId: payload.referenceId || null,
      }),
    })

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.success) return true
    }
  } catch (apiErr) {
    console.warn('sendAppNotification API endpoint unreachable, falling back to direct Supabase:', apiErr)
  }

  // 2. Fallback: Direct client-side insert
  try {
    const rows = recipients.map((uid) => ({
      user_id: uid,
      type: payload.type || 'order_update',
      title: payload.title.trim(),
      body: payload.body?.trim() || null,
      reference_id: payload.referenceId || null,
      is_read: false,
    }))
    const { error } = await supabase.from('notifications').insert(rows)
    if (!error) return true
    console.warn('Fallback direct notification insert failed:', error)
  } catch (clientErr) {
    console.warn('Fallback direct notification insert exception:', clientErr)
  }

  return false
}

/**
 * Synthesizes a subtle, premium two-tone notification chime via Web Audio API.
 * Requires 0 external assets and works in all modern desktop/mobile browsers.
 */
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()

    // Tone 1: High crisp bell note (A5 - 880 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, ctx.currentTime)
    gain1.gain.setValueAtTime(0.12, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.35)

    // Tone 2: Harmonic complement note (E6 - 1318.5 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.08)
    gain2.gain.setValueAtTime(0.09, ctx.currentTime + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.08)
    osc2.stop(ctx.currentTime + 0.5)
  } catch {
    // AudioContext blocked by browser autoplay policy if user hasn't interacted yet
  }
}

/**
 * Request notification permission from the browser / installed PWA.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Trigger a native system notification popup (works for installed PWAs and open desktop/mobile browser tabs).
 */
export function showSystemNotification(title: string, options?: { body?: string; tag?: string; url?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const notif = new Notification(title, {
      body: options?.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options?.tag,
    })

    notif.onclick = () => {
      window.focus()
      if (options?.url) {
        window.location.href = options.url
      }
      notif.close()
    }
  } catch (err) {
    console.warn('Failed to show native system notification:', err)
  }
}

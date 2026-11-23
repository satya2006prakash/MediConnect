import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, ShoppingBag, Receipt, ShieldAlert, CheckCircle2, MessageSquare, Megaphone, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { playNotificationChime, showSystemNotification, requestNotificationPermission } from '@/lib/notifications'

export function useRealtimeNotifications() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile?.id) return

    // Proactively request browser notification permission for installed PWA / browser popup
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      // Delay slightly so it doesn't immediately interrupt page load
      const permTimer = setTimeout(() => {
        requestNotificationPermission()
      }, 3000)
      return () => clearTimeout(permTimer)
    }
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return

    const userId = profile.id
    const userRole = profile.role

    // ── Helper to route to relevant section based on notification type ──
    const getNotificationPath = (type: string, referenceId?: string | null) => {
      switch (type) {
        case 'new_request':
          return referenceId ? `/pharmacy/requests/${referenceId}` : '/pharmacy/requests'
        case 'bill_generated':
          return referenceId ? `/app/orders/${referenceId}` : '/app/orders'
        case 'order_update':
          if (userRole === 'pharmacy_admin') {
            return referenceId ? `/pharmacy/requests/${referenceId}` : '/pharmacy/requests'
          }
          return referenceId ? `/app/orders/${referenceId}` : '/app/orders'
        case 'pharmacy_verified':
          return '/pharmacy/profile'
        case 'complaint_update':
          if (userRole === 'admin') return '/admin/complaints'
          if (userRole === 'pharmacy_admin') return '/pharmacy/complaints'
          return '/app/complaints'
        case 'broadcast':
        case 'system_alert':
          return userRole === 'admin' ? '/admin/broadcast' : userRole === 'pharmacy_admin' ? '/pharmacy/dashboard' : '/app/dashboard'
        default:
          return userRole === 'admin' ? '/admin/orders' : userRole === 'pharmacy_admin' ? '/pharmacy/requests' : '/app/orders'
      }
    }

    const getNotificationIcon = (type: string) => {
      switch (type) {
        case 'new_request':
          return <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        case 'bill_generated':
          return <Receipt className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        case 'order_update':
          return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        case 'pharmacy_verified':
          return <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        case 'complaint_update':
          return <MessageSquare className="w-5 h-5 text-red-600 dark:text-red-400" />
        case 'broadcast':
        case 'system_alert':
          return <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        default:
          return <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
      }
    }

    // ── Handle incoming notification event ──
    const handleIncomingNotification = (notif: {
      id?: string
      title: string
      body?: string | null
      type: string
      reference_id?: string | null
    }) => {
      // 1. Play soft audio chime
      playNotificationChime()

      // 2. Dispatch native OS system notification (works in installed PWA / background)
      const targetUrl = getNotificationPath(notif.type, notif.reference_id)
      showSystemNotification(notif.title, {
        body: notif.body || undefined,
        tag: notif.id || `notif-${Date.now()}`,
        url: targetUrl,
      })

      // 3. Render rich in-app toast popup
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id)
              navigate(targetUrl)
            }}
            className={`cursor-pointer max-w-sm w-full bg-white dark:bg-[#161B22] shadow-xl rounded-xl border border-[#CBDDF4] dark:border-[#30363D] p-3.5 flex items-start gap-3 transition-all transform hover:scale-[1.02] ${
              t.visible ? 'animate-in fade-in slide-in-from-top-4 duration-200' : 'animate-out fade-out duration-150'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#EEF4FC] dark:bg-[#21262D] flex items-center justify-center shrink-0 mt-0.5">
              {getNotificationIcon(notif.type)}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-bold text-[#182230] dark:text-[#F0F6FC] leading-snug truncate">
                {notif.title}
              </p>
              {notif.body && (
                <p className="text-[11px] text-[#667085] dark:text-[#8B949E] mt-0.5 line-clamp-2 leading-relaxed">
                  {notif.body}
                </p>
              )}
              <span className="text-[10px] text-[#2457A7] dark:text-[#58A6FF] font-medium mt-1 inline-block">
                Click to view details →
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toast.dismiss(t.id)
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 rounded"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
        { duration: 6000, position: 'top-right' }
      )

      // 4. Invalidate related caches immediately
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-header-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['pharmacy-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] })
    }

    // ── Subscribe to Supabase Realtime channel ──
    const channelName = `realtime-user-notifs-${userId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            handleIncomingNotification(payload.new as any)
          }
        }
      )
      .subscribe()

    // ── If admin, also listen for new complaints and pending pharmacy registrations ──
    let adminChannel: any = null
    if (userRole === 'admin') {
      adminChannel = supabase
        .channel('admin-realtime-monitor')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'complaints',
          },
          (payload) => {
            const comp = payload.new as any
            if (comp) {
              handleIncomingNotification({
                id: comp.id,
                title: 'New Complaint Ticket Filed',
                body: `Subject: "${comp.subject}". An issue has been reported.`,
                type: 'complaint_update',
                reference_id: comp.id,
              })
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pharmacies',
          },
          (payload) => {
            const pharm = payload.new as any
            if (pharm) {
              handleIncomingNotification({
                id: pharm.id,
                title: 'New Pharmacy Registration Pending',
                body: `Store "${pharm.name}" in ${pharm.city || 'your area'} submitted documents for verification.`,
                type: 'pharmacy_verified',
                reference_id: pharm.id,
              })
            }
          }
        )
        .subscribe()
    }

    return () => {
      supabase.removeChannel(channel)
      if (adminChannel) {
        supabase.removeChannel(adminChannel)
      }
    }
  }, [profile?.id, profile?.role, queryClient, navigate])
}

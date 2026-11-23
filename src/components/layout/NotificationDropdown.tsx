import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCheck,
  Building2,
  MessageSquareWarning,
  Package,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime, cn } from '@/lib/utils'
import type { Notification, UserRole } from '@/types/database'

interface NotificationDropdownProps {
  role: UserRole
  className?: string
}

export function NotificationDropdown({ role, className }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // ── 1. User Notifications Query (for all roles) ──
  const { data: userNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['header-notifications', profile?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(8)
        if (error) return []
        return (data || []) as Notification[]
      } catch {
        return []
      }
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  })

  // ── 2. Admin-specific Alerts (pending pharmacies & open complaints) ──
  const { data: adminAlerts = { pendingPharmacies: [], openComplaints: [] } } = useQuery({
    queryKey: ['admin-header-alerts'],
    queryFn: async () => {
      try {
        const [pharmRes, compRes] = await Promise.all([
          supabase
            .from('pharmacies')
            .select('id, name, city, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('complaints')
            .select('id, subject, created_at')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(5),
        ])
        return {
          pendingPharmacies: pharmRes.data || [],
          openComplaints: compRes.data || [],
        }
      } catch {
        return { pendingPharmacies: [], openComplaints: [] }
      }
    },
    enabled: role === 'admin',
    refetchInterval: 30000,
  })

  // ── 3. Pharmacy-specific Pending Requests Count ──
  const { data: pharmacyPendingCount = 0 } = useQuery({
    queryKey: ['pharmacy-pending-badge', profile?.id],
    queryFn: async () => {
      try {
        const { data: pharm } = await supabase
          .from('pharmacies')
          .select('id')
          .eq('owner_id', profile!.id)
          .maybeSingle()
        if (!pharm) return 0
        const { count, error } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('pharmacy_id', pharm.id)
          .eq('status', 'pending')
        if (error) return 0
        return count || 0
      } catch {
        return 0
      }
    },
    enabled: role === 'pharmacy_admin' && !!profile?.id,
    refetchInterval: 30000,
  })

  // Mutations
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile!.id)
        .eq('is_read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markSingleReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Compute True Unread Count
  const unreadUserCount = userNotifications.filter((n) => !n.is_read).length
  const totalAdminAlerts = adminAlerts.pendingPharmacies.length + adminAlerts.openComplaints.length

  const totalUnreadCount =
    role === 'admin'
      ? unreadUserCount + totalAdminAlerts
      : role === 'pharmacy_admin'
        ? unreadUserCount + (pharmacyPendingCount > 0 ? 1 : 0)
        : unreadUserCount

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative p-2 rounded-md transition-colors',
          isOpen
            ? 'bg-[#F0F3F7] dark:bg-[#21262D] text-[#182230] dark:text-[#F0F6FC]'
            : 'text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D]'
        )}
        title="Notifications & System Alerts"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4" />
        {totalUnreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D64545] ring-2 ring-white dark:ring-[#161B22]" />
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5EAF0] dark:border-[#30363D] bg-slate-50/60 dark:bg-[#21262D]/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC]">
                Notifications
              </span>
              {totalUnreadCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                  {totalUnreadCount} unread
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-[#21262D] text-slate-500 dark:text-[#8B949E]">
                  All caught up
                </span>
              )}
            </div>

            {unreadUserCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark read
              </button>
            )}
          </div>

          {/* Alert Content List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E5EAF0] dark:divide-[#30363D]">
            {/* ── Admin Action Alerts ── */}
            {role === 'admin' && (
              <>
                {adminAlerts.pendingPharmacies.map((pharm: any) => (
                  <div
                    key={pharm.id}
                    onClick={() => {
                      setIsOpen(false)
                      navigate('/admin/pharmacies')
                    }}
                    className="p-3.5 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 cursor-pointer transition-colors flex items-start gap-3 bg-amber-50/30 dark:bg-amber-950/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-[#F0F6FC] leading-snug">
                        {pharm.name}
                      </p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                        New pharmacy registration awaits drug license verification.
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pharm.city && `${pharm.city} · `}
                        {formatDateTime(pharm.created_at)}
                      </p>
                    </div>
                  </div>
                ))}

                {adminAlerts.openComplaints.map((comp: any) => (
                  <div
                    key={comp.id}
                    onClick={() => {
                      setIsOpen(false)
                      navigate('/admin/complaints')
                    }}
                    className="p-3.5 hover:bg-purple-50/60 dark:hover:bg-purple-950/20 cursor-pointer transition-colors flex items-start gap-3 bg-purple-50/20 dark:bg-purple-950/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquareWarning className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-[#F0F6FC] leading-snug">
                        Open Complaint Ticket
                      </p>
                      <p className="text-[11px] text-purple-800 dark:text-purple-300 mt-0.5 truncate">
                        {comp.subject}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(comp.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ── Pharmacy Action Alert (Pending Refills) ── */}
            {role === 'pharmacy_admin' && pharmacyPendingCount > 0 && (
              <div
                onClick={() => {
                  setIsOpen(false)
                  navigate('/pharmacy/requests')
                }}
                className="p-3.5 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 cursor-pointer transition-colors flex items-start gap-3 bg-blue-50/30 dark:bg-blue-950/10"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Package className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-[#F0F6FC]">
                    {pharmacyPendingCount} New Refill Request{pharmacyPendingCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                    Patients are waiting for prescription review and bill generation.
                  </p>
                </div>
              </div>
            )}

            {/* ── Direct User Notifications ── */}
            {userNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markSingleReadMutation.mutate(n.id)
                  setIsOpen(false)
                  if (role === 'patient') {
                    if (n.reference_id) navigate(`/app/orders/${n.reference_id}`)
                    else navigate('/app/notifications')
                  } else if (role === 'pharmacy_admin') {
                    if (n.reference_id) navigate(`/pharmacy/requests/${n.reference_id}`)
                    else navigate('/pharmacy/requests')
                  } else if (role === 'admin') {
                    if (n.type === 'complaint_update') navigate('/admin/complaints')
                    else if (n.type === 'pharmacy_verified') navigate('/admin/pharmacies')
                    else if (n.type === 'broadcast' || n.type === 'system_alert') navigate('/admin/broadcast')
                    else navigate('/admin/notifications')
                  }
                }}
                className={cn(
                  'p-3.5 hover:bg-slate-50 dark:hover:bg-[#21262D] cursor-pointer transition-colors flex items-start gap-3',
                  !n.is_read && 'bg-primary-50/30 dark:bg-primary-950/20'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full mt-2 shrink-0',
                    n.is_read ? 'bg-transparent' : 'bg-primary-600'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs leading-snug',
                      !n.is_read
                        ? 'font-semibold text-slate-900 dark:text-[#F0F6FC]'
                        : 'font-medium text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-[11px] text-slate-500 dark:text-[#8B949E] mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
              </div>
            ))}

            {/* ── Empty State ── */}
            {totalUnreadCount === 0 && userNotifications.length === 0 && (
              <div className="py-8 px-4 text-center">
                <Bell className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  No notifications
                </p>
                <p className="text-[11px] text-slate-400 dark:text-[#8B949E] mt-0.5">
                  You're all caught up with your updates!
                </p>
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="p-2.5 border-t border-[#E5EAF0] dark:border-[#30363D] bg-slate-50/80 dark:bg-[#21262D]/60 text-center">
            {role === 'patient' && (
              <Link
                to="/app/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
              >
                View all notifications
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {role === 'pharmacy_admin' && (
              <Link
                to="/pharmacy/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
              >
                View all notifications
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {role === 'admin' && (
              <Link
                to="/admin/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
              >
                View all notifications
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

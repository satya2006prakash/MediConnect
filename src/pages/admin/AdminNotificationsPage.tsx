import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Megaphone,
  MessageSquare,
  Building2,
  ShoppingBag,
  Check,
  CheckCheck,
  Trash2,
  Search,
  ArrowRight,
  Clock,
  ShieldAlert,
  Inbox,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { formatDateTime, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Notification } from '@/types/database'

type FilterCategory = 'all' | 'unread' | 'broadcast' | 'complaint' | 'pharmacy' | 'order'

export function AdminNotificationsPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<FilterCategory>('all')
  const [search, setSearch] = useState('')
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null)
  const [isDeletingAllRead, setIsDeletingAllRead] = useState(false)

  // Fetch all notifications for Admin
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['admin-notifications-page', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching admin notifications:', error)
          return []
        }
        return (data || []) as Notification[]
      } catch {
        return []
      }
    },
    enabled: !!profile?.id,
    refetchInterval: 15000,
  })

  // Admin Counts for quick insight cards
  const { data: alertCounts = { pendingPharmacies: 0, openComplaints: 0 } } = useQuery({
    queryKey: ['admin-notifications-counts'],
    queryFn: async () => {
      try {
        const [pharmRes, compRes] = await Promise.all([
          supabase.from('pharmacies').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        ])
        return {
          pendingPharmacies: pharmRes.count || 0,
          openComplaints: compRes.count || 0,
        }
      } catch {
        return { pendingPharmacies: 0, openComplaints: 0 }
      }
    },
    refetchInterval: 30000,
  })

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: isRead })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] })
      queryClient.invalidateQueries({ queryKey: ['header-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile!.id)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('All notifications marked as read')
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] })
      queryClient.invalidateQueries({ queryKey: ['header-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Notification removed')
      setNotificationToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] })
      queryClient.invalidateQueries({ queryKey: ['header-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete notification')
    },
  })

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile!.id)
        .eq('is_read', true)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('All read notifications deleted')
      setIsDeletingAllRead(false)
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] })
      queryClient.invalidateQueries({ queryKey: ['header-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to clear read notifications')
    },
  })

  // Filter & Search Logic
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const readCount = notifications.filter((n) => n.is_read).length

  const filteredNotifications = notifications.filter((n) => {
    if (search.trim()) {
      const term = search.toLowerCase()
      const titleMatch = n.title?.toLowerCase().includes(term)
      const bodyMatch = n.body?.toLowerCase().includes(term)
      if (!titleMatch && !bodyMatch) return false
    }

    if (activeTab === 'unread') return !n.is_read
    if (activeTab === 'broadcast') return n.type === 'broadcast' || n.type === 'system_alert'
    if (activeTab === 'complaint') return n.type === 'complaint_update'
    if (activeTab === 'pharmacy') return n.type === 'pharmacy_verified'
    if (activeTab === 'order') return n.type === 'new_request' || n.type === 'order_update' || n.type === 'bill_generated'
    return true
  })

  const getNotificationVisuals = (type: string) => {
    switch (type) {
      case 'broadcast':
        return {
          icon: <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40',
          badgeText: 'Broadcast',
          badgeClass: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
        }
      case 'system_alert':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40',
          badgeText: 'System Alert',
          badgeClass: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
        }
      case 'complaint_update':
        return {
          icon: <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          bgColor: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40',
          badgeText: 'Complaint',
          badgeClass: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
        }
      case 'pharmacy_verified':
        return {
          icon: <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
          badgeText: 'Pharmacy',
          badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
        }
      case 'new_request':
      case 'order_update':
      case 'bill_generated':
        return {
          icon: <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          bgColor: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40',
          badgeText: 'Order',
          badgeClass: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
        }
      default:
        return {
          icon: <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />,
          bgColor: 'bg-slate-50 dark:bg-[#21262D] border-slate-200 dark:border-[#30363D]',
          badgeText: 'General',
          badgeClass: 'bg-slate-100 dark:bg-[#21262D] text-slate-700 dark:text-slate-300',
        }
    }
  }

  const getActionLink = (type: string, _referenceId?: string | null) => {
    switch (type) {
      case 'complaint_update':
        return '/admin/complaints'
      case 'pharmacy_verified':
        return '/admin/pharmacies'
      case 'new_request':
      case 'order_update':
      case 'bill_generated':
        return '/admin/orders'
      case 'broadcast':
      case 'system_alert':
        return '/admin/broadcast'
      default:
        return null
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & System Alerts"
        description="Real-time alerts, broadcast dispatches, complaint reports, and pharmacy approvals."
        actions={
          unreadCount > 0 || readCount > 0 ? (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => markAllReadMutation.mutate()}
                  isLoading={markAllReadMutation.isPending}
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
              {readCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeletingAllRead(true)}
                  className="text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Clear read
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161B22] p-4 rounded-xl border border-[#E5EAF0] dark:border-[#30363D] shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#667085] dark:text-[#8B949E]">Total Notifications</p>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-[#182230] dark:text-[#F0F6FC] mt-1">
            {notifications.length}
          </p>
        </div>

        <div className="bg-white dark:bg-[#161B22] p-4 rounded-xl border border-[#E5EAF0] dark:border-[#30363D] shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#667085] dark:text-[#8B949E]">Unread Alerts</p>
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                unreadCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-slate-300'
              )}
            />
          </div>
          <p className="text-2xl font-bold text-[#182230] dark:text-[#F0F6FC] mt-1">
            {unreadCount}
          </p>
        </div>

        <Link
          to="/admin/complaints"
          className="bg-white dark:bg-[#161B22] p-4 rounded-xl border border-[#E5EAF0] dark:border-[#30363D] shadow-xs hover:border-purple-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#667085] dark:text-[#8B949E]">Open Complaints</p>
            <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
            {alertCounts.openComplaints}
          </p>
        </Link>

        <Link
          to="/admin/pharmacies"
          className="bg-white dark:bg-[#161B22] p-4 rounded-xl border border-[#E5EAF0] dark:border-[#30363D] shadow-xs hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#667085] dark:text-[#8B949E]">Pending Pharmacies</p>
            <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {alertCounts.pendingPharmacies}
          </p>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#161B22] p-3 rounded-xl border border-[#E5EAF0] dark:border-[#30363D]">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            {
              key: 'broadcast',
              label: 'Broadcasts',
              count: notifications.filter((n) => n.type === 'broadcast' || n.type === 'system_alert').length,
            },
            {
              key: 'complaint',
              label: 'Complaints',
              count: notifications.filter((n) => n.type === 'complaint_update').length,
            },
            {
              key: 'pharmacy',
              label: 'Pharmacies',
              count: notifications.filter((n) => n.type === 'pharmacy_verified').length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as FilterCategory)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-[#667085] dark:text-[#8B949E] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D] hover:text-[#182230] dark:hover:text-[#F0F6FC]'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-[#21262D] text-slate-600 dark:text-[#8B949E]'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F9FC] dark:bg-[#0D1117] border border-[#CBDDF4] dark:border-[#30363D] rounded-lg text-[#182230] dark:text-[#F0F6FC] placeholder-[#667085] focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Notification Feed List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={search ? 'No matching notifications' : 'No notifications in this view'}
          description={
            search
              ? 'Try modifying your search term or selecting a different tab.'
              : "You're all caught up! New system broadcasts and platform events will show up here."
          }
          action={
            search ? (
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Clear Search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl shadow-xs divide-y divide-[#E5EAF0] dark:divide-[#30363D] overflow-hidden">
          {filteredNotifications.map((notif) => {
            const visuals = getNotificationVisuals(notif.type)
            const targetUrl = getActionLink(notif.type, notif.reference_id)

            return (
              <div
                key={notif.id}
                className={cn(
                  'p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-[#21262D]/50',
                  !notif.is_read && 'bg-primary-50/25 dark:bg-primary-950/15'
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5',
                      visuals.bgColor
                    )}
                  >
                    {visuals.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          visuals.badgeClass
                        )}
                      >
                        {visuals.badgeText}
                      </span>

                      {!notif.is_read ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
                          Unread
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Read
                        </span>
                      )}

                      <span className="text-slate-300 dark:text-slate-600">·</span>

                      <span className="text-[11px] text-[#667085] dark:text-[#8B949E] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(notif.created_at)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC] leading-snug">
                      {notif.title}
                    </h3>

                    {notif.body && (
                      <p className="text-xs text-[#475467] dark:text-[#8B949E] mt-1 leading-relaxed whitespace-pre-line">
                        {notif.body}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-[#30363D]">
                  {targetUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!notif.is_read) {
                          markReadMutation.mutate({ id: notif.id, isRead: true })
                        }
                        navigate(targetUrl)
                      }}
                      className="text-xs"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      markReadMutation.mutate({
                        id: notif.id,
                        isRead: !notif.is_read,
                      })
                    }
                    title={notif.is_read ? 'Mark as unread' : 'Mark as read'}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {notif.is_read ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotificationToDelete(notif)}
                    title="Delete notification"
                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!notificationToDelete}
        onClose={() => setNotificationToDelete(null)}
        onConfirm={() => {
          if (notificationToDelete) {
            deleteNotificationMutation.mutate(notificationToDelete.id)
          }
        }}
        title="Delete Notification"
        description="Are you sure you want to permanently delete this notification from your records?"
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteNotificationMutation.isPending}
      />

      {/* Clear All Read Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeletingAllRead}
        onClose={() => setIsDeletingAllRead(false)}
        onConfirm={() => deleteAllReadMutation.mutate()}
        title="Clear All Read Notifications"
        description={`This will permanently remove all ${readCount} read notifications. Unread notifications will remain.`}
        confirmLabel="Clear All Read"
        variant="danger"
        isLoading={deleteAllReadMutation.isPending}
      />
    </div>
  )
}

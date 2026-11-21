import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types/database'

export function NotificationsPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile!.id)
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error fetching notifications:', error)
          return []
        }
        return (data || []) as Notification[]
      } catch {
        return []
      }
    },
    enabled: !!profile?.id,
  })


  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile!.id)
        .eq('is_read', false)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You'll be notified about low stock, order updates, and bills here."
        />
      ) : (
        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg divide-y divide-border dark:divide-[#30363D]">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#21262D] transition-colors',
                !n.is_read && 'bg-primary-50/40 dark:bg-primary-950/30'
              )}
              onClick={() => !n.is_read && markRead.mutate(n.id)}
            >
              <div className={cn(
                'w-2 h-2 rounded-full mt-1.5 shrink-0',
                n.is_read ? 'bg-transparent' : 'bg-primary-600'
              )} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', !n.is_read ? 'font-semibold text-slate-900 dark:text-[#F0F6FC]' : 'font-medium text-slate-700 dark:text-slate-300')}>
                  {n.title}
                </p>
                {n.body && <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-0.5">{n.body}</p>}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <button
                  onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id) }}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#30363D] text-slate-400 shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

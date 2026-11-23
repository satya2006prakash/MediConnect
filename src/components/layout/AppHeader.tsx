import { Link } from 'react-router-dom'
import { Menu, User, Shield, Store, Pill, Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/StatusBadge'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { NotificationDropdown } from '@/components/layout/NotificationDropdown'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { cn } from '@/lib/utils'

export interface AppHeaderProps {
  title?: string
  subtitle?: string
  onMobileMenuToggle?: () => void
  className?: string
}

export function AppHeader({
  title,
  subtitle,
  onMobileMenuToggle,
  className,
}: AppHeaderProps) {
  const { profile } = useAuthStore()

  // Activate real-time in-app toasts, sound chimes, and PWA system notifications
  useRealtimeNotifications()

  const role = profile?.role ?? 'patient'

  // Unread count for the bell badge (admin & pharmacy)
  const { data: headerUnreadCount = 0 } = useQuery({
    queryKey: ['header-unread-count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_read', false)
        if (error) return 0
        return count || 0
      } catch {
        return 0
      }
    },
    enabled: (role === 'admin' || role === 'pharmacy_admin') && !!profile?.id,
    refetchInterval: 15000,
  })

  const roleConfig = {
    patient: {
      label: 'Patient Portal',
      variant: 'primary' as const,
      icon: <Pill className="w-3.5 h-3.5" />,
      notificationsPath: '/app/notifications',
      profilePath: '/app/profile',
    },
    pharmacy_admin: {
      label: 'Pharmacy Portal',
      variant: 'secondary' as const,
      icon: <Store className="w-3.5 h-3.5" />,
      notificationsPath: '/pharmacy/notifications',
      profilePath: '/pharmacy/profile',
    },
    admin: {
      label: 'Platform Admin',
      variant: 'neutral' as const,
      icon: <Shield className="w-3.5 h-3.5" />,
      notificationsPath: '/admin/notifications',
      profilePath: '/admin/settings',
    },
  }[role]

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white/95 dark:bg-[#161B22]/95 backdrop-blur-sm border-b border-[#E5EAF0] dark:border-[#30363D]',
        className
      )}
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-md text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D] transition-colors focus:outline-none"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          {title ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC] tracking-tight">{title}</span>
              {subtitle && <span className="text-xs text-[#667085] dark:text-[#8B949E] hidden sm:inline">· {subtitle}</span>}
            </div>
          ) : (
            <Badge variant={roleConfig.variant} size="sm">
              <span className="flex items-center gap-1.5">
                {roleConfig.icon}
                {roleConfig.label}
              </span>
            </Badge>
          )}
        </div>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Role Badge on desktop */}
        {title && (
          <div className="hidden md:block">
            <Badge variant={roleConfig.variant} size="sm">
              <span className="flex items-center gap-1.5">
                {roleConfig.icon}
                {roleConfig.label}
              </span>
            </Badge>
          </div>
        )}

        {/* Dark Mode Toggle */}
        <ThemeToggle size="sm" />

        {/* Bell Notifications */}
        {role === 'admin' || role === 'pharmacy_admin' ? (
          <Link
            to={role === 'admin' ? '/admin/notifications' : '/pharmacy/notifications'}
            className="relative p-2 rounded-md text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D] transition-colors"
            title="Notifications & System Alerts"
            aria-label="View all notifications"
          >
            <Bell className="w-4 h-4" />
            {headerUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D64545] ring-2 ring-white dark:ring-[#161B22]" />
              </span>
            )}
          </Link>
        ) : (
          <NotificationDropdown role={role} />
        )}

        <div className="h-4 w-px bg-[#E5EAF0] dark:bg-[#30363D]" />

        {/* User Chip */}
        <Link
          to={roleConfig.profilePath}
          className="flex items-center gap-2.5 p-1 rounded-md hover:bg-[#F7F9FC] dark:hover:bg-[#21262D] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#EEF4FC] dark:bg-[#2457A7]/25 text-[#2457A7] dark:text-[#58A6FF] border border-[#CBDDF4] dark:border-[#2457A7]/40 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile?.full_name || 'User'} className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0).toUpperCase() ?? <User className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="hidden sm:block text-left text-xs leading-tight">
            <p className="font-semibold text-[#182230] dark:text-[#F0F6FC] truncate max-w-[120px]">
              {profile?.full_name?.split(' ')[0] ?? 'Account'}
            </p>
            <p className="text-[11px] text-[#667085] dark:text-[#8B949E] capitalize">
              {profile?.role?.replace('_', ' ') ?? 'User'}
            </p>
          </div>
        </Link>
      </div>
    </header>
  )
}

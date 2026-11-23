import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, ShoppingBag,
  MessageSquare, Settings, LogOut, ChevronRight, X, Send, Bell,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { label: 'Platform Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'User Directory', href: '/admin/users', icon: Users },
  { label: 'Pharmacy Registry', href: '/admin/pharmacies', icon: Building2 },
  { label: 'Global Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Complaints', href: '/admin/complaints', icon: MessageSquare },
  { label: 'Push & Broadcast', href: '/admin/broadcast', icon: Send },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Platform Settings', href: '/admin/settings', icon: Settings },
]

export interface AdminSidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const location = useLocation()
  const { profile, signOut } = useAuthStore()

  const isActive = (href: string) =>
    location.pathname === href || (href !== '/admin/dashboard' && location.pathname.startsWith(href))

  const NavContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#161B22] text-[#182230] dark:text-[#F0F6FC] border-r border-[#E5EAF0] dark:border-[#30363D]">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5EAF0] dark:border-[#30363D]">
        <Link to="/admin/dashboard" className="flex items-center py-1" onClick={onMobileClose}>
          <Logo size="sm" />
        </Link>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-[#667085] dark:text-[#8B949E] uppercase tracking-wider">
          System Management
        </p>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              to={href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors',
                active
                  ? 'bg-[#2457A7] text-white font-semibold shadow-xs'
                  : 'text-[#667085] dark:text-[#8B949E] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D] hover:text-[#182230] dark:hover:text-[#F0F6FC]'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-[#667085] dark:text-[#8B949E]')} />
              <span>{label}</span>
              {active && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-white" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Card */}
      <div className="p-3 border-t border-[#E5EAF0] dark:border-[#30363D]">
        <div className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0D1117] border border-[#E5EAF0] dark:border-[#30363D] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#2457A7] text-white flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Admin" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0).toUpperCase() ?? 'A'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC] truncate leading-tight">
              {profile?.full_name ?? 'Platform Admin'}
            </p>
            <p className="text-[10px] text-[#667085] dark:text-[#8B949E] truncate">Super Administrator</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="p-1 rounded text-[#667085] dark:text-[#8B949E] hover:text-[#D64545] hover:bg-[#FEEFEF] dark:hover:bg-[#D64545]/20 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 shrink-0 z-20">
        {NavContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#182230]/40 backdrop-blur-[2px] transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {NavContent}
          </div>
        </div>
      )}
    </>
  )
}

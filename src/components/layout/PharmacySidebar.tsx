import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, InboxIcon, ShoppingBag,
  User, Settings, LogOut, ChevronRight, X, MessageSquareWarning,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { label: 'Dashboard', href: '/pharmacy/dashboard', icon: LayoutDashboard },
  { label: 'Medicine Inventory', href: '/pharmacy/inventory', icon: Package },
  { label: 'Refill Requests', href: '/pharmacy/requests', icon: InboxIcon },
  { label: 'Order History', href: '/pharmacy/orders', icon: ShoppingBag },
  { label: 'Support & Complaints', href: '/pharmacy/complaints', icon: MessageSquareWarning },
  { label: 'Pharmacy Profile', href: '/pharmacy/profile', icon: User },
  { label: 'Store Settings', href: '/pharmacy/settings', icon: Settings },
]

export interface PharmacySidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function PharmacySidebar({ mobileOpen = false, onMobileClose }: PharmacySidebarProps) {
  const location = useLocation()
  const { profile, signOut } = useAuthStore()

  const isActive = (href: string) =>
    location.pathname === href || (href !== '/pharmacy/dashboard' && location.pathname.startsWith(href))

  const NavContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#161B22] border-r border-[#E5EAF0] dark:border-[#30363D]">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5EAF0] dark:border-[#30363D]">
        <Link to="/pharmacy/dashboard" className="flex items-center py-1" onClick={onMobileClose}>
          <Logo size="sm" />
        </Link>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-[#98A2B3] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-[#667085] dark:text-[#8B949E] uppercase tracking-wider">
          Store Operations
        </p>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              to={href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all duration-100',
                active
                  ? 'bg-[#EBF8F7] dark:bg-[#159A91]/20 text-[#159A91] dark:text-[#38D9A9] font-semibold shadow-xs'
                  : 'text-[#667085] dark:text-[#8B949E] hover:bg-[#F7F9FC] dark:hover:bg-[#21262D] hover:text-[#182230] dark:hover:text-[#F0F6FC]'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-[#159A91] dark:text-[#38D9A9]' : 'text-[#667085] dark:text-[#8B949E]')} />
              <span>{label}</span>
              {active && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#159A91] dark:text-[#38D9A9]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Card */}
      <div className="p-3 border-t border-[#E5EAF0] dark:border-[#30363D]">
        <div className="p-2.5 rounded-lg bg-[#F7F9FC] dark:bg-[#0D1117] border border-[#E5EAF0] dark:border-[#30363D] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#EBF8F7] dark:bg-[#159A91]/25 text-[#159A91] dark:text-[#38D9A9] border border-[#C8ECE9] dark:border-[#159A91]/40 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile?.full_name || 'Pharmacy'} className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0).toUpperCase() ?? 'S'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC] truncate leading-tight">
              {profile?.full_name ?? 'Pharmacy Admin'}
            </p>
            <p className="text-[10px] text-[#667085] dark:text-[#8B949E] truncate">Dispensing Partner</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="p-1 rounded text-[#98A2B3] dark:text-[#8B949E] hover:text-[#D64545] hover:bg-[#FBEFEF] dark:hover:bg-[#D64545]/20 transition-colors"
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

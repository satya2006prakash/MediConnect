import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/database'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, isInitialised, isLoading } = useAuthStore()
  const location = useLocation()

  if (!isInitialised || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to the appropriate home for their role
    const roleHome: Record<UserRole, string> = {
      patient: '/app/dashboard',
      pharmacy_admin: '/pharmacy/dashboard',
      admin: '/admin/dashboard',
    }
    return <Navigate to={roleHome[profile.role]} replace />
  }

  return <>{children}</>
}

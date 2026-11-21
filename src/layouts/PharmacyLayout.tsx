import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { PharmacySidebar } from '@/components/layout/PharmacySidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/LoadingSpinner'

export function PharmacyLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [checking, setChecking] = useState(true)
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    async function checkApproval() {
      if (!profile) return
      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select('status')
          .eq('owner_id', profile.id)
          .maybeSingle()

        if (error || !data || data.status !== 'verified') {
          if (isMounted) {
            navigate('/pharmacy/pending-approval', { replace: true })
          }
          return
        }
      } catch (err) {
        console.error('Approval check error:', err)
      } finally {
        if (isMounted) setChecking(false)
      }
    }

    checkApproval()
    return () => { isMounted = false }
  }, [profile?.id, navigate])

  if (checking) {
    return <PageLoader message="Verifying pharmacy approval status..." />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <PharmacySidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}


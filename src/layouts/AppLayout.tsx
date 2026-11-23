import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { useMedicineConsumption } from '@/hooks/useMedicineConsumption'

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Activates auto date-based stock catch-up and reconciles missed medicine doses
  useMedicineConsumption()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

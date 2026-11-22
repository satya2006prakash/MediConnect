import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pill, ShoppingBag, AlertTriangle, Plus, ArrowRight, MessageSquareWarning } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { StatsCard } from '@/components/ui/StatsCard'
import { MedicineCard } from '@/components/ui/MedicineCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatDate, getDaysRemaining, getStockStatus } from '@/lib/utils'
import type { Medicine, Order } from '@/types/database'

export function PatientDashboard() {
  const { profile } = useAuthStore()

  const { data: medicines = [], isLoading: medicinesLoading } = useQuery({
    queryKey: ['medicines', profile?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .select('*')
          .eq('user_id', profile!.id)
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error fetching dashboard medicines:', error)
          return []
        }
        return (data || []) as Medicine[]
      } catch {
        return []
      }
    },
    enabled: !!profile?.id,
  })

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery<
    (Order & { pharmacy: { name: string; city: string } })[]
  >({
    queryKey: ['orders', profile?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, pharmacy:pharmacies(name, city)')
          .eq('patient_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(5)
        if (error) {
          console.error('Error fetching dashboard orders:', error)
          return []
        }
        return (data || []) as (Order & { pharmacy: { name: string; city: string } })[]
      } catch {
        return []
      }
    },
    enabled: !!profile?.id,
  })


  if (medicinesLoading || ordersLoading) return <PageLoader />

  const lowStockMedicines = medicines.filter((m) => {
    const days = getDaysRemaining(m.current_quantity, m.daily_dose)
    const status = getStockStatus(days, m.reminder_threshold)
    return status === 'low' || status === 'critical'
  })

  const activeOrders = recentOrders.filter(
    (o) => !['delivered', 'rejected', 'cancelled'].includes(o.status)
  )

  return (
    <div>
      <PageHeader
        title={`Good morning, ${profile?.full_name?.split(' ')[0] ?? 'there'}`}
        description="Here's an overview of your medicine stock and orders."
        actions={
          <Link to="/app/medicines">
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" />
              Add medicine
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatsCard label="Total medicines" value={medicines.length} icon={Pill} />
        <StatsCard
          label="Low stock alerts"
          value={lowStockMedicines.length}
          icon={AlertTriangle}
          iconClassName="bg-amber-50"
        />
        <StatsCard label="Active orders" value={activeOrders.length} icon={ShoppingBag} />
        <StatsCard
          label="Total orders"
          value={recentOrders.length}
          icon={ShoppingBag}
          iconClassName="bg-green-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Low stock alerts</h2>
            <Link to="/app/medicines" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {lowStockMedicines.length === 0 ? (
            <div className="bg-white border border-border rounded-lg p-6 text-center">
              <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Pill className="w-4 h-4 text-success-600" />
              </div>
              <p className="text-sm font-medium text-slate-900">All stocks are healthy</p>
              <p className="text-xs text-slate-500 mt-1">No medicines need restocking right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockMedicines.slice(0, 3).map((med) => (
                <MedicineCard key={med.id} medicine={med} />
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent orders</h2>
            <Link to="/app/orders" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-white border border-border rounded-lg p-6 text-center">
              <p className="text-sm font-medium text-slate-900">No orders yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Find a pharmacy and place your first refill request.
              </p>
              <Link to="/app/pharmacies" className="mt-3 inline-block">
                <Button size="sm" variant="secondary">Browse pharmacies</Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-lg divide-y divide-border">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/app/orders/${order.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {(order as any).pharmacy?.name ?? 'Unknown pharmacy'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help & Support Banner */}
      <div className="mt-8 p-4 rounded-xl border border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#161B22] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#2457A7] dark:text-[#58A6FF] flex items-center justify-center shrink-0">
            <MessageSquareWarning className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC]">
              Experiencing an issue with the website or an order?
            </p>
            <p className="text-xs text-[#667085] dark:text-[#8B949E]">
              Our administration team is here to assist. Submit a ticket and track its resolution.
            </p>
          </div>
        </div>
        <Link to="/app/complaints">
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
            <MessageSquareWarning className="w-3.5 h-3.5" />
            File a Complaint
          </Button>
        </Link>
      </div>
    </div>
  )
}

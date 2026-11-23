import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pill, ShoppingBag, AlertTriangle, Plus, ArrowRight, MessageSquareWarning, CheckCircle2, Check, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { StatsCard } from '@/components/ui/StatsCard'
import { MedicineCard } from '@/components/ui/MedicineCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatDate, getDaysRemaining, getStockStatus } from '@/lib/utils'
import { useMedicineConsumption } from '@/hooks/useMedicineConsumption'
import type { Medicine, Order } from '@/types/database'

export function PatientDashboard() {
  const { profile } = useAuthStore()
  const { takeDose, undoDose, isDoseTakenToday } = useMedicineConsumption()

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

  const takenMedicines = medicines.filter((m) => isDoseTakenToday(m))
  const totalCount = medicines.length
  const takenCount = takenMedicines.length
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0

  return (
    <div>
      <PageHeader
        title={`Good morning, ${profile?.full_name?.split(' ')[0] ?? 'there'}`}
        description="Here's an overview of your medicine stock, today's schedule, and orders."
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

      {/* Today's Dose Tracker Card */}
      {totalCount > 0 && (
        <div className="mb-6 p-4 sm:p-5 rounded-xl border border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#161B22] shadow-[0_1px_3px_0_rgba(24,34,48,0.05)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC]">
                    Today's Medication Tracker
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#EEF4FC] text-[#2457A7] dark:bg-[#16243B] dark:text-[#58A6FF]">
                    {takenCount} of {totalCount} taken
                  </span>
                </div>
                <p className="text-xs text-[#667085] dark:text-[#8B949E] mt-0.5">
                  Record your daily intake to automatically deduct stock and keep supplies accurate.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-56 shrink-0">
              <div className="flex-1 h-2 bg-slate-100 dark:bg-[#21262D] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-10 text-right">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Quick tracker rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {medicines.map((med) => {
              const isTaken = isDoseTakenToday(med)
              return (
                <div
                  key={med.id}
                  className="p-3 rounded-lg border border-[#E5EAF0] dark:border-[#30363D] bg-[#FAFAFA] dark:bg-[#0D1117] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC] truncate">
                      {med.name}
                    </p>
                    <p className="text-[11px] text-[#667085] dark:text-[#8B949E] mt-0.5">
                      Dose: {med.daily_dose} {med.unit}/day · {med.current_quantity} {med.unit} left
                    </p>
                  </div>

                  {isTaken ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3" /> Taken
                      </span>
                      <button
                        type="button"
                        onClick={() => undoDose(med)}
                        className="text-[11px] text-[#667085] hover:text-[#D64545] dark:text-[#8B949E] dark:hover:text-[#F85149] p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        title="Undo dose"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={med.current_quantity <= 0}
                      onClick={() => takeDose(med)}
                      className="shrink-0 text-xs py-1 h-7 px-2.5 gap-1 font-medium bg-[#EEF4FC] hover:bg-[#DCE9FA] text-[#2457A7] dark:bg-[#16243B] dark:text-[#58A6FF] dark:hover:bg-[#1f3354] border border-[#2457A7]/20 dark:border-[#58A6FF]/30"
                    >
                      <Check className="w-3 h-3" />
                      {med.current_quantity <= 0 ? 'Empty' : 'Take'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F0F6FC]">Low stock alerts</h2>
            <Link to="/app/medicines" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {lowStockMedicines.length === 0 ? (
            <div className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-lg p-6 text-center">
              <div className="w-9 h-9 bg-green-50 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <Pill className="w-4 h-4 text-success-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-[#F0F6FC]">All stocks are healthy</p>
              <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-1">No medicines need restocking right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockMedicines.slice(0, 3).map((med) => (
                <MedicineCard
                  key={med.id}
                  medicine={med}
                  onTakeDose={takeDose}
                  onUndoDose={undoDose}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F0F6FC]">Recent orders</h2>
            <Link to="/app/orders" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-lg p-6 text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-[#F0F6FC]">No orders yet</p>
              <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-1">
                Find a pharmacy and place your first refill request.
              </p>
              <Link to="/app/pharmacies" className="mt-3 inline-block">
                <Button size="sm" variant="secondary">Browse pharmacies</Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-lg divide-y divide-[#E5EAF0] dark:divide-[#30363D]">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/app/orders/${order.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#21262D] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-[#F0F6FC]">
                      {(order as any).pharmacy?.name ?? 'Unknown pharmacy'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-[#8B949E]" />
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

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { InboxIcon, ShoppingBag, Package, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { StatsCard } from '@/components/ui/StatsCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import type { Order, Pharmacy } from '@/types/database'

type OrderWithPatient = Order & { patient: { full_name: string } }

export function PharmacyDashboard() {
  const { profile } = useAuthStore()

  const { data: pharmacy } = useQuery({
    queryKey: ['pharmacy', profile?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('owner_id', profile!.id)
          .maybeSingle()
        if (error || !data) return null
        return data as Pharmacy
      } catch {
        return null
      }
    },
    enabled: !!profile?.id,
  })

  const { data: orders = [], isLoading } = useQuery<OrderWithPatient[]>({
    queryKey: ['pharmacy-orders', pharmacy?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, patient:profiles(full_name)')
          .eq('pharmacy_id', pharmacy!.id)
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error fetching pharmacy orders:', error)
          return []
        }
        return (data || []) as OrderWithPatient[]
      } catch {
        return []
      }
    },
    enabled: !!pharmacy?.id,
  })


  if (isLoading) return <PageLoader />

  const pending = orders.filter((o) => o.status === 'pending')
  const active = orders.filter((o) => ['accepted', 'bill_generated', 'bill_approved', 'processing', 'dispatched'].includes(o.status))
  const completed = orders.filter((o) => o.status === 'delivered')

  return (
    <div>
      <PageHeader
        title={pharmacy?.name ?? 'Pharmacy Dashboard'}
        description={`${pharmacy?.city ?? ''} · Status: ${pharmacy?.status ?? ''}`}
      />

      {pharmacy?.status === 'pending' && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Verification pending</p>
            <p className="text-xs text-amber-600 mt-0.5">Your pharmacy is awaiting admin verification. You cannot receive orders until verified.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatsCard label="New requests" value={pending.length} icon={InboxIcon} iconClassName="bg-amber-50" />
        <StatsCard label="Active orders" value={active.length} icon={ShoppingBag} />
        <StatsCard label="Completed" value={completed.length} icon={Package} iconClassName="bg-green-50" />
        <StatsCard label="Total orders" value={orders.length} icon={ShoppingBag} iconClassName="bg-slate-100" />
      </div>

      {/* Pending requests */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Pending requests</h2>
          <Link to="/pharmacy/requests" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-slate-500">No pending requests right now.</p>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-lg divide-y divide-border">
            {pending.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                to={`/pharmacy/requests/${order.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{order.patient?.full_name ?? 'Patient'}</p>
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
  )
}

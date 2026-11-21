import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import type { Order } from '@/types/database'

type OrderWithPharmacy = Order & { pharmacy: { name: string; city: string } }

export function OrdersPage() {
  const { profile } = useAuthStore()

  const { data: orders = [], isLoading } = useQuery<OrderWithPharmacy[]>({
    queryKey: ['orders', profile?.id, 'all'],
    queryFn: async () => {

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, pharmacy:pharmacies(name, city)')
          .eq('patient_id', profile!.id)
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error fetching orders:', error)
          return []
        }
        return (data || []) as OrderWithPharmacy[]
      } catch {
        return []
      }
    },
    enabled: !!profile?.id,
  })


  if (isLoading) return <PageLoader />

  const active = orders.filter((o) => !['delivered', 'rejected', 'cancelled'].includes(o.status))
  const history = orders.filter((o) => ['delivered', 'rejected', 'cancelled'].includes(o.status))

  const OrderRow = ({ order }: { order: OrderWithPharmacy }) => (
    <Link
      to={`/app/orders/${order.id}`}
      className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-slate-50 dark:hover:bg-[#21262D] transition-colors border-b border-border dark:border-[#30363D] last:border-0"
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="w-9 h-9 bg-primary-50 dark:bg-primary-950/60 rounded-lg flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-[#F0F6FC] truncate">{order.pharmacy?.name ?? 'Unknown pharmacy'}</p>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5 truncate">
            {order.pharmacy?.city && `${order.pharmacy.city} · `}
            {formatDate(order.created_at)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <StatusBadge status={order.status} />
        <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:block" />
      </div>
    </Link>
  )

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track your refill requests and order status."
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Browse pharmacies and send your first refill request."
          action={
            <Link to="/app/pharmacies">
              <button className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                Browse pharmacies →
              </button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Active orders */}
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F0F6FC] mb-3">Active orders</h2>
              <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg divide-y divide-border dark:divide-[#30363D]">
                {active.map((o) => <OrderRow key={o.id} order={o} />)}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F0F6FC] mb-3">Order history</h2>
              <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg divide-y divide-border dark:divide-[#30363D]">
                {history.map((o) => <OrderRow key={o.id} order={o} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

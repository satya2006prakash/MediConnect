import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingBag, ArrowRight, Search, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDate, formatCurrency, parseBillMetadata, cn } from '@/lib/utils'
import type { Order, Pharmacy, OrderItem, Bill } from '@/types/database'

type OrderWithDetails = Order & {
  patient: { full_name: string; phone: string; city: string } | null
  items: OrderItem[]
  bill: Bill | null
}

type FilterTab = 'all' | 'completed' | 'active' | 'pending' | 'cancelled'

export function PharmacyOrdersPage() {
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: pharmacy } = useQuery({
    queryKey: ['pharmacy', profile?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('pharmacies')
          .select('id, name')
          .eq('owner_id', profile!.id)
          .maybeSingle()
        if (!data) return null
        return data as unknown as Pharmacy
      } catch {
        return null
      }
    },
    enabled: !!profile?.id,
  })

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['pharmacy-order-history', pharmacy?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            patient:profiles(full_name, phone, city),
            items:order_items(medicine_name, quantity_requested, unit),
            bill:bills(id, subtotal, tax, delivery_fee, total, status, patient_note, generated_at)
          `)
          .eq('pharmacy_id', pharmacy!.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching pharmacy order history:', error)
          return []
        }

        // Supabase returns 1-to-1 relations as objects or arrays
        const normalized = (data || []).map((order: any) => ({
          ...order,
          bill: Array.isArray(order.bill) ? order.bill[0] : order.bill,
        }))

        return normalized as OrderWithDetails[]
      } catch {
        return []
      }
    },
    enabled: !!pharmacy?.id,
  })

  if (isLoading) return <PageLoader />

  const completedOrders = orders.filter((o) => o.status === 'delivered')
  const activeOrders = orders.filter((o) =>
    ['accepted', 'bill_generated', 'bill_approved', 'processing', 'dispatched'].includes(o.status)
  )
  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const cancelledOrders = orders.filter((o) => ['rejected', 'cancelled'].includes(o.status))

  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (activeTab === 'completed' && order.status !== 'delivered') return false
    if (
      activeTab === 'active' &&
      !['accepted', 'bill_generated', 'bill_approved', 'processing', 'dispatched'].includes(order.status)
    )
      return false
    if (activeTab === 'pending' && order.status !== 'pending') return false
    if (activeTab === 'cancelled' && !['rejected', 'cancelled'].includes(order.status)) return false

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const patientMatch = order.patient?.full_name?.toLowerCase().includes(q)
      const phoneMatch = order.patient?.phone?.includes(q)
      const medicineMatch = order.items?.some((i) => i.medicine_name.toLowerCase().includes(q))
      const billMeta = order.bill
        ? parseBillMetadata(
            order.bill.patient_note,
            order.bill.subtotal,
            order.bill.tax,
            order.bill.delivery_fee,
            order.bill.total,
            order.bill.id
          )
        : null
      const billMatch = billMeta?.billNumber?.toLowerCase().includes(q)

      return patientMatch || phoneMatch || medicineMatch || billMatch
    }

    return true
  })

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Orders', count: orders.length },
    { key: 'completed', label: 'Completed', count: completedOrders.length },
    { key: 'active', label: 'In Progress', count: activeOrders.length },
    { key: 'pending', label: 'Pending', count: pendingOrders.length },
    { key: 'cancelled', label: 'Rejected / Cancelled', count: cancelledOrders.length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order History"
        description={`Complete record of patient orders · ${completedOrders.length} completed out of ${orders.length} total orders`}
        actions={
          <Link
            to="/pharmacy/requests"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-200 transition-colors"
          >
            Refill Requests
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'bg-primary-600 text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-[#161B22] text-slate-600 dark:text-slate-300 border border-border dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-[#21262D]'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  activeTab === tab.key
                    ? 'bg-primary-700 text-white'
                    : 'bg-slate-100 dark:bg-[#21262D] text-slate-500 dark:text-[#8B949E]'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, medicine, bill #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] text-slate-900 dark:text-[#F0F6FC] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={
            activeTab === 'completed'
              ? 'No completed orders yet'
              : searchQuery
                ? 'No matching orders found'
                : 'No orders in this category'
          }
          description={
            activeTab === 'completed'
              ? 'Orders marked as delivered will appear here in your pharmacy history.'
              : 'Try clearing your search query or selecting a different status filter.'
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg divide-y divide-border dark:divide-[#30363D]">
          {filteredOrders.map((order) => {
            const billMeta = order.bill
              ? parseBillMetadata(
                  order.bill.patient_note,
                  order.bill.subtotal,
                  order.bill.tax,
                  order.bill.delivery_fee,
                  order.bill.total,
                  order.bill.id
                )
              : null

            return (
              <Link
                key={order.id}
                to={`/pharmacy/requests/${order.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-5 sm:py-4 hover:bg-slate-50 dark:hover:bg-[#21262D] transition-colors gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F6FC]">
                      {order.patient?.full_name ?? 'Patient'}
                    </p>
                    {order.patient?.phone && (
                      <span className="text-xs text-slate-400 dark:text-[#8B949E]">
                        · {order.patient.phone}
                      </span>
                    )}
                    {billMeta?.billNumber && (
                      <span className="font-mono text-[11px] font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800/60">
                        {billMeta.billNumber}
                      </span>
                    )}
                  </div>

                  {/* Medicines summary */}
                  {order.items && order.items.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {order.items.map((i) => `${i.medicine_name} × ${i.quantity_requested}`).join(', ')}
                    </p>
                  )}

                  <p className="text-xs text-slate-400 dark:text-[#8B949E]">
                    Placed on {formatDate(order.created_at)}
                    {order.status === 'delivered' && (
                      <span className="text-green-600 dark:text-green-400 font-medium ml-2 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {order.bill && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-[#F0F6FC]">
                        {formatCurrency(order.bill.total)}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-[#8B949E] capitalize">
                        Bill {order.bill.status}
                      </p>
                    </div>
                  )}
                  <StatusBadge status={order.status} />
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 hidden sm:block" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

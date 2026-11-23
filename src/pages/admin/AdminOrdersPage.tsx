import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ShoppingBag,
  Search,
  Receipt,
  Eye,
  Copy,
  User,
  Store,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Clock,
  History,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { OrderTimeline } from '@/components/ui/OrderTimeline'
import { formatDate, formatDateTime, formatCurrency, parseBillMetadata, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Order, Profile, Pharmacy, OrderItem, Bill, BillItem } from '@/types/database'

type FullAdminOrder = Order & {
  patient: (Profile & { email?: string | null }) | null
  pharmacy: Pharmacy | null
  items: OrderItem[]
  bill: (Bill & { items?: BillItem[] }) | null
}

type TabKey = 'all' | 'history' | 'active' | 'cancelled'

export function AdminOrdersPage() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<FullAdminOrder | null>(null)

  const { data: orders = [], isLoading } = useQuery<FullAdminOrder[]>({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            patient:profiles(id, full_name, phone, address, city, pincode, email),
            pharmacy:pharmacies(id, name, city, address, phone, email, license_number),
            items:order_items(*),
            bill:bills(*, items:bill_items(*))
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching admin orders:', error)
          return []
        }

        // Supabase returns 1-to-1 joins as object or array
        const normalized = (data || []).map((order: any) => ({
          ...order,
          bill: Array.isArray(order.bill) ? order.bill[0] : order.bill,
        }))

        return normalized as FullAdminOrder[]
      } catch {
        return []
      }
    },
  })

  // Tab counts
  const completedOrders = orders.filter((o) => o.status === 'delivered')
  const activeOrders = orders.filter((o) =>
    ['pending', 'accepted', 'bill_generated', 'bill_approved', 'processing', 'dispatched'].includes(
      o.status
    )
  )
  const cancelledOrders = orders.filter((o) => ['rejected', 'cancelled'].includes(o.status))

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All Orders', count: orders.length },
    { key: 'history', label: 'Order History (Delivered)', count: completedOrders.length },
    { key: 'active', label: 'In Progress', count: activeOrders.length },
    { key: 'cancelled', label: 'Rejected / Cancelled', count: cancelledOrders.length },
  ]

  const filtered = orders.filter((o) => {
    // Tab filter
    if (activeTab === 'history' && o.status !== 'delivered') return false
    if (
      activeTab === 'active' &&
      !['pending', 'accepted', 'bill_generated', 'bill_approved', 'processing', 'dispatched'].includes(
        o.status
      )
    )
      return false
    if (activeTab === 'cancelled' && !['rejected', 'cancelled'].includes(o.status)) return false

    // Status dropdown filter
    if (statusFilter !== 'all' && o.status !== statusFilter) return false

    // Bill metadata for bill number matching
    const billMeta = o.bill
      ? parseBillMetadata(
          o.bill.patient_note,
          o.bill.subtotal,
          o.bill.tax,
          o.bill.delivery_fee,
          o.bill.total,
          o.bill.id
        )
      : null

    // Search query matching
    if (search.trim()) {
      const q = search.toLowerCase()
      const patientMatch = (o.patient?.full_name ?? '').toLowerCase().includes(q)
      const phoneMatch = (o.patient?.phone ?? '').toLowerCase().includes(q)
      const pharmacyMatch = (o.pharmacy?.name ?? '').toLowerCase().includes(q)
      const cityMatch = (o.pharmacy?.city ?? '').toLowerCase().includes(q)
      const billMatch = (billMeta?.billNumber ?? '').toLowerCase().includes(q)
      const idMatch = o.id.toLowerCase().includes(q)

      return patientMatch || phoneMatch || pharmacyMatch || cityMatch || billMatch || idMatch
    }

    return true
  })

  if (isLoading) return <PageLoader />

  const selectedBillMeta = selectedOrder?.bill
    ? parseBillMetadata(
        selectedOrder.bill.patient_note,
        selectedOrder.bill.subtotal,
        selectedOrder.bill.tax,
        selectedOrder.bill.delivery_fee,
        selectedOrder.bill.total,
        selectedOrder.bill.id
      )
    : null

  // Patient previous order history (excluding currently selected order)
  const patientPreviousOrders = selectedOrder
    ? orders.filter((o) => o.patient_id === selectedOrder.patient_id && o.id !== selectedOrder.id)
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders Monitor"
        description={`${orders.length} total orders across platform · ${completedOrders.length} completed orders in history`}
      />

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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

        {/* Search & Status Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Bill #, patient, pharmacy, or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 text-xs sm:text-sm border border-border dark:border-[#30363D] rounded bg-white dark:bg-[#161B22] text-slate-900 dark:text-[#F0F6FC] placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs sm:text-sm border border-border dark:border-[#30363D] rounded bg-white dark:bg-[#161B22] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
          >
            <option value="all">All statuses</option>
            {[
              'pending',
              'accepted',
              'bill_generated',
              'bill_approved',
              'processing',
              'dispatched',
              'delivered',
              'rejected',
              'cancelled',
            ].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={activeTab === 'history' ? 'No completed order history found' : 'No orders found'}
          description={
            activeTab === 'history'
              ? 'Orders will appear in history once delivered to patients.'
              : 'Try adjusting your search criteria or selecting a different tab.'
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="border-b border-border dark:border-[#30363D] bg-slate-50/70 dark:bg-[#21262D]/60 text-slate-500 dark:text-[#8B949E]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Bill No
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Patient
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Pharmacy
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-[#30363D]">
              {filtered.map((order) => {
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
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#21262D]/50 cursor-pointer transition-colors"
                  >
                    {/* Bill No */}
                    <td className="px-4 py-3.5">
                      {billMeta?.billNumber ? (
                        <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800/60 inline-flex items-center gap-1">
                          <Receipt className="w-3 h-3" />
                          {billMeta.billNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          Not billed
                        </span>
                      )}
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900 dark:text-[#F0F6FC]">
                        {order.patient?.full_name ?? '—'}
                      </p>
                      {order.patient?.phone && (
                        <p className="text-xs text-slate-400 dark:text-[#8B949E]">
                          {order.patient.phone}
                        </p>
                      )}
                    </td>

                    {/* Pharmacy */}
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {order.pharmacy?.name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-[#8B949E]">
                        {order.pharmacy?.city}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-[#F0F6FC] whitespace-nowrap">
                      {order.bill ? formatCurrency(order.bill.total) : '—'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOrder(order)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-border dark:border-[#30363D] hover:bg-slate-100 dark:hover:bg-[#30363D] text-slate-700 dark:text-slate-200 transition-colors"
                        title="View Order & Bill Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Order & History Details Modal ── */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={
            <div className="flex items-center gap-2 flex-wrap">
              <span>Order Details</span>
              <span className="font-mono text-xs text-slate-400 font-normal">
                #{selectedOrder.id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={selectedOrder.status} />
            </div>
          }
          description={`Placed on ${formatDateTime(selectedOrder.created_at)}`}
          size="xl"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-5">
            {/* 1. Bill Card Banner (if bill exists) */}
            {selectedOrder.bill && selectedBillMeta ? (
              <div className="p-3.5 rounded-lg bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Bill Number:
                    </span>
                    <span className="font-mono text-xs font-bold text-primary-800 dark:text-primary-200 bg-white dark:bg-[#161B22] px-2 py-0.5 rounded border border-primary-300 dark:border-primary-700">
                      {selectedBillMeta.billNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedBillMeta.billNumber)
                        toast.success('Bill number copied!')
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Copy Bill Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <StatusBadge status={selectedOrder.bill.status} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Generated: {formatDateTime(selectedOrder.bill.generated_at)}
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Billed</span>
                  <p className="text-base font-bold text-primary-700 dark:text-primary-300">
                    {formatCurrency(selectedOrder.bill.total)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#21262D] border border-border dark:border-[#30363D] text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>No bill generated yet for this order.</span>
              </div>
            )}

            {/* 2. Order Progression & Timeline History */}
            <div className="p-4 rounded-lg border border-border dark:border-[#30363D] bg-slate-50/50 dark:bg-[#21262D]/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border dark:border-[#30363D]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-[#F0F6FC]">
                  <Clock className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  Order Lifecycle &amp; Progress History
                </div>
                {selectedOrder.status === 'delivered' && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Fulfilled
                  </span>
                )}
              </div>
              <OrderTimeline
                currentStatus={selectedOrder.status}
                timestamps={{
                  pending: selectedOrder.created_at,
                  bill_generated: selectedOrder.bill?.generated_at,
                  bill_approved: selectedOrder.bill?.responded_at || undefined,
                  delivered: selectedOrder.status === 'delivered' ? selectedOrder.updated_at : undefined,
                }}
              />
            </div>

            {/* 3. Patient & Pharmacy Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patient Info */}
              <div className="p-3.5 rounded-lg border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-border dark:border-[#30363D]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <User className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                    Patient Details
                  </div>
                  {patientPreviousOrders.length > 0 && (
                    <span className="text-[10px] font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-1.5 py-0.5 rounded">
                      {patientPreviousOrders.length + 1} orders total
                    </span>
                  )}
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-[#F0F6FC]">
                    {selectedOrder.patient?.full_name ?? '—'}
                  </p>
                  {selectedOrder.patient?.phone && (
                    <p className="text-slate-500 dark:text-[#8B949E] flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedOrder.patient.phone}
                    </p>
                  )}
                  {selectedOrder.patient?.email && (
                    <p className="text-slate-500 dark:text-[#8B949E]">{selectedOrder.patient.email}</p>
                  )}
                  {(selectedOrder.patient?.address || selectedOrder.patient?.city) && (
                    <p className="text-slate-500 dark:text-[#8B949E] flex items-start gap-1 pt-0.5">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        {selectedOrder.patient.address}
                        {selectedOrder.patient.city && `, ${selectedOrder.patient.city}`}
                        {selectedOrder.patient.pincode && ` - ${selectedOrder.patient.pincode}`}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Pharmacy Info */}
              <div className="p-3.5 rounded-lg border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 pb-1.5 border-b border-border dark:border-[#30363D]">
                  <Store className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  Dispensing Pharmacy
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-[#F0F6FC]">
                    {selectedOrder.pharmacy?.name ?? '—'}
                  </p>
                  {selectedOrder.pharmacy?.license_number && (
                    <p className="text-[11px] text-slate-500 dark:text-[#8B949E] font-mono">
                      Lic: {selectedOrder.pharmacy.license_number}
                    </p>
                  )}
                  {selectedOrder.pharmacy?.phone && (
                    <p className="text-slate-500 dark:text-[#8B949E] flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedOrder.pharmacy.phone}
                    </p>
                  )}
                  {(selectedOrder.pharmacy?.address || selectedOrder.pharmacy?.city) && (
                    <p className="text-slate-500 dark:text-[#8B949E] flex items-start gap-1 pt-0.5">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        {selectedOrder.pharmacy.address}
                        {selectedOrder.pharmacy.city && `, ${selectedOrder.pharmacy.city}`}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Medicines Requested */}
            <div className="rounded-lg border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#21262D] border-b border-border dark:border-[#30363D] text-xs font-semibold text-slate-700 dark:text-slate-200">
                Medicines Requested in this Order
              </div>
              <div className="p-3 divide-y divide-border dark:divide-[#30363D] text-xs">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between first:pt-0 last:pb-0">
                      <span className="font-medium text-slate-900 dark:text-[#F0F6FC]">
                        {item.medicine_name}
                      </span>
                      <span className="text-slate-500 dark:text-[#8B949E]">
                        Qty: {item.quantity_requested} {item.unit || 'units'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 py-1">No items listed</p>
                )}
              </div>
            </div>

            {/* 5. Complete Bill Breakdown (if bill exists) */}
            {selectedOrder.bill && selectedBillMeta && (
              <div className="rounded-lg border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#21262D] border-b border-border dark:border-[#30363D] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>Pharmacy Itemized Bill</span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-[#8B949E]">
                    {selectedBillMeta.billNumber}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Itemized lines */}
                  {selectedOrder.bill.items && selectedOrder.bill.items.length > 0 && (
                    <div className="space-y-1.5 pb-3 border-b border-border dark:border-[#30363D] text-xs">
                      {selectedOrder.bill.items.map((bItem) => (
                        <div key={bItem.id} className="flex justify-between items-center">
                          <span className="text-slate-700 dark:text-slate-300">
                            {bItem.medicine_name} × {bItem.quantity}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-[#F0F6FC]">
                            {formatCurrency(bItem.total_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pricing Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Items Subtotal</span>
                      <span className="font-medium text-slate-900 dark:text-[#F0F6FC]">
                        {formatCurrency(selectedOrder.bill.subtotal)}
                      </span>
                    </div>

                    {selectedBillMeta.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Discount ({selectedBillMeta.discountPercent}%)</span>
                        <span>- {formatCurrency(selectedBillMeta.discountAmount)}</span>
                      </div>
                    )}

                    {selectedBillMeta.discountAmount > 0 && selectedBillMeta.taxAmount > 0 && (
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Taxable Subtotal</span>
                        <span>{formatCurrency(selectedBillMeta.taxableSubtotal)}</span>
                      </div>
                    )}

                    {selectedOrder.bill.tax > 0 && (
                      <div className="flex justify-between text-blue-600 font-medium">
                        <span>Tax / GST ({selectedBillMeta.taxPercent}%)</span>
                        <span>+ {formatCurrency(selectedOrder.bill.tax)}</span>
                      </div>
                    )}

                    {selectedOrder.bill.delivery_fee > 0 && (
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Delivery Fee</span>
                        <span className="font-medium text-slate-900 dark:text-[#F0F6FC]">
                          {formatCurrency(selectedOrder.bill.delivery_fee)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-border dark:border-[#30363D] text-sm font-bold text-slate-900 dark:text-[#F0F6FC]">
                      <span>Grand Total</span>
                      <span className="text-primary-600 dark:text-primary-400">
                        {formatCurrency(selectedOrder.bill.total)}
                      </span>
                    </div>

                    {selectedBillMeta.note && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-border dark:border-[#30363D] italic">
                        Note: {selectedBillMeta.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Patient's Previous Orders History */}
            <div className="rounded-lg border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#21262D] border-b border-border dark:border-[#30363D] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  Previous Orders History for this Patient
                </span>
                <span className="text-[11px] text-slate-400 dark:text-[#8B949E]">
                  {patientPreviousOrders.length} previous order{patientPreviousOrders.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="p-3">
                {patientPreviousOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
                    No previous orders recorded for this patient. This is their first order on MediConnect.
                  </p>
                ) : (
                  <div className="divide-y divide-border dark:divide-[#30363D]">
                    {patientPreviousOrders.map((prevOrder) => {
                      const prevBillMeta = prevOrder.bill
                        ? parseBillMetadata(
                            prevOrder.bill.patient_note,
                            prevOrder.bill.subtotal,
                            prevOrder.bill.tax,
                            prevOrder.bill.delivery_fee,
                            prevOrder.bill.total,
                            prevOrder.bill.id
                          )
                        : null

                      return (
                        <div
                          key={prevOrder.id}
                          onClick={() => setSelectedOrder(prevOrder)}
                          className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#21262D] px-2 rounded cursor-pointer transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-[#F0F6FC]">
                                {prevOrder.pharmacy?.name ?? 'Pharmacy'}
                              </span>
                              {prevBillMeta?.billNumber && (
                                <span className="font-mono text-[10px] text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-1.5 py-0.2 rounded border border-primary-200 dark:border-primary-800/60">
                                  {prevBillMeta.billNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-[#8B949E]">
                              {formatDate(prevOrder.created_at)}
                              {prevOrder.bill && ` · ${formatCurrency(prevOrder.bill.total)}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <StatusBadge status={prevOrder.status} />
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

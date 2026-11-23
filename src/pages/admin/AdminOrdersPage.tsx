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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatDate, formatDateTime, formatCurrency, parseBillMetadata } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Order, Profile, Pharmacy, OrderItem, Bill, BillItem } from '@/types/database'

type FullAdminOrder = Order & {
  patient: (Profile & { email?: string | null }) | null
  pharmacy: Pharmacy | null
  items: OrderItem[]
  bill: (Bill & { items?: BillItem[] }) | null
}

export function AdminOrdersPage() {
  const [search, setSearch] = useState('')
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

  const filtered = orders.filter((o) => {
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

    const q = search.toLowerCase()
    const matchesSearch =
      (o.patient?.full_name ?? '').toLowerCase().includes(q) ||
      (o.patient?.phone ?? '').toLowerCase().includes(q) ||
      (o.pharmacy?.name ?? '').toLowerCase().includes(q) ||
      (o.pharmacy?.city ?? '').toLowerCase().includes(q) ||
      (billMeta?.billNumber ?? '').toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
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

  return (
    <div>
      <PageHeader
        title="Orders Monitor"
        description={`${orders.length} total orders across platform`}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
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

      {/* Orders Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders found" />
      ) : (
        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-sm min-w-[760px]">
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

      {/* ── Order & Bill Details Modal ── */}
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

            {/* 2. Patient & Pharmacy Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patient Info */}
              <div className="p-3.5 rounded-lg border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 pb-1.5 border-b border-border dark:border-[#30363D]">
                  <User className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  Patient Information
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

            {/* 3. Medicines Requested */}
            <div className="rounded-lg border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#21262D] border-b border-border dark:border-[#30363D] text-xs font-semibold text-slate-700 dark:text-slate-200">
                Medicines Requested by Patient
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

            {/* 4. Complete Bill Breakdown (if bill exists) */}
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
          </div>
        </Modal>
      )}
    </div>
  )
}

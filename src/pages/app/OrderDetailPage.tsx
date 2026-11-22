import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OrderTimeline } from '@/components/ui/OrderTimeline'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate, formatCurrency, parseBillMetadata } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Order, Bill, BillItem, OrderItem } from '@/types/database'

type FullOrder = Order & {
  pharmacy: { name: string; city: string; phone: string; address: string }
  items: OrderItem[]
  bill: (Bill & { items: BillItem[] }) | null
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            pharmacy:pharmacies(name, city, phone, address),
            items:order_items(*),
            bill:bills(*, items:bill_items(*))
          `)
          .eq('id', id!)
          .maybeSingle()
        if (error || !data) return null
        const billData = Array.isArray(data.bill) ? data.bill[0] : data.bill
        return { ...data, bill: billData || null } as FullOrder
      } catch {
        return null
      }
    },
    enabled: !!id,
  })


  const billResponseMutation = useMutation({
    mutationFn: async (action: 'approved' | 'rejected') => {
      if (!order?.bill) return

      // Update bill status
      await supabase.from('bills').update({ status: action, responded_at: new Date().toISOString() }).eq('id', order.bill.id)

      // Update order status
      const newOrderStatus = action === 'approved' ? 'bill_approved' : 'rejected'
      await supabase.from('orders').update({ status: newOrderStatus }).eq('id', order.id)
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success(action === 'approved' ? 'Bill approved! Pharmacy will begin processing.' : 'Bill rejected.')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <PageLoader />
  if (!order) return <div className="p-6 text-sm text-slate-500">Order not found.</div>

  const hasPendingBill = order.bill?.status === 'pending' && order.status === 'bill_generated'

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Order detail</h1>
          <p className="text-sm text-slate-400 mt-1">Placed on {formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="space-y-5">
        {/* Pharmacy info */}
        <Card>
          <CardHeader title="Pharmacy" />
          <div className="space-y-1.5 text-sm">
            <p className="font-medium text-slate-900">{order.pharmacy?.name}</p>
            {order.pharmacy?.address && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <MapPin className="w-3.5 h-3.5" />{order.pharmacy.address}, {order.pharmacy.city}
              </div>
            )}
            {order.pharmacy?.phone && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <Phone className="w-3.5 h-3.5" />{order.pharmacy.phone}
              </div>
            )}
          </div>
        </Card>

        {/* Order items */}
        <Card>
          <CardHeader title="Medicines requested" />
          <div className="space-y-2">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-slate-900">{item.medicine_name}</span>
                <span className="text-sm text-slate-500">{item.quantity_requested} {item.unit}s</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bill */}
        {order.bill && (() => {
          const billMeta = parseBillMetadata(
            order.bill.patient_note,
            order.bill.subtotal,
            order.bill.tax,
            order.bill.delivery_fee,
            order.bill.total
          )

          return (
            <Card>
              <CardHeader
                title="Bill from pharmacy"
                actions={<StatusBadge status={order.bill.status} />}
              />

              <div className="space-y-2 mb-4">
                {order.bill.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                    <span className="text-slate-700">{item.medicine_name} × {item.quantity}</span>
                    <span className="text-slate-900 font-medium">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border space-y-1.5">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(order.bill.subtotal)}</span>
                </div>
                {billMeta.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Discount ({billMeta.discountPercent}%)</span>
                    <span>- {formatCurrency(billMeta.discountAmount)}</span>
                  </div>
                )}
                {billMeta.discountAmount > 0 && billMeta.taxAmount > 0 && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Taxable Subtotal</span>
                    <span>{formatCurrency(billMeta.taxableSubtotal)}</span>
                  </div>
                )}
                {order.bill.tax > 0 && (
                  <div className="flex justify-between text-sm text-blue-600 font-medium">
                    <span>Tax / GST ({billMeta.taxPercent}%)</span>
                    <span>+ {formatCurrency(order.bill.tax)}</span>
                  </div>
                )}
                {order.bill.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Delivery fee</span>
                    <span className="text-slate-900 font-medium">{formatCurrency(order.bill.delivery_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(order.bill.total)}</span>
                </div>
                {billMeta.note && (
                  <p className="text-xs text-slate-500 pt-2 border-t border-border italic">
                    Note from pharmacy: {billMeta.note}
                  </p>
                )}
              </div>

              {hasPendingBill && (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => billResponseMutation.mutate('rejected')}
                    isLoading={billResponseMutation.isPending}
                  >
                    Reject bill
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => billResponseMutation.mutate('approved')}
                    isLoading={billResponseMutation.isPending}
                  >
                    Approve &amp; confirm
                  </Button>
                </div>
              )}
            </Card>
          )
        })()}

        {/* Timeline */}
        <Card>
          <CardHeader title="Order status" />
          <OrderTimeline currentStatus={order.status} />
        </Card>
      </div>
    </div>
  )
}

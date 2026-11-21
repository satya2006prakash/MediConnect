import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Order, OrderItem } from '@/types/database'

type FullRequest = Order & {
  patient: { full_name: string; phone: string; city: string }
  items: OrderItem[]
}

interface BillLine {
  medicine_name: string
  quantity: number
  unit_price: number
}

export function PharmacyRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [billLines, setBillLines] = useState<BillLine[]>([])
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [tax, setTax] = useState(0)
  const [showBillForm, setShowBillForm] = useState(false)

  const { data: request, isLoading } = useQuery({
    queryKey: ['pharmacy-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, patient:profiles(full_name, phone, city), items:order_items(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as FullRequest
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (request && billLines.length === 0 && request.items) {
      setBillLines(
        request.items.map((item) => ({
          medicine_name: item.medicine_name,
          quantity: item.quantity_requested,
          unit_price: 0,
        }))
      )
    }
  }, [request, billLines.length])


  const acceptMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('orders').update({ status: 'accepted' }).eq('id', id!)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pharmacy-request', id] }); toast.success('Request accepted') },
    onError: (err: Error) => toast.error(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('orders').update({ status: 'rejected' }).eq('id', id!)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pharmacy-request', id] }); toast.success('Request rejected'); navigate(-1) },
    onError: (err: Error) => toast.error(err.message),
  })

  const generateBillMutation = useMutation({
    mutationFn: async () => {
      const subtotal = billLines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)
      const total = subtotal + deliveryFee + tax

      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({ order_id: id!, subtotal, delivery_fee: deliveryFee, tax, total, status: 'pending' })
        .select()
        .single()

      if (billError) throw billError

      const items = billLines.map((l) => ({
        bill_id: bill.id,
        medicine_name: l.medicine_name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total_price: l.quantity * l.unit_price,
      }))

      await supabase.from('bill_items').insert(items)
      await supabase.from('orders').update({ status: 'bill_generated' }).eq('id', id!)

      // Create notification for patient
      if (request?.patient_id) {
        await supabase.from('notifications').insert({
          user_id: request.patient_id,
          type: 'bill_generated',
          title: 'Bill ready for review',
          body: `Your pharmacy has sent a bill of ${formatCurrency(total)}. Please review and approve.`,
          reference_id: id!,
        })
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pharmacy-request', id] }); toast.success('Bill sent to patient'); setShowBillForm(false) },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateDeliveryMutation = useMutation({
    mutationFn: async (status: 'processing' | 'dispatched' | 'delivered') => {
      await supabase.from('orders').update({ status }).eq('id', id!)
    },
    onSuccess: (_, status) => { queryClient.invalidateQueries({ queryKey: ['pharmacy-request', id] }); toast.success(`Order marked as ${status}`) },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <PageLoader />
  if (!request) return <div className="p-6 text-sm">Request not found.</div>

  const subtotal = billLines.reduce((s, l) => s + l.quantity * l.unit_price, 0)

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Refill Request</h1>
          <p className="text-sm text-slate-400 mt-1">{formatDate(request.created_at)}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="space-y-5">
        {/* Patient info */}
        <Card>
          <CardHeader title="Patient" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-slate-900">{request.patient?.full_name}</p>
            <p className="text-slate-500">{request.patient?.phone}</p>
            <p className="text-slate-500">{request.patient?.city}</p>
          </div>
        </Card>

        {/* Requested medicines */}
        <Card>
          <CardHeader title="Medicines requested" />
          <div className="space-y-2">
            {request.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                <span className="text-slate-900">{item.medicine_name}</span>
                <span className="text-slate-500">{item.quantity_requested} {item.unit}s</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        {request.status === 'pending' && (
          <Card>
            <CardHeader title="Actions" />
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={() => rejectMutation.mutate()} isLoading={rejectMutation.isPending}>
                Reject request
              </Button>
              <Button size="sm" onClick={() => acceptMutation.mutate()} isLoading={acceptMutation.isPending}>
                Accept request
              </Button>
            </div>
          </Card>
        )}

        {request.status === 'accepted' && (
          <Card>
            <CardHeader title="Generate bill" />
            {!showBillForm ? (
              <Button size="sm" onClick={() => setShowBillForm(true)}>Create bill</Button>
            ) : (
              <div className="space-y-4">
                {billLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 flex-1">{line.medicine_name} × {line.quantity}</span>
                    <Input
                      label=""
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Unit price ₹"
                      className="w-32"
                      value={line.unit_price || ''}
                      onChange={(e) => {
                        const updated = [...billLines]
                        updated[idx].unit_price = parseFloat(e.target.value) || 0
                        setBillLines(updated)
                      }}
                    />
                    <span className="text-sm font-medium w-20 text-right">{formatCurrency(line.quantity * line.unit_price)}</span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Input label="Delivery fee (₹)" type="number" min={0} step={0.01} value={deliveryFee || ''} onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)} />
                  <Input label="Tax (₹)" type="number" min={0} step={0.01} value={tax || ''} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Total: {formatCurrency(subtotal + deliveryFee + tax)}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowBillForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={() => generateBillMutation.mutate()} isLoading={generateBillMutation.isPending}>
                      Send bill to patient
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {request.status === 'bill_approved' && (
          <Card>
            <CardHeader title="Update delivery status" />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => updateDeliveryMutation.mutate('processing')} isLoading={updateDeliveryMutation.isPending}>Mark processing</Button>
              <Button size="sm" variant="secondary" onClick={() => updateDeliveryMutation.mutate('dispatched')} isLoading={updateDeliveryMutation.isPending}>Mark dispatched</Button>
              <Button size="sm" onClick={() => updateDeliveryMutation.mutate('delivered')} isLoading={updateDeliveryMutation.isPending}>Mark delivered</Button>
            </div>
          </Card>
        )}

        {['processing', 'dispatched'].includes(request.status) && (
          <Card>
            <CardHeader title="Update delivery status" />
            <div className="flex gap-2">
              {request.status === 'processing' && (
                <Button size="sm" variant="secondary" onClick={() => updateDeliveryMutation.mutate('dispatched')} isLoading={updateDeliveryMutation.isPending}>Mark dispatched</Button>
              )}
              <Button size="sm" onClick={() => updateDeliveryMutation.mutate('delivered')} isLoading={updateDeliveryMutation.isPending}>Mark delivered</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

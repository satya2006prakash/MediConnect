import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Percent, Receipt, Truck, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import { formatDate, formatCurrency, parseBillMetadata, generateUniqueBillNumber, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Order, OrderItem, Bill, BillItem } from '@/types/database'

type FullRequest = Order & {
  patient: { full_name: string; phone: string; city: string }
  items: OrderItem[]
  bill?: (Bill & { items: BillItem[] }) | null
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
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [taxPercent, setTaxPercent] = useState<number>(0)
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [patientNote, setPatientNote] = useState<string>('')
  const [showBillForm, setShowBillForm] = useState(false)

  const { data: request, isLoading } = useQuery({
    queryKey: ['pharmacy-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          patient:profiles(full_name, phone, city),
          items:order_items(*),
          bill:bills(*, items:bill_items(*))
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      const billData = Array.isArray(data.bill) ? data.bill[0] : data.bill
      return { ...data, bill: billData || null } as FullRequest
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-request', id] })
      toast.success('Request accepted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('orders').update({ status: 'rejected' }).eq('id', id!)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-request', id] })
      toast.success('Request rejected')
      navigate(-1)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Live calculations
  const itemsSubtotal = billLines.reduce((sum, l) => sum + l.quantity * (l.unit_price || 0), 0)
  const discountAmount = Math.round(((itemsSubtotal * discountPercent) / 100) * 100) / 100
  const taxableSubtotal = Math.max(0, Math.round((itemsSubtotal - discountAmount) * 100) / 100)
  const taxAmount = Math.round(((taxableSubtotal * taxPercent) / 100) * 100) / 100
  const grandTotal = Math.round((taxableSubtotal + taxAmount + deliveryFee) * 100) / 100

  const generateBillMutation = useMutation({
    mutationFn: async () => {
      const missingPrice = billLines.some((l) => l.unit_price <= 0)
      if (missingPrice) {
        throw new Error('Please enter unit prices greater than ₹0 for all items.')
      }

      const billNumber = generateUniqueBillNumber()

      const payloadMetadata = JSON.stringify({
        bill_number: billNumber,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        delivery_fee: deliveryFee,
        note: patientNote.trim() || undefined,
      })

      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
          order_id: id!,
          subtotal: itemsSubtotal,
          delivery_fee: deliveryFee,
          tax: taxAmount,
          total: grandTotal,
          status: 'pending',
          patient_note: payloadMetadata,
        })
        .select()
        .single()

      if (billError) throw billError

      const items = billLines.map((l) => ({
        bill_id: bill.id,
        medicine_name: l.medicine_name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total_price: Math.round(l.quantity * l.unit_price * 100) / 100,
      }))

      await supabase.from('bill_items').insert(items)
      await supabase.from('orders').update({ status: 'bill_generated' }).eq('id', id!)

      // Create notification for patient
      if (request?.patient_id) {
        await supabase.from('notifications').insert({
          user_id: request.patient_id,
          type: 'bill_generated',
          title: 'Bill ready for review',
          body: `Your pharmacy has sent bill ${billNumber} of ${formatCurrency(grandTotal)}. Please review and approve.`,
          reference_id: id!,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-request', id] })
      toast.success('Bill sent to patient')
      setShowBillForm(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateDeliveryMutation = useMutation({
    mutationFn: async (status: 'processing' | 'dispatched' | 'delivered') => {
      await supabase.from('orders').update({ status }).eq('id', id!)
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-request', id] })
      toast.success(`Order marked as ${status}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) return <PageLoader />
  if (!request) return <div className="p-6 text-sm">Request not found.</div>

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5"
      >
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

        {/* Actions for Pending */}
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

        {/* Generate bill */}
        {request.status === 'accepted' && (
          <Card>
            <CardHeader
              title="Generate Bill"
              subtitle="Set unit prices, discount %, and tax % to generate an invoice"
            />
            {!showBillForm ? (
              <Button size="sm" onClick={() => setShowBillForm(true)}>Create bill</Button>
            ) : (
              <div className="space-y-5">
                {/* Medicine Items & Unit Prices */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Medicine Unit Prices</p>
                  {billLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50/60 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{line.medicine_name}</p>
                        <p className="text-xs text-slate-500">Quantity: {line.quantity}</p>
                      </div>
                      <div className="w-32">
                        <Input
                          label=""
                          type="number"
                          min={0}
                          max={100000}
                          step={0.01}
                          placeholder="Price ₹"
                          value={line.unit_price || ''}
                          onChange={(e) => {
                            const val = Math.min(100000, Math.max(0, parseFloat(e.target.value) || 0))
                            const updated = [...billLines]
                            updated[idx].unit_price = val
                            setBillLines(updated)
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-24 text-right text-slate-900">
                        {formatCurrency(line.quantity * line.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal preview */}
                <div className="flex justify-between items-center px-1 text-sm text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(itemsSubtotal)}</span>
                </div>

                {/* Discount in % Section */}
                <div className="bg-emerald-50/40 rounded-xl p-3.5 border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-emerald-600" />
                      Discount (%)
                    </label>
                    <span className="text-xs font-bold text-emerald-700">
                      {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : '₹0.00'}
                    </span>
                  </div>
                  <Input
                    label=""
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="Discount %"
                    value={discountPercent || ''}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                      setDiscountPercent(val)
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-emerald-700/80 mr-1">Presets:</span>
                    {[0, 5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDiscountPercent(pct)}
                        className={cn(
                          'px-2.5 py-0.5 text-xs rounded-full border transition-colors',
                          discountPercent === pct
                            ? 'bg-emerald-600 text-white border-emerald-600 font-medium shadow-sm'
                            : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tax in % Section */}
                <div className="bg-blue-50/40 rounded-xl p-3.5 border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-blue-600" />
                      Tax / GST (%)
                    </label>
                    <span className="text-xs font-bold text-blue-700">
                      {taxAmount > 0 ? `+ ${formatCurrency(taxAmount)}` : '₹0.00'}
                    </span>
                  </div>
                  <Input
                    label=""
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="Tax %"
                    value={taxPercent || ''}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                      setTaxPercent(val)
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-blue-700/80 mr-1">GST Slabs:</span>
                    {[
                      { label: '0% (Exempt)', val: 0 },
                      { label: '5% (Essential)', val: 5 },
                      { label: '12% (Standard)', val: 12 },
                      { label: '18% (OTC/Devices)', val: 18 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setTaxPercent(item.val)}
                        className={cn(
                          'px-2.5 py-0.5 text-xs rounded-full border transition-colors',
                          taxPercent === item.val
                            ? 'bg-blue-600 text-white border-blue-600 font-medium shadow-sm'
                            : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Fee Section */}
                <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-600" />
                      Delivery Fee (₹)
                    </label>
                    <span className="text-xs font-medium text-slate-700">{formatCurrency(deliveryFee)}</span>
                  </div>
                  <Input
                    label=""
                    type="number"
                    min={0}
                    max={5000}
                    step={1}
                    placeholder="₹0"
                    value={deliveryFee || ''}
                    onChange={(e) => setDeliveryFee(Math.min(5000, Math.max(0, parseFloat(e.target.value) || 0)))}
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-slate-500 mr-1">Quick:</span>
                    {[
                      { label: '₹0 (Free)', val: 0 },
                      { label: '₹20', val: 20 },
                      { label: '₹30', val: 30 },
                      { label: '₹50', val: 50 },
                    ].map((fee) => (
                      <button
                        key={fee.val}
                        type="button"
                        onClick={() => setDeliveryFee(fee.val)}
                        className={cn(
                          'px-2.5 py-0.5 text-xs rounded-full border transition-colors',
                          deliveryFee === fee.val
                            ? 'bg-slate-800 text-white border-slate-800 font-medium'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {fee.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patient Note */}
                <Input
                  label="Note for patient (optional)"
                  type="text"
                  placeholder="e.g. Free home delivery, take medicines after food"
                  value={patientNote}
                  onChange={(e) => setPatientNote(e.target.value)}
                />

                {/* Live Bill Summary Card */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Bill Preview</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Items subtotal</span>
                      <span className="font-medium text-slate-900">{formatCurrency(itemsSubtotal)}</span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount ({discountPercent}%)</span>
                        <span className="font-semibold">- {formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Taxable subtotal</span>
                        <span>{formatCurrency(taxableSubtotal)}</span>
                      </div>
                    )}
                    {taxPercent > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Tax / GST ({taxPercent}%)</span>
                        <span className="font-semibold">+ {formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery fee</span>
                        <span className="font-medium text-slate-900">{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Final Bill Total</span>
                      <span className="text-primary-600">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowBillForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => generateBillMutation.mutate()}
                    isLoading={generateBillMutation.isPending}
                  >
                    Send bill to patient
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Existing Bill Card (when bill has been generated) */}
        {request.bill && (
          <Card>
            <CardHeader
              title="Generated Bill"
              actions={<StatusBadge status={request.bill.status} />}
            />
            {(() => {
              const billMeta = parseBillMetadata(
                request.bill.patient_note,
                request.bill.subtotal,
                request.bill.tax,
                request.bill.delivery_fee,
                request.bill.total,
                request.bill.id
              )
              return (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-4 rounded-lg bg-slate-50 dark:bg-[#21262D] border border-border dark:border-[#30363D] text-xs">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-500 dark:text-[#8B949E]">Bill No:</span>
                      <strong className="font-semibold text-slate-900 dark:text-[#F0F6FC] bg-white dark:bg-[#161B22] px-2 py-0.5 rounded border border-border dark:border-[#30363D]">
                        {billMeta.billNumber}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(billMeta.billNumber)
                          toast.success('Bill number copied!')
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title="Copy Bill Number"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-slate-400 dark:text-[#8B949E]">
                      Issued: {formatDate(request.bill.generated_at)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {request.bill.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-border dark:border-[#30363D] last:border-0">
                        <span className="text-slate-700 dark:text-slate-200">{item.medicine_name} × {item.quantity}</span>
                        <span className="text-slate-900 dark:text-[#F0F6FC] font-medium">{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 dark:bg-[#21262D] rounded-xl p-3.5 border border-slate-200 dark:border-[#30363D] space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-500 dark:text-[#8B949E]">
                      <span>Subtotal</span>
                      <span className="text-slate-900 dark:text-[#F0F6FC] font-medium">{formatCurrency(request.bill.subtotal)}</span>
                    </div>
                  {billMeta.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
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
                  {request.bill.tax > 0 && (
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Tax / GST ({billMeta.taxPercent}%)</span>
                      <span>+ {formatCurrency(request.bill.tax)}</span>
                    </div>
                  )}
                  {request.bill.delivery_fee > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Delivery fee</span>
                      <span className="text-slate-900 font-medium">{formatCurrency(request.bill.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-base">
                    <span>Total</span>
                    <span className="text-primary-600">{formatCurrency(request.bill.total)}</span>
                  </div>
                  {billMeta.note && (
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-200 italic">
                      Note to patient: {billMeta.note}
                    </p>
                  )}
                </div>
              </div>
            )
          })()}
        </Card>
      )}

        {/* Update delivery status actions */}
        {request.status === 'bill_approved' && (
          <Card>
            <CardHeader title="Update delivery status" />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => updateDeliveryMutation.mutate('processing')} isLoading={updateDeliveryMutation.isPending}>
                Mark processing
              </Button>
              <Button size="sm" variant="secondary" onClick={() => updateDeliveryMutation.mutate('dispatched')} isLoading={updateDeliveryMutation.isPending}>
                Mark dispatched
              </Button>
              <Button size="sm" onClick={() => updateDeliveryMutation.mutate('delivered')} isLoading={updateDeliveryMutation.isPending}>
                Mark delivered
              </Button>
            </div>
          </Card>
        )}

        {['processing', 'dispatched'].includes(request.status) && (
          <Card>
            <CardHeader title="Update delivery status" />
            <div className="flex gap-2">
              {request.status === 'processing' && (
                <Button size="sm" variant="secondary" onClick={() => updateDeliveryMutation.mutate('dispatched')} isLoading={updateDeliveryMutation.isPending}>
                  Mark dispatched
                </Button>
              )}
              <Button size="sm" onClick={() => updateDeliveryMutation.mutate('delivered')} isLoading={updateDeliveryMutation.isPending}>
                Mark delivered
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

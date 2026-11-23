import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Phone, Mail, Plus } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { sendAppNotification } from '@/lib/notifications'
import toast from 'react-hot-toast'
import type { Pharmacy, PharmacyInventory, Medicine } from '@/types/database'

export function PharmacyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [selectedMedicines, setSelectedMedicines] = useState<string[]>([])
  const [requestNotes, setRequestNotes] = useState('')

  const { data: pharmacy, isLoading: pharmacyLoading } = useQuery({
    queryKey: ['pharmacy-detail', id],
    queryFn: async (): Promise<Pharmacy | null> => {
      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('id', id!)
          .maybeSingle()
        if (error || !data) return null
        return data as Pharmacy
      } catch {
        return null
      }
    },
    enabled: !!id,
  })

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery<PharmacyInventory[]>({
    queryKey: ['pharmacy-inventory-view', id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('pharmacy_inventory')
          .select('*')
          .eq('pharmacy_id', id!)
          .eq('is_available', true)
          .order('medicine_name')
        if (error) return []
        return (data || []) as PharmacyInventory[]
      } catch {
        return []
      }
    },
    enabled: !!id,
  })

  const { data: patientMedicines = [] } = useQuery<Medicine[]>({
    queryKey: ['medicines', profile?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .select('id, name, current_quantity, unit, daily_dose, reminder_threshold')
          .eq('user_id', profile!.id)
        if (error) return []
        return (data || []) as Medicine[]
      } catch {
        return []
      }
    },
    enabled: !!profile?.id,
  })

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!pharmacy || selectedMedicines.length === 0) {
        throw new Error('Select at least one medicine')
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          patient_id: profile!.id,
          pharmacy_id: pharmacy.id,
          status: 'pending',
          notes: requestNotes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const items = selectedMedicines.map((medId) => {
        const med = patientMedicines.find((m) => m.id === medId)!
        return {
          order_id: order.id,
          medicine_id: medId,
          medicine_name: med.name,
          quantity_requested: 30,
          unit: med.unit,
        }
      })

      const { error: itemsError } = await supabase.from('order_items').insert(items)
      if (itemsError) throw itemsError

      // Notify the dispensing pharmacy store owner in real-time
      if (pharmacy?.owner_id) {
        sendAppNotification({
          userId: pharmacy.owner_id,
          type: 'new_request',
          title: 'New Medicine Order Request',
          body: `Patient ${profile?.full_name || 'A patient'} requested ${items.length} medicine(s). Please review and generate a bill.`,
          referenceId: order.id,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Refill request sent to pharmacy!')
      setIsRequestModalOpen(false)
      setSelectedMedicines([])
      setRequestNotes('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (pharmacyLoading || inventoryLoading) return <PageLoader />
  if (!pharmacy) return <div className="p-6 text-sm text-slate-500">Pharmacy not found.</div>

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate('/app/pharmacies')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to pharmacies
      </button>

      <PageHeader
        title={pharmacy.name}
        description={`Licensed pharmacy · ${pharmacy.city}`}
        actions={
          <Button onClick={() => setIsRequestModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Request Refill
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Contact info card */}
        <Card className="md:col-span-1">
          <CardHeader title="Pharmacy Information" />
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wide block">Verification</span>
              <div className="mt-1">
                <StatusBadge status={pharmacy.status} />
              </div>
            </div>
            {pharmacy.license_number && (
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wide block">License</span>
                <p className="text-slate-700 font-mono text-xs mt-0.5">{pharmacy.license_number}</p>
              </div>
            )}
            {pharmacy.address && (
              <div className="flex items-start gap-2 text-slate-600 text-xs pt-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                <span>{pharmacy.address}, {pharmacy.city} {pharmacy.pincode}</span>
              </div>
            )}
            {pharmacy.phone && (
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>{pharmacy.phone}</span>
              </div>
            )}
            {pharmacy.email && (
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>{pharmacy.email}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Available inventory list */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title="Available Medicines in Stock"
              description="Medicines currently in stock and dispensed by this pharmacy"
            />
            {inventory.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No inventory listed for this pharmacy.</p>
            ) : (
              <div className="divide-y divide-border">
                {inventory.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.medicine_name}</p>
                      <p className="text-xs text-slate-500">
                        {item.brand && `${item.brand} · `}
                        {item.form && `${item.form} · `}
                        {item.dosage}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.price)}</p>
                      <span className="text-[11px] text-success-600 font-medium">In stock ({item.stock_quantity})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Refill Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => { setIsRequestModalOpen(false); setSelectedMedicines([]) }}
        title={`Request refill from ${pharmacy.name}`}
        description="Choose from your regular medicines to request an order."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Select medicines</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {patientMedicines.map((med) => (
                <label key={med.id} className="flex items-center gap-2.5 p-2.5 rounded border border-border hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMedicines.includes(med.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMedicines([...selectedMedicines, med.id])
                      } else {
                        setSelectedMedicines(selectedMedicines.filter((id) => id !== med.id))
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{med.name}</p>
                    <p className="text-xs text-slate-400">{med.current_quantity} {med.unit}s remaining</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Textarea
            label="Notes for pharmacy"
            placeholder="Special delivery instructions or requirements…"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setIsRequestModalOpen(false); setSelectedMedicines([]) }}>
              Cancel
            </Button>
            <Button
              onClick={() => requestMutation.mutate()}
              isLoading={requestMutation.isPending}
              disabled={selectedMedicines.length === 0}
            >
              Submit request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

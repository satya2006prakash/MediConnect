import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, MapPin, Phone, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormField'

import toast from 'react-hot-toast'
import type { Pharmacy, Medicine } from '@/types/database'


export function PharmaciesPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null)
  const [requestNotes, setRequestNotes] = useState('')
  const [selectedMedicines, setSelectedMedicines] = useState<string[]>([])

  const { data: pharmacies = [], isLoading } = useQuery({
    queryKey: ['pharmacies'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('status', 'verified')
          .order('name')
        if (error) {
          console.error('Error fetching pharmacies:', error)
          return []
        }
        return (data || []) as Pharmacy[]
      } catch {
        return []
      }
    },
  })

  const { data: medicines = [] } = useQuery({
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
      if (!selectedPharmacy || selectedMedicines.length === 0) {
        throw new Error('Select at least one medicine')
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          patient_id: profile!.id,
          pharmacy_id: selectedPharmacy.id,
          status: 'pending',
          notes: requestNotes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Add items
      const items = selectedMedicines.map((medId) => {
        const med = medicines.find((m) => m.id === medId)!
        return {
          order_id: order.id,
          medicine_id: medId,
          medicine_name: med.name,
          quantity_requested: 30, // default 30 days supply
          unit: med.unit,
        }
      })

      const { error: itemsError } = await supabase.from('order_items').insert(items)
      if (itemsError) throw itemsError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Refill request sent to pharmacy!')
      setSelectedPharmacy(null)
      setSelectedMedicines([])
      setRequestNotes('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const cities = [...new Set(pharmacies.map((p) => p.city).filter(Boolean))] as string[]

  const filtered = pharmacies.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.city ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCity = !cityFilter || p.city === cityFilter
    return matchesSearch && matchesCity
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Find Pharmacies"
        description="Browse verified pharmacies and send refill requests."
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-sm border border-border dark:border-[#30363D] rounded bg-white dark:bg-[#161B22] text-slate-900 dark:text-[#F0F6FC] placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-950"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-border dark:border-[#30363D] rounded bg-white dark:bg-[#161B22] text-slate-700 dark:text-[#F0F6FC] focus:outline-none focus:border-primary-500"
        >
          <option value="">All cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No pharmacies found"
          description="Try a different city or search term."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pharmacy) => (
            <div
              key={pharmacy.id}
              className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg p-4 flex flex-col gap-3 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-50 dark:bg-primary-950/60 rounded-lg flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F0F6FC]">{pharmacy.name}</h3>
                    <StatusBadge status={pharmacy.status} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 dark:text-[#8B949E]">
                {pharmacy.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{pharmacy.address}, {pharmacy.city} {pharmacy.pincode}</span>
                  </div>
                )}
                {pharmacy.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{pharmacy.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1 border-t border-border dark:border-[#30363D]">
                <Link
                  to={`/app/pharmacies/${pharmacy.id}`}
                  className="flex-1 text-xs text-center px-3 py-1.5 border border-border dark:border-[#30363D] rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#21262D] transition-colors"
                >
                  View inventory
                </Link>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setSelectedPharmacy(pharmacy)}
                >
                  Request refill
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refill Request Modal */}
      <Modal
        isOpen={!!selectedPharmacy}
        onClose={() => { setSelectedPharmacy(null); setSelectedMedicines([]) }}
        title={`Request refill from ${selectedPharmacy?.name ?? ''}`}
        description="Select the medicines you need refilled."
        size="md"
      >
        <div className="space-y-4">
          {/* Medicine multi-select */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select medicines</p>
            {medicines.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You haven't added any medicines yet.{' '}
                <Link to="/app/medicines" className="text-primary-600 dark:text-primary-400 underline">Add medicines first.</Link>
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {medicines.map((med) => (
                  <label key={med.id} className="flex items-center gap-2.5 p-2.5 rounded border border-border dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-[#21262D] cursor-pointer">
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
                      <p className="text-sm font-medium text-slate-900 dark:text-[#F0F6FC]">{med.name}</p>
                      <p className="text-xs text-slate-400 dark:text-[#8B949E]">{med.current_quantity} {med.unit}s remaining</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Textarea
            label="Notes for pharmacy"
            placeholder="Any special instructions…"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setSelectedPharmacy(null); setSelectedMedicines([]) }}>
              Cancel
            </Button>
            <Button
              onClick={() => requestMutation.mutate()}
              isLoading={requestMutation.isPending}
              disabled={selectedMedicines.length === 0}
            >
              Send request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pill, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormField'
import { MedicineCard } from '@/components/ui/MedicineCard'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Medicine } from '@/types/database'


const schema = z.object({
  name: z.string().trim().min(1, 'Medicine name is required').max(100, 'Medicine name cannot exceed 100 characters'),
  brand: z.string().trim().max(100, 'Brand name cannot exceed 100 characters').optional(),
  dosage: z.string().trim().max(50, 'Dosage cannot exceed 50 characters').optional(),
  form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other']).optional(),
  current_quantity: z.coerce
    .number()
    .min(0, 'Quantity cannot be negative')
    .max(1000, 'Current quantity cannot exceed 1,000 units'),
  unit: z.string().min(1, 'Unit is required'),
  daily_dose: z.coerce
    .number()
    .min(0.5, 'Minimum daily dose is 0.5')
    .max(50, 'Daily dose cannot exceed 50 units per day')
    .refine(
      (val) => Math.abs(val * 2 - Math.round(val * 2)) < 0.0001,
      'Daily dose must be in intervals of 0.5 (e.g. 0.5, 1, 1.5, 2)'
    ),
  reminder_threshold: z.coerce
    .number()
    .min(1, 'Reminder threshold must be at least 1 day')
    .max(90, 'Reminder threshold cannot exceed 90 days'),
  is_prescription: z.boolean().optional(),
  notes: z.string().trim().max(300, 'Notes cannot exceed 300 characters').optional(),
})

interface MedicineFormValues {
  name: string
  brand?: string
  dosage?: string
  form?: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'other'
  current_quantity: number
  unit: string
  daily_dose: number
  reminder_threshold: number
  is_prescription?: boolean
  notes?: string
}


const formOptions = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'injection', label: 'Injection' },
  { value: 'cream', label: 'Cream' },
  { value: 'drops', label: 'Drops' },
  { value: 'other', label: 'Other' },
]

const unitOptions = [
  { value: 'tablet', label: 'Tablets' },
  { value: 'capsule', label: 'Capsules' },
  { value: 'ml', label: 'ml' },
  { value: 'mg', label: 'mg' },
  { value: 'unit', label: 'Units' },
]

export function MedicinesPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null)

  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ['medicines', profile?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('medicines')
          .select('*')
          .eq('user_id', profile!.id)
          .order('name')
        if (error) {
          console.error('Error fetching medicines:', error)
          return []
        }
        return (data || []) as Medicine[]
      } catch {
        return []
      }
    },
    enabled: !!profile?.id,
  })


  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<MedicineFormValues>({
      resolver: zodResolver(schema) as any,
      defaultValues: { unit: 'tablet', daily_dose: 1, reminder_threshold: 7, current_quantity: 10 },
    })

  const saveMutation = useMutation({
    mutationFn: async (data: MedicineFormValues) => {
      if (editingMedicine) {
        const { error } = await supabase
          .from('medicines')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', editingMedicine.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('medicines').insert({
          ...data,
          user_id: profile!.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines', profile?.id] })
      toast.success(editingMedicine ? 'Medicine updated' : 'Medicine added')
      closeModal()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('medicines').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines', profile?.id] })
      toast.success('Medicine deleted')
      setDeletingMedicine(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine)
    reset({
      name: medicine.name,
      brand: medicine.brand ?? '',
      dosage: medicine.dosage ?? '',
      form: medicine.form ?? undefined,
      current_quantity: medicine.current_quantity,
      unit: medicine.unit,
      daily_dose: medicine.daily_dose,
      reminder_threshold: medicine.reminder_threshold,
      is_prescription: medicine.is_prescription ?? false,
      notes: medicine.notes ?? '',
    })
    setIsModalOpen(true)
  }

  const openAdd = () => {
    setEditingMedicine(null)
    reset({
      name: '',
      brand: '',
      dosage: '',
      current_quantity: 10,
      unit: 'tablet',
      daily_dose: 1,
      reminder_threshold: 7,
      is_prescription: false,
      notes: '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingMedicine(null)
  }

  const filtered = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.brand ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="My Medicines"
        description="Track your medicine stock and daily consumption."
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" />
            Add medicine
          </Button>
        }
      />

      {/* Search */}
      {medicines.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search medicines…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-sm border border-border dark:border-[#30363D] rounded bg-white dark:bg-[#161B22] text-slate-900 dark:text-[#F0F6FC] placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-950"
          />
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={search ? 'No medicines match your search' : 'No medicines yet'}
          description={search ? 'Try a different search term.' : 'Add your first medicine to start tracking stock.'}
          action={!search && <Button onClick={openAdd}><Plus className="w-4 h-4" />Add medicine</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((med) => (
            <MedicineCard
              key={med.id}
              medicine={med}
              onEdit={openEdit}
              onDelete={setDeletingMedicine}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingMedicine ? 'Edit medicine' : 'Add medicine'}
        size="lg"
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d as MedicineFormValues))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Medicine name"
              placeholder="e.g. Paracetamol, Metformin"
              maxLength={100}
              error={errors.name?.message}
              required
              {...register('name')}
            />
            <Input
              label="Brand name"
              placeholder="e.g. Dolo 650, Calpol"
              maxLength={100}
              error={errors.brand?.message}
              {...register('brand')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Dosage / Strength"
              placeholder="e.g. 500mg, 650mg, 5ml"
              maxLength={50}
              error={errors.dosage?.message}
              {...register('dosage')}
            />
            <Select
              label="Form"
              options={formOptions}
              placeholder="Select form"
              error={errors.form?.message}
              {...register('form')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Current quantity"
              type="number"
              min={0}
              max={1000}
              step={0.5}
              placeholder="e.g. 30"
              hint="In stock (max 1,000)"
              error={errors.current_quantity?.message}
              required
              {...register('current_quantity', {
                valueAsNumber: true,
                onChange: (e) => {
                  const val = Number(e.target.value)
                  if (val > 1000) e.target.value = '1000'
                  if (val < 0 && e.target.value !== '') e.target.value = '0'
                },
              })}
            />
            <Select
              label="Unit"
              options={unitOptions}
              error={errors.unit?.message}
              required
              {...register('unit')}
            />
            <div>
              <Input
                label="Daily dose"
                type="number"
                min={0.5}
                max={50}
                step={0.5}
                placeholder="1"
                hint="Dose/day (max 50)"
                error={errors.daily_dose?.message}
                required
                {...register('daily_dose', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const val = Number(e.target.value)
                    if (val > 50) e.target.value = '50'
                    if (val < 0.5 && e.target.value !== '') e.target.value = '0.5'
                  },
                })}
              />
              {/* Quick Dose Flow Selector */}
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {[0.5, 1, 1.5, 2, 2.5, 3].map((dose) => (
                  <button
                    key={dose}
                    type="button"
                    onClick={() => setValue('daily_dose', dose, { shouldValidate: true })}
                    className={cn(
                      'px-1.5 py-0.5 text-[11px] font-semibold rounded border transition-all',
                      Number(watch('daily_dose')) === dose
                        ? 'bg-[#2457A7] text-white border-[#2457A7]'
                        : 'bg-[#F0F3F7] dark:bg-[#21262D] text-[#475467] dark:text-[#8B949E] border-[#E5EAF0] dark:border-[#30363D] hover:bg-[#E5EAF0] dark:hover:bg-[#30363D]'
                    )}
                  >
                    {dose}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Input
            label="Low stock reminder threshold"
            type="number"
            min={1}
            max={90}
            step={1}
            placeholder="7"
            hint="Alert when ≤ this many days of stock remain (1 to 90 days)"
            error={errors.reminder_threshold?.message}
            required
            {...register('reminder_threshold', {
              valueAsNumber: true,
              onChange: (e) => {
                const val = Number(e.target.value)
                if (val > 90) e.target.value = '90'
                if (val < 1 && e.target.value !== '') e.target.value = '1'
              },
            })}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_prescription"
              className="w-4 h-4 rounded border-border text-primary-600"
              {...register('is_prescription')}
            />
            <label htmlFor="is_prescription" className="text-sm text-slate-700">
              Requires doctor's prescription (Rx)
            </label>
          </div>

          <Input
            label="Notes / Pharmacist Instructions"
            placeholder="e.g. Take after food, sugar-free syrup preferred (max 300 chars)"
            maxLength={300}
            error={errors.notes?.message}
            {...register('notes')}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting || saveMutation.isPending}>
              {editingMedicine ? 'Save changes' : 'Add medicine'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingMedicine}
        onClose={() => setDeletingMedicine(null)}
        onConfirm={() => deletingMedicine && deleteMutation.mutate(deletingMedicine.id)}
        title="Delete medicine"
        description={`Are you sure you want to delete "${deletingMedicine?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

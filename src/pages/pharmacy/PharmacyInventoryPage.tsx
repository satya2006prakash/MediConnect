import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Package, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormField'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Pharmacy, PharmacyInventory } from '@/types/database'

const schema = z.object({
  medicine_name: z.string().min(1, 'Medicine name is required'),
  brand: z.string().optional(),
  form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other']).optional(),
  dosage: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock_quantity: z.coerce.number().int().min(0, 'Quantity must be positive'),
  is_available: z.boolean().optional(),
})

interface FormValues {
  medicine_name: string
  brand?: string
  form?: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'other'
  dosage?: string
  price: number
  stock_quantity: number
  is_available?: boolean
}

const formOptions = [
  { value: 'tablet', label: 'Tablet' }, { value: 'capsule', label: 'Capsule' },
  { value: 'syrup', label: 'Syrup' }, { value: 'injection', label: 'Injection' },
  { value: 'cream', label: 'Cream' }, { value: 'drops', label: 'Drops' },
  { value: 'other', label: 'Other' },
]

export function PharmacyInventoryPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<PharmacyInventory | null>(null)
  const [deleting, setDeleting] = useState<PharmacyInventory | null>(null)

  const { data: pharmacy } = useQuery({
    queryKey: ['pharmacy', profile?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('pharmacies').select('id').eq('owner_id', profile!.id).maybeSingle()
        if (!data) return null
        return data as unknown as Pharmacy
      } catch {
        return null
      }
    },
    enabled: !!profile?.id,
  })

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory', pharmacy?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('pharmacy_inventory')
          .select('*')
          .eq('pharmacy_id', pharmacy!.id)
          .order('medicine_name')
        if (error) {
          console.error('Error fetching inventory:', error)
          return []
        }
        return (data || []) as PharmacyInventory[]
      } catch {
        return []
      }
    },
    enabled: !!pharmacy?.id,
  })


  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as any, defaultValues: { is_available: true, stock_quantity: 0, price: 0 } })

  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (editing) {
        const { error } = await supabase.from('pharmacy_inventory').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('pharmacy_inventory').insert({ ...data, pharmacy_id: pharmacy!.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success(editing ? 'Item updated' : 'Item added')

      setIsModalOpen(false); setEditing(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pharmacy_inventory').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Item removed'); setDeleting(null) },
    onError: (err: Error) => toast.error(err.message),
  })

  const openEdit = (item: PharmacyInventory) => {
    setEditing(item)
    reset({ medicine_name: item.medicine_name, brand: item.brand ?? '', form: item.form ?? undefined, dosage: item.dosage ?? '', price: item.price, stock_quantity: item.stock_quantity, is_available: item.is_available })
    setIsModalOpen(true)
  }

  const filtered = inventory.filter((i) => i.medicine_name.toLowerCase().includes(search.toLowerCase()))

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Medicine Inventory"
        description="Manage your pharmacy's medicine stock and pricing."
        actions={<Button onClick={() => { setEditing(null); reset({ is_available: true }); setIsModalOpen(true) }}><Plus className="w-4 h-4" />Add medicine</Button>}
      />

      {inventory.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search inventory…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-sm border border-border rounded bg-white placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No medicines in inventory" description="Add medicines to your inventory so patients can find and order them." />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Medicine</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Form / Dosage</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Price</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Available</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{item.medicine_name}</p>
                    {item.brand && <p className="text-xs text-slate-400">{item.brand}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 capitalize">
                    {[item.form, item.dosage].filter(Boolean).join(' · ')}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-900">{formatCurrency(item.price)}</td>
                  <td className="px-5 py-3.5 text-right text-slate-700">{item.stock_quantity}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={cn('inline-block w-2 h-2 rounded-full', item.is_available ? 'bg-success-600' : 'bg-danger-600')} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(item)} className="text-danger-600 hover:text-danger-600">Remove</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditing(null) }} title={editing ? 'Edit medicine' : 'Add medicine to inventory'} size="md">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d as FormValues))} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <Input label="Medicine name" error={errors.medicine_name?.message} required {...register('medicine_name')} />
            <Input label="Brand" {...register('brand')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Form" options={formOptions} placeholder="Select form" {...register('form')} />
            <Input label="Dosage" placeholder="e.g. 500mg" {...register('dosage')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₹)" type="number" min={0} step={0.01} error={errors.price?.message} required {...register('price')} />
            <Input label="Stock quantity" type="number" min={0} error={errors.stock_quantity?.message} required {...register('stock_quantity')} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_available" className="w-4 h-4 rounded border-border text-primary-600" defaultChecked {...register('is_available')} />
            <label htmlFor="is_available" className="text-sm text-slate-700">Currently available</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setEditing(null) }}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting || saveMutation.isPending}>{editing ? 'Save' : 'Add'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Remove medicine"
        description={`Remove "${deleting?.medicine_name}" from inventory?`}
        confirmLabel="Remove"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

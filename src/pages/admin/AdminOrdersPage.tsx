import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ShoppingBag, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import type { Order } from '@/types/database'

type FullOrder = Order & {
  patient: { full_name: string }
  pharmacy: { name: string; city: string }
}

export function AdminOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: orders = [], isLoading } = useQuery<FullOrder[]>({
    queryKey: ['admin-orders'],
    queryFn: async () => {

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, patient:profiles(full_name), pharmacy:pharmacies(name, city)')
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error fetching admin orders:', error)
          return []
        }
        return (data || []) as FullOrder[]
      } catch {
        return []
      }
    },
  })


  const filtered = orders.filter((o) => {
    const matchesSearch =
      (o.patient?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.pharmacy?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Orders Monitor" description={`${orders.length} total orders`} />

      <div className="flex gap-3 mb-5">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient or pharmacy…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-sm border border-border rounded bg-white placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-border rounded bg-white text-slate-700 focus:outline-none focus:border-primary-500"
        >
          <option value="all">All statuses</option>
          {['pending','accepted','bill_generated','bill_approved','processing','dispatched','delivered','rejected','cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders found" />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Pharmacy</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 font-medium text-slate-900">{order.patient?.full_name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-slate-700">{order.pharmacy?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{order.pharmacy?.city}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(order.created_at)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

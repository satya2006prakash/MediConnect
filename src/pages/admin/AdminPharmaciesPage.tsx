import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Pharmacy } from '@/types/database'

type PharmacyWithOwner = Pharmacy & { owner?: { full_name: string; phone: string } }

export function AdminPharmaciesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Realtime subscription: auto-update when pharmacies are registered or status changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-pharmacies-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pharmacies' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const {
    data: pharmacies = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<PharmacyWithOwner[]>({
    queryKey: ['admin-pharmacies'],
    refetchInterval: 8000, // 8-second auto-poll so admin always sees incoming registrations
    queryFn: async () => {
      try {
        let { data, error } = await supabase
          .from('pharmacies')
          .select('*, owner:profiles!pharmacies_owner_id_fkey(full_name, phone)')
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('Error fetching pharmacies with fkey join, falling back to direct select:', error)
          const fallback = await supabase
            .from('pharmacies')
            .select('*')
            .order('created_at', { ascending: false })
          if (fallback.error) {
            console.error('Error fetching pharmacies fallback:', fallback.error)
            return []
          }
          data = fallback.data as any
        }
        return (data || []) as PharmacyWithOwner[]
      } catch (err) {
        console.error('Unexpected error fetching pharmacies:', err)
        return []
      }
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      pharmacyEmail,
      pharmacyName,
    }: {
      id: string
      action: 'verified' | 'suspended'
      pharmacyEmail?: string
      pharmacyName?: string
    }) => {
      const { error } = await supabase
        .from('pharmacies')
        .update({
          status: action,
          verified_at: action === 'verified' ? new Date().toISOString() : null,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id)
      if (error) throw error

      // If approved and pharmacy has an email, dispatch approval notification
      if (action === 'verified' && pharmacyEmail) {
        try {
          const res = await fetch('/api/notify-pharmacy-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pharmacyEmail,
              pharmacyName: pharmacyName || 'Pharmacy Partner',
            }),
          })
          if (!res.ok) {
            console.warn('Approval email endpoint returned non-200 status')
          }
        } catch (e) {
          console.warn('Could not send approval email:', e)
        }
      }
    },
    onSuccess: (_, { action, pharmacyName, pharmacyEmail }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] })
      if (action === 'verified') {
        toast.success(
          pharmacyEmail
            ? `Approved ${pharmacyName || 'Pharmacy'}! Login email notification dispatched.`
            : `Approved ${pharmacyName || 'Pharmacy'}!`
        )
      } else {
        toast.success('Pharmacy suspended')
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filtered = pharmacies.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.license_number ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (isLoading) return <PageLoader />

  const pendingCount = pharmacies.filter((p) => p.status === 'pending').length

  return (
    <div>
      <PageHeader
        title="Pharmacy Registry"
        description={`${pendingCount} pending verification • ${pharmacies.length} total registered`}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            isLoading={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Pending Approval Alert Banner */}
      {pendingCount > 0 && statusFilter !== 'pending' && (
        <div className="mb-5 flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {pendingCount} new pharmacy {pendingCount === 1 ? 'request awaits' : 'requests await'} administrative review and approval.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-amber-800 border-amber-300 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-700 h-8 text-xs font-semibold"
            onClick={() => setStatusFilter('pending')}
          >
            Filter Pending Requests
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search pharmacies…"
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
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No pharmacies found" />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-sm min-w-[750px]">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Pharmacy</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">License</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Registered</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((pharmacy) => (
                <tr key={pharmacy.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{pharmacy.name}</p>
                    <p className="text-xs text-slate-400">{pharmacy.city}, {pharmacy.pincode}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-slate-700">{pharmacy.owner?.full_name}</p>
                    <p className="text-xs text-slate-400">{pharmacy.owner?.phone}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{pharmacy.license_number ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(pharmacy.created_at)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={pharmacy.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5 justify-end">
                      {pharmacy.status !== 'verified' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#16865B] hover:text-[#117C75] hover:bg-green-50"
                          onClick={() =>
                            verifyMutation.mutate({
                              id: pharmacy.id,
                              action: 'verified',
                              pharmacyEmail: pharmacy.email || undefined,
                              pharmacyName: pharmacy.name,
                            })
                          }
                          isLoading={verifyMutation.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve & Notify
                        </Button>
                      )}
                      {pharmacy.status !== 'suspended' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#D64545] hover:bg-red-50"
                          onClick={() =>
                            verifyMutation.mutate({
                              id: pharmacy.id,
                              action: 'suspended',
                              pharmacyName: pharmacy.name,
                            })
                          }
                          isLoading={verifyMutation.isPending}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Suspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

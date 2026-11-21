import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, CheckCircle, Clock } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Complaint, ComplaintStatus } from '@/types/database'

export function AdminComplaintsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: complaints = [], isLoading } = useQuery<Complaint[]>({
    queryKey: ['admin-complaints'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error fetching complaints:', error)
          return []
        }
        return (data || []) as Complaint[]
      } catch {
        return []
      }
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ComplaintStatus }) => {
      const { error } = await supabase
        .from('complaints')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })
      toast.success(`Complaint status updated to ${status.replace('_', ' ')}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filtered = complaints.filter(
    (c) => statusFilter === 'all' || c.status === statusFilter
  )

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Complaints & Resolution"
        description="Monitor user complaints, service issues, and resolution workflows."
      />

      {/* Filter */}
      <div className="flex gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-border rounded bg-white text-slate-700 focus:outline-none focus:border-primary-500"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="under_review">Under review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No complaints found"
          description="There are currently no complaints matching the selected filter."
        />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Subject &amp; Details
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Date Filed
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 max-w-md">
                    <p className="font-medium text-slate-900">{item.subject}</p>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.admin_note && (
                      <p className="text-[11px] text-primary-700 bg-primary-50 px-2 py-0.5 rounded mt-1.5 inline-block">
                        Admin Note: {item.admin_note}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-500 text-xs">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1.5">
                      {item.status !== 'under_review' && item.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'under_review' })}
                          isLoading={updateStatusMutation.isPending}
                        >
                          <Clock className="w-3.5 h-3.5" /> Review
                        </Button>
                      )}
                      {item.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-success-600 hover:text-success-700"
                          onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'resolved' })}
                          isLoading={updateStatusMutation.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Resolve
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

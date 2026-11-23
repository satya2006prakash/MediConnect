import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare,
  CheckCircle,
  Search,
  User,
  Building2,
  Send,
  Eye,
  CheckCircle2,
  Trash2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/FormField'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Complaint, ComplaintStatus } from '@/types/database'

interface EnrichedComplaint extends Complaint {
  complainant?: {
    full_name: string
    role: string
    phone: string | null
  } | null
  pharmacy?: {
    name: string
    city: string | null
  } | null
}

export function AdminComplaintsPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'patient' | 'pharmacy_admin'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Selected complaint for full Resolution Modal
  const [activeComplaint, setActiveComplaint] = useState<EnrichedComplaint | null>(null)
  const [complaintToDelete, setComplaintToDelete] = useState<EnrichedComplaint | null>(null)
  const [modalStatus, setModalStatus] = useState<ComplaintStatus>('under_review')
  const [modalAdminNote, setModalAdminNote] = useState('')
  const [notifyUser, setNotifyUser] = useState(true)

  // 1. Fetch complaints and enrich with complainant profiles & pharmacy info
  const { data: complaints = [], isLoading } = useQuery<EnrichedComplaint[]>({
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
        if (!data || data.length === 0) return []

        // Enrich with complainant profile information
        const userIds = [...new Set(data.map((c) => c.filed_by).filter(Boolean))]
        let profilesMap: Record<string, { full_name: string; role: string; phone: string | null }> = {}
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, role, phone')
            .in('id', userIds)
          if (profs) {
            profs.forEach((p) => {
              profilesMap[p.id] = { full_name: p.full_name, role: p.role, phone: p.phone }
            })
          }
        }

        // Enrich with pharmacy name if against_pharmacy is present
        const pharmacyIds = [...new Set(data.map((c) => c.against_pharmacy).filter(Boolean))]
        let pharmaciesMap: Record<string, { name: string; city: string | null }> = {}
        if (pharmacyIds.length > 0) {
          const { data: pharms } = await supabase
            .from('pharmacies')
            .select('id, name, city')
            .in('id', pharmacyIds)
          if (pharms) {
            pharms.forEach((p) => {
              pharmaciesMap[p.id] = { name: p.name, city: p.city }
            })
          }
        }

        return data.map((c) => ({
          ...c,
          complainant: profilesMap[c.filed_by] || null,
          pharmacy: c.against_pharmacy ? pharmaciesMap[c.against_pharmacy] : null,
        }))
      } catch (err) {
        console.error('Complaints query exception:', err)
        return []
      }
    },
  })

  // Open modal handler
  const handleOpenResolutionModal = (complaint: EnrichedComplaint) => {
    setActiveComplaint(complaint)
    setModalStatus(complaint.status === 'open' ? 'under_review' : complaint.status)
    setModalAdminNote(complaint.admin_note || '')
    setNotifyUser(true)
  }

  // Update Status & Resolution Mutation
  const resolveMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      adminNote,
      shouldNotify,
      filedBy,
      subject,
    }: {
      id: string
      status: ComplaintStatus
      adminNote: string
      shouldNotify: boolean
      filedBy: string
      subject: string
    }) => {
      // 1. Update complaint
      const { error } = await supabase
        .from('complaints')
        .update({
          status,
          admin_note: adminNote.trim() ? adminNote.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      // 2. Notify complainant if requested
      if (shouldNotify && filedBy) {
        try {
          const statusLabels: Record<string, string> = {
            open: 'Open',
            under_review: 'Under Review',
            resolved: 'Resolved',
            dismissed: 'Dismissed',
          }
          await supabase.from('notifications').insert({
            user_id: filedBy,
            type: 'complaint_update',
            title: `Complaint Updated: ${statusLabels[status] || status}`,
            body: adminNote.trim()
              ? `Admin Response: "${adminNote.trim()}"`
              : `Your ticket regarding "${subject.slice(0, 50)}" is now marked as ${statusLabels[status]}.`,
            reference_id: id,
            is_read: false,
          })
        } catch (notifErr) {
          console.warn('Failed to insert user notification:', notifErr)
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })
      toast.success(`Complaint status updated to ${vars.status.replace('_', ' ')}`)
      setActiveComplaint(null)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update complaint'),
  })

  // Quick Resolve without modal
  const handleQuickResolve = (item: EnrichedComplaint) => {
    resolveMutation.mutate({
      id: item.id,
      status: 'resolved',
      adminNote: item.admin_note || 'Resolved by Platform Administrator.',
      shouldNotify: true,
      filedBy: item.filed_by,
      subject: item.subject,
    })
  }

  // Permanent Delete Complaint Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('complaints').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })
      queryClient.invalidateQueries({ queryKey: ['admin-header-alerts'] })
      toast.success('Complaint permanently deleted')
      setComplaintToDelete(null)
      setActiveComplaint(null)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete complaint'),
  })

  // Filter complaints
  const filtered = complaints.filter((c) => {
    // Role filter
    const userRole = c.complainant?.role || (c.subject.includes('[Pharmacy') ? 'pharmacy_admin' : 'patient')
    if (roleFilter !== 'all' && userRole !== roleFilter) return false

    // Status filter
    if (statusFilter !== 'all' && c.status !== statusFilter) return false

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchesSubject = c.subject.toLowerCase().includes(q)
      const matchesDesc = (c.description || '').toLowerCase().includes(q)
      const matchesName = (c.complainant?.full_name || '').toLowerCase().includes(q)
      const matchesPhone = (c.complainant?.phone || '').toLowerCase().includes(q)
      if (!matchesSubject && !matchesDesc && !matchesName && !matchesPhone) return false
    }

    return true
  })

  // Summary counts
  const openCount = complaints.filter((c) => c.status === 'open').length
  const underReviewCount = complaints.filter((c) => c.status === 'under_review').length
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length
  const patientCount = complaints.filter((c) => c.complainant?.role === 'patient' || (!c.complainant && !c.subject.includes('[Pharmacy'))).length
  const pharmacyCount = complaints.filter((c) => c.complainant?.role === 'pharmacy_admin' || c.subject.includes('[Pharmacy')).length

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints & Resolution Center"
        description="Review, investigate, and resolve complaints submitted by patients and pharmacies regarding site issues or services."
      />

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl">
          <p className="text-xs text-[#667085] dark:text-[#8B949E] font-medium">Open Issues</p>
          <p className="text-2xl font-bold text-[#D64545] mt-1">{openCount}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl">
          <p className="text-xs text-[#667085] dark:text-[#8B949E] font-medium">Under Review</p>
          <p className="text-2xl font-bold text-[#B54708] mt-1">{underReviewCount}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl">
          <p className="text-xs text-[#667085] dark:text-[#8B949E] font-medium">Resolved</p>
          <p className="text-2xl font-bold text-[#067647] mt-1">{resolvedCount}</p>
        </div>
        <div className="p-3.5 bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl">
          <p className="text-xs text-[#667085] dark:text-[#8B949E] font-medium">Total Tickets</p>
          <p className="text-2xl font-bold text-[#182230] dark:text-[#F0F6FC] mt-1">{complaints.length}</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#8B949E]" />
            <input
              type="text"
              placeholder="Search by subject, description, complainant name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#2457A7]"
            />
          </div>

          {/* Complainant Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#667085] dark:text-[#8B949E] shrink-0">Role:</span>
            <div className="flex gap-1 bg-[#F8FAFC] dark:bg-[#0D1117] p-1 rounded-lg border border-[#E5EAF0] dark:border-[#30363D]">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  roleFilter === 'all'
                    ? 'bg-[#2457A7] text-white shadow-xs'
                    : 'text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC]'
                }`}
              >
                All ({complaints.length})
              </button>
              <button
                onClick={() => setRoleFilter('patient')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  roleFilter === 'patient'
                    ? 'bg-[#2457A7] text-white shadow-xs'
                    : 'text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC]'
                }`}
              >
                Patients ({patientCount})
              </button>
              <button
                onClick={() => setRoleFilter('pharmacy_admin')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  roleFilter === 'pharmacy_admin'
                    ? 'bg-[#2457A7] text-white shadow-xs'
                    : 'text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC]'
                }`}
              >
                Pharmacies ({pharmacyCount})
              </button>
            </div>
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#667085] dark:text-[#8B949E] shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] focus:outline-none focus:border-[#2457A7]"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open Issues</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No complaints match your filters"
          description="Try adjusting your search query, role filter, or status filter."
        />
      ) : (
        <div className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl overflow-x-auto shadow-2xs">
          <table className="w-full text-sm min-w-[750px]">
            <thead>
              <tr className="border-b border-[#E5EAF0] dark:border-[#30363D] bg-[#F8FAFC] dark:bg-[#0D1117]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[#667085] dark:text-[#8B949E] uppercase tracking-wide">
                  Complainant &amp; Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#667085] dark:text-[#8B949E] uppercase tracking-wide">
                  Subject &amp; Issue Details
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#667085] dark:text-[#8B949E] uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#667085] dark:text-[#8B949E] uppercase tracking-wide">
                  Date Filed
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-[#667085] dark:text-[#8B949E] uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0] dark:divide-[#30363D]">
              {filtered.map((item) => {
                const isPharmacy =
                  item.complainant?.role === 'pharmacy_admin' || item.subject.includes('[Pharmacy')

                return (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#21262D]/50 transition-colors">
                    {/* Complainant Identity */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isPharmacy
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}
                        >
                          {isPharmacy ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-[#182230] dark:text-[#F0F6FC]">
                            {item.complainant?.full_name || (isPharmacy ? 'Pharmacy Store' : 'Patient')}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                isPharmacy
                                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {isPharmacy ? 'Pharmacy' : 'Patient'}
                            </span>
                            {item.complainant?.phone && (
                              <span className="text-[10px] text-[#667085] dark:text-[#8B949E]">
                                · {item.complainant.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Subject & Description */}
                    <td className="px-5 py-4 max-w-sm">
                      <p className="font-medium text-xs text-[#182230] dark:text-[#F0F6FC] line-clamp-1">
                        {item.subject}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-[#667085] dark:text-[#8B949E] mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.admin_note && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-[#175CD3] dark:text-[#58A6FF]">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">Admin Note: {item.admin_note}</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-[#667085] dark:text-[#8B949E] text-xs">
                      {formatDate(item.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenResolutionModal(item)}
                          className="text-xs gap-1.5 h-8 px-2.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Resolve / Respond
                        </Button>

                        {item.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuickResolve(item)}
                            isLoading={resolveMutation.isPending}
                            className="text-xs text-[#067647] hover:text-[#05603A] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-8 px-2"
                            title="Quick mark as resolved"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setComplaintToDelete(item)}
                          className="text-xs text-[#D64545] hover:text-[#B42318] hover:bg-red-50 dark:hover:bg-red-950/30 h-8 px-2"
                          title="Permanently delete complaint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resolution & Detail Modal */}
      {activeComplaint && (
        <Modal
          isOpen={!!activeComplaint}
          onClose={() => setActiveComplaint(null)}
          title="Investigate & Resolve Complaint"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setComplaintToDelete(activeComplaint)}
                className="text-xs text-[#D64545] hover:text-[#B42318] hover:bg-red-50 dark:hover:bg-red-950/30 border-[#FDA29B] dark:border-[#912018] gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Permanently
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveComplaint(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    resolveMutation.mutate({
                      id: activeComplaint.id,
                      status: modalStatus,
                      adminNote: modalAdminNote,
                      shouldNotify: notifyUser,
                      filedBy: activeComplaint.filed_by,
                      subject: activeComplaint.subject,
                    })
                  }
                  isLoading={resolveMutation.isPending}
                  className="gap-2 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Save &amp; Update Status
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-sm">
            {/* Header Identity Row */}
            <div className="p-3 bg-[#F8FAFC] dark:bg-[#0D1117] border border-[#E5EAF0] dark:border-[#30363D] rounded-lg flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Complainant:</span>
                <span className="text-xs font-bold text-[#182230] dark:text-[#F0F6FC]">
                  {activeComplaint.complainant?.full_name || 'User'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 uppercase">
                  {activeComplaint.complainant?.role || (activeComplaint.subject.includes('[Pharmacy') ? 'Pharmacy' : 'Patient')}
                </span>
              </div>
              {activeComplaint.complainant?.phone && (
                <span className="text-xs text-[#667085] dark:text-[#8B949E]">
                  Phone: {activeComplaint.complainant.phone}
                </span>
              )}
            </div>

            {/* Subject */}
            <div>
              <p className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Subject</p>
              <p className="font-semibold text-sm text-[#182230] dark:text-[#F0F6FC] mt-0.5">
                {activeComplaint.subject}
              </p>
            </div>

            {/* User Description */}
            <div>
              <p className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Problem Description</p>
              <div className="mt-1 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0D1117] border border-[#E5EAF0] dark:border-[#30363D] text-xs text-[#344054] dark:text-[#8B949E] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {activeComplaint.description || 'No detailed description provided.'}
              </div>
            </div>

            {/* Related Order or Pharmacy Info */}
            {(activeComplaint.against_order || activeComplaint.against_pharmacy) && (
              <div className="flex flex-wrap gap-4 text-xs bg-slate-50 dark:bg-[#161B22] p-2.5 rounded-lg border border-border dark:border-[#30363D]">
                {activeComplaint.against_order && (
                  <div>
                    <span className="font-semibold text-slate-500">Related Order ID: </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{activeComplaint.against_order}</span>
                  </div>
                )}
                {activeComplaint.against_pharmacy && (
                  <div>
                    <span className="font-semibold text-slate-500">Related Pharmacy: </span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {activeComplaint.pharmacy?.name || activeComplaint.against_pharmacy}
                    </span>
                  </div>
                )}
              </div>
            )}

            <hr className="border-[#E5EAF0] dark:border-[#30363D]" />

            {/* Status Update Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC]">
                Update Complaint Status
              </label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as ComplaintStatus)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] focus:outline-none focus:border-[#2457A7]"
              >
                <option value="open">Open (Awaiting Action)</option>
                <option value="under_review">Under Review (Investigating)</option>
                <option value="resolved">Resolved (Issue Addressed)</option>
                <option value="dismissed">Dismissed (Invalid / Duplicate)</option>
              </select>
            </div>

            {/* Admin Resolution Note / Response */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC]">
                Admin Resolution Note &amp; Feedback
              </label>
              <Textarea
                rows={4}
                placeholder="Explain the steps taken to fix the issue, resolution outcome, or response message that the complainant will see..."
                value={modalAdminNote}
                onChange={(e) => setModalAdminNote(e.target.value)}
                hint="This response will be visible to the patient/pharmacy on their complaints dashboard."
              />
            </div>

            {/* Notification Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="notify-checkbox"
                checked={notifyUser}
                onChange={(e) => setNotifyUser(e.target.checked)}
                className="rounded border-[#E5EAF0] dark:border-[#30363D] text-[#2457A7] focus:ring-[#2457A7]"
              />
              <label htmlFor="notify-checkbox" className="text-xs text-[#344054] dark:text-[#8B949E] cursor-pointer">
                Send an in-app notification to the complainant with this update
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* Permanent Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!complaintToDelete}
        onClose={() => setComplaintToDelete(null)}
        onConfirm={() => {
          if (complaintToDelete) {
            deleteMutation.mutate(complaintToDelete.id)
          }
        }}
        title="Permanently Delete Complaint"
        description={`Are you sure you want to permanently delete complaint ticket "${complaintToDelete?.subject}"? This complaint record will be erased completely and this action cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

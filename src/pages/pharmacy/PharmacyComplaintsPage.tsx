import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquareWarning,
  Plus,
  Clock,
  CheckCircle2,
  Send,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/FormField'
import { formatDate } from '@/lib/utils'
import { sendAppNotification } from '@/lib/notifications'
import toast from 'react-hot-toast'
import type { Complaint, Order } from '@/types/database'

const PHARMACY_CATEGORIES = [
  { value: 'Website / Platform Bug', label: 'Website / Platform Bug (Inventory sync, page crash, error)' },
  { value: 'Billing & Payouts', label: 'Billing, Taxes & Payouts (Discount/Tax issue, settlement query)' },
  { value: 'Order & Prescription Dispute', label: 'Order & Prescription Dispute (Customer dispute, invalid doc)' },
  { value: 'Store Profile & Verification', label: 'Store Profile & Verification (License update, info change)' },
  { value: 'Feature Suggestion & Feedback', label: 'Feature Suggestion & Platform Feedback' },
]

export function PharmacyComplaintsPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all')

  // Form State
  const [category, setCategory] = useState(PHARMACY_CATEGORIES[0].value)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [againstOrder, setAgainstOrder] = useState('')

  // 1. Fetch pharmacy record for this owner
  const { data: pharmacy } = useQuery({
    queryKey: ['pharmacy-owner-info', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null
      const { data } = await supabase
        .from('pharmacies')
        .select('id, name, city')
        .eq('owner_id', profile.id)
        .maybeSingle()
      return data
    },
    enabled: !!profile?.id,
  })

  // 2. Fetch complaints filed by this pharmacy admin
  const { data: complaints = [], isLoading } = useQuery<Complaint[]>({
    queryKey: ['pharmacy-complaints', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      try {
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .eq('filed_by', profile.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching pharmacy complaints:', error)
          return []
        }
        return (data || []) as Complaint[]
      } catch (err) {
        console.error('Fetch pharmacy complaints error:', err)
        return []
      }
    },
    enabled: !!profile?.id,
  })

  // 3. Fetch recent store orders for optional linking
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['pharmacy-orders-ref', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy?.id) return []
      const { data } = await supabase
        .from('orders')
        .select('id, created_at, status')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .limit(15)
      return (data || []) as Order[]
    },
    enabled: !!pharmacy?.id,
  })

  // Submit Complaint Mutation
  const createComplaintMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('You must be signed in to submit a ticket.')
      if (!subject.trim()) throw new Error('Please enter a brief subject.')
      if (!description.trim()) throw new Error('Please provide details about the issue.')

      const fullSubject = `[Pharmacy: ${pharmacy?.name || 'Store'}] [${category}] ${subject.trim()}`

      const { data, error } = await supabase
        .from('complaints')
        .insert({
          filed_by: profile.id,
          subject: fullSubject,
          description: description.trim(),
          against_pharmacy: pharmacy?.id || null,
          against_order: againstOrder ? againstOrder : null,
          status: 'open',
          admin_note: null,
        })
        .select()
        .single()

      if (error) throw error

      // Notify platform administrator of new pharmacy ticket
      try {
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
        if (admins && admins.length > 0) {
          sendAppNotification({
            userId: admins.map((a) => a.id),
            type: 'complaint_update',
            title: 'New Pharmacy Support Ticket',
            body: `${pharmacy?.name || 'A pharmacy store'} submitted: "${fullSubject}".`,
            referenceId: data.id,
          })
        }
      } catch (notifErr) {
        console.warn('Could not dispatch complaint alert to admin:', notifErr)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-complaints', profile?.id] })
      toast.success('Your support ticket has been sent to the Platform Administration team.')
      // Reset form
      setSubject('')
      setDescription('')
      setAgainstOrder('')
      setIsModalOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to submit complaint. Please try again.')
    },
  })

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'open') return c.status === 'open' || c.status === 'under_review'
    if (statusFilter === 'resolved') return c.status === 'resolved' || c.status === 'dismissed'
    return true
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support & Complaints"
        description="Facing technical glitches with the site, inventory errors, or billing questions? File a ticket to notify the admin team."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-xs">
            <Plus className="w-4 h-4" />
            Submit Support Ticket
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5EAF0] dark:border-[#30363D] pb-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            statusFilter === 'all'
              ? 'bg-[#2457A7] text-white'
              : 'text-[#667085] dark:text-[#8B949E] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D]'
          }`}
        >
          All Tickets ({complaints.length})
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            statusFilter === 'open'
              ? 'bg-[#2457A7] text-white'
              : 'text-[#667085] dark:text-[#8B949E] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D]'
          }`}
        >
          Open / Under Review ({complaints.filter((c) => c.status === 'open' || c.status === 'under_review').length})
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            statusFilter === 'resolved'
              ? 'bg-[#2457A7] text-white'
              : 'text-[#667085] dark:text-[#8B949E] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D]'
          }`}
        >
          Resolved ({complaints.filter((c) => c.status === 'resolved' || c.status === 'dismissed').length})
        </button>
      </div>

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title={statusFilter === 'all' ? 'No support tickets filed' : 'No tickets matching this filter'}
          description={
            statusFilter === 'all'
              ? 'If you ever encounter errors with inventory updates, bill generations, or platform operations, reach out to the admin team here.'
              : 'There are currently no tickets matching your selected filter.'
          }
          action={
            statusFilter === 'all' ? (
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Submit Your First Ticket
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((item) => {
            const isUnderReview = item.status === 'under_review'

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl p-5 shadow-xs hover:border-[#CBD5E1] dark:hover:border-[#484F58] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-semibold text-[#182230] dark:text-[#F0F6FC]">
                        {item.subject}
                      </h3>
                      <StatusBadge status={item.status} />
                    </div>

                    <p className="text-xs text-[#667085] dark:text-[#8B949E]">
                      Submitted on {formatDate(item.created_at)}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedComplaint(item)}
                    className="self-start text-xs"
                  >
                    View Details
                  </Button>
                </div>

                {item.description && (
                  <p className="mt-3 text-xs sm:text-sm text-[#475467] dark:text-[#8B949E] bg-[#F8FAFC] dark:bg-[#0D1117] p-3 rounded-lg border border-[#E5EAF0] dark:border-[#30363D] whitespace-pre-wrap">
                    {item.description}
                  </p>
                )}

                {/* Admin Note / Resolution Box */}
                {item.admin_note ? (
                  <div className="mt-4 p-3.5 rounded-lg bg-[#EFF8FF] dark:bg-[#0C2D6B]/30 border border-[#B2DDFF] dark:border-[#1D4ED8]/40">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#175CD3] dark:text-[#58A6FF] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-[#175CD3] dark:text-[#58A6FF]">
                          Administrator Resolution &amp; Feedback
                        </p>
                        <p className="text-xs text-[#1D2939] dark:text-[#F0F6FC] leading-relaxed">
                          {item.admin_note}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isUnderReview ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#B54708] dark:text-[#F79009] bg-[#FFFAEB] dark:bg-[#7A2E0E]/20 p-2.5 rounded-lg border border-[#FEDF89] dark:border-[#B54708]/30">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>The administration team is currently reviewing your ticket. Updates will appear here.</span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#667085] dark:text-[#8B949E]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Ticket received. Awaiting admin review.</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* File Complaint Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Pharmacy Support Ticket"
        description="Notify platform administrators regarding site bugs, inventory glitches, payouts, or order disputes."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={createComplaintMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => createComplaintMutation.mutate()}
              isLoading={createComplaintMutation.isPending}
              className="gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Ticket
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {/* Category */}
          <Select
            label="Issue Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={PHARMACY_CATEGORIES}
            required
          />

          {/* Subject */}
          <Input
            label="Subject"
            placeholder="e.g., Medicine inventory bulk import failing with network error"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          {/* Optional Order Reference */}
          {orders.length > 0 && (
            <Select
              label="Related Order / Request (Optional)"
              value={againstOrder}
              onChange={(e) => setAgainstOrder(e.target.value)}
              placeholder="Select an order if this ticket is order-specific"
              options={orders.map((o) => ({
                value: o.id,
                label: `Order #${o.id.slice(0, 8).toUpperCase()} (${formatDate(o.created_at)}) - ${o.status}`,
              }))}
            />
          )}

          {/* Detailed Description */}
          <Textarea
            label="Detailed Description"
            placeholder="Explain the problem in detail. Include any error messages, medicines affected, customer details, or screenshots context..."
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            hint="Our technical support team will review this and respond with a resolution note."
          />
        </div>
      </Modal>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title="Ticket Details"
          size="md"
          footer={
            <Button variant="outline" onClick={() => setSelectedComplaint(null)} className="w-full">
              Close
            </Button>
          }
        >
          <div className="space-y-4 py-2 text-sm">
            <div>
              <p className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Subject</p>
              <p className="font-medium text-[#182230] dark:text-[#F0F6FC] mt-0.5">{selectedComplaint.subject}</p>
            </div>

            <div className="flex gap-4">
              <div>
                <p className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedComplaint.status} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Submitted</p>
                <p className="text-xs text-[#182230] dark:text-[#F0F6FC] mt-1.5">{formatDate(selectedComplaint.created_at)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Description</p>
              <p className="mt-1 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0D1117] border border-[#E5EAF0] dark:border-[#30363D] text-xs text-[#344054] dark:text-[#8B949E] whitespace-pre-wrap leading-relaxed">
                {selectedComplaint.description || 'No description provided.'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Admin Resolution Response</p>
              {selectedComplaint.admin_note ? (
                <div className="mt-1 p-3 rounded-lg bg-[#EFF8FF] dark:bg-[#0C2D6B]/30 border border-[#B2DDFF] dark:border-[#1D4ED8]/40 text-xs text-[#175CD3] dark:text-[#58A6FF] leading-relaxed">
                  {selectedComplaint.admin_note}
                </div>
              ) : (
                <p className="mt-1 text-xs text-[#667085] dark:text-[#8B949E] italic">
                  No response posted yet. The administrator is currently investigating this ticket.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

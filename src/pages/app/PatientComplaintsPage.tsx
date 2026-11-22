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
import toast from 'react-hot-toast'
import type { Complaint, Order, Pharmacy } from '@/types/database'

const COMPLAINT_CATEGORIES = [
  { value: 'Website / Technical Bug', label: 'Website / Technical Bug (Page error, button not working, etc.)' },
  { value: 'Pharmacy Service', label: 'Pharmacy Service (Wrong medicine, rude staff, delayed dispatch)' },
  { value: 'Order & Prescription', label: 'Order & Prescription (Order rejected, missing item, wrong dose)' },
  { value: 'Billing & Payment', label: 'Billing & Payment (Incorrect invoice, refund issue)' },
  { value: 'General Feedback', label: 'General Feedback / Other Concern' },
]

export function PatientComplaintsPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all')

  // Form State
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0].value)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [againstPharmacy, setAgainstPharmacy] = useState('')
  const [againstOrder, setAgainstOrder] = useState('')

  // 1. Fetch complaints filed by this patient
  const { data: complaints = [], isLoading } = useQuery<Complaint[]>({
    queryKey: ['patient-complaints', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      try {
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .eq('filed_by', profile.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching complaints:', error)
          return []
        }
        return (data || []) as Complaint[]
      } catch (err) {
        console.error('Fetch complaints error:', err)
        return []
      }
    },
    enabled: !!profile?.id,
  })

  // 2. Fetch patient's past orders for optional reference
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['patient-orders-ref', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase
        .from('orders')
        .select('id, created_at, status')
        .eq('patient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(15)
      return (data || []) as Order[]
    },
    enabled: !!profile?.id,
  })

  // 3. Fetch pharmacies for optional reference
  const { data: pharmacies = [] } = useQuery<Pharmacy[]>({
    queryKey: ['pharmacies-ref'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pharmacies')
        .select('id, name, city')
        .order('name')
      return (data || []) as Pharmacy[]
    },
  })

  // Submit Complaint Mutation
  const createComplaintMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('You must be signed in to submit a complaint.')
      if (!subject.trim()) throw new Error('Please enter a brief subject for your complaint.')
      if (!description.trim()) throw new Error('Please provide details about the problem you encountered.')

      const fullSubject = `[${category}] ${subject.trim()}`

      const { data, error } = await supabase
        .from('complaints')
        .insert({
          filed_by: profile.id,
          subject: fullSubject,
          description: description.trim(),
          against_pharmacy: againstPharmacy ? againstPharmacy : null,
          against_order: againstOrder ? againstOrder : null,
          status: 'open',
          admin_note: null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-complaints', profile?.id] })
      toast.success('Your complaint has been submitted. Our admin team will investigate and respond shortly.')
      // Reset form
      setSubject('')
      setDescription('')
      setAgainstPharmacy('')
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
        title="Help & Complaints"
        description="Facing any issue with the website, orders, or a pharmacy? File a complaint and track admin resolution here."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-xs">
            <Plus className="w-4 h-4" />
            File a Complaint
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
          All Complaints ({complaints.length})
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            statusFilter === 'open'
              ? 'bg-[#2457A7] text-white'
              : 'text-[#667085] dark:text-[#8B949E] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D]'
          }`}
        >
          Active / In Review ({complaints.filter((c) => c.status === 'open' || c.status === 'under_review').length})
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
          title={statusFilter === 'all' ? 'No complaints filed yet' : 'No complaints in this category'}
          description={
            statusFilter === 'all'
              ? "If you ever encounter technical issues with our website, order delivery problems, or service disputes, let us know and we'll resolve it."
              : 'There are currently no complaints matching your selected filter.'
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
                          Admin Resolution &amp; Notes
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
                    <span>Our administration team is currently reviewing your ticket. We will post a resolution note here.</span>
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
        title="File a Site or Service Complaint"
        description="Describe any glitch, issue with the website, order delivery, or pharmacy service. Our admin team will investigate."
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
            label="What is this complaint regarding?"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={COMPLAINT_CATEGORIES}
            required
          />

          {/* Subject */}
          <Input
            label="Subject"
            placeholder="e.g., Cannot view bill invoice on orders page"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          {/* Optional Order Reference */}
          {orders.length > 0 && (
            <Select
              label="Related Order (Optional)"
              value={againstOrder}
              onChange={(e) => setAgainstOrder(e.target.value)}
              placeholder="Select an order if this is order-related"
              options={orders.map((o) => ({
                value: o.id,
                label: `Order #${o.id.slice(0, 8).toUpperCase()} (${formatDate(o.created_at)}) - ${o.status}`,
              }))}
            />
          )}

          {/* Optional Pharmacy Reference */}
          {pharmacies.length > 0 && (
            <Select
              label="Related Pharmacy (Optional)"
              value={againstPharmacy}
              onChange={(e) => setAgainstPharmacy(e.target.value)}
              placeholder="Select a pharmacy if this is regarding a specific store"
              options={pharmacies.map((p) => ({
                value: p.id,
                label: `${p.name}${p.city ? ` (${p.city})` : ''}`,
              }))}
            />
          )}

          {/* Detailed Description */}
          <Textarea
            label="Detailed Description"
            placeholder="Please explain what happened, any error messages you saw, steps to reproduce, or what resolution you expect..."
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            hint="Be as detailed as possible to help our admin team resolve your issue quickly."
          />
        </div>
      </Modal>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title="Complaint Details"
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
              <p className="text-xs font-semibold text-[#667085] dark:text-[#8B949E] uppercase">Your Description</p>
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

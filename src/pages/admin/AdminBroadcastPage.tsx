import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Send,
  Users,
  Building2,
  User,
  Megaphone,
  Bell,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { NotificationType } from '@/types/database'

type TargetGenre = 'all' | 'patient' | 'pharmacy_admin' | 'specific_user'

interface BroadcastTemplate {
  label: string
  title: string
  body: string
  type: NotificationType
}

const TEMPLATES: BroadcastTemplate[] = [
  {
    label: 'Scheduled Maintenance',
    title: 'Platform Maintenance Notice',
    body: 'MediConnect will undergo scheduled maintenance tonight at 11:30 PM for 30 minutes. Order tracking and refills will resume normally afterwards.',
    type: 'system_alert',
  },
  {
    label: 'New Features Update',
    title: 'New MediConnect Features Available!',
    body: 'We have updated MediConnect with instant real-time order notifications, downloadable PWA support, and unique bill verification.',
    type: 'broadcast',
  },
  {
    label: 'Monsoon / Delivery Delay',
    title: 'Weather & Delivery Update',
    body: 'Due to severe weather conditions in certain areas, medicine dispatch and delivery may experience minor delays. Your pharmacy is actively expediting orders.',
    type: 'order_update',
  },
  {
    label: 'Monthly Refill Reminder',
    title: 'Time for your Monthly Refill?',
    body: 'Review your ongoing medicines on MediConnect and send a refill request to your favorite local pharmacy with just one tap.',
    type: 'low_stock',
  },
]

export function AdminBroadcastPage() {
  const queryClient = useQueryClient()

  // Form State
  const [targetGenre, setTargetGenre] = useState<TargetGenre>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [userSearch, setUserSearch] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [body, setBody] = useState<string>('')
  const [notifType, setNotifType] = useState<NotificationType>('broadcast')
  const [showConfirm, setShowConfirm] = useState<boolean>(false)

  // 1. Fetch audience stats
  const { data: audienceStats = { total: 0, patients: 0, pharmacies: 0, usersList: [] } } = useQuery({
    queryKey: ['admin-broadcast-audience'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, phone, city')
          .order('full_name', { ascending: true })

        if (error || !data) return { total: 0, patients: 0, pharmacies: 0, usersList: [] }

        const patients = data.filter((p) => p.role === 'patient')
        const pharmacies = data.filter((p) => p.role === 'pharmacy_admin')

        return {
          total: data.length,
          patients: patients.length,
          pharmacies: pharmacies.length,
          usersList: data,
        }
      } catch {
        return { total: 0, patients: 0, pharmacies: 0, usersList: [] }
      }
    },
  })

  // 2. Fetch recent broadcast history
  const { data: recentBroadcasts = [], isLoading: historyLoading } = useQuery({
    queryKey: ['admin-broadcast-history'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, body, type, created_at, user_id')
          .in('type', ['broadcast', 'system_alert'])
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) return []
        return data || []
      } catch {
        return []
      }
    },
  })

  // Recipient Count Calculator
  const getRecipientCount = () => {
    switch (targetGenre) {
      case 'all':
        return audienceStats.total
      case 'patient':
        return audienceStats.patients
      case 'pharmacy_admin':
        return audienceStats.pharmacies
      case 'specific_user':
        return selectedUserId ? 1 : 0
    }
  }

  // Filtered users for individual selection
  const filteredUsers = audienceStats.usersList.filter((u: any) => {
    if (!userSearch.trim()) return true
    const q = userSearch.toLowerCase()
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    )
  })

  // Broadcast Mutation
  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/broadcast-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetGenre,
          userId: targetGenre === 'specific_user' ? selectedUserId : undefined,
          title: title.trim(),
          body: body.trim(),
          type: notifType,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch broadcast notification')
      }
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-broadcast-history'] })
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success(data.message || `Broadcast sent to ${data.recipientCount} recipient(s)!`)
      setShowConfirm(false)
      setTitle('')
      setBody('')
      setSelectedUserId('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error broadcasting notification')
      setShowConfirm(false)
    },
  })

  const handleApplyTemplate = (tmpl: BroadcastTemplate) => {
    setTitle(tmpl.title)
    setBody(tmpl.body)
    setNotifType(tmpl.type)
  }

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Please enter a notification title')
      return
    }
    if (!body.trim()) {
      toast.error('Please enter a notification message body')
      return
    }
    if (targetGenre === 'specific_user' && !selectedUserId) {
      toast.error('Please select a specific recipient')
      return
    }
    setShowConfirm(true)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Broadcast & Real-Time Push Notifications"
        description="Dispatch real-time in-app alerts, audio chimes, and native system push notifications to patients, pharmacies, or individual accounts across the platform."
      />

      {/* Target Genre Audience Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setTargetGenre('all')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            targetGenre === 'all'
              ? 'border-[#2457A7] bg-[#EEF4FC] dark:bg-[#2457A7]/20 ring-2 ring-[#2457A7]/20'
              : 'border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#161B22] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-[#2457A7] dark:text-[#58A6FF]" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {audienceStats.total}
            </span>
          </div>
          <p className="font-semibold text-xs mt-2 text-[#182230] dark:text-[#F0F6FC]">All Users</p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B949E]">Patients &amp; Stores</p>
        </button>

        <button
          type="button"
          onClick={() => setTargetGenre('patient')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            targetGenre === 'patient'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
              : 'border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#161B22] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              {audienceStats.patients}
            </span>
          </div>
          <p className="font-semibold text-xs mt-2 text-[#182230] dark:text-[#F0F6FC]">Patients Only</p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B949E]">All registered patients</p>
        </button>

        <button
          type="button"
          onClick={() => setTargetGenre('pharmacy_admin')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            targetGenre === 'pharmacy_admin'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 ring-2 ring-purple-500/20'
              : 'border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#161B22] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
              {audienceStats.pharmacies}
            </span>
          </div>
          <p className="font-semibold text-xs mt-2 text-[#182230] dark:text-[#F0F6FC]">Pharmacies Only</p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B949E]">All pharmacy stores</p>
        </button>

        <button
          type="button"
          onClick={() => setTargetGenre('specific_user')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            targetGenre === 'specific_user'
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
              : 'border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#161B22] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              1-on-1
            </span>
          </div>
          <p className="font-semibold text-xs mt-2 text-[#182230] dark:text-[#F0F6FC]">Specific User</p>
          <p className="text-[11px] text-[#667085] dark:text-[#8B949E]">Direct push target</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Quick Templates */}
        <div className="lg:col-span-2 space-y-4">
          <form
            onSubmit={handleInitiateSend}
            className="p-5 bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E5EAF0] dark:border-[#30363D] pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#2457A7] dark:text-[#58A6FF]" />
                <h3 className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC]">Compose Message</h3>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Audience: <strong className="text-primary-600 dark:text-primary-400">{getRecipientCount()} recipient(s)</strong>
              </span>
            </div>

            {/* In Specific User Mode: Searchable Recipient Picker */}
            {targetGenre === 'specific_user' && (
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-[#0D1117] border border-border dark:border-[#30363D] rounded-lg">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                  Select Specific Recipient
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or role…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22]"
                  />
                </div>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded border border-border dark:border-[#30363D] bg-white dark:bg-[#161B22] text-slate-800 dark:text-[#F0F6FC]"
                >
                  <option value="">— Select Recipient ({filteredUsers.length} available) —</option>
                  {filteredUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role === 'pharmacy_admin' ? 'Pharmacy' : u.role === 'admin' ? 'Admin' : 'Patient'}{u.phone ? ` · ${u.phone}` : ''})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notification Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC]">
                Notification Type &amp; Category
              </label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value as NotificationType)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] focus:outline-none focus:border-[#2457A7]"
              >
                <option value="broadcast">📢 General Announcement / News</option>
                <option value="system_alert">⚠️ System Alert / Critical Maintenance</option>
                <option value="order_update">📦 Order &amp; Logistics Update</option>
                <option value="low_stock">💊 Medication &amp; Refill Reminder</option>
              </select>
            </div>

            {/* Notification Title */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC]">Notification Title</label>
                <span className="text-[10px] text-slate-400">{title.length}/60 chars</span>
              </div>
              <input
                type="text"
                placeholder="e.g., Important Platform Update, Holiday Hours, Maintenance"
                value={title}
                maxLength={60}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-9 px-3 text-xs sm:text-sm rounded-lg border border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] focus:outline-none focus:border-[#2457A7]"
              />
            </div>

            {/* Notification Body */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC]">Message Details (Body)</label>
                <span className="text-[10px] text-slate-400">{body.length}/300 chars</span>
              </div>
              <textarea
                rows={3}
                placeholder="Write the message that users will see in their popups and notification drawers..."
                value={body}
                maxLength={300}
                onChange={(e) => setBody(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm rounded-lg border border-[#E5EAF0] dark:border-[#30363D] bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] focus:outline-none focus:border-[#2457A7]"
              />
            </div>

            {/* Quick Templates */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Quick Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Send Button */}
            <div className="pt-2 flex items-center justify-between border-t border-[#E5EAF0] dark:border-[#30363D]">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Pushes instant popups + audio chime to all target users online
              </span>
              <Button type="submit" isLoading={broadcastMutation.isPending} className="gap-2">
                <Send className="w-3.5 h-3.5" />
                Push Realtime Notification
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 pb-2 border-b border-[#E5EAF0] dark:border-[#30363D]">
              <Bell className="w-4 h-4 text-primary-600" />
              Live Real-Time Toast Preview
            </div>

            {/* Simulated In-App Popup */}
            <div className="p-3 bg-[#F8FAFC] dark:bg-[#0D1117] rounded-lg border border-[#CBDDF4] dark:border-[#30363D] shadow-sm space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#182230] dark:text-[#F0F6FC] truncate">
                      {title.trim() || 'Notification Title Preview'}
                    </p>
                    <span className="text-[10px] text-slate-400">Just now</span>
                  </div>
                  <p className="text-[11px] text-[#667085] dark:text-[#8B949E] mt-0.5 leading-relaxed">
                    {body.trim() || 'Notification body text will appear here exactly as recipients will read it in their in-app banner.'}
                  </p>
                  <span className="text-[10px] text-primary-600 dark:text-primary-400 font-medium mt-1 inline-block">
                    Click to view details →
                  </span>
                </div>
              </div>
            </div>

            {/* Target Summary Details */}
            <div className="text-[11px] space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
              <p>
                <strong className="text-slate-700 dark:text-slate-300">Target Role: </strong>
                {targetGenre === 'all'
                  ? 'All Platform Users'
                  : targetGenre === 'patient'
                  ? 'Patients Only'
                  : targetGenre === 'pharmacy_admin'
                  ? 'Pharmacies Only'
                  : 'Individual User'}
              </p>
              <p>
                <strong className="text-slate-700 dark:text-slate-300">Category: </strong>
                {notifType}
              </p>
              <p>
                <strong className="text-slate-700 dark:text-slate-300">Sound: </strong>
                Two-tone chime plays automatically on arrival
              </p>
            </div>
          </div>

          {/* Recent Broadcast Audit Card */}
          <div className="p-4 bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 pb-2 border-b border-[#E5EAF0] dark:border-[#30363D]">
              <Clock className="w-4 h-4 text-slate-400" />
              Recent Broadcast History
            </div>
            {historyLoading ? (
              <p className="text-xs text-slate-400 py-2">Loading recent broadcasts…</p>
            ) : recentBroadcasts.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No previous broadcast records logged.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {recentBroadcasts.map((b: any) => (
                  <div key={b.id} className="py-2 space-y-0.5 first:pt-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{b.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{b.body}</p>
                    <span className="text-[10px] text-slate-400">{formatDate(b.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Before Bulk Blast */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => broadcastMutation.mutate()}
        title="Confirm Notification Broadcast"
        description={`Are you sure you want to broadcast "${title}" to ${getRecipientCount()} recipient(s) in the ${targetGenre === 'all' ? 'All Users' : targetGenre === 'patient' ? 'Patients' : targetGenre === 'pharmacy_admin' ? 'Pharmacies' : 'selected recipient'} category? An instant real-time popup and sound alert will be triggered.`}
        confirmLabel="Broadcast Now"
        variant="primary"
        isLoading={broadcastMutation.isPending}
      />
    </div>
  )
}

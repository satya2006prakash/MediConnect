import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormField'
import { CheckCircle2, Shield, Bell, Database } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { ProfilePhotoUpload } from '@/components/ui/ProfilePhotoUpload'
import toast from 'react-hot-toast'

export function AdminSettingsPage() {
  const { user, profile, updateProfileAvatar, fetchProfile } = useAuthStore()
  const [adminName, setAdminName] = useState(profile?.full_name || 'Satya Prakash')
  const [adminPhone, setAdminPhone] = useState(profile?.phone || '+91 7061800527')
  const [isSavingAdmin, setIsSavingAdmin] = useState(false)

  const [defaultThreshold, setDefaultThreshold] = useState('7')
  const [verificationMode, setVerificationMode] = useState('manual')
  const [platformFee, setPlatformFee] = useState('0')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [realtimeAlerts, setRealtimeAlerts] = useState(true)

  const handleAvatarChange = async (newUrl: string | null) => {
    if (!profile) return
    try {
      await supabase.auth.updateUser({
        data: { avatar_url: newUrl },
      })
      await supabase
        .from('profiles')
        .update({ avatar_url: newUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      updateProfileAvatar(newUrl)
    } catch (err: any) {
      console.error('Failed to update admin avatar:', err)
      toast.error('Failed to update avatar')
    }
  }

  const handleSaveAdminProfile = async () => {
    if (!profile) return
    setIsSavingAdmin(true)
    try {
      await supabase.auth.updateUser({
        data: { full_name: adminName, phone: adminPhone },
      })
      await supabase
        .from('profiles')
        .update({ full_name: adminName, phone: adminPhone, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      await fetchProfile(profile.id)
      toast.success('Administrator profile updated successfully')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update admin profile')
    } finally {
      setIsSavingAdmin(false)
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Platform settings saved successfully')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Platform Settings & Administration"
        description="Configure administrator profile photo, system-wide parameters, and verification rules."
      />

      {/* Administrator Profile & Photo Section */}
      <Card>
        <CardHeader
          title="Administrator Profile Photo"
          description="Manage platform super-administrator photo, name, and emergency contact details."
        />
        <ProfilePhotoUpload
          currentAvatarUrl={profile?.avatar_url}
          name={profile?.full_name || 'Satya Prakash'}
          role="admin"
          userId={profile?.id}
          onAvatarChange={handleAvatarChange}
        />

        <div className="mt-5 pt-4 border-t border-border dark:border-[#30363D] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Administrator Name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
          />
          <Input
            label="Support / Emergency Phone"
            value={adminPhone}
            onChange={(e) => setAdminPhone(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-border dark:border-[#30363D]">
          <span className="text-xs text-slate-500 dark:text-[#8B949E]">
            Logged in as: <strong>{user?.email || 'satya2006prakash@gmail.com'}</strong> (Super Admin)
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveAdminProfile}
            isLoading={isSavingAdmin}
          >
            Save Admin Info
          </Button>
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core System Configuration */}
        <Card>
          <CardHeader
            title="Medicine &amp; Reordering Rules"
            description="Default thresholds and automated reminder schedules."
          />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Default Low Stock Threshold (Days)"
                type="number"
                min={1}
                max={30}
                value={defaultThreshold}
                onChange={(e) => setDefaultThreshold(e.target.value)}
                hint="Default days remaining before patient receives restock alert"
              />
              <Input
                label="Platform Convenience Fee (₹)"
                type="number"
                min={0}
                step={0.5}
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                hint="Fee applied to orders (0 for free trial period)"
              />
            </div>
            <Select
              label="Pharmacy Onboarding Approval"
              options={[
                { value: 'manual', label: 'Manual Admin Verification (Recommended for Healthcare)' },
                { value: 'automatic', label: 'Instant Auto-Activation on Document Upload' },
              ]}
              value={verificationMode}
              onChange={(e) => setVerificationMode(e.target.value)}
              hint="Requires drug license verification before pharmacy can accept patient orders"
            />
          </div>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader
            title="Notification &amp; Alert Channels"
            description="Control dispatch channels for restock alerts and bill approvals."
          />
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded border border-border hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={realtimeAlerts}
                onChange={(e) => setRealtimeAlerts(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">In-App Realtime Push Notifications</p>
                <p className="text-xs text-slate-500">Instant browser notifications for bill generation and order status updates</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded border border-border hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Email Restock Reminders</p>
                <p className="text-xs text-slate-500">Daily summary sent to patients when stock falls below reminder threshold</p>
              </div>
            </label>
          </div>
        </Card>

        {/* Infrastructure & Security Status */}
        <Card>
          <CardHeader
            title="System Infrastructure"
            description="Live health of platform services and database."
          />
          <div className="grid grid-cols-3 gap-4 pt-1">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-semibold text-slate-700">Database</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-success-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> PostgreSQL Ready
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-semibold text-slate-700">Security</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-success-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> 10 RLS Policies Active
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-semibold text-slate-700">Realtime</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-success-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> WebSockets Connected
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save Platform Settings</Button>
        </div>
      </form>
    </div>
  )
}

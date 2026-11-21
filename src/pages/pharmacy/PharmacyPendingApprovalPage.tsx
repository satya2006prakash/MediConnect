import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, CheckCircle2, RefreshCw, LogOut, ShieldAlert, Store, FileText } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Pharmacy } from '@/types/database'

export function PharmacyPendingApprovalPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null)
  const [checking, setChecking] = useState(false)

  const checkStatus = async (showToast = true) => {
    if (!profile) return
    setChecking(true)

    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('owner_id', profile.id)
        .single()

      if (error) {
        console.error('Check pharmacy error:', error)
      } else if (data) {
        setPharmacy(data as Pharmacy)
        if (data.status === 'verified') {
          if (showToast) toast.success('Your pharmacy has been approved! Redirecting to dashboard...')
          navigate('/pharmacy/dashboard', { replace: true })
          return
        }
      }
      if (showToast) toast('Status checked: Still under review.', { icon: '⏳' })
    } catch (err: any) {
      console.error(err)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkStatus(false)
  }, [profile?.id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const isSuspended = pharmacy?.status === 'suspended'

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle size="sm" />
      </div>
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="flex justify-center mb-6">
          <Logo size="lg" to="/" />
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl shadow-xs overflow-hidden">
          {/* Status Banner */}
          <div className={isSuspended ? 'bg-[#FDF2F2] dark:bg-[#D64545]/15 border-b border-[#F8D7D7] dark:border-[#D64545]/30 p-6 text-center' : 'bg-[#FFF9F0] dark:bg-[#D99122]/15 border-b border-[#FEE7C8] dark:border-[#D99122]/30 p-6 text-center'}>
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center bg-white dark:bg-[#161B22] shadow-xs">
              {isSuspended ? (
                <ShieldAlert className="w-7 h-7 text-[#D64545]" />
              ) : (
                <Clock className="w-7 h-7 text-[#D99122] animate-pulse" />
              )}
            </div>
            <h1 className="text-xl font-semibold text-[#182230] dark:text-[#F0F6FC]">
              {isSuspended ? 'Pharmacy Account Suspended' : 'Registration Under Administrative Review'}
            </h1>
            <p className="text-sm text-[#667085] dark:text-[#8B949E] mt-1.5 max-w-md mx-auto">
              {isSuspended
                ? 'Your pharmacy license has been suspended by the platform administrator. Please contact support.'
                : 'Your pharmacy application has been received and is awaiting compliance verification by the MediConnect Administration.'}
            </p>
          </div>

          {/* Application Summary */}
          <div className="p-6 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-[#8B949E]">
              Application Details
            </div>

            <div className="bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-[#E5EAF0] dark:border-[#30363D] p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#667085] dark:text-[#8B949E] flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#159A91]" />
                  Pharmacy Name
                </span>
                <span className="font-semibold text-[#182230] dark:text-[#F0F6FC]">
                  {pharmacy?.name || profile?.full_name || 'Registered Pharmacy'}
                </span>
              </div>

              {pharmacy?.license_number && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#667085] dark:text-[#8B949E] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2457A7]" />
                    Drug License No.
                  </span>
                  <span className="font-mono text-xs font-medium text-[#182230] dark:text-[#F0F6FC] bg-white dark:bg-[#161B22] px-2 py-0.5 rounded border border-[#E5EAF0] dark:border-[#30363D]">
                    {pharmacy.license_number}
                  </span>
                </div>
              )}

              {pharmacy?.city && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#667085] dark:text-[#8B949E]">Operating City</span>
                  <span className="text-[#182230] dark:text-[#F0F6FC]">{pharmacy.city}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-2 border-t border-[#E5EAF0] dark:border-[#30363D]">
                <span className="text-[#667085] dark:text-[#8B949E]">Current Status</span>
                <StatusBadge status={pharmacy?.status || 'pending'} />
              </div>
            </div>

            <div className="bg-[#F0F5FA] dark:bg-[#2457A7]/15 rounded-lg p-3.5 text-xs text-[#2457A7] dark:text-[#58A6FF] border border-[#CBDDF4] dark:border-[#2457A7]/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Next Step:</strong> As soon as the administrator verifies your drug license, you will receive an approval email notification and can access your inventory and refill queue.
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                className="flex-1"
                isLoading={checking}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => checkStatus(true)}
              >
                Check Approval Status
              </Button>
              <Button
                variant="outline"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-[#667085] dark:text-[#8B949E]">
          Need immediate assistance? Contact{' '}
          <a href="mailto:satya2006prakash@gmail.com" className="text-[#2457A7] dark:text-[#58A6FF] font-medium hover:underline">
            Platform Administration
          </a>
        </div>
      </div>
    </div>
  )
}

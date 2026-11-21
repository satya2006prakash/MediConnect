import { useNavigate } from 'react-router-dom'
import { AlertTriangle, LogIn, ArrowLeft, ShieldAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export interface EmailAlreadyRegisteredModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  existingRole?: 'patient' | 'pharmacy_admin' | 'admin' | string | null
  attemptedRole: 'patient' | 'pharmacy_admin'
  onUseDifferentEmail?: () => void
}

export function EmailAlreadyRegisteredModal({
  isOpen,
  onClose,
  email,
  existingRole,
  attemptedRole,
  onUseDifferentEmail,
}: EmailAlreadyRegisteredModalProps) {
  const navigate = useNavigate()

  const handleGoToLogin = () => {
    onClose()
    navigate(`/login?email=${encodeURIComponent(email)}`)
  }

  const handleDifferentEmail = () => {
    onClose()
    if (onUseDifferentEmail) {
      onUseDifferentEmail()
    }
  }

  const roleLabel = (role?: string | null) => {
    if (role === 'patient') return 'Patient'
    if (role === 'pharmacy_admin') return 'Pharmacy'
    if (role === 'admin') return 'Platform Administrator'
    return 'Registered User'
  }

  const isCrossRole = existingRole && existingRole !== attemptedRole
  const isSameRole = existingRole && existingRole === attemptedRole
  const isAdmin = existingRole === 'admin'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 text-[#182230]">
          <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            {isAdmin ? (
              <ShieldAlert className="w-5 h-5 text-red-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <span>Email Already Registered</span>
        </div>
      }
      size="md"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto text-slate-700"
            onClick={handleDifferentEmail}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Use Different Email
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto bg-[#16865B] hover:bg-[#117C75] text-white"
            onClick={handleGoToLogin}
          >
            <LogIn className="w-4 h-4 mr-1.5" />
            Sign In With This Email
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-sm text-slate-600">
        <p>
          The email address <strong className="text-slate-900 font-semibold">{email}</strong> is already
          registered on the <span className="font-medium text-[#16865B]">MediConnect</span> platform.
        </p>

        {isAdmin ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-xs text-red-900 leading-relaxed">
            <strong className="block font-semibold mb-1 text-red-800">
              Reserved Administrative Account
            </strong>
            This email is strictly reserved for MediConnect Platform Administration and cannot be
            registered as a regular patient or pharmacy account.
          </div>
        ) : isCrossRole ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 leading-relaxed space-y-1.5">
            <strong className="block font-semibold text-amber-800">
              Cross-Role Restriction Active
            </strong>
            <p>
              This email is currently associated with a{' '}
              <span className="font-semibold uppercase tracking-wide text-amber-950">
                {roleLabel(existingRole)}
              </span>{' '}
              account.
            </p>
            <p className="text-amber-800">
              On MediConnect, an email address can only belong to a single account type. A Patient
              email cannot be re-used to register a Pharmacy, and a Pharmacy email cannot be re-used
              to register a Patient.
            </p>
          </div>
        ) : isSameRole ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-900 leading-relaxed">
            <strong className="block font-semibold mb-1 text-emerald-800">
              Account Already Exists
            </strong>
            You already have a {roleLabel(existingRole)} account with this email. You do not need to
            register again. Please proceed to sign in with your password.
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 leading-relaxed">
            <strong className="block font-semibold mb-1 text-amber-800">
              Single Account Restriction
            </strong>
            Each email address is uniquely reserved for one account type across the platform. Please
            sign in to your existing account or register using a different email address.
          </div>
        )}

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
          💡 If you have forgotten your password, click{' '}
          <span className="font-semibold text-slate-700">"Sign In With This Email"</span> and select{' '}
          <span className="italic">"Forgot password"</span> to receive a secure password reset link.
        </div>
      </div>
    </Modal>
  )
}

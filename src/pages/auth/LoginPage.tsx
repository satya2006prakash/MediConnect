import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import toast from 'react-hot-toast'
import { PWAInstallButton } from '@/components/ui/PWAInstallButton'
import type { UserRole } from '@/types/database'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

const roleHomes: Record<UserRole, string> = {
  patient: '/app/dashboard',
  pharmacy_admin: '/pharmacy/dashboard',
  admin: '/admin/dashboard',
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, isPasswordRecovery, setUser, setSession, fetchProfile } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  // Keep logged in: If user is already authenticated (and not in recovery mode), redirect them directly to their dashboard
  useEffect(() => {
    if (user && profile && !isPasswordRecovery) {
      const destination = from || roleHomes[profile.role] || '/app/dashboard'
      navigate(destination, { replace: true })
    }
  }, [user, profile, isPasswordRecovery, navigate, from])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const isVerified = params.get('verified') === 'true'
    const isPharmVerified = params.get('pharmacy_verified') === 'true'
    const emailParam = params.get('email')

    if (isVerified) {
      toast.success('Email verified successfully! You can now sign in.', { id: 'email-verified' })
    }
    if (emailParam) {
      setValue('email', emailParam, { shouldValidate: true })
    }

    if (emailParam && (isPharmVerified || isVerified)) {
      fetch('/api/notify-admin-pharmacy-verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      }).catch((e) => console.warn('Could not notify admin of pharmacy verification:', e))
    }
  }, [location.search, setValue])

  const onSubmit = async (data: FormData) => {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        console.error('Supabase sign-in error:', error)
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          toast.error('Unregistered email or incorrect password. Please register below if you are new.')
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          toast.error('Your email has not been confirmed yet. Please check your Gmail for the authentication link.')
        } else {
          toast.error(error.message)
        }
        return
      }

      if (authData.user) {
        setUser(authData.user)
        setSession(authData.session)
        await fetchProfile(authData.user.id)
        const profile = useAuthStore.getState().profile

        if (profile?.role === 'pharmacy_admin') {
          // Trigger admin verification notification if not already dispatched
          fetch('/api/notify-admin-pharmacy-verified', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: authData.user.id, email: authData.user.email }),
          }).catch((e) => console.warn('Could not notify admin:', e))

          // Check if pharmacy is verified
          const { data: pharmacy } = await supabase
            .from('pharmacies')
            .select('status')
            .eq('owner_id', authData.user.id)
            .maybeSingle()

          if (!pharmacy || pharmacy.status !== 'verified') {
            navigate('/pharmacy/pending-approval', { replace: true })
            toast('Pharmacy approval is pending administrative review.', { icon: '⏳' })
            return
          }
        }

        const home = profile ? roleHomes[profile.role] : '/app/dashboard'
        navigate(from ?? home, { replace: true })
        toast.success('Welcome back!')
      }
    } catch (err: any) {
      console.error('Unexpected sign-in error:', err)
      toast.error(err?.message || 'Login failed. Please refresh the page and try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" to="/" />
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-xl shadow-xs p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-[#F0F6FC]">Sign in to your account</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={errors.password?.message}
                required
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-7 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Sign in to Account
            </Button>
          </form>

          {/* Registration Options */}
          <div className="mt-5 pt-4 border-t border-border dark:border-[#30363D] space-y-2.5">
            <div className="bg-[#F7F9FC] dark:bg-[#0D1117] border border-[#E5EAF0] dark:border-[#30363D] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC]">New Patient?</p>
                  <p className="text-[11px] text-[#667085] dark:text-[#8B949E]">Instant access, no approval needed</p>
                </div>
                <Link
                  to="/register/patient"
                  className="px-2.5 py-1 text-xs font-medium rounded bg-[#2457A7] text-white hover:bg-[#1E4888] transition-colors shadow-xs"
                >
                  Register
                </Link>
              </div>
            </div>

            <div className="bg-[#F7F9FC] dark:bg-[#0D1117] border border-[#E5EAF0] dark:border-[#30363D] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#182230] dark:text-[#F0F6FC]">Pharmacy Partner?</p>
                  <p className="text-[11px] text-[#667085] dark:text-[#8B949E]">Registration verified by Admin</p>
                </div>
                <Link
                  to="/register/pharmacy"
                  className="px-2.5 py-1 text-xs font-medium rounded bg-[#159A91] text-white hover:bg-[#117C75] transition-colors shadow-xs"
                >
                  Apply
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Install option at bottom of page */}
        <div className="mt-4">
          <PWAInstallButton variant="compact" />
        </div>

      </div>
    </div>
  )
}

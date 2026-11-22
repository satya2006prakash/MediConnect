import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { checkEmailRegistered } from '@/lib/authHelpers'
import { EmailAlreadyRegisteredModal } from '@/components/auth/EmailAlreadyRegisteredModal'

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(10, 'Enter a valid phone number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export function PatientRegisterPage() {
  const navigate = useNavigate()
  const { setUser, setSession, fetchProfile } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean
    email: string
    existingRole?: string | null
  }>({
    isOpen: false,
    email: '',
    existingRole: null,
  })

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    // 1. Pre-check if email is already registered via RPC
    const check = await checkEmailRegistered(data.email)
    if (check.exists) {
      setDuplicateModal({
        isOpen: true,
        email: data.email,
        existingRole: check.role || null,
      })
      return
    }

    // 2. Primary: Submit through server API handler (bypasses Supabase email confirmation rate limits)
    try {
      const res = await fetch('/api/register-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()

      if (res.ok && result.success) {
        setVerificationEmail(data.email)
        toast.success('Registration successful! Please check your Gmail to verify your account.')
        return
      }

      if (result.error === 'already_registered') {
        setDuplicateModal({
          isOpen: true,
          email: data.email,
          existingRole: result.role || check.role || null,
        })
        return
      }

      if (!res.ok && result.error) {
        toast.error(result.error)
        return
      }
    } catch (apiErr: any) {
      console.warn('API endpoint fallback to client auth:', apiErr.message)
    }

    // 3. Fallback: Direct Client-Side Supabase Sign Up
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone || null,
          role: 'patient',
        },
      },
    })

    // 3. Catch duplicate email response from Supabase Auth
    const isUserAlreadyRegistered =
      Boolean(
        error &&
          (error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already been registered') ||
            error.message.toLowerCase().includes('email exists') ||
            (error as any).code === 'user_already_exists' ||
            (error as any).status === 400)
      ) ||
      Boolean(authData?.user && (!authData.user.identities || authData.user.identities.length === 0))

    if (isUserAlreadyRegistered) {
      setDuplicateModal({
        isOpen: true,
        email: data.email,
        existingRole: check.role || null,
      })
      return
    }

    if (error) {
      toast.error(error.message)
      return
    }

    if (authData.user) {
      // Ensure profile row exists
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        role: 'patient',
        full_name: data.fullName,
        phone: data.phone || null,
      })

      if (authData.session) {
        setUser(authData.user)
        setSession(authData.session)
        await fetchProfile(authData.user.id)
        toast.success('Account created! Welcome to MediConnect.')
        navigate('/app/dashboard', { replace: true })
      } else {
        // Attempt immediate login
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (loginData?.session) {
          setUser(loginData.user)
          setSession(loginData.session)
          await fetchProfile(loginData.user.id)
          toast.success('Welcome to MediConnect!')
          navigate('/app/dashboard', { replace: true })
        } else {
          toast.success('Account created! Please sign in.')
          navigate('/login', { replace: true })
        }
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" to="/" />
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-xl shadow-xs p-6">
          {verificationEmail ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 text-[#2457A7] rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-[#F0F6FC]">
                Check your Gmail inbox
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                We've sent an authentication verification link to <strong className="text-slate-900 dark:text-white">{verificationEmail}</strong>.
              </p>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-500 dark:text-slate-400 text-left space-y-1.5 border border-slate-200 dark:border-slate-700/60">
                <p className="font-semibold text-slate-700 dark:text-slate-200">How to activate your account:</p>
                <p>1. Open your Gmail application or webmail.</p>
                <p>2. Look for the email: <em>"Confirm your MediConnect Account – Verify Your Email"</em>.</p>
                <p>3. Click the <strong>"Verify Email &amp; Activate Account"</strong> button.</p>
              </div>
              <div className="pt-2 space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate(`/login?email=${encodeURIComponent(verificationEmail)}`)}
                >
                  Go to Sign In
                </Button>
                <button
                  type="button"
                  onClick={() => setVerificationEmail(null)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Use a different email address
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-[#F0F6FC]">Create patient account</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Start managing your medicines today</p>
              </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Rahul Sharma"
              error={errors.fullName?.message}
              required
              {...register('fullName')}
            />

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <Input
              label="Phone number"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              hint="Optional — used for SMS alerts"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                hint="At least 8 characters"
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

            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              required
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
              Sign in
            </Link>
          </p>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
            Terms & Conditions
          </Link>{' '}
          and acknowledge our{' '}
          <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <EmailAlreadyRegisteredModal
        isOpen={duplicateModal.isOpen}
        onClose={() => setDuplicateModal((prev) => ({ ...prev, isOpen: false }))}
        email={duplicateModal.email}
        existingRole={duplicateModal.existingRole}
        attemptedRole="patient"
        onUseDifferentEmail={() => {
          setFocus('email')
        }}
      />
    </div>
  )
}

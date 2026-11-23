import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import toast from 'react-hot-toast'

import { useAuthStore } from '@/stores/authStore'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)
  const { setPasswordRecovery, reset } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    // Explicitly enforce password recovery mode while on this page
    setPasswordRecovery(true)

    // We MUST wait for onAuthStateChange — Supabase parses the #access_token hash
    // asynchronously, so getSession() called immediately often returns null even
    // when the link is valid. Subscribe first, then also check existing session.
    let timer: ReturnType<typeof setTimeout>

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        clearTimeout(timer)
        setPasswordRecovery(true)
        setHasValidSession(true)
        setSessionChecked(true)
      }
    })

    // Also check if there's already an active session (direct navigation)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        clearTimeout(timer)
        setPasswordRecovery(true)
        setHasValidSession(true)
        setSessionChecked(true)
      }
    })

    // Give Supabase up to 3 seconds to process the URL hash before
    // concluding the link is invalid / expired
    timer = setTimeout(() => {
      setSessionChecked((prev) => {
        if (!prev) {
          setPasswordRecovery(false)
          return true // show "expired" UI only if still unchecked
        }
        return prev
      })
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [setPasswordRecovery])

  const handleReturnToSignIn = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    reset()
    navigate('/login', { replace: true })
  }

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    // Security best practice: Flush the temporary recovery session so the user must
    // sign in cleanly using their newly updated credentials.
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    reset()

    setIsSuccess(true)
    toast.success('Password updated successfully! Please sign in with your new password.', {
      duration: 4000,
    })
    setTimeout(() => {
      navigate('/login', { replace: true })
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" to="/" />
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-xl shadow-xs p-6">
          {isSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-[#E8F5EF] text-[#16865B] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-semibold text-[#182230] dark:text-[#F0F6FC]">Password Updated</h2>
              <p className="text-xs text-[#667085] dark:text-[#8B949E] leading-relaxed">
                Your password has been securely reset. Redirecting you to the sign-in page...
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" className="w-full" onClick={handleReturnToSignIn}>
                  Go to Sign In
                </Button>
              </div>
            </div>
          ) : !sessionChecked ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#667085] dark:text-[#8B949E]">Verifying reset link…</p>
            </div>
          ) : sessionChecked && !hasValidSession ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-[#FBEFEF] dark:bg-[#2B1313] text-[#D64545] rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-semibold text-[#182230] dark:text-[#F0F6FC]">Reset Link Expired or Invalid</h2>
              <p className="text-xs text-[#667085] dark:text-[#8B949E] leading-relaxed">
                This password reset link is invalid or has expired. Please request a new reset link.
              </p>
              <div className="pt-2">
                <Link to="/forgot-password">
                  <Button variant="primary" size="sm" className="w-full">
                    Request New Link
                  </Button>
                </Link>
              </div>
            </div>
          ) : (

            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-[#182230] dark:text-[#F0F6FC]">Set New Password</h1>
                <p className="text-xs text-[#667085] dark:text-[#8B949E] mt-1">
                  Create a strong new password for your MediConnect account.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    error={errors.password?.message}
                    required
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-7 text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Input
                  label="Confirm New Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  required
                  {...register('confirmPassword')}
                />

                <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                  Save & Update Password
                </Button>
              </form>

              <div className="mt-4 pt-3 border-t border-[#E5EAF0] dark:border-[#30363D] text-center">
                <button
                  type="button"
                  onClick={handleReturnToSignIn}
                  className="text-xs text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] transition-colors"
                >
                  Return to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

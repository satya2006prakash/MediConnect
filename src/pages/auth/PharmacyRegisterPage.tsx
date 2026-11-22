import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import toast from 'react-hot-toast'
import { checkEmailRegistered } from '@/lib/authHelpers'
import { EmailAlreadyRegisteredModal } from '@/components/auth/EmailAlreadyRegisteredModal'

const schema = z.object({
  ownerName: z.string().min(2, 'Owner name is required'),
  pharmacyName: z.string().min(2, 'Pharmacy name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  licenseNumber: z.string().min(3, 'License number is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  pincode: z.string().length(6, 'Enter a valid 6-digit pincode'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export function PharmacyRegisterPage() {
  const navigate = useNavigate()
  const { setUser, setSession, fetchProfile } = useAuthStore()
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
    // 1. Pre-check if email is already registered
    const check = await checkEmailRegistered(data.email)
    if (check.exists) {
      setDuplicateModal({
        isOpen: true,
        email: data.email,
        existingRole: check.role || null,
      })
      return
    }

    // 2. Primary: Submit through server API handler (bypasses RLS & email rate limit lockouts)
    try {
      const res = await fetch('/api/register-pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        setVerificationEmail(data.email)
        toast.success('Registration submitted! Please check your Gmail to verify your account.')
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

      // If server returned an error, show it cleanly
      if (!res.ok) {
        toast.error(result.error || 'Registration failed')
        return
      }
    } catch (apiErr: any) {
      console.warn('API endpoint fallback to client auth:', apiErr.message)
    }

    // 3. Fallback: Direct Client-Side Supabase Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: 'pharmacy_admin',
          full_name: data.ownerName,
          pharmacy_name: data.pharmacyName,
          phone: data.phone,
          city: data.city,
          pincode: data.pincode,
          address: data.address,
          license_number: data.licenseNumber,
        },
      },
    })

    const isUserAlreadyRegistered =
      Boolean(
        authError &&
          (authError.message.toLowerCase().includes('already registered') ||
            authError.message.toLowerCase().includes('already been registered') ||
            authError.message.toLowerCase().includes('email exists') ||
            (authError as any).code === 'user_already_exists' ||
            (authError as any).status === 400)
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

    if (authError) {
      toast.error(authError.message)
      return
    }

    if (!authData.user) {
      toast.error('Registration failed. Please try again.')
      return
    }

    // Ensure session is active before insert
    if (!authData.session) {
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (loginData?.session) {
        authData.session = loginData.session
      }
    }

    // Create or update profile row in profiles table
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      role: 'pharmacy_admin' as const,
      full_name: data.ownerName,
      phone: data.phone,
      city: data.city,
      pincode: data.pincode,
      address: data.address,
    })

    // Create pharmacy record (pending verification)
    const { error: pharmacyError } = await supabase.from('pharmacies').insert({
      owner_id: authData.user.id,
      name: data.pharmacyName,
      license_number: data.licenseNumber,
      phone: data.phone,
      email: data.email.toLowerCase(),
      address: data.address,
      city: data.city,
      pincode: data.pincode,
      status: 'pending',
    })

    if (pharmacyError) {
      toast.error('Pharmacy registration failed: ' + pharmacyError.message)
      return
    }

    if (authData.session) {
      setUser(authData.user)
      setSession(authData.session)
      await fetchProfile(authData.user.id)
      toast.success('Pharmacy registered! Awaiting admin verification.')
      navigate('/pharmacy/pending-approval', { replace: true })
    } else {
      toast.success('Pharmacy registered! Awaiting admin verification.')
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Logo size="lg" to="/" />
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-xl shadow-xs p-6 sm:p-8">
          {verificationEmail ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 text-[#2457A7] rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-[#F0F6FC]">
                Verify your Pharmacy Email
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                We've sent an authentication verification link to <strong className="text-slate-900 dark:text-white">{verificationEmail}</strong>.
              </p>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-500 dark:text-slate-400 text-left space-y-1.5 border border-slate-200 dark:border-slate-700/60">
                <p className="font-semibold text-slate-700 dark:text-slate-200">What to do next:</p>
                <p>1. Open your Gmail inbox.</p>
                <p>2. Look for the email: <em>"Verify your Pharmacy Registration – [Store Name]"</em>.</p>
                <p>3. Click the <strong>"Verify Email &amp; Confirm Registration"</strong> button.</p>
                <p>4. Our administration will then review your drug license and activate your pharmacy.</p>
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
                <h1 className="text-xl font-semibold text-slate-900 dark:text-[#F0F6FC]">Register your pharmacy</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Your registration will be reviewed by our admin team before activation.
                </p>
              </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Owner / Manager name" error={errors.ownerName?.message} required {...register('ownerName')} />
              <Input label="Pharmacy name" error={errors.pharmacyName?.message} required {...register('pharmacyName')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Email address" type="email" error={errors.email?.message} required {...register('email')} />
              <Input label="Phone number" type="tel" error={errors.phone?.message} required {...register('phone')} />
            </div>

            <Input
              label="Drug license number"
              placeholder="DL-MH-123456"
              hint="As issued by your state drug authority"
              error={errors.licenseNumber?.message}
              required
              {...register('licenseNumber')}
            />

            <Input label="Street address" error={errors.address?.message} required {...register('address')} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="City" error={errors.city?.message} required {...register('city')} />
              <Input label="Pincode" maxLength={6} error={errors.pincode?.message} required {...register('pincode')} />
            </div>

            <div className="pt-2 border-t border-border">
              <Input
                label="Account password"
                type="password"
                hint="At least 8 characters"
                error={errors.password?.message}
                required
                {...register('password')}
              />
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
              Submit registration
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
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
        attemptedRole="pharmacy_admin"
        onUseDifferentEmail={() => {
          setFocus('email')
        }}
      />
    </div>
  )
}

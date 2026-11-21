import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import toast from 'react-hot-toast'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Send via Resend-powered backend to bypass Supabase mailer rate limits
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setSent(true)
        return
      }

      // 2. Fallback to Supabase direct client reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(data.error || error.message)
      } else {
        setSent(true)
      }
    } catch {
      // Fallback
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        toast.error(error.message)
      } else {
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" to="/" />
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-xl shadow-xs p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-50 dark:bg-[#0E291C] rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-5 h-5 text-[#16865B]" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#F0F6FC] mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <Link to="/login" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-[#F0F6FC]">Reset your password</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" isLoading={loading}>
                  Send reset link
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

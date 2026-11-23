import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * Bootstraps Supabase Auth state into the global store.
 * Mount this once at the top of the React tree.
 */
export function useAuthBootstrap() {
  const { setUser, setSession, fetchProfile, setLoading, setInitialised, reset } =
    useAuthStore()

  useEffect(() => {
    // Detect password recovery mode from URL hash or pathname
    if (typeof window !== 'undefined') {
      const isRecoveryHash =
        window.location.hash.includes('type=recovery') ||
        window.location.hash.includes('type=invite')
      const isResetPath = window.location.pathname === '/reset-password'
      if (isRecoveryHash || isResetPath) {
        useAuthStore.getState().setPasswordRecovery(true)
      }
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session)
        setUser(session.user)
        fetchProfile(session.user.id).finally(() => {
          setLoading(false)
          setInitialised(true)
        })
      } else {
        // If not logged in and no mock user, mark initialized
        const currentUser = useAuthStore.getState().user
        if (!currentUser) {
          reset()
        }
        setLoading(false)
        setInitialised(true)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        useAuthStore.getState().setPasswordRecovery(true)
      }

      if (event === 'SIGNED_OUT') {
        // User explicitly logged out
        reset()
        setLoading(false)
        setInitialised(true)
        return
      }

      if (session?.user) {
        setSession(session)
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session)
        setUser(session.user)
      }

      setLoading(false)
      setInitialised(true)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

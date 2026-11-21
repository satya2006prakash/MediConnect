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
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          setLoading(false)
          setInitialised(true)
        })
      } else {
        reset()
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          reset()
        }
        setLoading(false)
        setInitialised(true)
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

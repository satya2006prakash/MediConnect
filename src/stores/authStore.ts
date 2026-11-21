import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialised: boolean

  // actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  updateProfileAvatar: (avatarUrl: string | null) => void
  setLoading: (loading: boolean) => void
  setInitialised: (initialised: boolean) => void
  fetchProfile: (userId: string) => Promise<void>
  loginAsDemo: (role: UserRole) => void
  signOut: () => Promise<void>
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isInitialised: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      updateProfileAvatar: (avatarUrl) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, avatar_url: avatarUrl } : null,
        })),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialised: (isInitialised) => set({ isInitialised }),

      fetchProfile: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

          if (!error && data) {
            set({ profile: data as Profile })
            return
          }
        } catch {
          // Ignore network or schema errors and check fallback
        }

        // Fallback: derive profile from current authenticated user session metadata
        const currentUser = _get().user
        if (currentUser && currentUser.id === userId) {
          const role: UserRole =
            currentUser.email === 'satya2006prakash@gmail.com' || currentUser.user_metadata?.role === 'admin'
              ? 'admin'
              : currentUser.user_metadata?.role === 'pharmacy_admin'
                ? 'pharmacy_admin'
                : 'patient'

          const fallbackProfile: Profile = {
            id: userId,
            role,
            full_name:
              currentUser.user_metadata?.full_name ||
              (role === 'admin' ? 'Satya Prakash' : currentUser.email?.split('@')[0] || 'User'),
            phone: currentUser.user_metadata?.phone || null,
            avatar_url: currentUser.user_metadata?.avatar_url || null,
            city: currentUser.user_metadata?.city || (role === 'admin' ? 'Bengaluru' : 'Mumbai'),
            pincode: currentUser.user_metadata?.pincode || (role === 'admin' ? '560001' : '400001'),
            address: currentUser.user_metadata?.address || null,
            created_at: currentUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          set({ profile: fallbackProfile })
        }
      },

      loginAsDemo: (role: UserRole) => {
        const demoProfiles: Record<UserRole, Profile> = {
          patient: {
            id: 'demo-patient-id',
            role: 'patient',
            full_name: 'Arjun Verma',
            phone: '+91 98200 12345',
            avatar_url: null,
            city: 'Mumbai',
            pincode: '400001',
            address: '42 Marine Drive, Nariman Point',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          pharmacy_admin: {
            id: 'demo-pharmacy-owner-id',
            role: 'pharmacy_admin',
            full_name: 'Suresh Patel (Owner)',
            phone: '+91 98333 45678',
            avatar_url: null,
            city: 'Mumbai',
            pincode: '400001',
            address: 'Apollo Pharmacy, Fort Commercial Centre',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          admin: {
            id: 'demo-admin-id',
            role: 'admin',
            full_name: 'Satya Prakash',
            phone: '+91 98111 00000',
            avatar_url: null,
            city: 'Bengaluru',
            pincode: '560001',
            address: 'MediConnect Platform Governance, Indiranagar',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }

        const selectedProfile = demoProfiles[role]
        const userEmail =
          role === 'admin'
            ? 'satya2006prakash@gmail.com'
            : `${role}@mediconnect.local`

        const mockUser: any = {
          id: selectedProfile.id,
          email: userEmail,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: { provider: 'email' },
          user_metadata: { full_name: selectedProfile.full_name },
          created_at: selectedProfile.created_at,
        }

        set({
          user: mockUser,
          session: {
            access_token: 'demo-access-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'demo-refresh-token',
            user: mockUser,
          } as any,
          profile: selectedProfile,
          isLoading: false,
          isInitialised: true,
        })
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut()
        } catch {
          // ignore offline/demo errors
        }
        set({ user: null, session: null, profile: null })
      },


      reset: () =>
        set({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isInitialised: true,
        }),
    }),
    {
      name: 'mediconnect-auth',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)

// Convenience selectors
export const selectRole = (state: AuthState): UserRole | null =>
  state.profile?.role ?? null

export const selectIsPatient = (state: AuthState) =>
  state.profile?.role === 'patient'

export const selectIsPharmacy = (state: AuthState) =>
  state.profile?.role === 'pharmacy_admin'

export const selectIsAdmin = (state: AuthState) =>
  state.profile?.role === 'admin'

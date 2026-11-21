import { createClient } from '@supabase/supabase-js'


const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://zhenijqolswpsifqtaxr.supabase.co'
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_86u5vt8R-8_9pMYoq7iz7A_8RkVkrc0'

// Create Supabase client with any-table typing for complete flexibility
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})


import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://tphbpwzozkskytoichho.supabase.co',
  'sb_publishable_M00GF1FWV5tgKHqmyRCZag_kJjgBJn-',
  {
    auth: {
      flowType:           'pkce',
      detectSessionInUrl: true,   // let Supabase process the code on /auth/callback
      persistSession:     true,
      autoRefreshToken:   true,
    }
  }
)

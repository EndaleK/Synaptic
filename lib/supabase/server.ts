// Supabase Client for Server-Side Operations
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createClient() {
  // Use service role key for server-side operations to bypass RLS
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

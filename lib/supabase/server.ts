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
      },
      global: {
        headers: {
          'X-Client-Info': 'synaptic-app'
        },
        // Custom fetch with extended timeout for large file uploads
        fetch: (url, options) => {
          // Increase timeout to 10 minutes for large file operations
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 600000) // 10 min

          return fetch(url, {
            ...options,
            signal: controller.signal
          }).finally(() => clearTimeout(timeout))
        }
      }
    }
  )
}

import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      '⚠️ Supabase env vars are missing. Create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
    // Return a proxy that won't crash but does nothing.
    // This lets the app render during local dev before Supabase is configured.
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get: (_target, prop) => {
        if (prop === 'from') return () => new Proxy({} as any, {
          get: () => () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } })
        })
        if (prop === 'auth') return new Proxy({} as any, {
          get: () => () => Promise.resolve({ data: { user: null, session: null }, error: null })
        })
        return () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
      }
    })
  }

  if (!_client) {
    _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _client
}

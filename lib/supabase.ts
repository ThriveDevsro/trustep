import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — only created when actually used, so missing env vars don't crash the server
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || url === 'your_supabase_url' || !key || key === 'your_supabase_anon_key') return null
  if (!_supabase) _supabase = createClient(url, key)
  return _supabase
}

// Keep named export for dashboard/report pages (returns null when not configured)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    const client = getSupabase()
    if (!client) {
      // Return a no-op that resolves to empty data so pages don't crash
      return () => ({ data: null, error: new Error('Supabase not configured') })
    }
    return Reflect.get(client, prop, client)
  },
})

// Server-side client — returns null when not configured
export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || url === 'your_supabase_url' || !key || key === 'your_service_role_key') return null
  return createClient(url, key)
}

export function isSupabaseConfigured(): boolean {
  return createServiceClient() !== null
}

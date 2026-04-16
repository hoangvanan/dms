// ============================================================================
// Server-side Supabase client for API routes (PDF generation, etc.)
// File: src/lib/supabase-server.ts
// ============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client using the service role key.
 * ONLY use in server-side code (API routes, serverless functions).
 * This bypasses RLS — use with caution.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL env vars')
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

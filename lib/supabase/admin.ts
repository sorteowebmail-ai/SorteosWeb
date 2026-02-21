import { createClient } from "@supabase/supabase-js"

// Client with service role key — bypasses RLS
// ONLY use in server-side contexts (API routes, webhooks, server actions)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

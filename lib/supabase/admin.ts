import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client using the SERVICE ROLE key — bypasses Row Level Security.
 *
 * NEVER import this from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY
 * with a NEXT_PUBLIC_ prefix. This is only safe to use inside server-only code
 * (API routes, cron handlers) that runs on Vercel's servers, never in the browser.
 *
 * It's needed for the reminder cron because that job runs across ALL users'
 * job cards, not just one signed-in user's — something RLS is designed to
 * prevent for normal, session-based requests.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY server env vars."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

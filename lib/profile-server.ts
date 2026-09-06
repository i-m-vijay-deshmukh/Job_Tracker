import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side counterpart to lib/profile.ts's getMyResumeText, for use
 * inside API routes that already have an authenticated request-scoped
 * Supabase client (from lib/supabase/server.ts) instead of the browser
 * client. Kept as a fallback for jobs with no auto-readable resume file.
 */
export async function getMyResumeText(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("resume_text")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return "";
  return data?.resume_text ?? "";
}

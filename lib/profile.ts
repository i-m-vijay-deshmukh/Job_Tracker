import { createClient } from "@/lib/supabase/client";

const TABLE = "profiles";

/**
 * Resume text is stored once per user (not per job card) and reused across
 * every AI match-score request. RLS on the `profiles` table (see
 * supabase/schema.sql) ensures a user can only read/write their own row.
 */

export async function getMyResumeText(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data, error } = await supabase
    .from(TABLE)
    .select("resume_text")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.resume_text ?? "";
}

export async function saveMyResumeText(resumeText: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: user.id, resume_text: resumeText }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
}
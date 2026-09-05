import { createClient } from "@/lib/supabase/client";
import { JobCard, JobCardInput, JobStatus } from "@/lib/types";

const TABLE = "job_cards";

/**
 * All functions below rely on Supabase Row Level Security to scope reads
 * and writes to the signed-in user (see supabase/schema.sql). We still
 * pass user_id explicitly on insert so the column is populated.
 */

export async function fetchJobCards(): Promise<JobCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as JobCard[];
}

export async function createJobCard(input: JobCardInput): Promise<JobCard> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to create a job card.");

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as JobCard;
}

export async function updateJobCard(
  id: string,
  updates: Partial<JobCardInput>
): Promise<JobCard> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as JobCard;
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  interviewDate?: string | null,
  oaDate?: string | null
): Promise<JobCard> {
  return updateJobCard(id, {
    status,
    interview_date: status === "Interview" ? interviewDate ?? null : null,
    oa_date: status === "OA" ? oaDate ?? null : null,
  });
}

export async function deleteJobCard(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Uploads a resume file to the private `resumes` storage bucket and returns its path. */
export async function uploadResume(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("resumes").upload(path, file, {
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Resolves a stored resume path (or an already-public URL) into a signed URL to open. */
export async function getResumeUrl(pathOrUrl: string): Promise<string> {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(pathOrUrl, 60 * 60); // 1 hour

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

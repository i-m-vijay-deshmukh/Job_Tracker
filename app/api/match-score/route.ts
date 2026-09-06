import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyResumeText } from "@/lib/profile-server";
import { extractResumeText } from "@/lib/resume-extract";

/**
 * Scores how well a specific job's attached resume matches its job
 * description, using Google's Gemini API (free tier — see
 * https://aistudio.google.com/apikey).
 *
 * Resume source, in priority order:
 *   1. The PDF/DOCX file actually attached to THIS job card (auto-read,
 *      text extracted server-side — nothing pasted by hand).
 *   2. If that job's resume was added as an external link (not an upload),
 *      or has no resume at all, falls back to the one-time resume text
 *      saved via the "Resume text" button, if present.
 *
 * The API key lives only in the server environment (GEMINI_API_KEY, no
 * NEXT_PUBLIC_ prefix) so it's never exposed to the browser. This route
 * also requires a signed-in Supabase session tied to the job's owner, so
 * RLS naturally prevents reading someone else's job or resume file.
 */

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI matching isn't configured yet (missing GEMINI_API_KEY)." },
      { status: 500 }
    );
  }

  const { jobId } = await request.json();
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
  }

  // RLS scopes this to the signed-in user's own row — a stranger's jobId
  // simply won't be found, never leaks another user's data.
  const { data: job, error: jobError } = await supabase
    .from("job_cards")
    .select("id, job_description, resume_url")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (!job.job_description || !job.job_description.trim()) {
    return NextResponse.json(
      { error: "This application doesn't have a job description saved to match against." },
      { status: 400 }
    );
  }

  let resumeText = "";
  let resumeSource: "file" | "saved-text" | "none" = "none";
  let extractionWarning: string | null = null;

  if (job.resume_url && !/^https?:\/\//i.test(job.resume_url)) {
    // Stored file path in the private `resumes` bucket — download and
    // extract its text automatically. The session-based client respects
    // RLS storage policies, so this only works for the file's own owner.
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("resumes")
        .download(job.resume_url);

      if (downloadError || !fileData) {
        throw new Error(downloadError?.message ?? "Could not download the resume file.");
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      resumeText = await extractResumeText(buffer, job.resume_url);
      resumeSource = "file";
    } catch (err: any) {
      extractionWarning = err.message ?? "Could not read the attached resume file.";
    }
  }

  // Fall back to the saved one-time resume text if there's no usable file
  // (external link, missing resume, or extraction failed).
  if (!resumeText.trim()) {
    const savedText = await getMyResumeText(supabase, user.id);
    if (savedText.trim()) {
      resumeText = savedText;
      resumeSource = "saved-text";
    }
  }

  if (!resumeText.trim()) {
    return NextResponse.json(
      {
        error:
          extractionWarning ??
          "No resume found for this job. Attach a PDF or Word resume to this application, or save your resume text via the \"Resume text\" button.",
      },
      { status: 400 }
    );
  }

  const prompt = `You are a careful, honest career advisor. Compare the RESUME to the JOB DESCRIPTION below.

Respond with ONLY valid JSON, no markdown fences, no extra text, matching exactly this shape:
{"score": <integer 0-100>, "matchedSkills": [<up to 6 short strings>], "missingSkills": [<up to 6 short strings>], "summary": "<one or two honest sentences>"}

JOB DESCRIPTION:
"""${job.job_description.slice(0, 6000)}"""

RESUME:
"""${resumeText.slice(0, 6000)}"""`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `Gemini API error (${response.status}): ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      resumeSource,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Could not compute a match score right now." },
      { status: 500 }
    );
  }
}

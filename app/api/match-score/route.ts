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

/**
 * Google renames/retires Flash model IDs every few months (gemini-2.0-flash
 * was shut down June 1, 2026, for example). Instead of hardcoding one model
 * and breaking again next time, this tries a short list of candidates in
 * order and moves on if one is gone (404) or rate-limited (429).
 *
 * Set GEMINI_MODEL as an env var to force a specific model without a code
 * change. Otherwise it tries Google's always-current "latest" alias first,
 * then a few known-stable fallbacks. If ALL of these ever stop working,
 * check https://ai.google.dev/gemini-api/docs/models for the current free
 * Flash model ID and add it to this list (or set GEMINI_MODEL).
 */
const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
].filter((m): m is string => Boolean(m));

/**
 * Gemini is asked for JSON via responseMimeType, but model output is never
 * 100% guaranteed — some responses still arrive wrapped in markdown fences,
 * with trailing commentary, or otherwise not parsing on the first try. This
 * tries a plain parse first, then falls back to extracting the first
 * {...} block before giving up, so one odd response doesn't surface a raw
 * "Unexpected token" parser error straight to the user.
 */
function parseGeminiJSON(rawText: string): {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
} {
  const attempts = [
    rawText.trim(),
    rawText.replace(/```json|```/g, "").trim(),
  ];

  const jsonBlockMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonBlockMatch) attempts.push(jsonBlockMatch[0]);

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      return {
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
        missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
      };
    } catch {
      continue;
    }
  }

  console.error("Gemini returned unparseable output:", rawText.slice(0, 500));
  throw new Error(
    "The AI returned an unexpected response format. Please try again — if it keeps happening, try re-running in a minute."
  );
}

/**
 * Gemini 2.5-era models use a numeric thinkingBudget (0 fully disables
 * thinking on Flash/Lite variants). Gemini 3.x-era models use a string
 * thinkingLevel instead and CANNOT fully disable thinking — sending both
 * fields in one request, or the wrong field for a model's era, causes a
 * 400 error. So each model gets its own matching config, and token budget
 * is generous enough to survive thinking + still fit the JSON answer.
 */
function buildGenerationConfig(model: string) {
  const isLegacy25Series = /gemini-2\./.test(model);

  return {
    temperature: 0.2,
    // Generous headroom: even minimized "thinking" on 3.x models still
    // consumes real tokens before the actual answer starts.
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
    thinkingConfig: isLegacy25Series
      ? { thinkingBudget: 0 } // fully disable thinking (2.5 Flash/Lite support this)
      : { thinkingLevel: "low" }, // 3.x can't disable thinking, only minimize it
  };
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  let lastError = "";

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: buildGenerationConfig(model),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const rawText: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) return rawText;
      lastError = `Model "${model}" returned an empty response.`;
      continue;
    }

    // Model was renamed/retired (404), rate-limited (429), or temporarily
    // overloaded on Google's end (500/502/503/504) — all worth trying the
    // next candidate for instead of failing outright.
    if ([404, 429, 500, 502, 503, 504].includes(response.status)) {
      lastError = `Model "${model}" unavailable (HTTP ${response.status}).`;
      continue;
    }

    // Anything else (bad API key, malformed request) won't be fixed by
    // switching models — surface it immediately instead of masking it.
    const detail = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 200)}`);
  }

  throw new Error(
    `Every Gemini model candidate failed. Last error: ${lastError} ` +
      `Google likely renamed its Flash models again — check ` +
      `https://ai.google.dev/gemini-api/docs/models for the current model ID ` +
      `and set GEMINI_MODEL in your environment variables to override.`
  );
}

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
    const rawText = await callGemini(prompt, apiKey);
    const result = parseGeminiJSON(rawText);

    return NextResponse.json({
      ...result,
      resumeSource,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Could not compute a match score right now." },
      { status: 500 }
    );
  }
}


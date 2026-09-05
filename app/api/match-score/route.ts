import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Scores how well a resume matches a job description, using Google's
 * Gemini API (free tier — see https://aistudio.google.com/apikey).
 *
 * The API key lives only in the server environment (GEMINI_API_KEY,
 * no NEXT_PUBLIC_ prefix) so it's never exposed to the browser. This
 * route also requires a signed-in Supabase session, so it can't be
 * called by anonymous visitors and burn through your free quota.
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

  const { jobDescription, resumeText } = await request.json();

  if (!jobDescription || !resumeText) {
    return NextResponse.json(
      { error: "Both a job description and resume text are required." },
      { status: 400 }
    );
  }

  const prompt = `You are a careful, honest career advisor. Compare the RESUME to the JOB DESCRIPTION below.

Respond with ONLY valid JSON, no markdown fences, no extra text, matching exactly this shape:
{"score": <integer 0-100>, "matchedSkills": [<up to 6 short strings>], "missingSkills": [<up to 6 short strings>], "summary": "<one or two honest sentences>"}

JOB DESCRIPTION:
"""${jobDescription.slice(0, 6000)}"""

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

    // Gemini sometimes wraps JSON in ```json fences despite instructions — strip them.
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Could not compute a match score right now." },
      { status: 500 }
    );
  }
}
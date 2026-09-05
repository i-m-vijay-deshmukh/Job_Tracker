import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${expected}`;
}

function tomorrowRangeUTC(): { start: string; end: string } {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const dayAfter = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2)
  );
  return { start: tomorrow.toISOString(), end: dayAfter.toISOString() };
}

async function sendReminderEmail(params: {
  to: string;
  jobTitle: string;
  companyName: string;
  kind: "OA" | "Interview";
  dateISO: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL env vars.");
  }

  const dateLabel = new Date(params.dateISO).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `Reminder: ${params.kind} tomorrow — ${params.jobTitle} at ${params.companyName}`;
  const html = `
    <div style="font-family: sans-serif; font-size: 15px; color: #1B2430;">
      <h2 style="margin-bottom: 4px;">Your ${params.kind} is tomorrow</h2>
      <p style="margin-top: 0; color: #555;">${dateLabel}</p>
      <p><strong>${params.jobTitle}</strong> at <strong>${params.companyName}</strong></p>
      <p style="color: #888; font-size: 13px;">Sent by your Job Tracker.</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: params.to, subject, html }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend error (${res.status}): ${detail.slice(0, 200)}`);
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = tomorrowRangeUTC();
  const supabase = createAdminClient();

  const [interviewsResult, oaResult] = await Promise.all([
    supabase
      .from("job_cards")
      .select("id, user_id, job_title, company_name, interview_date")
      .eq("status", "Interview")
      .gte("interview_date", start)
      .lt("interview_date", end),
    supabase
      .from("job_cards")
      .select("id, user_id, job_title, company_name, oa_date")
      .eq("status", "OA")
      .gte("oa_date", start)
      .lt("oa_date", end),
  ]);

  if (interviewsResult.error) {
    return NextResponse.json({ error: interviewsResult.error.message }, { status: 500 });
  }
  if (oaResult.error) {
    return NextResponse.json({ error: oaResult.error.message }, { status: 500 });
  }

  const due = [
    ...interviewsResult.data.map((j) => ({
      ...j,
      kind: "Interview" as const,
      dateISO: j.interview_date as string,
    })),
    ...oaResult.data.map((j) => ({
      ...j,
      kind: "OA" as const,
      dateISO: j.oa_date as string,
    })),
  ];

  let sent = 0;
  const errors: string[] = [];

  for (const job of due) {
    try {
      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(job.user_id);
      if (userError || !userData?.user?.email) {
        errors.push(`No email found for user ${job.user_id}`);
        continue;
      }

      await sendReminderEmail({
        to: userData.user.email,
        jobTitle: job.job_title,
        companyName: job.company_name,
        kind: job.kind,
        dateISO: job.dateISO,
      });
      sent += 1;
    } catch (err: any) {
      errors.push(`Job ${job.id}: ${err.message}`);
    }
  }

  return NextResponse.json({ checked: due.length, sent, errors });
}

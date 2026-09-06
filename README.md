# Job Tracker

A full-stack job application tracker: log every application, track its status through Applied → OA → Interview → Offer/Rejected, get AI-powered resume match scores read automatically from each job's attached resume file, and get reminded before OAs and interviews — all on free-tier infrastructure.

Built with **Next.js 14 (App Router)**, **React**, **Tailwind CSS**, **Lucide icons**, and **Supabase** (Postgres + Auth + Storage), deployed on **Vercel**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [How data access is secured](#how-data-access-is-secured)
- [Setup from zero](#setup-from-zero)
  1. [Create a Supabase project](#1-create-a-supabase-project)
  2. [Run the database schema](#2-run-the-database-schema)
  3. [Enable Google sign-in](#3-enable-google-sign-in)
  4. [Get a free Gemini API key (AI match score)](#4-get-a-free-gemini-api-key-ai-match-score)
  5. [Get a free Resend API key (reminder emails)](#5-get-a-free-resend-api-key-reminder-emails)
  6. [Configure environment variables locally](#6-configure-environment-variables-locally)
  7. [Run it locally](#7-run-it-locally)
  8. [Deploy to Vercel](#8-deploy-to-vercel)
- [Environment variables reference](#environment-variables-reference)
- [Feature details](#feature-details)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Authentication** — Google OAuth only, via Supabase Auth. Every route except `/login` requires a signed-in session (enforced in `middleware.ts`).
- **Job cards** — company, title, field/category, tag-style required skills, job description, resume (upload a PDF/DOCX/DOC file, or paste a link), and status (`Applied`, `OA`, `Interview`, `Offer`, `Rejected`).
- **Compensation tracking** — mark an application Paid or Unpaid, with a ₹/month stipend amount for paid roles.
- **OA and Interview dates** — set a date once status is `OA` or `Interview`; shown as a banner on the card and in the detail view.
- **Add to calendar** — one click downloads a `.ics` file for any interview date, importable into Google/Apple/Outlook calendars. Pure client-side, no calendar API needed.
- **Follow-up reminders (in-app)** — any application still `Applied` or `OA` with no update in 14+ days gets a visible badge, both on the card and in the detail view.
- **Email reminders (OA/Interview, day-before)** — a daily scheduled job emails you when an OA or interview is happening tomorrow. See [limitations](#known-limitations) for what this does and doesn't cover on the free tier.
- **AI resume match score** — reads the actual PDF/DOCX resume attached to a specific job card (server-side, automatic — nothing pasted by hand), compares it against that job's saved description using Google's Gemini API, and returns a 0–100 score, matched skills, and gaps to address. Falls back to a one-time saved "resume text" if a job's resume is a link or unreadable.
- **Duplicate application warning** — warns (non-blocking) if you're about to add a company + title combination you already have tracked.
- **Dashboard** — search by title/company, filter by status/field/skill, click any card for full details, quick status changes from a dropdown, edit/delete from the card or detail view.
- **Click-to-expand detail view** — every job card opens a full modal with everything: status, compensation, skills, description, dates, AI match section, and resume link.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, Lucide icons |
| Database | Supabase Postgres, secured with Row Level Security |
| Auth | Supabase Auth (Google OAuth provider) |
| File storage | Supabase Storage (private `resumes` bucket) |
| AI | Google Gemini API (free tier) |
| Email | Resend (free tier) |
| Scheduling | Vercel Cron (free on Hobby plan) |
| Hosting | Vercel |
| Resume text extraction | `pdf-parse` (PDF), `mammoth` (DOCX) — server-side only |

Nothing in this stack requires a paid plan to run. See [limitations](#known-limitations) for the one real free-tier constraint (email delivery without a verified domain).

---

## Project structure

```
app/
  layout.tsx                       Root layout, fonts
  globals.css                      Tailwind base styles
  page.tsx                         Dashboard (protected) — search, filters, job grid, all modals
  login/page.tsx                   Google OAuth sign-in
  auth/callback/route.ts           OAuth redirect handler
  api/
    match-score/route.ts           AI resume-match endpoint (Gemini, with model fallback chain)
    cron/send-reminders/route.ts   Daily OA/Interview email reminder job

components/
  Navbar.tsx                       Top bar: add application, resume text, sign out
  SearchBar.tsx                    Title/company search input
  FilterBar.tsx                    Status / field / skill filter dropdowns
  JobCardItem.tsx                  Single job card in the dashboard grid
  JobDetailModal.tsx               Full-detail view: AI match, calendar, follow-up banner, etc.
  JobForm.tsx                      Create/edit modal (all fields, duplicate warning)
  ResumeTextModal.tsx              Paste/save one-time fallback resume text
  SkillsInput.tsx                  Tag-style input for required skills
  StatusBadge.tsx                  Colored status pill
  ConfirmDialog.tsx                Generic delete-confirmation dialog

lib/
  types.ts                         Shared TypeScript types (JobCard, JobStatus, etc.)
  utils.ts                         Formatting, follow-up staleness check, .ics generation
  jobs.ts                          Job card CRUD + resume upload (client-side, RLS-scoped)
  profile.ts                       Client-side: get/save the one-time fallback resume text
  profile-server.ts                Server-side counterpart, used inside API routes
  resume-extract.ts                PDF/DOCX → plain text extraction (server-only)
  supabase/
    client.ts                      Browser Supabase client
    server.ts                      Server Component / Route Handler Supabase client
    middleware.ts                  Session refresh + route protection
    admin.ts                       Service-role client (bypasses RLS) — cron job only

types/
  pdf-parse.d.ts                   Ambient type declaration (pdf-parse ships no types)

supabase/
  schema.sql                       Full table definitions, RLS policies, storage bucket policies

middleware.ts                      Root middleware entrypoint
vercel.json                        Daily cron schedule for reminder emails
```

---

## How data access is secured

Every table and storage bucket uses **Postgres Row Level Security (RLS)**, not just application-level checks:

- `job_cards` — a user can only `select`/`insert`/`update`/`delete` rows where `user_id = auth.uid()`.
- `profiles` (resume text fallback) — same pattern, one row per user.
- `resumes` storage bucket — files are stored under `{user_id}/...`, and storage policies only allow a user to read/write/delete within their own folder.

This means even if a bug in the frontend code tried to fetch someone else's data, Postgres itself would refuse the query. The one exception is the reminder cron job (`app/api/cron/send-reminders/route.ts`), which legitimately needs to read across *all* users to check whose OA/interview is tomorrow — it uses a separate **service-role** client (`lib/supabase/admin.ts`) that intentionally bypasses RLS, is never imported into any client-side code, and is protected by a `CRON_SECRET` so only Vercel's own scheduler can trigger it.

---

## Setup from zero

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → **New project**. Note your **Project URL** and **anon public key** from **Project Settings → API** — you'll need both shortly.

### 2. Run the database schema

Open **SQL Editor → New query** in your Supabase dashboard, paste the entire contents of `supabase/schema.sql`, and run it. This creates:

- the `job_cards` table (with `status`, `interview_date`, `oa_date`, `compensation_type`, `stipend_amount`) and its RLS policies
- the `profiles` table (fallback resume text) and its RLS policies
- a private `resumes` storage bucket with per-user folder policies
- a trigger that keeps `updated_at` fresh automatically

If you're updating an existing database rather than starting fresh, see the commented `alter table` lines near the top of the file for adding just the newer columns without recreating anything.

### 3. Enable Google sign-in

In Supabase: **Authentication → Providers → Google** → toggle on, and paste in an OAuth Client ID/Secret from the [Google Cloud Console](https://console.cloud.google.com/). Set the authorized redirect URI to:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

### 4. Get a free Gemini API key (AI match score)

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in, click **Create API key**. No credit card required. This powers the AI resume match feature.

### 5. Get a free Resend API key (reminder emails)

Go to [resend.com](https://resend.com), sign up free, then **API Keys → Create API Key**. This powers the day-before OA/Interview email reminders. See [limitations](#known-limitations) below for what this does and doesn't reach without a verified domain.

### 6. Configure environment variables locally

```bash
cp .env.local.example .env.local
```

Fill in every value — see the [full reference table](#environment-variables-reference) below for where each one comes from.

### 7. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll land on `/login`. After signing in with Google, you're redirected to the dashboard.

### 8. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), **Add New → Project**, import the repo. Vercel auto-detects Next.js — no build settings need changing.
3. Under **Environment Variables**, add every variable from `.env.local` (same values).
4. Deploy.
5. Back in Supabase: **Authentication → URL Configuration** — set **Site URL** to your Vercel URL, and add it under **Redirect URLs**. In Google Cloud Console, add the same URL under your OAuth Client's **Authorized JavaScript origins**.
6. Vercel automatically registers the daily cron job defined in `vercel.json` — no extra setup needed, as long as `CRON_SECRET` is set in step 3.

Every future `git push` to `main` auto-redeploys — no manual redeploy step needed for ordinary code changes. You only need to manually redeploy after *adding or changing* an environment variable, since those don't apply retroactively to already-running deployments.

---

## Environment variables reference

| Variable | Where it comes from | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Everywhere (client + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Everywhere (client + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret | Reminder cron only (`lib/supabase/admin.ts`) — **never expose this to the browser** |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | AI match score (`app/api/match-score/route.ts`) |
| `GEMINI_MODEL` | *(optional)* any valid Gemini model ID | Forces a specific model instead of the built-in fallback chain — see [Feature details](#feature-details) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys | Reminder emails (`app/api/cron/send-reminders/route.ts`) |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` unless you verify your own domain in Resend | Reminder emails |
| `CRON_SECRET` | Any random string you generate yourself (e.g. `openssl rand -hex 32`) | Confirms reminder cron requests actually come from Vercel, not a random visitor |

All of these go in `.env.local` for local development, and in Vercel's **Project Settings → Environment Variables** for the deployed site — the two are separate and don't sync automatically.

---

## Feature details

### AI resume match score — how it decides which resume to read

For a given job card, `app/api/match-score/route.ts` resolves resume text in this order:

1. **If the job's resume was uploaded as a file** (not a link) — downloads it from the private `resumes` bucket and extracts text automatically: `pdf-parse` for `.pdf`, `mammoth` for `.docx`.
2. **If that fails, or the resume was added as a link, or no resume is attached** — falls back to the one-time resume text saved via the **"Resume text"** button in the navbar (`lib/profile.ts` / `components/ResumeTextModal.tsx`).
3. **If neither is available** — returns a clear error asking you to attach a resume file or save fallback text.

The detail view shows which source was actually used ("Read directly from this job's attached resume file" vs. "Used your saved resume text") so it's never ambiguous.

### Gemini model fallback chain

Google renames and retires Flash model IDs every few months — `gemini-2.0-flash` was shut down June 1, 2026, for example. Instead of hardcoding one model name that will eventually break, `callGemini()` in `app/api/match-score/route.ts` tries a short ordered list of candidates (`gemini-flash-latest` first, then a few known-stable fallbacks), automatically moving to the next one if a model is gone (`404`), rate-limited (`429`), or temporarily overloaded (`500`/`502`/`503`/`504`). Only genuine client-side problems (bad API key, malformed request) fail immediately.

Set `GEMINI_MODEL` as an env var to force a specific model without touching code. If every candidate in the list ever stops working, check [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models) for the current model ID and either set `GEMINI_MODEL` or add it to the candidate list in the route.

Gemini 2.5-series and 3.x-series models use different config fields for controlling "thinking" token spend (`thinkingBudget` vs `thinkingLevel`) — the route detects which era each candidate model belongs to and sends the matching field automatically.

### Follow-up reminders

An application is flagged as needing follow-up (`lib/utils.ts`'s `isStale()`) if its status is `Applied` or `OA` **and** it hasn't been updated in 14+ days (`STALE_DAYS_THRESHOLD`). `Interview`, `Offer`, and `Rejected` are excluded since those already mean something moved.

### Add to calendar

`downloadInterviewICS()` in `lib/utils.ts` builds a standard `.ics` file client-side (no calendar API, no account connection) and triggers a browser download whenever a job has status `Interview` and an interview date set.

---

## Known limitations

- **Email reminders and free-tier Resend**: without a verified sending domain, Resend can only deliver to the email address you personally signed up to Resend with — not to arbitrary other users. Fine for a personal tracker; if you ever add other users, they won't receive reminder emails until you verify a domain in Resend.
- **Old `.doc` files can't be auto-read**: the AI match score's automatic file-reading only supports `.pdf` and `.docx`. Old binary `.doc` files cleanly fall back to your saved resume text instead of erroring, since there's no good free `.doc` parser.
- **Gemini free tier**: subject to daily/per-minute rate limits that can change without notice, and free-tier prompts may be used by Google to improve their models. Fine for personal use; worth knowing if resume content is sensitive.
- **Vercel Hobby (free) plan cron limits**: the reminder job is scheduled once daily — the free plan doesn't support more frequent cron invocations.

---

## Troubleshooting

- **A file shows as present in git but the build fails as if it's missing content**: check the file isn't actually empty (0 bytes) — this most often happens when a file is created in an editor but never saved (Ctrl+S) before committing. `git status` and `git diff --stat` will show `0 insertions` for a file that looks "changed" but has no real content.
- **Build fails immediately after cloning, before `npm install` even runs**: check `vercel.json` isn't empty or malformed — Vercel parses it before anything else, so invalid JSON there fails the build in under a second.
- **AI match score returns a raw parsing error**: this should no longer happen (`app/api/match-score/route.ts` has a robust fallback parser and clean error messages), but if it does, check the Vercel function logs for the actual raw Gemini output — it's logged via `console.error` for exactly this kind of debugging.
- **A modal renders squashed behind other content instead of centered**: check it isn't nested inside an element with a CSS `backdrop-blur`/`filter` applied — that makes the blurred element a containing block for any `position: fixed` children, breaking full-screen overlays. Render modals at the page level instead (see how `JobDetailModal`, `JobForm`, and `ResumeTextModal` are rendered in `app/page.tsx`, not inside `Navbar.tsx`).

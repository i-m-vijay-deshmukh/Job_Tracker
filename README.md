# Job Tracker

A clean, modern job application tracker built with Next.js (App Router), React, Tailwind CSS, Lucide icons, and Supabase for auth, database, and file storage.

## Features

- **Auth**: Google OAuth and Phone Number (OTP) sign-in, backed by Supabase Auth.
- **Row Level Security**: every user can only read, create, edit, and delete their own job cards — enforced at the database level, not just in the UI.
- **Job cards**: company, title, field/category, tag-style skills, description, resume (file upload or link), and status (`Applied`, `OA`, `Interview` with an interview date, `Offer`, `Rejected`).
- **Dashboard**: search by title/company, filter by status/field/skill, inline status changes, edit and delete from each card.

## Project structure

```
app/
  layout.tsx           Root layout, fonts
  page.tsx             Dashboard (protected)
  login/page.tsx        Google OAuth + Phone OTP sign-in
  auth/callback/route.ts OAuth redirect handler
components/
  Navbar.tsx
  SearchBar.tsx
  FilterBar.tsx
  JobCardItem.tsx
  JobForm.tsx           Create/edit modal
  SkillsInput.tsx        Tag input for skills
  StatusBadge.tsx
  ConfirmDialog.tsx
lib/
  types.ts              Shared TypeScript types
  utils.ts              Formatting/color helpers
  jobs.ts               Database service functions (CRUD + resume upload)
  supabase/
    client.ts           Browser Supabase client
    server.ts           Server Supabase client
    middleware.ts        Session refresh + route protection
middleware.ts
supabase/
  schema.sql            Table, RLS policies, storage bucket + policies
```

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, and note your **Project URL** and **anon public key** from *Project Settings > API*.

### 2. Run the database schema

Open the SQL Editor in your Supabase dashboard and run the contents of `supabase/schema.sql`. This creates:

- the `job_cards` table with a `status` check constraint
- Row Level Security policies so `auth.uid() = user_id` gates every read/write
- a private `resumes` storage bucket with per-user folder policies

### 3. Enable auth providers

In **Authentication > Providers**:

- **Google**: enable it, and add your OAuth Client ID/Secret from the [Google Cloud Console](https://console.cloud.google.com/). Set the authorized redirect URI to `https://<your-project-ref>.supabase.co/auth/v1/callback`.
- **Phone**: enable Phone auth and configure an SMS provider (Twilio, MessageBird, or Vonage) under **Authentication > Providers > Phone**.

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 5. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll land on `/login`. After signing in you're redirected to the dashboard.

## Notes

- Resumes uploaded as files are stored in the private `resumes` bucket under `{user_id}/...` and opened via short-lived signed URLs; resumes added as a link are stored as-is in `resume_url`.
- The `Interview` status reveals an interview date field in the form; switching away from `Interview` clears the stored date.
- All filter options (status, field, skill) are derived live from the signed-in user's own job cards.

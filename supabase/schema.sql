-- ============================================================================
-- Job Tracker — Supabase schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Table: job_cards
-- ----------------------------------------------------------------------------
create table if not exists public.job_cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  company_name     text not null,
  job_title        text not null,
  job_field        text,
  skills           text[] not null default '{}',
  job_description  text,
  resume_url       text,
  status           text not null default 'Applied'
                     check (status in ('Applied', 'OA', 'Interview', 'Offer', 'Rejected')),
  interview_date   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists job_cards_user_id_idx on public.job_cards (user_id);
create index if not exists job_cards_status_idx on public.job_cards (status);

-- ----------------------------------------------------------------------------
-- Row Level Security — each user can only see and modify their own rows.
-- ----------------------------------------------------------------------------
alter table public.job_cards enable row level security;

drop policy if exists "Users can view own job cards" on public.job_cards;
create policy "Users can view own job cards"
  on public.job_cards for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own job cards" on public.job_cards;
create policy "Users can insert own job cards"
  on public.job_cards for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own job cards" on public.job_cards;
create policy "Users can update own job cards"
  on public.job_cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own job cards" on public.job_cards;
create policy "Users can delete own job cards"
  on public.job_cards for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Keep updated_at fresh automatically.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_job_cards_updated_at on public.job_cards;
create trigger set_job_cards_updated_at
  before update on public.job_cards
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Storage bucket for resume uploads (private — access via signed URLs only).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own resumes" on storage.objects;
create policy "Users can upload own resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can view own resumes" on storage.objects;
create policy "Users can view own resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own resumes" on storage.objects;
create policy "Users can delete own resumes"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

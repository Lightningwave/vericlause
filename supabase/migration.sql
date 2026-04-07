-- ============================================================
-- VeriClause database schema
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Documents table
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  file_name   text not null,
  file_path   text,                -- path in Supabase Storage bucket
  raw_text    text not null,
  extracted   jsonb,               -- ExtractedContract JSON
  created_at  timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Users can insert their own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can delete their own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

create index idx_documents_user_id on public.documents(user_id);

-- 2. Reports table
create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  verdicts          jsonb not null default '[]',   -- ComplianceVerdict[]
  compliance_score  integer not null default 0,
  created_at        timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "Users can delete their own reports"
  on public.reports for delete
  using (auth.uid() = user_id);

create index idx_reports_document_id on public.reports(document_id);
create index idx_reports_user_id on public.reports(user_id);

-- 2b. Analysis jobs table (async/polling workflow)
create table public.analysis_jobs (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'queued', -- queued | running | succeeded | failed
  error        text,
  report_id    uuid references public.reports(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.analysis_jobs enable row level security;

create policy "Users can insert their own analysis jobs"
  on public.analysis_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own analysis jobs"
  on public.analysis_jobs for select
  using (auth.uid() = user_id);

create policy "Users can update their own analysis jobs"
  on public.analysis_jobs for update
  using (auth.uid() = user_id);

create index idx_analysis_jobs_document_id on public.analysis_jobs(document_id);
create index idx_analysis_jobs_user_id on public.analysis_jobs(user_id);

-- 3. Resumes (onboarding: PDF/DOCX → LlamaCloud → profile + suggestions)
create table public.resumes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  file_name      text not null,
  file_path      text,
  raw_text       text not null,
  parsed_profile jsonb,
  ai_suggestions jsonb,
  image_urls     jsonb,
  created_at     timestamptz not null default now()
);

alter table public.resumes enable row level security;

create policy "Users can insert their own resumes"
  on public.resumes for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own resumes"
  on public.resumes for select
  using (auth.uid() = user_id);

create policy "Users can update their own resumes"
  on public.resumes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own resumes"
  on public.resumes for delete
  using (auth.uid() = user_id);

create index idx_resumes_user_id on public.resumes(user_id);

-- 3b. Profiling jobs (async polling for POST /api/resumes/profile)
create table public.profiling_jobs (
  id          uuid primary key default gen_random_uuid(),
  resume_id   uuid not null references public.resumes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'queued',
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiling_jobs enable row level security;

create policy "Users can insert their own profiling jobs"
  on public.profiling_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own profiling jobs"
  on public.profiling_jobs for select
  using (auth.uid() = user_id);

create policy "Users can update their own profiling jobs"
  on public.profiling_jobs for update
  using (auth.uid() = user_id);

create index idx_profiling_jobs_resume_id on public.profiling_jobs(resume_id);
create index idx_profiling_jobs_user_id on public.profiling_jobs(user_id);

-- 3c. Comparison jobs (async polling for POST /api/contracts/compare)
create table public.comparison_jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  document_a_id  uuid not null references public.documents(id) on delete cascade,
  document_b_id  uuid not null references public.documents(id) on delete cascade,
  status         text not null default 'queued', -- queued | running | succeeded | failed
  error          text,
  result         jsonb, -- ContractComparison JSON
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.comparison_jobs enable row level security;

create policy "Users can insert their own comparison jobs"
  on public.comparison_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own comparison jobs"
  on public.comparison_jobs for select
  using (auth.uid() = user_id);

create policy "Users can update their own comparison jobs"
  on public.comparison_jobs for update
  using (auth.uid() = user_id);

create index idx_comparison_jobs_user_id on public.comparison_jobs(user_id);
create index idx_comparison_jobs_docs on public.comparison_jobs(document_a_id, document_b_id);

-- 4. Storage bucket for contract PDFs
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own contracts" on storage.objects;
create policy "Users can upload their own contracts"
  on storage.objects for insert
  with check (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can view their own contracts" on storage.objects;
create policy "Users can view their own contracts"
  on storage.objects for select
  using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own contracts" on storage.objects;
create policy "Users can delete their own contracts"
  on storage.objects for delete
  using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Storage bucket for resume files (PDF/DOCX)
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own resumes" on storage.objects;
create policy "Users can upload their own resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can view their own resumes" on storage.objects;
create policy "Users can view their own resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own resumes" on storage.objects;
create policy "Users can delete their own resumes"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Interview sessions (transcript + AI scoring)
create table if not exists public.interview_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  resume_id     uuid references public.resumes(id) on delete set null,
  interviewer   text not null check (interviewer in ('alex','sophia')),
  transcript    jsonb not null default '[]', -- InterviewTranscriptLine[]
  score         jsonb not null,              -- InterviewScoreResult
  overall_score integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.interview_sessions enable row level security;

drop policy if exists "Users can insert their own interview sessions" on public.interview_sessions;
create policy "Users can insert their own interview sessions"
  on public.interview_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own interview sessions" on public.interview_sessions;
create policy "Users can view their own interview sessions"
  on public.interview_sessions for select
  using (auth.uid() = user_id);

create index if not exists idx_interview_sessions_user_id on public.interview_sessions(user_id);
create index if not exists idx_interview_sessions_resume_id on public.interview_sessions(resume_id);

-- 7. User profiles (billing / plan; used by lib/billing and Stripe webhooks)
create table if not exists public.profiles (
  id                              uuid primary key references auth.users(id) on delete cascade,
  plan                            text not null default 'free',
  stripe_customer_id              text,
  stripe_subscription_id          text,
  current_period_end              timestamptz,
  subscription_cancel_at_period_end boolean not null default false,
  updated_at                      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

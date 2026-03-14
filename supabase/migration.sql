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

-- 3. Storage bucket for contract PDFs
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false);

create policy "Users can upload their own contracts"
  on storage.objects for insert
  with check (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own contracts"
  on storage.objects for select
  using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own contracts"
  on storage.objects for delete
  using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

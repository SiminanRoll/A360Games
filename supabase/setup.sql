-- Spot the Phish static-site schema

create table if not exists public.quiz_submissions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  answers_json jsonb not null default '[]'::jsonb
);

create table if not exists public.quiz_feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text,
  score integer,
  answers_json jsonb,
  message text not null
);

alter table public.quiz_submissions enable row level security;
alter table public.quiz_feedback enable row level security;

drop policy if exists "anon insert quiz_submissions" on public.quiz_submissions;
create policy "anon insert quiz_submissions"
on public.quiz_submissions
for insert
to anon
with check (true);

drop policy if exists "anon select quiz_submissions" on public.quiz_submissions;
create policy "anon select quiz_submissions"
on public.quiz_submissions
for select
to anon
using (true);

drop policy if exists "anon insert quiz_feedback" on public.quiz_feedback;
create policy "anon insert quiz_feedback"
on public.quiz_feedback
for insert
to anon
with check (true);

drop policy if exists "anon select quiz_feedback" on public.quiz_feedback;
create policy "anon select quiz_feedback"
on public.quiz_feedback
for select
to anon
using (true);

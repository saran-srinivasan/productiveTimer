create table if not exists public.focus_tasks (
  id uuid primary key,
  name text not null,
  target_minutes integer not null default 30,
  color text not null default '#287c6f',
  created_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key,
  task_id uuid not null references public.focus_tasks(id) on delete cascade,
  seconds integer not null check (seconds > 0),
  note text not null default '',
  work_date date not null,
  ended_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists focus_sessions_work_date_idx
  on public.focus_sessions (work_date desc);

create index if not exists focus_sessions_task_id_idx
  on public.focus_sessions (task_id);

alter table public.focus_tasks enable row level security;
alter table public.focus_sessions enable row level security;

drop policy if exists "anon can manage focus tasks" on public.focus_tasks;
drop policy if exists "anon can manage focus sessions" on public.focus_sessions;

create policy "anon can manage focus tasks"
  on public.focus_tasks
  for all
  to anon
  using (true)
  with check (true);

create policy "anon can manage focus sessions"
  on public.focus_sessions
  for all
  to anon
  using (true)
  with check (true);

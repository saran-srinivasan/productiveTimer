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

create table if not exists public.workout_entries (
  id uuid primary key,
  work_date date not null,
  kind text not null check (kind in ('strength', 'cardio')),
  exercise text not null,
  sets integer,
  reps integer,
  weight numeric,
  duration_minutes integer,
  distance numeric,
  intensity text not null default 'moderate',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists workout_entries_work_date_idx
  on public.workout_entries (work_date desc);

create index if not exists workout_entries_kind_idx
  on public.workout_entries (kind);

with ranked_tasks as (
  select
    id,
    first_value(id) over (
      partition by lower(btrim(name))
      order by created_at, id
    ) as canonical_id
  from public.focus_tasks
)
update public.focus_sessions s
set task_id = ranked_tasks.canonical_id
from ranked_tasks
where s.task_id = ranked_tasks.id
  and ranked_tasks.id <> ranked_tasks.canonical_id;

with ranked_tasks as (
  select
    id,
    first_value(id) over (
      partition by lower(btrim(name))
      order by created_at, id
    ) as canonical_id
  from public.focus_tasks
)
delete from public.focus_tasks t
using ranked_tasks
where t.id = ranked_tasks.id
  and ranked_tasks.id <> ranked_tasks.canonical_id;

create unique index if not exists focus_tasks_name_unique_idx
  on public.focus_tasks (lower(btrim(name)));

alter table public.focus_tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.workout_entries enable row level security;

drop policy if exists "anon can manage focus tasks" on public.focus_tasks;
drop policy if exists "anon can manage focus sessions" on public.focus_sessions;
drop policy if exists "anon can manage workout entries" on public.workout_entries;

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

create policy "anon can manage workout entries"
  on public.workout_entries
  for all
  to anon
  using (true)
  with check (true);

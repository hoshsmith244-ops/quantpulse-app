-- QuantPulse sync schema
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again; every statement is idempotent.
--
-- One row per user holding a single JSON document. A document rather than
-- columns because the client already merges the shape it cares about, and a
-- schema migration every time a preference is added would be busywork for data
-- only its owner ever reads.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security is what makes the public anon key safe to ship in the
-- browser bundle. WITHOUT THIS, ANY VISITOR COULD READ EVERY USER'S ROW.
alter table public.user_state enable row level security;

-- Recreated rather than guarded, so re-running picks up any policy change.
drop policy if exists "user_state: owner can read"   on public.user_state;
drop policy if exists "user_state: owner can insert" on public.user_state;
drop policy if exists "user_state: owner can update" on public.user_state;
drop policy if exists "user_state: owner can delete" on public.user_state;

create policy "user_state: owner can read"
  on public.user_state for select
  using (auth.uid() = user_id);

create policy "user_state: owner can insert"
  on public.user_state for insert
  with check (auth.uid() = user_id);

create policy "user_state: owner can update"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_state: owner can delete"
  on public.user_state for delete
  using (auth.uid() = user_id);

-- Keep updated_at honest even if a client forgets to send it.
create or replace function public.touch_user_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch
  before update on public.user_state
  for each row execute function public.touch_user_state();

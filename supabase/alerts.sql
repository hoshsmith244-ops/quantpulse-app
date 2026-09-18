-- QuantPulse server-side pre-close alerts
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again; every statement is idempotent.
--
-- Records what has already been emailed, so the job can run every few minutes
-- across the window without sending the same instruction twice -- and can tell
-- when an instruction it already sent no longer holds, which is the stand-down.

create table if not exists public.alert_log (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  -- "SYMBOL:factor", matching the watchlist's own key.
  entry_key    text        not null,
  -- The venue's session date, NOT the last completed bar. Inside the window
  -- today's bar does not exist yet, so keying on the bar would file today's
  -- alert under yesterday.
  session_date date        not null,
  dir          text        not null check (dir in ('in', 'out')),
  -- Set when the instruction was later withdrawn, so a stand-down is sent once.
  cancelled_at timestamptz,
  sent_at      timestamptz not null default now(),
  primary key (user_id, entry_key, session_date)
);

-- The job reads "what did I send today" on every pass.
create index if not exists alert_log_user_date_idx
  on public.alert_log (user_id, session_date);

alter table public.alert_log enable row level security;

-- Deliberately READ-ONLY for end users: rows are written by the scheduled job
-- through the service role, which bypasses RLS entirely. Nobody signed in
-- should be able to forge or delete a record of what was sent to them.
drop policy if exists "alert_log: owner can read" on public.alert_log;
create policy "alert_log: owner can read"
  on public.alert_log for select
  using (auth.uid() = user_id);

grant select on public.alert_log to authenticated;

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------
--
-- pg_cron rather than the host's scheduler: the window is ten minutes wide and
-- GitHub and Vercel both treat cron times as approximate.
--
-- The schedule is deliberately BROAD and the endpoint decides for itself
-- whether it is genuinely inside the window, by reading the venue's real
-- session end. That way daylight saving, market holidays, early closes and
-- scheduler drift are all handled in one place instead of encoded in a cron
-- expression that will rot.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace BOTH placeholders below before running:
--   <APP_URL>      e.g. https://quantpulse-app-alpha.vercel.app
--   <CRON_SECRET>  the same value set in the Vercel environment
--
-- 19:30-21:00 UTC covers 3:30-5:00pm EDT and 2:30-4:00pm EST, so the real
-- 3:40pm window falls inside it whichever side of DST we are on. Runs that
-- land outside the window return immediately without touching market data.

select cron.unschedule('quantpulse-pre-close')
  where exists (select 1 from cron.job where jobname = 'quantpulse-pre-close');

select cron.schedule(
  'quantpulse-pre-close',
  '*/3 19-21 * * 1-5',
  $$
  select net.http_post(
    url     := '<APP_URL>/api/cron/pre-close',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    timeout_milliseconds := 55000
  );
  $$
);

-- Useful afterwards:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 20;

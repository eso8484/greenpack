-- Migration 014: DB-backed rate limiting (serverless-safe fixed window)
-- -----------------------------------------------------------------------------
-- An in-memory counter doesn't work on serverless (each invocation may be a new
-- instance), so the limiter lives in Postgres. check_rate_limit() atomically
-- increments a per-(key, time-window) bucket and reports whether the caller is
-- still under the limit. Used by src/lib/rate-limit.ts.

create table if not exists public.rate_limits (
  bucket text primary key,
  count integer not null default 0,
  expires_at timestamptz not null
);
create index if not exists rate_limits_expires_idx on public.rate_limits(expires_at);

-- Lock the table down: no policies → no anon/authenticated access. Only the
-- SECURITY DEFINER function below and the service-role key touch it.
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket text;
  v_count integer;
begin
  v_bucket := p_key || ':' || floor(extract(epoch from now()) / p_window_seconds)::text;

  insert into public.rate_limits as rl (bucket, count, expires_at)
    values (v_bucket, 1, now() + make_interval(secs => p_window_seconds * 2))
  on conflict (bucket)
    do update set count = rl.count + 1
  returning rl.count into v_count;

  -- Opportunistic cleanup of expired buckets (~2% of calls).
  if random() < 0.02 then
    delete from public.rate_limits where expires_at < now();
  end if;

  return v_count <= p_limit;  -- true = allowed
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

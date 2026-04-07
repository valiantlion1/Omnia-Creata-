create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  service_tier text not null default 'internal',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.service_environments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  slug text not null check (slug in ('staging', 'production')),
  name text not null,
  base_url text not null,
  login_path text not null default '/login',
  health_path text not null default '/api/v1/healthz',
  version_path text not null default '/api/v1/version',
  cadence_minutes integer not null check (cadence_minutes > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (service_id, slug)
);

create table if not exists public.check_runs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  service_environment_id uuid not null references public.service_environments(id) on delete cascade,
  run_type text not null,
  source text not null,
  status text not null check (status in ('healthy', 'degraded', 'failed')),
  summary text not null,
  fingerprint text,
  health_status text,
  login_ok boolean,
  version_build text,
  version_label text,
  checked_paths jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  service_environment_id uuid not null references public.service_environments(id) on delete cascade,
  fingerprint text not null,
  title text not null,
  summary text not null,
  severity text not null check (severity in ('P1', 'P2', 'P3')),
  state text not null check (state in ('open', 'acknowledged', 'auto_remediating', 'resolved', 'escalated', 'silenced')),
  source text not null default 'api',
  latest_check_run_id uuid references public.check_runs(id) on delete set null,
  latest_action_run_id uuid,
  auto_remediation_attempted boolean not null default false,
  recommended_next_path text,
  opened_at timestamptz not null default timezone('utc', now()),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  silenced_until timestamptz,
  last_seen_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists incidents_one_active_fingerprint_idx
  on public.incidents(fingerprint)
  where state in ('open', 'acknowledged', 'auto_remediating', 'escalated', 'silenced');

create table if not exists public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.action_runs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete set null,
  service_id uuid not null references public.services(id) on delete cascade,
  service_environment_id uuid not null references public.service_environments(id) on delete cascade,
  recipe text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  requested_by text not null,
  summary text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

alter table public.incidents
  add constraint incidents_latest_action_run_fk
  foreign key (latest_action_run_id) references public.action_runs(id) on delete set null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete set null,
  channel text not null,
  severity text check (severity in ('P1', 'P2', 'P3')),
  kind text not null,
  destination text,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.codex_escalations (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  status text not null default 'open',
  bundle jsonb not null default '{}'::jsonb,
  recommended_next_path text not null,
  notified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.operator_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  telegram_chat_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.operator_tokens (
  id uuid primary key default gen_random_uuid(),
  operator_profile_id uuid not null references public.operator_profiles(id) on delete cascade,
  label text not null,
  token_hash text not null unique,
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.artifact_blobs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete set null,
  action_run_id uuid references public.action_runs(id) on delete set null,
  kind text not null,
  label text not null,
  href text not null,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.services (slug, name, description, service_tier)
values ('studio', 'OmniaCreata Studio', 'Studio-first OCOS monitored surface.', 'internal')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    service_tier = excluded.service_tier,
    updated_at = timezone('utc', now());

with studio as (
  select id from public.services where slug = 'studio'
)
insert into public.service_environments (
  service_id,
  slug,
  name,
  base_url,
  login_path,
  health_path,
  version_path,
  cadence_minutes
)
select studio.id, 'production', 'Production', 'https://studio.omniacreata.com', '/login', '/api/v1/healthz', '/api/v1/version', 5
from studio
on conflict (service_id, slug) do update
set name = excluded.name,
    base_url = excluded.base_url,
    login_path = excluded.login_path,
    health_path = excluded.health_path,
    version_path = excluded.version_path,
    cadence_minutes = excluded.cadence_minutes,
    updated_at = timezone('utc', now());

with studio as (
  select id from public.services where slug = 'studio'
)
insert into public.service_environments (
  service_id,
  slug,
  name,
  base_url,
  login_path,
  health_path,
  version_path,
  cadence_minutes
)
select studio.id, 'staging', 'Staging', 'https://staging-studio.omniacreata.com', '/login', '/api/v1/healthz', '/api/v1/version', 15
from studio
on conflict (service_id, slug) do update
set name = excluded.name,
    base_url = excluded.base_url,
    login_path = excluded.login_path,
    health_path = excluded.health_path,
    version_path = excluded.version_path,
    cadence_minutes = excluded.cadence_minutes,
    updated_at = timezone('utc', now());

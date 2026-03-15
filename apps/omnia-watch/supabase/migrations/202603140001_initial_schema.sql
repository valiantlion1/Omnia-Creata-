create extension if not exists pgcrypto;

create type public.locale_code as enum ('en', 'tr');
create type public.device_status as enum ('healthy', 'attention', 'critical', 'offline');
create type public.scan_app_status as enum ('current', 'updatable', 'manual', 'unsupported', 'error', 'ignored');
create type public.scan_action_type as enum ('automatic', 'manual', 'none', 'pending');
create type public.recommendation_severity as enum ('low', 'medium', 'high', 'critical');
create type public.recommendation_category as enum ('updates', 'cleanup', 'startup', 'security', 'health', 'sync');
create type public.operation_type as enum ('scan', 'sync', 'update', 'cleanup', 'startup-change', 'pairing', 'security-check');
create type public.operation_status as enum ('success', 'partial', 'failed', 'running');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'paused');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  default_locale public.locale_code not null default 'en',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  locale public.locale_code not null default 'en',
  marketing_emails boolean not null default false,
  recommendation_digest boolean not null default true,
  release_channel text not null default 'stable' check (release_channel in ('stable', 'preview')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.plans (
  id text primary key,
  name text not null,
  tier_rank integer not null,
  monthly_price_cents integer not null default 0,
  yearly_price_cents integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status public.subscription_status not null default 'trialing',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  platform text not null check (platform in ('windows')),
  os_version text not null,
  status public.device_status not null default 'healthy',
  attention_score integer not null default 0 check (attention_score between 0 and 100),
  issue_count integer not null default 0 check (issue_count >= 0),
  machine_fingerprint text,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  last_scan_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.device_pairings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  pairing_code_hash text not null,
  device_token_hash text,
  paired_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.device_scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  scanned_at timestamptz not null,
  synced_at timestamptz not null default timezone('utc'::text, now()),
  scan_version text not null default '1',
  health_summary jsonb not null default '{}'::jsonb,
  counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.scan_app_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  scan_id uuid not null references public.device_scans (id) on delete cascade,
  app_id text not null,
  display_name text not null,
  normalized_name text not null,
  publisher text,
  installed_version text,
  available_version text,
  source_kind text not null default 'unknown',
  detection_method text not null,
  install_path text,
  status public.scan_app_status not null,
  action_type public.scan_action_type not null,
  update_confidence numeric(4, 3),
  notes text,
  technical_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.scan_cleanup_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  scan_id uuid not null references public.device_scans (id) on delete cascade,
  category text not null,
  label text not null,
  estimated_bytes bigint not null default 0,
  safety_level text not null default 'safe' check (safety_level in ('safe', 'review')),
  selected_by_default boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.scan_startup_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  scan_id uuid not null references public.device_scans (id) on delete cascade,
  name text not null,
  command text not null,
  enabled boolean not null default true,
  impact text not null default 'unknown' check (impact in ('low', 'medium', 'high', 'unknown')),
  source text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.scan_security_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  scan_id uuid not null references public.device_scans (id) on delete cascade,
  signal_key text not null,
  label text not null,
  status text not null check (status in ('ok', 'warning', 'critical', 'unknown')),
  detail text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.maintenance_recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  scan_id uuid references public.device_scans (id) on delete set null,
  severity public.recommendation_severity not null,
  category public.recommendation_category not null,
  title text not null,
  summary text not null,
  action_label text not null,
  action_path text not null,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.operation_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid references public.devices (id) on delete cascade,
  operation_type public.operation_type not null,
  status public.operation_status not null,
  title text not null,
  summary text not null,
  technical_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid references public.devices (id) on delete cascade,
  event_type text not null,
  title text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null,
  version text not null,
  accepted_at timestamptz not null default timezone('utc'::text, now()),
  ip_address inet,
  user_agent text
);

create index devices_owner_last_seen_idx on public.devices (owner_id, last_seen_at desc);
create index device_scans_device_scanned_idx on public.device_scans (device_id, scanned_at desc);
create index recommendations_owner_created_idx on public.maintenance_recommendations (owner_id, created_at desc);
create index operation_logs_owner_created_idx on public.operation_logs (owner_id, created_at desc);
create index activity_events_owner_created_idx on public.activity_events (owner_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger devices_set_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

create trigger device_pairings_set_updated_at
before update on public.device_pairings
for each row execute function public.set_updated_at();

create trigger maintenance_recommendations_set_updated_at
before update on public.maintenance_recommendations
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.plans (id, name, tier_rank, monthly_price_cents, yearly_price_cents, metadata)
values
  ('free', 'Free', 0, 0, 0, '{"device_limit":1,"support":"community"}'),
  ('pro', 'Pro', 1, 1200, 12000, '{"device_limit":5,"support":"priority"}'),
  ('team', 'Team', 2, 4900, 49000, '{"device_limit":25,"support":"managed"}')
on conflict (id) do update
set
  name = excluded.name,
  tier_rank = excluded.tier_rank,
  monthly_price_cents = excluded.monthly_price_cents,
  yearly_price_cents = excluded.yearly_price_cents,
  metadata = excluded.metadata;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.devices enable row level security;
alter table public.device_pairings enable row level security;
alter table public.device_scans enable row level security;
alter table public.scan_app_items enable row level security;
alter table public.scan_cleanup_items enable row level security;
alter table public.scan_startup_items enable row level security;
alter table public.scan_security_items enable row level security;
alter table public.maintenance_recommendations enable row level security;
alter table public.operation_logs enable row level security;
alter table public.activity_events enable row level security;
alter table public.legal_acceptances enable row level security;

create policy "plans are readable by authenticated users"
on public.plans for select
to authenticated
using (true);

create policy "users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users can read own preferences"
on public.user_preferences for select
to authenticated
using (auth.uid() = user_id);

create policy "users can update own preferences"
on public.user_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can read own subscriptions"
on public.subscriptions for select
to authenticated
using (auth.uid() = user_id);

create policy "users can manage own devices"
on public.devices for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own pairings"
on public.device_pairings for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own scans"
on public.device_scans for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own scan app items"
on public.scan_app_items for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own scan cleanup items"
on public.scan_cleanup_items for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own scan startup items"
on public.scan_startup_items for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own scan security items"
on public.scan_security_items for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own recommendations"
on public.maintenance_recommendations for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own operation logs"
on public.operation_logs for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can manage own activity events"
on public.activity_events for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "users can read own legal acceptances"
on public.legal_acceptances for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own legal acceptances"
on public.legal_acceptances for insert
to authenticated
with check (auth.uid() = user_id);

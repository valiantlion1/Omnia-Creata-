create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.projects (slug, name, description)
values ('studio', 'OmniaCreata Studio', 'Studio-first project cockpit for OCOS foundation.')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = timezone('utc', now());

alter table public.services
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

update public.services
set project_id = public.projects.id,
    updated_at = timezone('utc', now())
from public.projects
where public.services.slug = 'studio'
  and public.projects.slug = 'studio'
  and public.services.project_id is distinct from public.projects.id;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'project_id'
      and is_nullable = 'YES'
  ) and not exists (select 1 from public.services where project_id is null) then
    alter table public.services alter column project_id set not null;
  end if;
end $$;

create index if not exists services_project_id_idx
  on public.services(project_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scope_level text not null check (scope_level in ('project', 'service', 'incident')),
  scope_key text not null,
  report_type text not null check (report_type in ('overview', 'daily', 'weekly', 'incident_snapshot')),
  status text not null check (status in ('healthy', 'degraded', 'failed')),
  headline text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'system',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists reports_scope_period_unique_idx
  on public.reports(scope_key, report_type, period_start, period_end);

create index if not exists reports_project_id_idx
  on public.reports(project_id, report_type, updated_at desc);

create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  preferred_locale text default 'en',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  language text not null default 'en',
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  density text not null default 'comfortable' check (density in ('comfortable', 'compact')),
  default_view text not null default 'list' check (default_view in ('list', 'grid')),
  enable_offline_cache boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  key text not null,
  label_en text not null,
  label_tr text not null,
  description_en text,
  description_tr text,
  tone text not null default 'teal',
  icon text not null default 'folder',
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, key)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  color text not null default 'teal',
  icon text not null default 'folder',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create table if not exists public.platform_catalog (
  key text primary key,
  label_en text not null,
  label_tr text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  summary text,
  notes text,
  result_notes text,
  recommended_variations text,
  type text not null check (type in ('prompt', 'idea', 'workflow', 'template', 'system_prompt', 'agent_instruction', 'text_block', 'note')),
  status text not null default 'draft' check (status in ('draft', 'active', 'reviewed', 'archived')),
  language text not null default 'en',
  category_id uuid references public.categories(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  source_url text,
  source_label text,
  rating smallint check (rating between 1 and 5),
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  is_pinned boolean not null default false,
  variables jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  version_chain_id uuid not null default gen_random_uuid(),
  latest_version_id uuid,
  latest_version_number integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  version_number integer not null,
  body text not null,
  summary text,
  result_notes text,
  change_summary text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (prompt_id, version_number)
);

create table if not exists public.prompt_tags (
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (prompt_id, tag_id)
);

create table if not exists public.prompt_platforms (
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  platform_key text not null references public.platform_catalog(key) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (prompt_id, platform_key)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete cascade,
  type text not null check (type in ('created', 'updated', 'favorited', 'archived', 'version_created', 'exported')),
  description text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  format text not null check (format in ('json', 'markdown', 'txt')),
  status text not null default 'completed' check (status in ('queued', 'completed', 'failed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_requests (
  id uuid primary key,
  actor_id text not null,
  action text not null,
  provider text not null,
  model text not null,
  status text not null check (status in ('success', 'rate_limited', 'failed')),
  prompt_id uuid references public.prompts(id) on delete set null,
  latency_ms integer not null default 0,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_suggestion_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete cascade,
  action text not null,
  provider text not null,
  model text not null,
  suggestion_payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('pending', 'applied', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prompt_shares (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private', 'team', 'public_link')),
  share_slug text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_key text not null default 'starter',
  status text not null default 'inactive',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
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

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute procedure public.handle_updated_at();

drop trigger if exists user_preferences_updated_at on public.user_preferences;
create trigger user_preferences_updated_at before update on public.user_preferences
for each row execute procedure public.handle_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
for each row execute procedure public.handle_updated_at();

drop trigger if exists collections_updated_at on public.collections;
create trigger collections_updated_at before update on public.collections
for each row execute procedure public.handle_updated_at();

drop trigger if exists prompts_updated_at on public.prompts;
create trigger prompts_updated_at before update on public.prompts
for each row execute procedure public.handle_updated_at();

drop trigger if exists prompt_shares_updated_at on public.prompt_shares;
create trigger prompt_shares_updated_at before update on public.prompt_shares
for each row execute procedure public.handle_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute procedure public.handle_updated_at();

drop trigger if exists ai_suggestion_feedback_updated_at on public.ai_suggestion_feedback;
create trigger ai_suggestion_feedback_updated_at before update on public.ai_suggestion_feedback
for each row execute procedure public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.tags enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.prompt_tags enable row level security;
alter table public.prompt_platforms enable row level security;
alter table public.activities enable row level security;
alter table public.exports enable row level security;
alter table public.ai_requests enable row level security;
alter table public.ai_suggestion_feedback enable row level security;
alter table public.prompt_shares enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles select own" on public.profiles
for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles
for update using (auth.uid() = id);

create policy "preferences own" on public.user_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories read system or own" on public.categories
for select using (user_id is null or auth.uid() = user_id);
create policy "categories manage own" on public.categories
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "collections own" on public.collections
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tags own" on public.tags
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "prompts own" on public.prompts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "prompt versions own" on public.prompt_versions
for all using (
  exists (
    select 1
    from public.prompts
    where prompts.id = prompt_versions.prompt_id
      and prompts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.prompts
    where prompts.id = prompt_versions.prompt_id
      and prompts.user_id = auth.uid()
  )
);

create policy "prompt tags own" on public.prompt_tags
for all using (
  exists (
    select 1
    from public.prompts
    where prompts.id = prompt_tags.prompt_id
      and prompts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.prompts
    where prompts.id = prompt_tags.prompt_id
      and prompts.user_id = auth.uid()
  )
);

create policy "prompt platforms own" on public.prompt_platforms
for all using (
  exists (
    select 1
    from public.prompts
    where prompts.id = prompt_platforms.prompt_id
      and prompts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.prompts
    where prompts.id = prompt_platforms.prompt_id
      and prompts.user_id = auth.uid()
  )
);

create policy "activities own" on public.activities
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exports own" on public.exports
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai requests own" on public.ai_requests
for select using (auth.uid()::text = actor_id);

create policy "ai suggestion feedback own" on public.ai_suggestion_feedback
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "prompt shares own" on public.prompt_shares
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "subscriptions own" on public.subscriptions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.platform_catalog (key, label_en, label_tr)
values
  ('chatgpt', 'ChatGPT', 'ChatGPT'),
  ('claude', 'Claude', 'Claude'),
  ('gemini', 'Gemini', 'Gemini'),
  ('midjourney', 'Midjourney', 'Midjourney'),
  ('flux', 'Flux', 'Flux'),
  ('stable_diffusion', 'Stable Diffusion', 'Stable Diffusion'),
  ('runway', 'Runway', 'Runway'),
  ('veo', 'Veo', 'Veo'),
  ('kling', 'Kling', 'Kling'),
  ('suno', 'Suno', 'Suno'),
  ('replit', 'Replit', 'Replit'),
  ('codex', 'Codex', 'Codex'),
  ('cursor', 'Cursor', 'Cursor'),
  ('generic', 'Generic', 'Genel'),
  ('other', 'Other', 'Diger')
on conflict (key) do nothing;

insert into public.categories (user_id, key, label_en, label_tr, description_en, description_tr, tone, icon, is_system)
values
  (null, 'image', 'Image', 'Gorsel', 'Prompts for image generation and visual styling.', 'Gorsel uretim ve gorsel stil icin istemler.', 'coral', 'sparkles', true),
  (null, 'video', 'Video', 'Video', 'Video scenes, camera moves, and direction prompts.', 'Video sahneleri, kamera hareketleri ve yonlendirme istemleri.', 'blue', 'film', true),
  (null, 'music', 'Music', 'Muzik', 'Lyrics, sonic moods, and composition ideas.', 'Sarki sozleri, ses dunyalari ve kompozisyon fikirleri.', 'amber', 'music', true),
  (null, 'chat', 'Chat', 'Sohbet', 'General-purpose conversational and assistant prompts.', 'Genel amacli sohbet ve asistan istemleri.', 'teal', 'messages', true),
  (null, 'coding', 'Coding', 'Kodlama', 'Developer workflows, debugging prompts, and architecture notes.', 'Gelistirici akisleri, hata ayiklama istemleri ve mimari notlar.', 'ink', 'code', true),
  (null, 'marketing', 'Marketing', 'Pazarlama', 'Campaign ideas, ad prompts, and brand messaging.', 'Kampanya fikirleri, reklam istemleri ve marka mesajlari.', 'coral', 'megaphone', true),
  (null, 'writing', 'Writing', 'Yazma', 'Articles, scripts, drafts, and writing frameworks.', 'Makale, senaryo, taslak ve yazma cerceveleri.', 'sage', 'pen', true),
  (null, 'storytelling', 'Storytelling', 'Hikaye Anlatimi', 'Narrative structures, character arcs, and scene building.', 'Anlati yapilari, karakter gelisimleri ve sahne kurgusu.', 'amber', 'book', true),
  (null, 'productivity', 'Productivity', 'Verimlilik', 'Daily operating systems, planners, and execution prompts.', 'Gunluk calisma sistemleri, planlayicilar ve uygulama istemleri.', 'sage', 'clock', true),
  (null, 'automation', 'Automation', 'Otomasyon', 'Workflow automations, agents, and repeatable systems.', 'Is akis otomasyonlari, ajanlar ve tekrar kullanilabilir sistemler.', 'teal', 'workflow', true),
  (null, 'agent_tasks', 'Agent Tasks', 'Ajan Gorevleri', 'System instructions and operational agent prompts.', 'Sistem talimatlari ve operasyonel ajan istemleri.', 'ink', 'bot', true),
  (null, 'ui_ux', 'UI/UX', 'UI/UX', 'Design prompts, UX flows, and interface critiques.', 'Tasarim istemleri, UX akisleri ve arayuz degerlendirmeleri.', 'blue', 'layout', true),
  (null, 'research', 'Research', 'Arastirma', 'Exploration prompts, summaries, and analysis structures.', 'Kesif istemleri, ozetler ve analiz yapilari.', 'teal', 'search', true),
  (null, 'business', 'Business', 'Is', 'Strategy, operations, sales, and business systems.', 'Strateji, operasyon, satis ve is sistemleri.', 'ink', 'briefcase', true),
  (null, 'other', 'Other', 'Diger', 'Anything that does not fit a single clear bucket yet.', 'Henuz tek bir net kategoriye sigmayan her sey.', 'sage', 'folder', true)
on conflict (user_id, key) do nothing;

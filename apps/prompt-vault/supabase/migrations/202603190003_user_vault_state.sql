create table if not exists public.user_vault_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists user_vault_state_updated_at on public.user_vault_state;
create trigger user_vault_state_updated_at before update on public.user_vault_state
for each row execute procedure public.handle_updated_at();

alter table public.user_vault_state enable row level security;

drop policy if exists "user vault state own" on public.user_vault_state;
create policy "user vault state own" on public.user_vault_state
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

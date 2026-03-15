alter table public.device_pairings
  add column if not exists pairing_expires_at timestamptz,
  add column if not exists consumed_at timestamptz;

update public.device_pairings
set pairing_expires_at = created_at + interval '30 minutes'
where pairing_expires_at is null
  and paired_at is null;

update public.device_pairings
set consumed_at = paired_at
where consumed_at is null
  and paired_at is not null;

create index if not exists device_pairings_owner_created_idx
  on public.device_pairings (owner_id, created_at desc);

create index if not exists device_pairings_device_active_idx
  on public.device_pairings (device_id, revoked_at, paired_at);

create unique index if not exists device_pairings_pairing_code_hash_key
  on public.device_pairings (pairing_code_hash);

create unique index if not exists device_pairings_device_token_hash_key
  on public.device_pairings (device_token_hash)
  where device_token_hash is not null;

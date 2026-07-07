alter table public.device_locations
add column if not exists buzzer_active boolean not null default false,
add column if not exists buzzer_updated_at timestamptz not null default now();

create table if not exists public.device_buzzer_commands (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.device_locations(device_id) on delete cascade,
  active boolean not null,
  requested_by uuid references public.profiles(id) on delete set null,
  source text not null default 'dashboard' check (source in ('dashboard', 'personnel_app', 'device')),
  created_at timestamptz not null default now()
);

create index if not exists device_buzzer_commands_device_idx
on public.device_buzzer_commands(device_id, created_at desc);

alter table public.device_buzzer_commands enable row level security;

drop policy if exists "authenticated users can read buzzer commands" on public.device_buzzer_commands;
create policy "authenticated users can read buzzer commands" on public.device_buzzer_commands
for select to authenticated using (true);

drop policy if exists "authenticated users can insert buzzer commands" on public.device_buzzer_commands;
create policy "authenticated users can insert buzzer commands" on public.device_buzzer_commands
for insert to authenticated with check (requested_by = auth.uid() or requested_by is null);

drop policy if exists "authenticated users can update device buzzer state" on public.device_locations;
create policy "authenticated users can update device buzzer state" on public.device_locations
for update to authenticated using (true) with check (true);

create or replace function public.set_device_buzzer(
  p_device_id text,
  p_active boolean,
  p_source text default 'personnel_app'
)
returns table (
  device_id text,
  buzzer_active boolean,
  buzzer_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source not in ('dashboard', 'personnel_app', 'device') then
    raise exception 'Invalid buzzer command source: %', p_source;
  end if;

  update public.device_locations dl
  set
    buzzer_active = p_active,
    buzzer_updated_at = now()
  where dl.device_id = p_device_id
  returning dl.device_id, dl.buzzer_active, dl.buzzer_updated_at
  into device_id, buzzer_active, buzzer_updated_at;

  if not found then
    raise exception 'Device not found: %', p_device_id;
  end if;

  insert into public.device_buzzer_commands (device_id, active, requested_by, source)
  values (p_device_id, p_active, auth.uid(), p_source);

  return next;
end;
$$;

grant execute on function public.set_device_buzzer(text, boolean, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.device_locations;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.device_buzzer_commands;
exception
  when duplicate_object then null;
end $$;

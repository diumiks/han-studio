-- =============================================================================
-- Migration v3 — run once in Supabase SQL Editor after v2.
-- Covers: email-gated signup, admin archive permission, 24h cancel rule,
--         swap requests, studio class default location.
-- All statements are idempotent.
-- =============================================================================

-- 1. Allowed-emails roster ----------------------------------------------------
create table if not exists public.allowed_emails (
  email text primary key,
  full_name text not null default '',
  added_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

drop policy if exists "allowed_emails_read" on public.allowed_emails;
create policy "allowed_emails_read" on public.allowed_emails
  for select using (auth.uid() is not null);

drop policy if exists "allowed_emails_write_admin" on public.allowed_emails;
create policy "allowed_emails_write_admin" on public.allowed_emails
  for all using (public.is_admin()) with check (public.is_admin());

-- Ensure the configured admin email can always sign up.
insert into public.allowed_emails (email)
select value from public.settings where key = 'admin_email' and value <> ''
on conflict (email) do nothing;

-- Grandfather existing users so they aren't locked out by the new rule.
insert into public.allowed_emails (email, full_name)
select email, full_name from public.profiles
on conflict (email) do nothing;


-- 2. handle_new_user: enforce allowed_emails ---------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_email text;
  is_allowed boolean;
  invite_name text;
begin
  select value into admin_email from public.settings where key = 'admin_email';

  select exists(select 1 from public.allowed_emails where lower(email) = lower(new.email))
  into is_allowed;

  if lower(coalesce(new.email, '')) <> lower(coalesce(admin_email, '')) and not is_allowed then
    raise exception 'Email % is not on the studio roster. Ask Chi Ho to add you first.', new.email;
  end if;

  select full_name into invite_name
  from public.allowed_emails
  where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), coalesce(invite_name, '')),
    case when lower(new.email) = lower(admin_email) then 'admin' else 'student' end
  );
  return new;
end;
$$;


-- 3. Admin update policy on profiles (fixes archive bug) ---------------------
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());


-- 4. Cancellation within 24 hours: block students, still allow admin ---------
drop policy if exists "slots_update" on public.slots;
create policy "slots_update" on public.slots
  for update using (
    public.is_admin()
    or (
      auth.uid() is not null
      and (
        -- booking an open slot
        (booked_by is null and (restricted_to is null or auth.uid() = any(restricted_to)))
        -- cancelling own booking — only if lesson starts more than 24h from now.
        -- Slots are stored as naive local (Bloomington) time; compare against
        -- the current local time in America/Indiana/Indianapolis.
        or (
          booked_by = auth.uid()
          and (slot_date + slot_time) > ((now() at time zone 'America/Indiana/Indianapolis')::timestamp + interval '24 hours')
        )
      )
    )
  );


-- 5. Swap requests ------------------------------------------------------------
create table if not exists public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_slot_id uuid not null references public.slots(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  target_slot_id uuid not null references public.slots(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  message text not null default '',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_swap_target on public.swap_requests(target_id, status);
create index if not exists idx_swap_requester on public.swap_requests(requester_id, status);

alter table public.swap_requests enable row level security;

drop policy if exists "swap_read" on public.swap_requests;
create policy "swap_read" on public.swap_requests
  for select using (
    auth.uid() = requester_id
    or auth.uid() = target_id
    or public.is_admin()
  );

drop policy if exists "swap_insert" on public.swap_requests;
create policy "swap_insert" on public.swap_requests
  for insert with check (auth.uid() = requester_id);

drop policy if exists "swap_update" on public.swap_requests;
create policy "swap_update" on public.swap_requests
  for update using (
    auth.uid() = requester_id
    or auth.uid() = target_id
    or public.is_admin()
  );

-- Atomic swap executor. Callable by the target of a pending request.
create or replace function public.accept_swap_request(req_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.swap_requests%rowtype;
begin
  select * into r from public.swap_requests where id = req_id for update;
  if not found then raise exception 'Swap request not found.'; end if;
  if r.status <> 'pending' then raise exception 'This request has already been resolved.'; end if;
  if r.target_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the recipient can accept this swap.';
  end if;

  -- Verify both slots still belong to who they should.
  perform 1 from public.slots where id = r.requester_slot_id and booked_by = r.requester_id;
  if not found then raise exception 'The requester no longer holds their slot.'; end if;
  perform 1 from public.slots where id = r.target_slot_id and booked_by = r.target_id;
  if not found then raise exception 'The target no longer holds their slot.'; end if;

  -- Swap booked_by.
  update public.slots set booked_by = r.target_id where id = r.requester_slot_id;
  update public.slots set booked_by = r.requester_id where id = r.target_slot_id;

  -- Cancel any other pending requests touching these slots.
  update public.swap_requests
    set status = 'cancelled', responded_at = now()
    where status = 'pending'
      and id <> req_id
      and (requester_slot_id in (r.requester_slot_id, r.target_slot_id)
           or target_slot_id in (r.requester_slot_id, r.target_slot_id));

  update public.swap_requests
    set status = 'accepted', responded_at = now()
    where id = req_id;
end;
$$;

alter publication supabase_realtime add table public.swap_requests;


-- 6. Studio class default location -------------------------------------------
insert into public.settings (key, value) values ('studio_default_location', '')
on conflict (key) do nothing;

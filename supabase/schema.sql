-- =============================================================================
-- The Han Studio — Supabase schema
-- =============================================================================
-- Run this once in Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- It creates all tables, policies, and a trigger that auto-creates a student
-- profile whenever a new user signs up.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- Student/admin profiles. One row per authenticated user.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'admin')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Lesson slots. Each row is one bookable hour.
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  slot_time time not null,
  booked_by uuid references public.profiles(id) on delete set null,
  restricted_to uuid[] default null,
  created_at timestamptz not null default now(),
  unique(slot_date, slot_time)
);

create index if not exists idx_slots_date on public.slots(slot_date);
create index if not exists idx_slots_booked_by on public.slots(booked_by);

-- Studio class sessions (one row per week).
create table if not exists public.studio_class (
  id uuid primary key default gen_random_uuid(),
  session_date date not null unique,
  session_time time not null,
  location text default '',
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

-- Allowed-emails roster. Students can only sign up if their email is here
-- (or matches the admin_email setting). Chi Ho adds emails on the Students page.
create table if not exists public.allowed_emails (
  email text primary key,
  full_name text not null default '',
  added_at timestamptz not null default now()
);

-- Swap requests (one student asking another to trade lesson slots).
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

-- Pieces signed up for a studio class. One student can add multiple pieces.
create table if not exists public.studio_pieces (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_class(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  piece text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pieces_session on public.studio_pieces(session_id);

-- Settings (announcements, default studio class time, etc).
create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- Seed default settings.
-- IMPORTANT: replace 'REPLACE_WITH_ADMIN_EMAIL' with Chi Ho's actual email
-- before running this script. The admin_email row controls which account
-- is granted admin role when it signs up.
insert into public.settings (key, value) values
  ('admin_email', 'zhouding@iu.edu'),
  ('announcement', ''),
  ('studio_default_day', 'Tuesday'),
  ('studio_default_time', '19:30'),
  ('studio_default_location', ''),
  ('lessons_per_semester', '14'),
  ('announcements_page',
'## Cancellation policy

Your lesson time is protected for you alone. Please give others the chance to use it if you cannot.

**Cancelling your own lesson.** You may cancel any booked lesson through this app. The slot returns to the pool. No penalty.

**Swapping with another student.** Arrange it directly by email or text. Once agreed, both of you cancel and rebook in the app.

**Late cancellations.** Please try to give at least 24 hours notice when possible. Life happens — illness, emergencies, recitals.

**If Chi Ho cancels.** You will see a note on the Book page and the affected slots will disappear. A make-up week is typically offered the following month.

## Concerto this year

(Chi Ho — edit this section with the current concerto repertoire, soloists, and performance dates.)

## Summer festivals

(Chi Ho — edit this section with summer festival information, audition deadlines, and travel notes.)')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Helper: current user's role
-- -----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Auto-create profile on sign-up.
-- The admin email (set in env) becomes role='admin' automatically.
-- -----------------------------------------------------------------------------

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

  -- Gate: only the configured admin or emails on the allowed_emails roster.
  if lower(coalesce(new.email, '')) <> lower(coalesce(admin_email, '')) and not is_allowed then
    raise exception 'Email % is not on the studio roster. Ask Chi Ho to add you first.', new.email;
  end if;

  select full_name into invite_name from public.allowed_emails
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security — everyone logged in can read; only admins can modify
-- (except students booking/cancelling their own slots, editing their own pieces)
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.slots enable row level security;
alter table public.studio_class enable row level security;
alter table public.studio_pieces enable row level security;
alter table public.settings enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.swap_requests enable row level security;

-- PROFILES: authenticated users can read everyone's name (to show bookings).
-- Only admins can modify role; users can update their own name.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- SLOTS: everyone authenticated can read. Only admin can insert/delete.
-- Booking (update) is allowed if the user is booking/cancelling their own slot
-- and the slot isn't restricted, or they're in the whitelist.
drop policy if exists "slots_read" on public.slots;
create policy "slots_read" on public.slots
  for select using (auth.uid() is not null);

drop policy if exists "slots_insert_admin" on public.slots;
create policy "slots_insert_admin" on public.slots
  for insert with check (public.is_admin());

drop policy if exists "slots_delete_admin" on public.slots;
create policy "slots_delete_admin" on public.slots
  for delete using (public.is_admin());

drop policy if exists "slots_update" on public.slots;
create policy "slots_update" on public.slots
  for update using (
    public.is_admin()
    or (
      auth.uid() is not null
      and (
        -- booking an open slot: must be allowed by restricted_to (or no restriction)
        (booked_by is null and (restricted_to is null or auth.uid() = any(restricted_to)))
        -- cancelling own booking: only if lesson starts more than 24h from now
        or (
          booked_by = auth.uid()
          and (slot_date + slot_time) > ((now() at time zone 'America/Indiana/Indianapolis')::timestamp + interval '24 hours')
        )
      )
    )
  );

-- STUDIO CLASS: everyone reads, only admin writes.
drop policy if exists "studio_class_read" on public.studio_class;
create policy "studio_class_read" on public.studio_class
  for select using (auth.uid() is not null);

drop policy if exists "studio_class_write_admin" on public.studio_class;
create policy "studio_class_write_admin" on public.studio_class
  for all using (public.is_admin()) with check (public.is_admin());

-- STUDIO PIECES: everyone reads, students manage their own, admin manages any.
drop policy if exists "pieces_read" on public.studio_pieces;
create policy "pieces_read" on public.studio_pieces
  for select using (auth.uid() is not null);

drop policy if exists "pieces_insert_self" on public.studio_pieces;
create policy "pieces_insert_self" on public.studio_pieces
  for insert with check (student_id = auth.uid() or public.is_admin());

drop policy if exists "pieces_update_self" on public.studio_pieces;
create policy "pieces_update_self" on public.studio_pieces
  for update using (student_id = auth.uid() or public.is_admin());

drop policy if exists "pieces_delete_self" on public.studio_pieces;
create policy "pieces_delete_self" on public.studio_pieces
  for delete using (student_id = auth.uid() or public.is_admin());

-- SETTINGS: everyone reads, only admin writes.
drop policy if exists "settings_read" on public.settings;
create policy "settings_read" on public.settings
  for select using (auth.uid() is not null);

drop policy if exists "settings_write_admin" on public.settings;
create policy "settings_write_admin" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ALLOWED_EMAILS: admin manages, everyone reads (to verify before signup UX).
drop policy if exists "allowed_emails_read" on public.allowed_emails;
create policy "allowed_emails_read" on public.allowed_emails
  for select using (auth.uid() is not null);

drop policy if exists "allowed_emails_write_admin" on public.allowed_emails;
create policy "allowed_emails_write_admin" on public.allowed_emails
  for all using (public.is_admin()) with check (public.is_admin());

-- SWAP REQUESTS: parties + admin can read; requester creates; either party or admin updates.
drop policy if exists "swap_read" on public.swap_requests;
create policy "swap_read" on public.swap_requests
  for select using (
    auth.uid() = requester_id or auth.uid() = target_id or public.is_admin()
  );

drop policy if exists "swap_insert" on public.swap_requests;
create policy "swap_insert" on public.swap_requests
  for insert with check (auth.uid() = requester_id);

drop policy if exists "swap_update" on public.swap_requests;
create policy "swap_update" on public.swap_requests
  for update using (
    auth.uid() = requester_id or auth.uid() = target_id or public.is_admin()
  );

-- Atomic swap executor.
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

  perform 1 from public.slots where id = r.requester_slot_id and booked_by = r.requester_id;
  if not found then raise exception 'The requester no longer holds their slot.'; end if;
  perform 1 from public.slots where id = r.target_slot_id and booked_by = r.target_id;
  if not found then raise exception 'The target no longer holds their slot.'; end if;

  update public.slots set booked_by = r.target_id where id = r.requester_slot_id;
  update public.slots set booked_by = r.requester_id where id = r.target_slot_id;

  update public.swap_requests
    set status = 'cancelled', responded_at = now()
    where status = 'pending' and id <> req_id
      and (requester_slot_id in (r.requester_slot_id, r.target_slot_id)
           or target_slot_id in (r.requester_slot_id, r.target_slot_id));

  update public.swap_requests
    set status = 'accepted', responded_at = now()
    where id = req_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Enable realtime on slots + pieces so bookings update live
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.slots;
alter publication supabase_realtime add table public.studio_pieces;
alter publication supabase_realtime add table public.studio_class;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.swap_requests;

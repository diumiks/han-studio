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
  ('lessons_per_semester', '14')
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
begin
  -- Read the configured admin email from settings, if present
  select value into admin_email from public.settings where key = 'admin_email';

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.email = admin_email then 'admin' else 'student' end
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

-- PROFILES: authenticated users can read everyone's name (to show bookings).
-- Only admins can modify role; users can update their own name.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

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
        -- booking an open slot: must be allowed by restrictedTo (or no restriction)
        (booked_by is null and (restricted_to is null or auth.uid() = any(restricted_to)))
        -- cancelling own booking
        or booked_by = auth.uid()
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

-- -----------------------------------------------------------------------------
-- Enable realtime on slots + pieces so bookings update live
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.slots;
alter publication supabase_realtime add table public.studio_pieces;
alter publication supabase_realtime add table public.studio_class;
alter publication supabase_realtime add table public.settings;

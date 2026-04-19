-- =============================================================================
-- Migration v2 — run once in Supabase SQL Editor for existing deployments.
-- Safe to re-run: all statements are idempotent.
-- =============================================================================

-- 1. Archive flag on profiles (for graduated / inactive students)
alter table public.profiles
  add column if not exists archived boolean not null default false;

-- 2. Seed the editable announcements page (policy + concerto + summer festivals).
--    If the row already exists, this does nothing.
insert into public.settings (key, value) values
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

# Project context — The Han Studio

This document captures the full background of this project: why it exists, who it's for, what decisions were made and why, and what's still open. Keep it in the project root so future instances of Claude (or Claude Code) can pick up where the original conversation left off.

---

## What this is

A private lesson-scheduling web app, built as a graduation gift from Ding Zhou (graduating MM at IU Jacobs School of Music, Spring 2026) to their teacher **Prof. Chi Ho Han**. Chi Ho teaches piano at Jacobs; Ding Zhou was his student and is heading to University of Cincinnati's College-Conservatory of Music for a DMA in Piano Performance starting Fall 2026.

The app replaces Chi Ho's existing workflow — a shared Word document that he updates each week with available time slots, and students fill in their names. The Word-doc approach had real problems: edit conflicts, no way to show "just taken" vs "still open," no reminders, everything gets re-done every week.

---

## Who uses it

**Chi Ho (admin).** One account, designated by email in the settings table. Posts availability, manages the schedule, writes a note to students, reschedules studio class, tracks the roster.

**Students (~15–20).** Sign themselves up the first time. Book lessons, cancel, view their own history, sign up pieces for studio class, read the policy.

That's it. No parent portal, no multi-faculty support, no payment. Jacobs students don't pay their teacher directly — this is purely a scheduling tool.

---

## How Chi Ho actually works (important context for anyone modifying the app)

Before building anything, I looked at several of Chi Ho's actual Word documents from different months. His pattern has specific characteristics that shaped every design decision:

- **No fixed weekly template.** Times vary completely — sometimes lessons start at 1:20pm, sometimes at 7pm. He opens what he opens.
- **He often restricts days to specific students** to keep gaps between lessons even. Notes like `"6th mon: David, Philippe, Shiohn, Ding, Yeunsu"` are common. → This became the "restricted slots" feature.
- **He writes free-form notes** at the top ("No studioclass this week", "Two lessons — Xiaoya, Xinyu, Seohyeong", "Due to very limited time, not everyone who requested can get two lessons"). → This became the "Note to students" announcement.
- **He mixes lesson slots with other events** (chamber masterclass, studio class). The app only handles lessons and studio class, not arbitrary events.
- **Students sometimes want two lessons a week.** We chose **not** to build a separate "request" flow — students just book two slots if they want two. Simple.

This is why generic tools like Google Calendar Appointment Schedule or Calendly don't fit: they assume a recurring availability pattern. Chi Ho's whole strength is how flexible he is week to week.

---

## Product decisions made during scoping

Each of these was an explicit choice with a reason. Don't change them without understanding the reason.

| Decision | Reason |
|---|---|
| Web app, not HTML export | Needs real-time multi-user (no edit conflicts); needs persistent history across weeks |
| Supabase backend | Most mature free-tier Postgres + auth; handles magic link email out of the box |
| Email/password login (not magic link only) | Ding Zhou's preference — initial email verification, then password + remembered session |
| No booking confirmation emails | Supabase free tier has limited transactional email; students see bookings in the app; Chi Ho didn't request it |
| Admin designated by email, not a UI toggle | Single admin, never changes; simpler than a management UI |
| 14 lessons/semester as a soft reminder, not a hard cap | Chi Ho sometimes offers makeup lessons. Hard cap would cause support headaches. |
| Restricted-slot feature (whitelist specific students) | Matches Chi Ho's explicit workflow — he assigns certain students to certain days |
| Studio class: one piece → multiple pieces per student | Ding Zhou noted students sometimes play two pieces |
| Studio class history is visible | Ding Zhou requested this — useful archive of what the studio has played |
| No "Move here" quick-swap on Book page | Removed after prototype review — simpler to Reserve/Cancel |
| No photos, no faculty headshots, no marketing copy | Ding Zhou explicit: pure tool, no bio/headshot page |
| English only | Studio mixes nationalities; English is the shared language |
| No car/payment/billing features | Not applicable — Jacobs faculty don't bill students |
| Studio name: "The Han Studio" | Placeholder. If Chi Ho uses a different name, search-and-replace across `src/`. |

---

## Design philosophy

The visual direction is intentional and should be preserved. Think **classical concert programme** or **ECM Records booklet**, not SaaS dashboard:

- **Typography**: Fraunces (italic serif) for display, Inter for body, JetBrains Mono for times/dates
- **Color**: warm paper (#F7F4ED) background, dark ink (#1C1B18), single accent in old-stamp red (#9B2D1F), confirmation green (#2D4A3E)
- **Borders**: 0.5px hairlines only; no drop shadows; minimal border radius (2px)
- **Layout**: single-column content with sidebar nav, generous whitespace, asymmetric emphasis
- **No gradients, no emoji, no icons larger than 16px, no rounded pills** (except the Pill component)

If someone adds new UI, it should feel consistent with this aesthetic — not modern SaaS bootstrap-y rounded cards.

---

## Technical architecture

```
Frontend:   React 18 + Vite + Tailwind (via CSS vars, not Tailwind classes for theming)
Routing:    react-router-dom (BrowserRouter)
State:      React hooks + custom hooks per data domain (useSlots, useProfiles, etc.)
Backend:    Supabase (Postgres + Auth + Realtime)
Hosting:    Vercel (static build, no server code)
```

**Key files to understand first:**

- `supabase/schema.sql` — single source of truth for DB structure. Includes RLS policies enforcing that students can only book open unrestricted slots and only cancel their own.
- `src/lib/auth.jsx` — AuthContext, wraps the whole app. Provides `{session, profile, signOut}`.
- `src/App.jsx` — routes + auth gating. `<Protected>` redirects to login if no session; `<Protected adminOnly>` additionally requires admin role.
- `src/hooks/*` — every data-fetching concern has its own hook with Supabase Realtime subscriptions so the UI updates live when another user books/cancels.

**Database tables:**

- `profiles` — one row per user (auto-created on signup by a trigger). Has `role: 'student' | 'admin'`.
- `slots` — one row per bookable hour. `restricted_to` is a uuid[] or null.
- `studio_class` — one row per weekly session.
- `studio_pieces` — student's piece signups (many per session, many per student).
- `settings` — key-value pairs: `admin_email`, `announcement`, `lessons_per_semester`, `studio_default_day`, `studio_default_time`.

---

## Conversation timeline (for context)

1. **First pass — scoping.** Ding Zhou described the Word-doc workflow. I considered Google Calendar Appointment Schedule, Calendly, and Cal.com; decided none fit Chi Ho's pattern. Recommended a custom web app.
2. **Requirements elicitation.** Over several back-and-forths, clarified: web app (not static HTML), email-verification login with remembered sessions, needs history, needs policy page, English UI, no photos.
3. **Prototype phase.** I built `studio.jsx` — a single-file React artifact with mocked `useState` data — so Ding Zhou could preview the full UX end-to-end.
4. **Prototype feedback.** Ding Zhou approved the design. Four changes requested: remove "Move here" logic, add 14-lessons/semester context, add studio class history, support multiple pieces per student per session.
5. **Production build.** Built the full codebase with Supabase backend, RLS policies, realtime subscriptions, and the four requested changes. Shipped as zip.
6. **Deployment guidance.** Ding Zhou chose self-deployment. README written with step-by-step: Node/Git install → Supabase project → schema.sql → env vars → GitHub → Vercel → optional custom domain.

---

## What's deliberately NOT in the app

Things considered and rejected, so future modifiers know not to "fix" them:

- **No admin student-invitation flow.** Students self-register — this is simpler and appropriate for the scale.
- **No email notifications for bookings.** Supabase free tier only sends auth emails. Can add Resend integration later if Chi Ho requests.
- **No recurring availability templates.** Every week opened manually — matches Chi Ho's actual pattern.
- **No timezone handling.** Everything is naive local time. Everyone is physically in Bloomington.
- **No "Move here" one-click reschedule.** Removed after prototype review. Students cancel and rebook — two clicks instead of one, but clearer state.
- **No per-lesson notes / practice logs.** Ding Zhou considered it and explicitly chose "only count lessons, no notes." Could be added later but the tables would need new structure.
- **No payment, no invoicing, no contracts.** Not applicable at a university studio.
- **No Chi Ho bio, no photos, no faculty page.** Pure tool.

---

## Handoff instructions

When Ding Zhou gives the app to Chi Ho, the handoff message should include:

1. The live URL
2. Confirmation the first email Chi Ho signs up with will be granted admin (already configured in the schema via `admin_email`)
3. A note that he controls: the weekly "Note to students", who can book which days, when studio class happens, and what students see
4. Nothing Chi Ho needs to maintain technically — Supabase and Vercel free tiers handle themselves

---

## Likely future requests (stubs for when they come up)

If Chi Ho eventually asks for these, here's how to approach them:

- **"Can students also see each other's pieces from past lessons?"** → Add a `lesson_notes` column to slots or a new `lesson_logs` table. Student-visible vs admin-only needs to be decided.
- **"Can I get an email when someone books?"** → Integrate Resend (free: 100/day). Add a Supabase Edge Function triggered on `slots` update that posts to Resend.
- **"Can I duplicate last week's availability?"** → Add a "Copy from previous week" button on Open Slots that takes the last 7 days of slots and recreates them +7 days out.
- **"Can studio class have sub-groups (chamber, solo)?"** → Add a `category` column to `studio_class`.
- **"Can I mark a lesson as 'held' vs 'cancelled'?"** → Add `status` column to slots, change history logic to filter on it.

---

## People referenced in the project

- **Ding Zhou** — the student making this. Pianist, MM at IU Jacobs under Chi Ho, going to CCM for DMA under Avan Yu. Detail-oriented, prefers lean prose, pragmatic about scope.
- **Chi Ho Han (Prof.)** — the recipient. Piano faculty at IU Jacobs. Works flexibly week-to-week, communicates warmly in mixed English/Chinese with close students, writes Word-doc notes in casual voice.

---

Last updated: April 19, 2026, at the end of the build conversation.

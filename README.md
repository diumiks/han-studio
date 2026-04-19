# The Han Studio — lesson scheduling app

A private scheduling tool built for Prof. Chi Ho Han's piano studio at Indiana University's Jacobs School of Music. Students sign up for their own weekly lessons, see their full lesson history, and sign up for studio class pieces. Chi Ho opens availability, manages the schedule, and posts notes to the studio.

Built with React, Vite, Tailwind, and Supabase. Free to host.

---

## What you're looking at

```
han-studio/
├── README.md                    ← you are here
├── package.json                 ← dependencies
├── .env.example                 ← template for your secrets
├── supabase/
│   └── schema.sql               ← one-click database setup
├── index.html                   ← HTML entry point
├── vite.config.js               ← build tool config
├── tailwind.config.js           ← styling config
├── postcss.config.js
└── src/
    ├── main.jsx                 ← app entry
    ├── App.jsx                  ← routes + auth gate
    ├── index.css                ← global colors + resets
    ├── lib/
    │   ├── supabase.js          ← database client
    │   ├── auth.jsx             ← React auth context
    │   └── dateUtils.js         ← date formatting helpers
    ├── components/
    │   ├── Shell.jsx            ← sidebar layout
    │   ├── Button.jsx, Pill.jsx, PageHeader.jsx
    ├── hooks/
    │   ├── useSlots.js          ← fetches bookable lesson slots
    │   ├── useProfiles.js       ← student/admin directory
    │   ├── useSettings.js       ← announcements, defaults
    │   └── useStudioClass.js    ← studio class sessions + pieces
    └── pages/
        ├── Login.jsx            ← sign in / sign up / reset password
        ├── StudioClass.jsx      ← shared studio class page
        ├── student/
        │   ├── Book.jsx         ← student lesson booking
        │   ├── MyLessons.jsx    ← student lesson history
        │   └── Policy.jsx       ← cancellation policy
        └── admin/
            ├── Schedule.jsx     ← admin week overview + announcement
            ├── OpenSlots.jsx    ← create new availability
            └── Students.jsx     ← roster with lesson counts
```

---

## Deployment guide — zero to live in about an hour

You'll go through five services:

1. **GitHub** (stores your code)
2. **Supabase** (database + authentication + email)
3. **Vercel** (runs the website)
4. Optional: a domain registrar (if you want a custom URL)

If you get stuck anywhere, search the exact error message you see — the Supabase and Vercel communities are large and helpful. The sections below flag the spots people commonly trip on.

### Prerequisites

- A computer with **Node.js 18 or later** installed. Check by opening Terminal and running `node --version`. If you don't have it, download from [nodejs.org](https://nodejs.org).
- **Git** installed. Check with `git --version`. If missing, install from [git-scm.com](https://git-scm.com).
- A code editor like [VS Code](https://code.visualstudio.com) (recommended but optional).

---

### Step 1 — Get the code running locally

Open Terminal, navigate to wherever you unzipped this project, and run:

```bash
cd han-studio
npm install
```

This downloads all dependencies. It takes 1–2 minutes. You'll see a `node_modules/` folder appear.

Don't try to run the app yet — it needs a database first.

---

### Step 2 — Set up Supabase (the backend)

**2a. Create a Supabase project**

1. Go to [supabase.com](https://supabase.com) and sign up (free). Use Chi Ho's email if you want, or your own — it doesn't matter.
2. Click **New project**. Pick any name (e.g. `han-studio`). Pick a region close to Indiana (e.g. `East US`).
3. Create a database password. Save it in a password manager — you won't need it often but you can't recover it.
4. Wait 2–3 minutes for the project to provision.

**2b. Configure the admin email**

Open `supabase/schema.sql` in a text editor. Near the top, find this line:

```sql
('admin_email', 'REPLACE_WITH_ADMIN_EMAIL'),
```

Replace `REPLACE_WITH_ADMIN_EMAIL` with Chi Ho's actual email address (the one he'll sign in with). For example:

```sql
('admin_email', 'chiho.han@indiana.edu'),
```

This is how the app knows which account is the admin. Every other account that signs up is a student.

**2c. Run the schema**

1. In the Supabase dashboard, click the **SQL Editor** icon in the left sidebar (looks like `>_`).
2. Click **New query**.
3. Open `supabase/schema.sql` in your text editor, copy the entire contents, and paste into the SQL editor.
4. Click **Run** (bottom right). You should see "Success. No rows returned."

If you see an error about `gen_random_uuid` or `pgcrypto`, run this first and try again:

```sql
create extension if not exists "pgcrypto";
```

**2d. Get your API keys**

1. Click **Project Settings** (gear icon at bottom of sidebar) → **API**.
2. You'll see two values you need:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

Keep this tab open.

**2e. Configure authentication**

1. Click **Authentication** in the sidebar → **Providers**.
2. Make sure **Email** is enabled.
3. Scroll down to **Confirm email**. Leave it **ON** (so students verify their email before they can sign in).
4. Click **Authentication** → **URL Configuration**.
5. Set **Site URL** to `http://localhost:5173` for now. We'll change it after deployment.

---

### Step 3 — Connect the local code to Supabase

Back in your project folder:

1. Copy `.env.example` to a new file called `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   (On Windows without bash: just duplicate the file in Finder/File Explorer and rename.)

2. Open `.env.local` in your editor and fill in the three values:
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ... (the long string)
   VITE_ADMIN_EMAIL=chiho.han@indiana.edu
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

You should see the login page with "The Han Studio" in big italic letters. If you do — congratulations, the app is talking to your database.

**Test it**:
1. Click "Create an account" and sign up with Chi Ho's admin email.
2. Check that email inbox. You'll get a confirmation link from Supabase. Click it.
3. Come back to the app and sign in. You should land on the admin dashboard.
4. Sign out, create a second account with a different email (can be yours) — this one will be a student account.

If the admin account lands on the student dashboard instead of admin, the `admin_email` setting didn't match. In the Supabase SQL Editor run:
```sql
update settings set value = 'chiho.han@indiana.edu' where key = 'admin_email';
update profiles set role = 'admin' where email = 'chiho.han@indiana.edu';
```
(Substituting Chi Ho's actual email.)

---

### Step 4 — Put your code on GitHub

1. Go to [github.com](https://github.com) and sign up (free) if you don't have an account.
2. Click the **+** icon (top right) → **New repository**.
3. Name it `han-studio`. Set it to **Private**. Don't initialize with a README.
4. Click **Create repository**.

5. Back in Terminal, inside your project folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/han-studio.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your actual GitHub username. GitHub will prompt for authentication; follow the instructions (modern Git uses a browser login).

Your code should now appear on GitHub. The `.env.local` file is automatically excluded (see `.gitignore`) — secrets stay private.

---

### Step 5 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up, choosing **"Continue with GitHub"**.
2. Click **Add New** → **Project**.
3. Vercel will show your GitHub repositories. Find `han-studio` and click **Import**.
4. Vercel auto-detects it's a Vite project. You don't need to change the framework settings.
5. Expand **Environment Variables** and add three entries (the same values from your `.env.local`):
   - `VITE_SUPABASE_URL` = `https://abcdefgh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJ...`
   - `VITE_ADMIN_EMAIL` = `chiho.han@indiana.edu`
6. Click **Deploy**. Wait 1–2 minutes.

Vercel will give you a live URL like `han-studio-abc123.vercel.app`. Open it.

**One last Supabase tweak**: Back in Supabase → Authentication → URL Configuration, set the **Site URL** to your Vercel URL (e.g. `https://han-studio.vercel.app`) and add it to **Redirect URLs** as well. Otherwise magic links and password reset emails will redirect to localhost.

Now every time you (or anyone with access to the repo) push a change to GitHub, Vercel redeploys automatically.

---

### Step 6 — Optional: custom domain

If you want a URL like `hanstudio.com` instead of `han-studio.vercel.app`:

1. Buy a domain from any registrar (Namecheap, Porkbun, Cloudflare all work well — around $10/year).
2. In Vercel → your project → **Settings** → **Domains** → add the domain. Vercel shows the DNS records to add at your registrar.
3. Update Supabase's Site URL and Redirect URLs to the new domain.

---

## Handing it off to Chi Ho

Once deployed, send Chi Ho:
- The URL
- His login email (whatever you set as admin)
- A note: "Go to Open slots to create this week's availability. The Note to students box on the Schedule page is for any announcements."

Students sign themselves up the first time they visit — Chi Ho doesn't need to invite them.

---

## How the pieces work

**Authentication.** Supabase handles sign-up, sign-in, password reset, and session persistence. Sessions last about 30 days by default. The `handle_new_user` trigger in `schema.sql` creates a profile row whenever someone signs up — and if their email matches the configured admin email, they get `role='admin'`.

**Real-time updates.** When a student books a slot, every other student's screen updates within a second — no refresh needed. This is Supabase Realtime, enabled on the `slots`, `studio_pieces`, `studio_class`, and `settings` tables.

**Row-level security.** Every database query is gated by policies in `schema.sql`. Students can only book open slots (enforced at the database layer, not just in JS) and only cancel their own lessons. Only the admin can create or delete slots. This is defense-in-depth — even if someone bypassed the UI, the database would refuse.

**Studio class.** Supports multiple pieces per student (you can sign up twice). Past sessions are preserved and viewable by expanding each one.

**Restricted slots.** When Chi Ho wants to limit a day to specific students (like `"6th mon: David, Philippe, Shiohn, Ding, Yeunsu"` in his usual notes), he checks "Restrict to specific students" on Open slots and picks them. Other students won't even see that day.

---

## Making changes

Edit any file in `src/`, save, and the dev server reloads instantly.

To push a change live:
```bash
git add .
git commit -m "describe what you changed"
git push
```
Vercel redeploys within a minute.

### Common tweaks

- **Change the studio name.** Search for `The Han Studio` across `src/` and replace.
- **Change the colors.** Edit the CSS variables at the top of `src/index.css`.
- **Change the semester lesson count.** In the Supabase SQL Editor:
  ```sql
  update settings set value = '15' where key = 'lessons_per_semester';
  ```
- **Add a new admin.** In SQL Editor:
  ```sql
  update profiles set role = 'admin' where email = 'new.admin@example.com';
  ```

---

## Known limitations

- **No email notifications for bookings.** Supabase's free tier only sends auth emails (verify, reset password), not custom ones. Students see their bookings in the app instead. If you want booking confirmations later, integrate [Resend](https://resend.com) or similar.
- **No time zone handling.** Everything displays in your browser's local time and is stored as naive date/time. Fine for a studio where everyone is in the same place; not fine for a distributed team.
- **No recurring slots.** Every week's availability is opened manually. Chi Ho's actual usage pattern doesn't follow a weekly template anyway, so this matched his workflow — but if a future instructor wants "every Tuesday 2–6pm automatically," that would need to be added.

---

## Trouble

**Login works locally but not on Vercel.** Almost always environment variables. In Vercel → Settings → Environment Variables, double-check all three are present and values match what's in `.env.local`. After editing env vars, trigger a new deployment (Vercel doesn't pick them up automatically).

**"Invalid API key" error.** The anon key doesn't match the project URL. Re-copy both from Supabase → Project Settings → API.

**Magic link redirects to localhost after clicking in email.** Supabase Site URL is still set to localhost. Update it to your live URL in Authentication → URL Configuration.

**Can't see any slots even as admin.** The RLS policies require you to be authenticated. If you're signed in but see nothing, check browser console for errors. If you see a role-related error, verify your profile has `role='admin'` — query `select * from profiles` in SQL Editor.

**Students get "policy violation" when trying to book.** The slot has a restriction list that doesn't include them. Either loosen the restriction in the DB, or delete and recreate the slot.

---

Built with love for a generous teacher. ♪

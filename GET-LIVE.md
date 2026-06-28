# Getting the BK/AO Dashboard live — a click-by-click guide

Written for someone who is **not** a developer. You will **not** install
anything or type any commands. Everything below happens in your web browser by
clicking and copy-pasting.

**Time:** about 30–40 minutes the first time.
**Cost:** $0 — everything fits inside free plans.

You'll set up two free services and connect them:

1. **Supabase** — stores your data and syncs it live between devices.
2. **Vercel** — hosts the actual website your team opens.

Your app's code already lives in your **GitHub** repository
(`briankelly-6/Shared-Dashboard`), so there's nothing to upload.

> 💡 **Tip:** open this guide in one browser tab and do the work in another, so
> you can flip back and forth.

---

## Before you start — decide your access code

Pick the **6-digit number** your team will type to open the board
(e.g. `482915`). Write it down. You'll enter it once during setup and share it
with your two teammates. You can change it later (see the end of this guide).

---

# PART 0 — One-time GitHub tidy-up (~1 minute)

The finished code is on your repository's **`main`** branch, but the repository
is currently set to treat a different working branch as its "default." Pointing
it at `main` makes the next steps (Vercel) automatic. Do this once:

1. Go to **https://github.com/briankelly-6/Shared-Dashboard**
2. Click the **Settings** tab (top-right of the repo page).
3. In the left menu, under **General**, find **Default branch** (near the top).
4. Click the **switch/swap** icon (two arrows) next to the current branch name.
5. Choose **`main`** from the dropdown, click **Update**, and confirm.

That's it — you can ignore the other branch from here on. (Optional: later you
can delete the old branch named `claude/vigilant-newton-vfy3xc` from the repo's
**Branches** page; it's a duplicate of `main`.)

> If you skip this, everything still works — you'll just need to tell Vercel to
> use the `main` branch in **Part 2** (a note is included there).

---

# PART 1 — Supabase (your data)

### Step 1.1 — Create a Supabase account
1. Go to **https://supabase.com** and click **Start your project** (or **Sign
   in**).
2. Sign up — using **"Continue with GitHub"** is easiest since you already have
   GitHub. Approve the prompt.

### Step 1.2 — Create a project
1. Click **New project**.
2. If asked to pick or create an **Organization**, create one (any name, e.g.
   your team or company name; the free plan is fine).
3. Fill in:
   - **Name:** `bk-ao-dashboard` (any name is fine).
   - **Database Password:** click **Generate a password**, then **copy it and
     save it somewhere safe** (a password manager or note). You'll rarely need
     it, but you can't easily get it back later.
   - **Region:** choose the one geographically closest to your team (e.g. *East
     US*). This only affects speed.
4. Click **Create new project**.
5. Wait ~2 minutes while it sets up. You'll land on the project dashboard.

### Step 1.3 — Create the data tables
1. In the left sidebar, click the **SQL Editor** icon (looks like `>_` /
   "SQL Editor").
2. Click **+ New query** (or use the blank editor shown).
3. **Copy the entire block below** (use the copy button in the corner of the
   box) and **paste it** into the editor:

```sql
-- BK/AO Dashboard — initial schema
create extension if not exists pgcrypto;

create table if not exists public.pipeline_companies (
  id          uuid primary key default gen_random_uuid(),
  pipeline    text not null check (pipeline in ('long', 'short')),
  name        text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.work_plan_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.pipeline_companies (id) on delete cascade,
  text        text not null default '',
  done        boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.idea_rows (
  id          uuid primary key default gen_random_uuid(),
  list        text not null check (list in ('on_deck', 'quick_cut', 'whacky')),
  company     text not null default '',
  side        text not null default 'L' check (side in ('L', 'S')),
  thesis      text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.friday_topics (
  id          uuid primary key default gen_random_uuid(),
  text        text not null default '',
  done        boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_pipeline_companies_pipeline
  on public.pipeline_companies (pipeline, sort_order, created_at);
create index if not exists idx_work_plan_items_company
  on public.work_plan_items (company_id, sort_order, created_at);
create index if not exists idx_idea_rows_list
  on public.idea_rows (list, sort_order, created_at);
create index if not exists idx_friday_topics_order
  on public.friday_topics (sort_order, created_at);

alter table public.pipeline_companies enable row level security;
alter table public.work_plan_items   enable row level security;
alter table public.idea_rows          enable row level security;
alter table public.friday_topics      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['pipeline_companies','work_plan_items','idea_rows','friday_topics']
  loop
    execute format('drop policy if exists "shared full access" on public.%I;', t);
    execute format('create policy "shared full access" on public.%I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['pipeline_companies','work_plan_items','idea_rows','friday_topics']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
```

4. Click the green **Run** button (bottom-right, or press the run shortcut).
5. You should see **"Success. No rows returned"** (or similar). That means it
   worked. ✅

> This is the exact same script stored in the repo at
> `supabase/migrations/0001_init.sql` — copying from either place is fine.

### Step 1.4 — Check the tables were created
1. In the left sidebar, click **Table Editor**.
2. You should see four tables: **pipeline_companies**, **work_plan_items**,
   **idea_rows**, **friday_topics**. (They'll be empty — that's expected.)

### Step 1.5 — Confirm live sync is on
1. In the left sidebar, under **Database Management** (near the top), click
   **Publications**.
   - ⚠️ **Not "Replication"** — that's a different, newer feature (read replicas
     / analytics) that you don't need. Ignore it.
2. Open the publication named **`supabase_realtime`**.
3. Confirm all four tables (`pipeline_companies`, `work_plan_items`,
   `idea_rows`, `friday_topics`) are included / toggled on.
4. They should already be on — the script in Step 1.3 added them. If any are
   missing, toggle them on. (This step is just a double-check; if you got
   "Success" in Step 1.3, live sync is already enabled and you can continue.)

### Step 1.6 — Copy your two connection values
You'll paste these into Vercel in Part 2. Keep this tab open.
1. In the left sidebar, click **Project Settings** (the gear), then **API**.
2. Find and copy these two values into your notes:
   - **Project URL** — looks like `https://abcdefghi....supabase.co`
     → this is your **VITE_SUPABASE_URL**.
   - **Project API Keys → `anon` `public`** — a long string starting with
     `eyJ...`
     → this is your **VITE_SUPABASE_ANON_KEY**.

> ✅ You now have **three** things written down:
> 1. Project URL  2. anon public key  3. your 6-digit code.

---

# PART 2 — Vercel (the live website)

### Step 2.1 — Create a Vercel account
1. Go to **https://vercel.com** and click **Sign Up**.
2. Choose **Continue with GitHub** and approve. (This lets Vercel see your code.)
3. If asked, choose the **Hobby** plan (free).

### Step 2.2 — Import your repository
1. On the Vercel dashboard, click **Add New… → Project**.
2. You'll see a list of your GitHub repositories. Find
   **`Shared-Dashboard`** and click **Import**.
   - If you don't see it, click **Adjust GitHub App Permissions** (or
     **Configure GitHub App**) and grant Vercel access to the
     `briankelly-6/Shared-Dashboard` repository, then come back.

> **If you skipped Part 0:** after importing, the live site tracks whatever
> branch GitHub calls "default." To point it at `main`, go to your Vercel
> project → **Settings → Git → Production Branch**, set it to **`main`**, save,
> then **Redeploy** (see "Changing the access code later" for how to redeploy).
> If you did Part 0, you can ignore this.

### Step 2.3 — Confirm the build settings
Vercel auto-detects this is a **Vite** app. You normally don't need to change
anything here:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Leave them as detected.

### Step 2.4 — Add the three environment variables  ⚠️ important
Still on the import screen, expand the **Environment Variables** section. Add
these **three**, one at a time (type the **Name** exactly as shown, paste your
saved value into **Value**, click **Add** after each):

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | your Project URL (e.g. `https://abcdefghi....supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | your anon public key (the long `eyJ...` string) |
| `VITE_APP_ACCESS_CODE` | your 6-digit code (e.g. `482915`) |

> Double-check there are no extra spaces, and that the names are spelled
> **exactly** like the table above (they're case-sensitive).

### Step 2.5 — Deploy
1. Click **Deploy**.
2. Wait ~1–2 minutes (you'll see build logs scroll by).
3. When it finishes you'll see **"Congratulations"** and a screenshot of your
   site. Click **Continue to Dashboard** or the **Visit** button.

### Step 2.6 — Open it and unlock
1. Click your live URL (something like
   `https://shared-dashboard-xxxx.vercel.app`).
2. You should see the **"Enter the 6-digit access code"** screen.
3. Type your code. The dashboard with all six widgets appears. 🎉

---

# PART 3 — Confirm it really works

1. On the live site, in **Long Pipeline**, type a company name in
   *"Add company…"* and press **Enter**. It appears in the list.
2. Open the **same URL on your phone** (or another browser). Enter the code.
3. Add or edit something on one device — it should appear on the other within
   **1–2 seconds**, no refresh. That's the live sync working.

If that works, **you're in production.** ✅

---

# PART 4 — Share it with your team

Send your two teammates:
- the **live URL** (from Vercel), and
- the **6-digit code**.

They open the link, enter the code once, and their device remembers it. All
three of you now share the same live board.

> 💡 **Bookmark tip:** tell them to bookmark the URL. On a phone they can use
> the browser's "Add to Home Screen" to make it feel like an app.

---

# Changing the access code later

1. In Vercel: **your project → Settings → Environment Variables**.
2. Edit **`VITE_APP_ACCESS_CODE`**, save the new 6 digits.
3. Go to the **Deployments** tab → open the latest deployment → **⋯ menu →
   Redeploy**. After it finishes (~1 min), the new code is live.
   (Everyone will need to enter the new code once.)

The same Redeploy step applies if you ever change the Supabase values.

---

# Optional — use your own web address

Vercel gives you a free `…vercel.app` address. If you'd rather use something
like `dashboard.yourfirm.com`:
1. Vercel: **your project → Settings → Domains → Add**.
2. Type your desired domain and follow Vercel's instructions (it will tell you
   the DNS record to add at your domain registrar). This part is a little more
   technical — ask whoever manages your company's domain, or ask me.

---

# Troubleshooting

**The page says "setup needed" instead of the code screen.**
One of the three environment variables in Vercel is missing or misspelled.
Re-check Step 2.4 (exact names, no spaces), then **Redeploy** (see above).

**My code doesn't unlock it / says "Incorrect code".**
The code on the site is whatever you put in `VITE_APP_ACCESS_CODE`. Confirm
that value in Vercel, and remember a change only takes effect after a
**Redeploy**.

**The board opens but typing a company doesn't stick / doesn't sync.**
Usually the Supabase URL or anon key is wrong, or Step 1.3 (the SQL) didn't
run. Re-check Step 1.6's values in Vercel, and re-run the SQL from Step 1.3
(it's safe to run again).

**The deploy failed in Vercel.**
Open the build log and read the last red lines. Most often it's an environment
variable issue. If you're stuck, copy the error and send it to me.

**It worked before but now data won't load.**
Supabase's free plan **pauses a project after ~1 week of no activity**. If the
board sits unused for a while, log into Supabase and click **Restore/Resume**
on the project. For a board used regularly this won't happen.

---

# What this costs

- **Supabase free plan:** plenty for a 3-person hand-entered board. (Pauses
  after a week idle; resume with one click.)
- **Vercel Hobby plan:** free for personal/small use.

If you ever outgrow the free tiers you can upgrade either service later without
changing the app.

---

Need a hand on any step? Tell me which **Part / Step number** you're on and
what you see on screen, and I'll walk you through it.

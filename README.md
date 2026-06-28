# BK/AO Dashboard

A minimalist, multi-device, **real-time-synced** board where a small
investment-research team tracks ideas across six independent buckets. All
content is hand-entered — there are no external feeds, integrations, or APIs.
Everyone shares one board and sees the same live state across their devices.

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend / data / realtime:** Supabase (hosted Postgres + Realtime)
- **Deploy:** Vercel (frontend) + Supabase (hosted)

---

## The six widgets

| # | Widget | Type | Data |
|---|--------|------|------|
| 1 | **Long Pipeline — Active Work** | Master-detail: company list → per-company Work Plan checklist | `pipeline_companies` (long) + `work_plan_items` |
| 2 | **Short Pipeline — Active Work** | Same as #1, separate data | `pipeline_companies` (short) + `work_plan_items` |
| 3 | **On Deck Circle** | Flat table: Company / L-S / Thesis | `idea_rows` (on_deck) |
| 4 | **Quick Cut Pipeline** | Same as #3, separate data | `idea_rows` (quick_cut) |
| 5 | **Whacky Ideas** | Same as #3, separate data | `idea_rows` (whacky) |
| 6 | **Friday Core Topics** | Simple checklist | `friday_topics` |

The buckets are independent — there is no promotion/funnel between them and
every list grows freely. Checking a checklist line strikes it through in **red**
(toggleable); a separate ✕ control deletes it. All editing is inline with
optimistic UI updates.

---

## Architecture notes

- **Widget registry.** The dashboard renders from a config array
  (`src/widgets/registry.tsx`: `WIDGETS = [{ id, title, component, span }]`),
  never from hard-coded positions. This is the seam for future drag/drop and
  "Add Widget" — those are intentionally **not** built yet.
- **Shared card shell.** Every widget is wrapped by `WidgetCard`
  (header with title + placeholder `⋯` menu + scrollable body).
- **One realtime engine.** `src/hooks/useRealtimeTable.ts` does the initial
  fetch, subscribes to Postgres changes (optionally filtered to one column),
  keeps a locally-sorted copy, and exposes optimistic `insert` / `update` /
  `remove`. Every widget is a thin view over this hook. Optimistic rows use a
  client-generated UUID so the row's own realtime echo merges by `id` instead
  of duplicating.
- **Auth / gate.** A single shared 6-digit code gates the whole app. See below.

```
src/
  App.tsx                  setup notice / gate / dashboard switch
  lib/
    supabase.ts            client + isSupabaseConfigured guard
    types.ts               domain types (mirror the tables)
  hooks/
    useRealtimeTable.ts    generic fetch + realtime + optimistic CRUD
  auth/
    useSession.ts          tracks the shared Supabase session
    CodeGate.tsx           6-digit code entry screen
  components/
    Dashboard.tsx          header + responsive grid (3×2 desktop)
    WidgetCard.tsx         shared card shell
    InlineText.tsx         borderless inline-editable field
    Checklist.tsx          checkbox + text + delete (shared by #1/#2/#6)
  widgets/
    registry.tsx           WIDGETS config array
    PipelineWidget.tsx     master-detail (#1, #2)
    IdeaTableWidget.tsx    Company/L-S/Thesis table (#3, #4, #5)
    FridayTopicsWidget.tsx checklist (#6)
supabase/
  migrations/0001_init.sql tables + indexes + RLS + realtime
  functions/verify-code/   Edge Function that gates on the shared code
```

---

## How the code gate works (preferred: Edge Function)

1. First visit shows a code-entry screen.
2. The 6 digits are POSTed to the `verify-code` Edge Function.
3. The function compares them to the secret `APP_ACCESS_CODE`. The code is
   **never shipped to the browser**.
4. On a match, the function signs into **one shared Supabase Auth account**
   (server-side, using secret credentials) and returns that session.
5. The client installs the session; Supabase persists it in `localStorage`, so
   the device stays unlocked across reloads until you click **Lock**.
6. Row Level Security allows the `authenticated` role full read/write — so only
   devices that passed the gate can touch the data.

> **Acceptable fallback (not used here):** a purely client-side code check with
> anon RLS (security by URL obscurity). Acceptable given low confidentiality,
> but it ships the code in the bundle. This project uses the Edge Function
> approach instead.

---

## Setup — run locally first

### Prerequisites
- Node 18+ and npm
- A free [Supabase](https://supabase.com) project
- (Optional) the [Supabase CLI](https://supabase.com/docs/guides/cli) for
  applying migrations / deploying the function from your terminal

### 1. Create the Supabase project
In the Supabase dashboard, create a project. Then from **Project Settings → API**
note your:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 2. Apply the database migration
Run `supabase/migrations/0001_init.sql`. Either:

- **Dashboard:** open **SQL Editor**, paste the file contents, and run it; **or**
- **CLI:** `supabase link --project-ref <ref>` then `supabase db push`.

This creates the four tables, indexes, RLS policies (authenticated full
access), and adds every table to the `supabase_realtime` publication.

### 3. Confirm Realtime is enabled
The migration adds all four tables to the `supabase_realtime` publication. To
double-check, open **Database → Replication → `supabase_realtime`** and confirm
`pipeline_companies`, `work_plan_items`, `idea_rows`, and `friday_topics` are
listed.

### 4. Create the one shared auth account
This is the account every device signs into after entering the code.

- **Authentication → Users → Add user** (or "Create new user").
- Use any email + a strong password, e.g. `shared@yourteam.example` /
  `<long-random-password>`. **Confirm/auto-confirm the email** so password
  sign-in works.
- (Email/password sign-in must be enabled under **Authentication → Providers**.)

### 5. Set the access code + deploy the Edge Function
Set the function secrets (these stay server-side):

```bash
supabase secrets set \
  APP_ACCESS_CODE=123456 \
  SHARED_USER_EMAIL=shared@yourteam.example \
  SHARED_USER_PASSWORD='<the shared account password>'
```

> Replace `123456` with your real 6-digit code. `SUPABASE_URL`,
> `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
> automatically — do not set them.

Deploy the function:

```bash
supabase functions deploy verify-code
```

### 6. Configure the frontend env
```bash
cp .env.example .env
# then edit .env:
#   VITE_SUPABASE_URL=https://<your-ref>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<your anon key>
```

### 7. Install and run
```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). Enter your 6-digit code.
Open the app on a second device/tab and confirm edits propagate in ~1–2s
without a refresh.

Useful scripts:
- `npm run dev` — dev server
- `npm run build` — type-check + production build to `dist/`
- `npm run preview` — preview the production build
- `npm run typecheck` — `tsc --noEmit`

---

## Deploy

### Frontend → Vercel
1. Import the repo in Vercel. Framework preset: **Vite** (build `npm run build`,
   output `dist`).
2. Add env vars **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** in the
   Vercel project settings.
3. Deploy.

### Backend → Supabase (hosted)
Already hosted once you've done setup steps 1–5. The migration and the
`verify-code` function live under `supabase/` and can be re-applied with the
Supabase CLI.

> The 6-digit code is low-confidentiality access control, not strong security.
> All three users share equal read/write with no per-user identity, roles, edit
> history, or attribution — by design.

---

## Out of scope (by design)
Offline support; edit history / audit / attribution; user accounts or roles
beyond the shared code; any external/licensed data feed or integration;
charts/analytics; promotion between widgets; drag/drop and Add-Widget (the
registry is architected for them, but they are not implemented).

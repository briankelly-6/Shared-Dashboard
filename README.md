# BK/AO Dashboard

A minimalist, multi-device, **real-time-synced** board where a small
investment-research team tracks ideas across six independent buckets. All
content is hand-entered — there are no external feeds, integrations, or APIs.
Everyone shares one board and sees the same live state across their devices.

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend / data / realtime:** Supabase (hosted Postgres + Realtime)
- **Deploy:** Vercel (frontend) + Supabase (hosted)

> **New here / non-technical?** Follow **[GET-LIVE.md](./GET-LIVE.md)** — a
> click-by-click guide to putting this online with no developer tools.

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
- **Code gate.** A single shared 6-digit code gates the UI client-side
  (`src/auth/CodeGate.tsx`): the entered code is compared to
  `VITE_APP_ACCESS_CODE`, and a passing device is remembered in `localStorage`.

```
src/
  App.tsx                  setup notice / gate / dashboard switch
  lib/
    supabase.ts            client + isSupabaseConfigured guard
    config.ts              access code + unlock-key
    types.ts               domain types (mirror the tables)
  hooks/
    useRealtimeTable.ts    generic fetch + realtime + optimistic CRUD
  auth/
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
```

---

## Setup (technical summary)

For the full point-and-click version, see **[GET-LIVE.md](./GET-LIVE.md)**.

1. **Create a Supabase project** at https://supabase.com/dashboard.
2. **Run the migration:** open the project's **SQL Editor**, paste the contents
   of `supabase/migrations/0001_init.sql`, and run it. This creates the four
   tables, indexes, RLS policies (anon full access), and adds every table to the
   `supabase_realtime` publication.
3. **Confirm Realtime:** **Database → Publications → `supabase_realtime`** should
   list all four tables (the migration adds them). Note: this is **Publications**,
   not the separate "Replication" (read-replicas) page.
4. **Get your keys:** the **publishable key** (Project Settings → **API Keys** →
   `sb_publishable_…`) is your `VITE_SUPABASE_ANON_KEY`; the **Project URL**
   (green **Connect** button, or Settings → Data API) is your
   `VITE_SUPABASE_URL`. Never use the secret key (`sb_secret_…`) in the
   frontend. (On older projects, the legacy `anon` `public` key `eyJ…` works too.)
5. **Configure env vars** (locally in `.env`, and in your host for production):
   ```
   VITE_SUPABASE_URL=https://<your-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your anon key>
   VITE_APP_ACCESS_CODE=<your 6-digit code>
   ```
6. **Run locally:**
   ```bash
   npm install
   npm run dev
   ```
   Open the printed URL, enter the code, and confirm edits sync across a second
   tab/device in ~1–2s.

Scripts: `npm run dev` · `npm run build` · `npm run preview` · `npm run typecheck`.

### Deploy the frontend → Vercel
Import the repo in Vercel (framework preset **Vite**; build `npm run build`,
output `dist`), add the three `VITE_*` env vars in the Vercel project settings,
and deploy. The backend (Supabase) is already hosted once steps 1–3 are done.

---

## Security note

This is **low-confidentiality** access control, by design. The 6-digit code is
checked in the browser, and the database is reachable with the public anon key
under permissive RLS. In practice that means: anyone who has the site URL and
the code can use the board, and a technically-minded person could recover the
code or the anon key from the site. That is an accepted trade-off for a small
internal team board with no sensitive data.

If you later want stronger protection (keep the code secret on the server, lock
the database to authenticated requests only), that can be added with a Supabase
Edge Function + a shared auth account. Ask and it can be reintroduced.

---

## Out of scope (by design)
Offline support; edit history / audit / attribution; user accounts or roles
beyond the shared code; any external/licensed data feed or integration;
charts/analytics; promotion between widgets; drag/drop and Add-Widget (the
registry is architected for them, but they are not implemented).

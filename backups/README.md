# backups/ — the board's nightly data export

The BK/AO Dashboard's content lives only in four Supabase tables and is typed in
by hand. This folder is its backup: one JSON file per table, written every night
by the GitHub Actions workflow `.github/workflows/backup.yml`, committed only
when the data changed.

| file | table | what it holds |
|---|---|---|
| `pipeline_companies.json` | `pipeline_companies` | Long / Short Pipeline companies and their Status notes |
| `work_plan_items.json` | `work_plan_items` | each company's Work Plan to-dos |
| `idea_rows.json` | `idea_rows` | On Deck Circle, Quick Cut Pipeline, Whacky Ideas rows |
| `friday_topics.json` | `friday_topics` | Friday Catch Up Topics |
| `MANIFEST.json` | — | when the last export ran and how many rows each table had |

The nightly read is also the **keep-alive**: Supabase's free plan pauses a
project after seven days without a request, and a paused project makes the
board look blank (that happened on 2026-09-10; resuming the project in the
Supabase dashboard brought everything back). One request a day keeps it awake.

**The export is guarded.** If a table that had rows in the last backup comes
back empty, or lost more than half its rows, the job fails and writes nothing,
so the previous backup is never overwritten by a bad read (a paused project,
a rejected key or a dropped access policy all read as an empty table). GitHub
emails the repo owner when the job fails. If the rows were removed on purpose,
run the workflow by hand with **allow_shrink** ticked. The export also pages
through large tables, so nothing is silently cut at the API's 1,000-row limit.

Backup-only commits do not redeploy the site: `vercel.json` tells Vercel to
skip a build when only `backups/`, `scripts/` or `.github/` changed.

## If the board is ever blank again

1. Open the Supabase dashboard. If the project says **Paused**, click **Restore**,
   wait two minutes, reload the board. Nothing was deleted.
2. If it is running but a widget shows the red "Can't reach the database" line,
   the message in brackets says why (key, policy, network).
3. Only if the tables are genuinely empty: restore from here.

## Restoring

From a checkout of this repo, with the two public values the site is built with
(Vercel → Settings → Environment Variables):

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=<key> \
  python3 scripts/restore_backup.py
```

It upserts every row by id (parent tables first), so it is safe on a table that
still has some rows: rows present in the backup are re-created or overwritten
with the backup's version, and rows added since the backup are left alone. A row
the team deleted after the backup was taken comes back too, so re-delete those
on the board afterwards. `--dry-run` only counts the files; `--only friday_topics`
restores one table. Then reload the board.

## Setup (once)

Repository **Settings → Secrets and variables → Actions → New repository secret**:
`SUPABASE_URL` and `SUPABASE_ANON_KEY`, the same values as Vercel's
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Then **Actions → Nightly
backup + keep-alive → Run workflow** to write the first export.

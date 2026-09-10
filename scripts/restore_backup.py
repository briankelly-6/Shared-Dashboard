#!/usr/bin/env python3
"""Restore the BK/AO Dashboard's Supabase tables from the JSON files in backups/.

The nightly workflow (.github/workflows/backup.yml) writes one JSON file per table.
This script pushes them back through the same public REST API the board itself
uses, as UPSERTS keyed on each row's id — so it is safe to run against a table
that still holds some rows: existing rows are overwritten with the backup's
version, missing rows are re-created, and rows added since the backup are left
alone. Parent rows (pipeline_companies) go first so work_plan_items can
reference them.

Standard library only — no install step.

Usage (from the repo root):
    SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=<key> \
        python3 scripts/restore_backup.py            # restore all four tables
    python3 scripts/restore_backup.py --dry-run      # only read and count the files
    python3 scripts/restore_backup.py --only friday_topics idea_rows

The URL and key are the same two values the site is built with (Vercel's
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

# Parent tables before children (work_plan_items references pipeline_companies).
TABLES = ["pipeline_companies", "work_plan_items", "idea_rows", "friday_topics"]
BATCH = 200


def load(table: str, backups_dir: str) -> list[dict]:
    path = os.path.join(backups_dir, f"{table}.json")
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    if not isinstance(rows, list):
        raise SystemExit(f"{path}: expected a JSON list of rows")
    for r in rows:
        if not isinstance(r, dict) or "id" not in r:
            raise SystemExit(f"{path}: every row must be an object with an id")
    return rows


def upsert(url: str, key: str, table: str, rows: list[dict]) -> None:
    endpoint = f"{url.rstrip('/')}/rest/v1/{table}?on_conflict=id"
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(chunk).encode("utf-8"),
            method="POST",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                # merge-duplicates = upsert on the conflict target (id).
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status not in (200, 201, 204):
                    raise SystemExit(f"{table}: unexpected HTTP {resp.status}")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:500]
            raise SystemExit(f"{table}: HTTP {e.code} — {body}") from e
        print(f"  {table}: upserted rows {i + 1}–{i + len(chunk)} of {len(rows)}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--backups-dir", default="backups")
    ap.add_argument("--only", nargs="+", choices=TABLES, help="restore only these tables")
    ap.add_argument("--dry-run", action="store_true", help="read and count the files; write nothing")
    a = ap.parse_args()

    tables = [t for t in TABLES if not a.only or t in a.only]
    data = {t: load(t, a.backups_dir) for t in tables}
    for t in tables:
        print(f"{t}: {len(data[t])} rows in {a.backups_dir}/{t}.json")
    if a.dry_run:
        print("dry run — nothing written")
        return 0

    url, key = os.environ.get("SUPABASE_URL", ""), os.environ.get("SUPABASE_ANON_KEY", "")
    if not url or not key:
        print("SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment (see the docstring).", file=sys.stderr)
        return 2
    for t in tables:
        if data[t]:
            upsert(url, key, t, data[t])
        else:
            print(f"  {t}: backup is empty — nothing to restore")
    print("done — reload the board.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

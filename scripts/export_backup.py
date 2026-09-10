#!/usr/bin/env python3
"""Export the BK/AO Dashboard's four Supabase tables to backups/<table>.json — paged, and GUARDED.

Run nightly by .github/workflows/backup.yml (the read is also the keep-alive against the free plan's
seven-idle-day pause). Standard library only.

Two things the first version of the workflow got wrong, fixed here:

1. PAGING. PostgREST caps one response at the project's `max-rows` (1,000 by default), silently. A table
   past that size would have been exported truncated and the truncation would have looked like data.
   This script pages with `Range` headers and `Prefer: count=exact`, and stops only when it holds every
   row the server says exists.

2. THE SHRINK GUARD. A read that returns nothing — the project paused, a key rejected, an access policy
   dropped, or the rows genuinely deleted — used to be committed as the new backup, overwriting the last
   good one (recoverable from git history, but the restore script reads the latest files). Now a table
   that previously had rows and comes back EMPTY, or that lost more than half its rows, makes the export
   REFUSE: nothing is written, the previous files stand, and the job fails loudly so the owner looks.
   A deliberate clean-up is allowed through with ALLOW_SHRINK=true (the workflow's "allow_shrink" input).

Environment: SUPABASE_URL, SUPABASE_ANON_KEY (required); ALLOW_SHRINK (default false);
BACKUPS_DIR (default "backups"); PAGE_SIZE (default 1000).
Exit codes: 0 exported; 1 refused by the guard or a failed read; 2 missing configuration.
"""
from __future__ import annotations

import datetime as _dt
import json
import os
import shutil
import sys
import tempfile
import urllib.error
import urllib.request

# Parent tables first (the same order the restore script uses).
TABLES = ["pipeline_companies", "work_plan_items", "idea_rows", "friday_topics"]
SHRINK_FLOOR = 10          # below this many previous rows, only the zero case is guarded
SHRINK_RATIO = 0.5         # a drop past half the previous count is guarded


def _get(url: str, key: str, table: str, start: int, page: int):
    """One page. Returns (rows, total_or_None). Raises on HTTP errors other than 416 (past the end)."""
    endpoint = (f"{url.rstrip('/')}/rest/v1/{table}"
                f"?select=*&order=sort_order.asc,created_at.asc,id.asc")
    req = urllib.request.Request(endpoint, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Range-Unit": "items",
        "Range": f"{start}-{start + page - 1}",
        "Prefer": "count=exact",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            rows = json.load(resp)
            content_range = resp.headers.get("Content-Range", "")
    except urllib.error.HTTPError as e:
        if e.code == 416:            # Range starts past the last row: the table ended exactly on a page
            return [], None
        body = e.read().decode("utf-8", "replace")[:300]
        raise SystemExit(f"::error::{table}: HTTP {e.code} from the API — {body}") from e
    if not isinstance(rows, list):
        raise SystemExit(f"::error::{table}: unexpected response (not a list): {str(rows)[:200]}")
    total = None
    if "/" in content_range:
        tail = content_range.rsplit("/", 1)[1]
        if tail.isdigit():
            total = int(tail)
    return rows, total


def fetch_all(url: str, key: str, table: str, page: int) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while True:
        chunk, total = _get(url, key, table, start, page)
        rows.extend(chunk)
        if not chunk or len(chunk) < page or (total is not None and len(rows) >= total):
            break
        start += page
    ids = [r.get("id") for r in rows]
    if len(set(ids)) != len(ids):
        raise SystemExit(f"::error::{table}: duplicate ids across pages — the ordering is not stable; refusing")
    return rows


def _prev_count(backups_dir: str, table: str):
    path = os.path.join(backups_dir, f"{table}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            prev = json.load(f)
        return len(prev) if isinstance(prev, list) else None
    except (OSError, ValueError):
        return None


def guard(table: str, prev, new: int, allow_shrink: bool):
    """Return a refusal message, or None when the new count is acceptable."""
    if prev is None or allow_shrink:
        return None
    if prev > 0 and new == 0:
        return (f"{table}: the previous backup had {prev} rows and this read returned 0. Refusing to overwrite "
                f"it — a paused project, a rejected key or a dropped access policy all read as an empty table. "
                f"Check the Supabase project; re-run with allow_shrink=true only if the rows were deleted on purpose.")
    if prev >= SHRINK_FLOOR and new < prev * SHRINK_RATIO:
        return (f"{table}: {prev} rows in the previous backup, {new} now — more than half gone. Refusing to "
                f"overwrite; re-run with allow_shrink=true if this was a deliberate clean-up.")
    return None


def main() -> int:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_ANON_KEY", "").strip()
    if not url or not key:
        print("::error::SUPABASE_URL and SUPABASE_ANON_KEY must be set (repository secrets; see the workflow header).",
              file=sys.stderr)
        return 2
    allow_shrink = os.environ.get("ALLOW_SHRINK", "false").strip().lower() in ("1", "true", "yes")
    backups_dir = os.environ.get("BACKUPS_DIR", "backups")
    page = int(os.environ.get("PAGE_SIZE", "1000"))
    os.makedirs(backups_dir, exist_ok=True)

    staged = tempfile.mkdtemp(prefix="backup-stage-")
    counts, previous, refusals = {}, {}, []
    try:
        for t in TABLES:
            rows = fetch_all(url, key, t, page)
            prev = _prev_count(backups_dir, t)
            counts[t], previous[t] = len(rows), prev
            msg = guard(t, prev, len(rows), allow_shrink)
            if msg:
                refusals.append(msg)
            with open(os.path.join(staged, f"{t}.json"), "w", encoding="utf-8") as f:
                json.dump(rows, f, indent=2, ensure_ascii=False, sort_keys=True)
                f.write("\n")
            print(f"{t}: {len(rows)} rows (previous backup: {prev if prev is not None else 'none'})")
        if refusals:
            for m in refusals:
                print(f"::error::{m}", file=sys.stderr)
            print("REFUSED — the previous backup files were left untouched.", file=sys.stderr)
            return 1
        for t in TABLES:                       # every table passed: move the staged files in together
            shutil.move(os.path.join(staged, f"{t}.json"), os.path.join(backups_dir, f"{t}.json"))
    finally:
        shutil.rmtree(staged, ignore_errors=True)

    manifest = {
        "exported_at_utc": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "row_counts": counts,
        "previous_row_counts": previous,
        "allow_shrink": allow_shrink,
        "note": ("Nightly export of the BK/AO Dashboard's Supabase tables; also the keep-alive that stops the "
                 "free-plan pause. Paged; guarded against an empty or shrinking read. Restore with "
                 "scripts/restore_backup.py."),
    }
    with open(os.path.join(backups_dir, "MANIFEST.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
    print("exported:", json.dumps(counts))
    return 0


if __name__ == "__main__":
    sys.exit(main())

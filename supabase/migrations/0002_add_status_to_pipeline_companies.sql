-- ===========================================================================
-- BK/AO Dashboard — add a per-company Status field to the pipelines
-- Adds a free-text `status` column (shown beside the company name in the two
-- Pipeline widgets). Safe to run on an already-live database; the column is
-- created only if it doesn't already exist.
-- ===========================================================================

alter table public.pipeline_companies
  add column if not exists status text not null default '';

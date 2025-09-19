### Triggers and Operations

Scheduled Triggers (recommended)
- Ingest Active Month: run every 15 minutes.
- Month Rollover Check: run daily around 01:10 local.
- Callback Enrichment (optional): run hourly with small batches.

Operational Behavior
- Ingest is idempotent: uses ETag and per-month end-time cursor to avoid duplicates.
- Rollover finalizes the prior month with a last conditional fetch, then flips status to inactive and activates the new month.
- Callback enrichment stamps exact rating deltas and triggers targeted recompute for affected dates.

Quotas and Limits
- Respect UrlFetch quotas; prefer batching with `fetchAll` for known lists.
- Use exponential backoff for 429/5xx; cap retries to avoid trigger overruns.
- Locking prevents overlapping executions of the same orchestrator.

Runbooks
- Backfill: execute during off-hours; large histories may require multiple runs.
- Stalls: check Logs for codes, inspect Archives.errors, and confirm Script Properties (IDs, username).
- Data drift: rebuild DailyTotals for a clean slate; exactness fields will propagate on next callback runs.


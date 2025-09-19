### Performance and Idempotency

Idempotency Guards
- URL as uniqueness anchor in Games.
- Per-month end-time cursor (CURSOR_YYYY_MM_END_EPOCH) skips already ingested games.
- Conditional GETs with ETags to avoid unnecessary parsing and writes.

Batching and Memory
- Use setValues in chunks for large writes (e.g., 5k rows per chunk).
- Avoid `getDataRange` on large sheets; read only required ranges/columns.

Targeted Recompute
- Prefer `recomputeDailyForDates(dates)` when only some dates changed due to exactness updates.
- Full rebuild (`rebuildDailyTotals`) remains available for baseline correctness.

Resilience
- Locking prevents overlapping runs for the same orchestrator.
- Backoff with jitter on 429/5xx responses.
- Structured logs record codes and context for quick diagnosis.

Scalability Notes
- Incremental ingest focuses only on the active month.
- Rollover performs a final reconciliation fetch and then marks the month inactive.


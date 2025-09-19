### Project Overview

This project ingests your complete Chess.com game history into Google Sheets, keeps it incrementally updated, computes daily performance aggregates, and optionally enriches games with exact rating deltas via game callback endpoints. It is designed for reliability, idempotency, and low operational overhead.

### Components
- Games spreadsheet: canonical table of all games (one row per game).
- Metrics spreadsheet: operational/meta sheets — Archives, DailyTotals, CallbackStats, Logs.

### Core Capabilities
- Initial discovery of all monthly archive URLs for a user.
- Full backfill of historical games.
- Incremental ingestion for the active month using ETags and cursors.
- Month rollover finalization and activation of new month.
- Daily totals (wins/losses/draws/score, rating delta, games, duration) by date and format.
- Optional enrichment of exact rating changes via Chess.com callbacks, with targeted recompute of affected dates.

### Operating Principles
- Idempotent writes guarded by ETags, per-month end-time cursors, and URL uniqueness.
- Batched sheet operations for performance.
- Structured logging for observability.
- Minimal required scopes; configuration stored in Script Properties.

### What’s Not in This Doc
No function-by-function runtime details. This documentation focuses on schemas, constants, state, contracts, and operational behavior that remain stable across restarts.


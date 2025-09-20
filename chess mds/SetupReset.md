### Setup and Reset Guide

Initial Setup (fresh project)
1. Configure Script Properties via code settings:
   - CHESS_USERNAME (required)
   - TIMEZONE (optional)
   - SPREADSHEET_NAME_GAMES (optional)
   - SPREADSHEET_NAME_CALLBACKS (optional)
   - SPREADSHEET_NAME_RATINGS (optional)
   - SPREADSHEET_NAME_STATS (optional)
   - SPREADSHEET_NAME_LIVESTATS (optional)
   - SPREADSHEET_NAME_ARCHIVES (optional)
   - SPREADSHEET_NAME_DAILYTOTALS (optional)
   - SPREADSHEET_NAME_LOGS (optional)
2. Create/open spreadsheets:
   - Games: creates sheet `Games` with canonical headers.
   - Callbacks: creates `CallbackStats`.
   - Ratings: creates `Ratings` and `Adjustments`.
   - Stats: creates `PlayerStats`.
   - LiveStats: creates `LiveStatsEOD` and `LiveStatsMeta`.
   - Archives: creates `Archives`.
   - DailyTotals: creates `DailyTotals`.
   - Logs: creates `Logs`.
3. Discover and write `Archives` rows for all months.

Full Backfill
- Fetch all archive months, transform games to rows, append to Games.
- Update per-archive etag/last_modified/last_checked and counts.
- Build `DailyTotals` across all games.

Incremental Operation
- Ingest Active Month runs on schedule, amending only new games.
- Month Rollover finalizes the previous month and activates the new one.

Resetting
- To reset completely: delete both spreadsheets in Drive or clear `SPREADSHEET_ID_*` in Script Properties, then rerun setup and backfill.
- To reinitialize names/timezone: update properties and rebuild Archive rows if needed.

Optional Callback Enrichment
- Schedule periodic callback runs to gather exact rating deltas.
- Exactness propagates into `Games` then targeted `DailyTotals` recompute for affected dates.


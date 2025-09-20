### State and Script Properties

Persistent Keys (Script Properties)
```
CHESS_USERNAME: required username for ingestion
TIMEZONE: optional, overrides project timezone (e.g., America/New_York)
SPREADSHEET_NAME_GAMES: optional display name
SPREADSHEET_NAME_CALLBACKS: optional display name
SPREADSHEET_NAME_RATINGS: optional display name
SPREADSHEET_NAME_STATS: optional display name
SPREADSHEET_NAME_LIVESTATS: optional display name
SPREADSHEET_NAME_ARCHIVES: optional display name
SPREADSHEET_NAME_DAILYTOTALS: optional display name
SPREADSHEET_NAME_LOGS: optional display name

SPREADSHEET_ID_GAMES: created and stored on first creation/open
SPREADSHEET_ID_CALLBACKS: created and stored on first creation/open
SPREADSHEET_ID_RATINGS: created and stored on first creation/open
SPREADSHEET_ID_STATS: created and stored on first creation/open
SPREADSHEET_ID_LIVESTATS: created and stored on first creation/open
SPREADSHEET_ID_ARCHIVES: created and stored on first creation/open
SPREADSHEET_ID_DAILYTOTALS: created and stored on first creation/open
SPREADSHEET_ID_LOGS: created and stored on first creation/open

CURSOR_YYYY_MM_END_EPOCH: per-month last ingested end_time (unix seconds)
PROJECT_FOLDER_NAME: optional, not required in the current simplified flow
```

Notes
- Names are optional; if absent, defaults are derived from CONFIG.
- Cursors prevent reprocessing within a month by skipping games with end_time ≤ cursor.
- Spreadsheet IDs anchor to stable targets across executions and restarts.

Schema Versioning
- Archives schema_version column mirrors CONFIG.SCHEMA_VERSION.
- Bump when changing column orders or meanings; migrations should reconcile older rows.

Status and Error Recording
- Archives.status ∈ {active, inactive, active_pending}.
- Archives.errors: free-text last error code/string for operator visibility.


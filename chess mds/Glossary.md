### Glossary

Active Month: Current calendar month’s archive; ingested incrementally.
Archive: A monthly endpoint and its row in `Archives` describing status and metadata.
Callback: Unofficial game detail endpoint providing exact rating deltas and extra metadata.
Cursor: Per-month pointer (end_time epoch) used to skip already ingested games.
DailyTotals: Aggregated statistics per date and format.
ETag: HTTP validator used in conditional GET to detect changes without downloading bodies.
Exactness: Whether a rating delta originates from callbacks (true) or coarse estimation (false/empty).
Format: Derived category combining rules and time class, e.g., blitz, rapid, live960, daily960.
Game Row: Single canonical row in `Games` for a Chess.com game.
Rollover: Finalization of prior month and activation of new month at month boundary.
Script Properties: Persistent key-value store for configuration and cursors.


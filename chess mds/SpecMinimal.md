### Minimal Spec (Stable Contracts)

Row Mapping (Games)
```
url                 ← game.url or PGN Link (required; unique)
type                ← derived from url (live|daily)
id                  ← last path segment of url
time_control        ← json.time_control or PGN TimeControl
base_time           ← parseTimeControl(time_control).base
increment           ← parseTimeControl(time_control).inc
correspondence_time ← parseTimeControl(time_control).corr
start_time          ← from start_time epoch or PGN UTCDate+UTCTime → local fmt
end_time            ← from end_time epoch → local fmt
duration_seconds    ← end_time_epoch - start_time_epoch (≥0)
rated               ← json.rated (bool)
time_class          ← json.time_class (bullet|blitz|rapid|daily)
rules               ← json.rules (chess|chess960|...)
format              ← deriveFormat(time_class,rules,type)
player_username     ← tracked player per pickPlayerColor
player_color        ← white|black|''
player_rating       ← rating at end
player_result       ← json.(white|black).result
player_outcome      ← mapResultToOutcome(player_result)
player_score        ← 1|0.5|0 based on outcome
opponent_username   ← opposing side
opponent_color      ← opposing color
opponent_rating     ← opposing rating
eco_code            ← PGN ECO (if present)
eco_url             ← PGN ECOUrl (fallback json.eco)
uuid                ← json.uuid (if present)
end_reason          ← derived from opposing result code
pgn_moves           ← movetext (PGN body after headers)
start_time_epoch    ← unix seconds (may be filled from PGN if missing)
end_time_epoch      ← unix seconds
rating_change_exact ← from callbacks if available, else ''
rating_is_exact     ← true if exact populated, else ''
```

Archives Row
```
year, month, archive_url, status(active|inactive|active_pending),
etag, last_modified, last_checked, game_count_api, game_count_ingested,
callback_completed, errors, schema_version
```

DailyTotals Row (date+format)
```
date, format, wins, losses, draws, score,
rating_start, rating_end, rating_change, games, duration_seconds,
rating_change_exact, is_rating_exact
```

Stable Constants
```
Formats: bullet|blitz|rapid|daily|live960|daily960|threecheck|kingofthehill|bughouse|crazyhouse
Outcomes: win|draw|loss (from result codes)
Time fmt: yyyy-MM-dd HH:mm:ss (project timezone)
UA: ChessSheets/1.0 (AppsScript)
```

State (Script Properties)
```
CHESS_USERNAME, TIMEZONE,
SPREADSHEET_ID_GAMES, SPREADSHEET_ID_METRICS,
CURSOR_YYYY_MM_END_EPOCH (one per month)
```

Operational Loop
1) Full backfill (all months) → Games + Archives + DailyTotals
2) Incremental ingest (active month; ~5×/day) with ETag + month cursor
3) Rollover at month change: finalize old, activate new
4) Callback enrichment runs in small batches over time; updates exactness and recomputes affected dates only


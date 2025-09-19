### Data Model

All data lives in two spreadsheets: Games (raw normalized games) and Metrics (meta/aggregates/logs). Column orders are stable and versioned via schema_version in Archives.

### Sheet: Games (canonical per-game rows)
Columns (order is canonical):
```
1 url
2 type
3 id
4 time_control
5 base_time
6 increment
7 correspondence_time
8 start_time
9 end_time
10 duration_seconds
11 rated
12 time_class
13 rules
14 format
15 player_username
16 player_color
17 player_rating
18 player_result
19 player_outcome
20 player_score
21 opponent_username
22 opponent_color
23 opponent_rating
24 eco_code
25 eco_url
26 uuid
27 end_reason
28 pgn_moves
29 start_time_epoch
30 end_time_epoch
31 rating_change_exact
32 rating_is_exact
```

Semantics:
- url: unique game URL; primary anti-duplication key.
- type: "live" or "daily".
- id: final URL segment; pairs with type but url remains the uniqueness anchor.
- time_control: raw field (e.g., "180+2", "60", "1/86400").
- base_time/increment/correspondence_time: parsed from time_control; one of live or daily fields will be null as appropriate.
- start_time/end_time: localized strings (project timezone) formatted yyyy-MM-dd HH:mm:ss.
- duration_seconds: non-negative integer; end_time_epoch - start_time_epoch.
- rated: boolean.
- time_class: bullet, blitz, rapid, daily.
- rules: chess, chess960, threecheck, etc.
- format: derived consolidated format (see Constants) used for daily totals.
- player/opponent_*: identity and results for the tracked user vs opponent.
- eco_code/eco_url: PGN-derived code and opening URL.
- end_reason: normalized termination derived from opponents’ result codes.
- pgn_moves: movetext after headers.
- start_time_epoch/end_time_epoch: raw unix seconds for precise math.
- rating_change_exact/rating_is_exact: populated from callback enrichment when available.

Invariants:
- url is non-empty for any row persisted.
- If rated is true, player_result ∈ {win, draw, loss} and player_score ∈ {1,0.5,0}.
- format is one of declared formats (Constants).

### Sheet: Archives (per-month operational metadata)
Columns:
```
1 year
2 month
3 archive_url
4 status
5 etag
6 last_modified
7 last_checked
8 game_count_api
9 game_count_ingested
10 callback_completed
11 errors
12 schema_version
```

Semantics:
- status ∈ {active, inactive, active_pending}.
- etag/last_modified/last_checked: freshness markers for conditional GETs.
- game_count_api: games reported by API for the month.
- game_count_ingested: count of rows in Games for that year+month (see counting approach).
- callback_completed: optional progress marker for callback coverage.
- errors: last error code/string for visibility.
- schema_version: aligns with the code’s CONFIG.SCHEMA_VERSION.

### Sheet: DailyTotals (aggregated per date+format)
Columns:
```
1 date
2 format
3 wins
4 losses
5 draws
6 score
7 rating_start
8 rating_end
9 rating_change
10 games
11 duration_seconds
12 rating_change_exact
13 is_rating_exact
```

Semantics:
- date: yyyy-MM-dd (project timezone).
- format: see Constants.
- rating_start/rating_end: coarse derived values from per-game ratings that day; rating_change = end - start.
- rating_change_exact/is_rating_exact: optional fields reflecting exactness propagated from callbacks.

### Sheet: CallbackStats (raw per-game callback JSON)
Columns:
```
1 url
2 type
3 id
4 exact_rating_change
5 pregame_rating
6 data_json
7 fetched_at
```

Semantics:
- data_json: full raw JSON from callback endpoint for traceability.
- exact_rating_change/pregame_rating: convenient lift for downstream reconciliation.

### Sheet: Logs (structured events)
Columns:
```
1 timestamp
2 level
3 code
4 message
5 context_json
```

Semantics:
- level ∈ {INFO, WARN, ERROR}.
- code: short machine code, e.g., BACKFILL_DONE, CALLBACK_HTTP, etc.
- context_json: structured payload for diagnostics.


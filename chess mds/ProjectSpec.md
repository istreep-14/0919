### Project Spec (Concise, New Structure)

Goal
- Backfill ~10k games; maintain daily totals; run callbacks over time for exactness; ingest new games ~5×/day; keep design simple, fast, and extensible for future per-game enrichments.

Sheets (minimal and intuitive)
- Games (single canonical table; newest at top)
- Metrics:
  - Archives (immutable months metadata)
  - DailyTotals (single sheet; includes all formats; highlights bullet/blitz/rapid; includes a consolidated Main3 row per date)
  - CallbackStats (raw enriched stats per game; identity for both players; exact rating deltas)
  - Logs (structured)

Games Columns (stable order)
```
url                       (required unique)
type                      (live|daily)
id                        (from url)
time_control              (raw)
base_time                 (parsed)
increment                 (parsed)
correspondence_time       (parsed)
start_time                (local yyyy-MM-dd HH:mm:ss)
end_time                  (local)
duration_seconds          (≥0)
rated                     (bool)
time_class                (bullet|blitz|rapid|daily)
rules                     (chess|chess960|...)
format                    (derived; see Constants)
player_username           (me)
player_color              (white|black)
player_rating_post        (postgame rating at end)
player_result             (raw result code)
player_outcome            (win|draw|loss)
player_score              (1|0.5|0)
opponent_username         
opponent_color            
opponent_rating_post      
eco_code                  (PGN)
eco_url                   (PGN or json.eco)
uuid                      
end_reason                (derived)
pgn_moves                 (movetext)
start_time_epoch          (unix)
end_time_epoch            (unix)

last_rating               (coarse last known post rating from previous game same format; empty for first)
rating_change_last        (player_rating_post - last_rating; empty if last_rating empty)

exact_pregame_rating      (from callbacks if available; for my color)
exact_rating_change       (from callbacks; my color) 
rating_is_exact           (true when exact fields populated)
```

CallbackStats Columns (raw+identity for both players)
```
url, type, id,
my_color, my_exact_rating_change, my_pregame_rating,
opp_color, opp_pregame_rating, opp_exact_rating_change,
game_end_reason, is_live_game, is_rated, ply_count,
white_username, white_rating, black_username, black_rating,
eco_code, eco_from_pgn, pgn_date, pgn_time, base_time1, time_increment1,
data_json, fetched_at
```

Archives Columns
```
year, month, archive_url, status(active|inactive|active_pending),
etag, last_modified, last_checked,
game_count_api, game_count_ingested,
callback_completed, errors, schema_version
```

DailyTotals Columns (per date+format + main-3 aggregate)
```
date, format, wins, losses, draws, score,
rating_start, rating_end, rating_change,
games, duration_seconds,
rating_change_exact, is_rating_exact
```

DailyTotals behavior
- Includes all formats, but focus on main 3: bullet, blitz, rapid.
- For UX, you can filter to main 3 or hide others; still compute and retain others.
- Add a synthetic row per date with format=Main3 that aggregates bullet+blitz+rapid:
  - wins/losses/draws/score/games/duration are sums.
  - rating_start/end are taken as the earliest start and latest end among the three formats that day; rating_change is end−start.
- Exactness:
  - If exact pregame rating is known for a game, it refines rating start/end; otherwise, use postgame rating chaining via last_rating.
  - When callbacks fill exactness for some games, recompute only the affected dates.

Sorting Rules
- Games: newest first (insert new games at row 2). Backfill writes older months bottom-up or appends then reorders by inserting at top for incremental months.
- DailyTotals: chronological ascending by date, within date by format order [bullet, blitz, rapid, Main3, others alphabetical]. New dates appear at the end of existing dates.

Ingestion Strategy
- Backfill (~10k):
  - Iterate monthly archives; use ETag; transform to rows; write in chunks.
  - Fill last_rating/rating_change_last by scanning within each format in chronological order.
  - Build DailyTotals once at the end for accuracy and performance.
- Incremental (~5×/day):
  - Only active month; conditional GET with ETag.
  - Select games with end_time_epoch > per-month cursor.
  - Insert newest-first at top; update cursor to newest end_time_epoch.
  - Update last_rating/rating_change_last for affected formats using previous rows above.
  - Targeted recompute for end dates impacted.

Callbacks and Exactness
- Batch small (e.g., 30) games lacking exactness.
- From response, identify my_color by username and take `ratingChangeWhite` or `ratingChangeBlack` accordingly.
- Stamp `exact_pregame_rating` and `exact_rating_change` into Games and set `rating_is_exact=true`.
- Update CallbackStats with identity (both players) and important fields for analysis.
- Recompute DailyTotals for affected dates only.

Optional Future Enrichments (same pattern)
- Opening Analysis: external API per game; write raw sheet (OpeningAnalysis) keyed by url; add minimal lift columns to Games if desired.
- Game Data: external API per game; write raw sheet (GameData) keyed by url; add minimal lifts to Games.

Constants
```
Formats: bullet, blitz, rapid, daily, live960, daily960, threecheck, kingofthehill, bughouse, crazyhouse, Main3
Result→Outcome: win→win; agreed/repetition/stalemate/insufficient/50move/timevsinsufficient→draw; others→loss
Time format: yyyy-MM-dd HH:mm:ss (project TZ)
User-Agent: ChessSheets/1.0 (AppsScript)
Archives Status: active|inactive|active_pending
```

Helpers (contracts)
```
parseTimeControl, toLocalDateTimeStringFromUnixSeconds,
deriveFormat, computeDurationSeconds, pickPlayerColor, safe,
mapResultToOutcome, extractPgnHeader, writeRowsChunked
```

Triggers
```
Ingest Active Month: every ~3 hours
Rollover: daily ~01:10
Callbacks Enrichment: hourly, small batch
Other Enrichments: hourly/off-peak
```

Rechecks (Old Months)
- Inactive archives are treated immutable. Optionally schedule a monthly recheck (ETag only) to catch rare retro changes.

Logging
- Logs(level, code, message, context_json) for each orchestrator run: counts of added rows, HTTP codes (2xx/304/4xx/5xx), timing.


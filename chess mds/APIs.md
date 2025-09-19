### APIs and HTTP Behavior

Official Chess.com Public Data API
- Archives list: `https://api.chess.com/pub/player/{username}/games/archives`
  - Returns array of monthly archive URLs.
- Monthly archive: `https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}`
  - Canonical per-game metadata including PGN.

Unofficial Game Callbacks (optional enrichment)
- Live: `https://www.chess.com/callback/live/game/{id}`
- Daily: `https://www.chess.com/callback/daily/game/{id}`
  - Used for exact rating deltas and auxiliary details; may be slower and subject to change.

Request Policy
- Headers: `User-Agent: ChessSheets/1.0 (AppsScript)`, `Accept: application/json`.
- Conditional GET with ETag via `If-None-Match`.
- Handling codes:
  - 200–299: parse JSON body.
  - 304: not modified; skip processing and only update last_checked.
  - 404 on new month: treat as not-yet-available; mark active_pending where relevant.
  - 429/5xx: retry with exponential backoff + jitter; cap maximum attempts.

Batching
- When fetching multiple URLs, prefer `fetchAll` with per-request headers.
- Responses are handled individually; record per-response ETag and Last-Modified where present.

Parsing PGN
- Extract headers (ECO, ECOUrl, UTCDate, UTCTime, Link, etc.).
- Movetext captured as `pgn_moves` (content after header block).

Timezone
- Convert timestamps to project timezone for `start_time` and `end_time` string columns.


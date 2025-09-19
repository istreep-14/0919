### Enrichment Jobs (Extensible, Line-by-Line)

Callbacks (Exact Rating Delta)
- Input: Games rows lacking exactness; batch size small (e.g., 30).
- Fetch: `callback/(live|daily)/game/{id}`.
- Persist: `CallbackStats` raw JSON and quick lifts.
- Apply: stamp `rating_change_exact` and `rating_is_exact` on Games; trigger targeted daily recompute.

Opening Analysis (stub)
- Input: game url/id; external service endpoint TBD.
- Output: per-game analysis JSON; persist to a dedicated sheet (e.g., OpeningAnalysis) keyed by url.
- Apply: optional columns back into Games (keep minimal to avoid bloat).

Game Data (stub)
- Input: game url/id; external endpoint TBD (e.g., deeper stats/engine lines).
- Output: per-game detail JSON; persist to a dedicated sheet (e.g., GameData) keyed by url.
- Apply: optional minimal lift into Games.

Design Rules
- One enrichment writes: [RawSheet] + minimal lifts to Games.
- Do not block ingest on enrichment; run asynchronously via triggers.
- Keep batch sizes small; respect quotas.


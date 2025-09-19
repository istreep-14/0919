### Exactness and Callback Enrichment

Purpose
- The archive API does not always expose exact per-player rating deltas. Callback endpoints can provide `ratingChange`, `ratingChangeWhite`, and `ratingChangeBlack` for precision.

Flow
1. Build a batch of recent games not yet present in `CallbackStats`.
2. For each game, hit the callback endpoint based on type (live/daily) and id.
3. Persist raw JSON to `CallbackStats` along with quick lifts (exact change, pregame rating) and timestamp.
4. Stamp `rating_change_exact` and `rating_is_exact=true` into the corresponding `Games` rows, selecting the correct color’s change.
5. Collect affected game end dates and recompute DailyTotals only for those dates.

Fields
- Games.rating_change_exact: numeric signed delta for the tracked player.
- Games.rating_is_exact: boolean; set to true when sourced from callback.
- DailyTotals.rating_change_exact / is_rating_exact: optional aggregates reflecting per-day certainty.

Caveats
- Callbacks are unofficial and may change; handle 404 and non-2xx conservatively.
- Not all games may have retrievable callback data.
- Batch size should be modest to respect quotas.


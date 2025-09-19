### Constants and Enums

Schema
- schema_version: "1.0.0" (stored in Archives rows; bump on breaking column changes).

Sheet Names
```
Archives
Games
DailyTotals
DailyTotals_Active (legacy placeholder; consolidated into DailyTotals)
DailyTotals_Archive (legacy placeholder; consolidated into DailyTotals)
CallbackStats
Logs
```

Formats (normalized game categories)
```
bullet, blitz, rapid, daily,
live960, daily960,
threecheck, kingofthehill, bughouse, crazyhouse
```

Rules → Format mapping
- chess: use time_class as format (bullet/blitz/rapid/daily).
- chess960: live → live960, daily → daily960.
- threecheck/kingofthehill/bughouse/crazyhouse: format equals rules.
- oddschess exists but is not part of rating types used here.

Result code → outcome mapping (player-centric)
```
win → win
agreed → draw
repetition → draw
stalemate → draw
insufficient → draw
50move → draw
timevsinsufficient → draw
checkmated → loss
timeout → loss
resigned → loss
abandoned → loss
kingofthehill → loss
threecheck → loss
bughousepartnerlose → loss
```

Archive Status
```
active, inactive, active_pending
```

HTTP
- User-Agent: "ChessSheets/1.0 (AppsScript)"
- Conditional requests: If-None-Match with ETag.
- Backoff: exponential with jitter for 429 and 5xx.

Time Control Parsing
- Examples: "180+2" → base=180, increment=2; "300" → base=300, increment=0; "1/86400" → correspondence_time=86400.

Keys and Uniqueness
- Primary dedupe key: url (Games).
- Per-month cursor key: CURSOR_YYYY_MM_END_EPOCH in Script Properties.


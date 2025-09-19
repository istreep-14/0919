### Helpers Contracts (Keep Stable)

parseTimeControl(tc:string) → { base:number|null, inc:number, corr:number|null }
- "180+2" → {180,2,null}; "300" → {300,0,null}; "1/86400" → {null,0,86400}

toLocalDateTimeStringFromUnixSeconds(s:number) → string
- Returns yyyy-MM-dd HH:mm:ss in project timezone.

deriveFormat(timeClass:string, rules:string, type:string) → string
- chess → timeClass; chess960 → daily→daily960, live→live960; otherwise rules.

computeDurationSeconds(start:number, end:number) → number|''
- Returns non-negative difference or '' if either missing.

pickPlayerColor(me:string, white:string, black:string) → 'white'|'black'|''
- Case-insensitive match against usernames.

safe(val:any) → any
- Returns '' for null/undefined; otherwise val.

mapResultToOutcome(result:string) → 'win'|'draw'|'loss'|''
- Map via constants table.

extractPgnHeader(pgn:string, key:string) → string
- Regex extract of PGN header value.

writeRowsChunked(sheet, rows:any[][], startRow?:number)
- Writes in chunks (≤5k rows) for performance.


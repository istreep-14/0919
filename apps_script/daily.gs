function buildDailyTotalsInitial() {
  var ss = getOrCreateSpreadsheet();
  var games = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var dailyArchive = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DailyArchive, CONFIG.HEADERS.DailyArchive);
  // Clear existing archive daily (keep header)
  if (dailyArchive.getLastRow() > 1) dailyArchive.getRange(2, 1, dailyArchive.getLastRow() - 1, dailyArchive.getLastColumn()).clearContent();
  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var values = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();
  var map = new Map(); // key: date|format
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var endTimeStr = row[8]; // end_time local string
    var format = row[13];
    if (!endTimeStr || !format) continue;
    var d = new Date(endTimeStr);
    var dayStr = Utilities.formatDate(d, getProjectTimeZone(), 'yyyy-MM-dd');
    var key = dayStr + '|' + format;
    var rec = map.get(key) || { date: dayStr, format: format, wins: 0, losses: 0, draws: 0, score: 0, rating_start: '', rating_end: '', games: 0, duration: 0 };
    var outcome = row[18]; // player_outcome
    if (outcome === 'win') rec.wins++; else if (outcome === 'draw') rec.draws++; else if (outcome === 'loss') rec.losses++;
    rec.score += (outcome === 'win') ? 1 : (outcome === 'draw' ? 0.5 : 0);
    var rating = row[16];
    if (rec.rating_start === '') rec.rating_start = rating;
    rec.rating_end = rating;
    rec.games++;
    var dur = parseInt(row[9], 10);
    if (!isNaN(dur)) rec.duration += dur;
    map.set(key, rec);
  }
  var out = [];
  map.forEach(function(rec){
    out.push([rec.date, rec.format, rec.wins, rec.losses, rec.draws, rec.score, rec.rating_start, rec.rating_end, (rec.rating_end === '' || rec.rating_start === '') ? '' : (rec.rating_end - rec.rating_start), rec.games, rec.duration]);
  });
  // Sort by date asc
  out.sort(function(a,b){ return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });
  writeRowsChunked(dailyArchive, out, 2);
}

function recomputeDailyForDates(dates) {
  // dates: array of 'yyyy-MM-dd'
  if (!dates || !dates.length) return;
  var ss = getOrCreateSpreadsheet();
  var games = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var dailyActive = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DailyActive, CONFIG.HEADERS.DailyActive);
  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var values = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();
  var tz = getProjectTimeZone();
  var setDates = new Set(dates);
  var map = new Map(); // key: date|format
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var endTimeStr = row[8];
    var format = row[13];
    if (!endTimeStr || !format) continue;
    var dayStr = Utilities.formatDate(new Date(endTimeStr), tz, 'yyyy-MM-dd');
    if (!setDates.has(dayStr)) continue;
    var key = dayStr + '|' + format;
    var rec = map.get(key) || { date: dayStr, format: format, wins: 0, losses: 0, draws: 0, score: 0, rating_start: '', rating_end: '', games: 0, duration: 0 };
    var outcome = row[18];
    if (outcome === 'win') rec.wins++; else if (outcome === 'draw') rec.draws++; else if (outcome === 'loss') rec.losses++;
    rec.score += (outcome === 'win') ? 1 : (outcome === 'draw' ? 0.5 : 0);
    var rating = row[16];
    if (rec.rating_start === '') rec.rating_start = rating;
    rec.rating_end = rating;
    rec.games++;
    var dur = parseInt(row[9], 10);
    if (!isNaN(dur)) rec.duration += dur;
    map.set(key, rec);
  }
  // Clear and rewrite only rows for these dates in DailyActive
  var actLast = dailyActive.getLastRow();
  var existing = actLast > 1 ? dailyActive.getRange(2, 1, actLast - 1, dailyActive.getLastColumn()).getValues() : [];
  var keep = [];
  for (var j = 0; j < existing.length; j++) {
    var dstr = Utilities.formatDate(new Date(existing[j][0]), tz, 'yyyy-MM-dd');
    if (!setDates.has(dstr)) keep.push(existing[j]);
  }
  var out = [];
  map.forEach(function(rec){ out.push([rec.date, rec.format, rec.wins, rec.losses, rec.draws, rec.score, rec.rating_start, rec.rating_end, (rec.rating_end === '' || rec.rating_start === '') ? '' : (rec.rating_end - rec.rating_start), rec.games, rec.duration]); });
  // Rewrite
  if (actLast > 1) dailyActive.getRange(2, 1, actLast - 1, dailyActive.getLastColumn()).clearContent();
  if (keep.length) dailyActive.getRange(2, 1, keep.length, keep[0].length).setValues(keep);
  if (out.length) writeRowsChunked(dailyActive, out);
}


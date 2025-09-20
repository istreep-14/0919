function rebuildDailyTotals() {
  var gamesSS = getOrCreateGamesSpreadsheet();
  var dailySS = getOrCreateDailyTotalsSpreadsheet();
  var games = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var daily = getOrCreateSheet(dailySS, CONFIG.SHEET_NAMES.DailyTotals, CONFIG.HEADERS.DailyTotals);

  if (daily.getLastRow() > 1) daily.getRange(2, 1, daily.getLastRow() - 1, daily.getLastColumn()).clearContent();

  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var values = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();

  var buckets = {};
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var endTimeStr = row[1];
    var format = row[3];
    if (!endTimeStr || !format) continue;
    var d = new Date(endTimeStr);
    var key = Utilities.formatDate(d, getProjectTimeZone(), 'yyyy-MM-dd') + '|' + format;
    if (!buckets[key]) buckets[key] = {
      date: Utilities.formatDate(d, getProjectTimeZone(), 'yyyy-MM-dd'),
      format: format,
      wins: 0, losses: 0, draws: 0, score: 0, games: 0, duration: 0,
      ratings: []
    };
    var b = buckets[key];
    var outcome = row[6];
    var score = (outcome === 'win') ? 1 : (outcome === 'draw' ? 0.5 : 0);
    var duration = 0; // duration dropped in simplified Games
    var rating = row[4];
    if (outcome === 'win') b.wins++;
    else if (outcome === 'draw') b.draws++;
    else b.losses++;
    b.score += Number(score || 0);
    b.games++;
    b.duration += Number(duration || 0);
    if (rating) b.ratings.push(Number(rating));
  }

  var out = buildDailyRowsWithMain3(buckets);
  if (out.length) {
    writeRowsChunked(daily, out);
    applyDailyTotalsDefaultView(daily);
  }
}

function recomputeDailyForDates(dates) {
  if (!dates || !dates.length) return;
  var gamesSS = getOrCreateGamesSpreadsheet();
  var dailySS = getOrCreateDailyTotalsSpreadsheet();
  var games = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var daily = getOrCreateSheet(dailySS, CONFIG.SHEET_NAMES.DailyTotals, CONFIG.HEADERS.DailyTotals);

  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var values = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();
  var set = {};
  for (var i = 0; i < dates.length; i++) set[dates[i]] = true;

  var buckets = {};
  for (var j = 0; j < values.length; j++) {
    var row = values[j];
    var endTimeStr = row[1];
    var format = row[3];
    if (!endTimeStr || !format) continue;
    var d = new Date(endTimeStr);
    var dateKey = Utilities.formatDate(d, getProjectTimeZone(), 'yyyy-MM-dd');
    if (!set[dateKey]) continue;
    var key = dateKey + '|' + format;
    if (!buckets[key]) buckets[key] = { date: dateKey, format: format, wins: 0, losses: 0, draws: 0, score: 0, games: 0, duration: 0, ratings: [] };
    var b = buckets[key];
    var outcome = row[6];
    var score = (outcome === 'win') ? 1 : (outcome === 'draw' ? 0.5 : 0);
    var duration = 0;
    var rating = row[4];
    if (outcome === 'win') b.wins++; else if (outcome === 'draw') b.draws++; else b.losses++;
    b.score += Number(score || 0);
    b.games++;
    b.duration += Number(duration || 0);
    if (rating) b.ratings.push(Number(rating));
  }

  // Clear and rewrite only rows for these dates in DailyTotals
  if (daily.getLastRow() >= 2) {
    var actVals = daily.getRange(2, 1, daily.getLastRow() - 1, daily.getLastColumn()).getValues();
    var keep = [];
    for (var r = 0; r < actVals.length; r++) {
      var dstr = Utilities.formatDate(new Date(actVals[r][0]), getProjectTimeZone(), 'yyyy-MM-dd');
      if (!set[dstr]) keep.push(actVals[r]);
    }
    daily.getRange(2, 1, Math.max(0, daily.getLastRow() - 1), daily.getLastColumn()).clearContent();
    if (keep.length) daily.getRange(2, 1, keep.length, keep[0].length).setValues(keep);
  }
  var out = buildDailyRowsWithMain3(buckets);
  if (out.length) {
    writeRowsChunked(daily, out);
    applyDailyTotalsDefaultView(daily);
  }
}

function buildDailyTotalsInitial() {
  var gamesSS = getOrCreateGamesSpreadsheet();
  var dailySS = getOrCreateDailyTotalsSpreadsheet();
  var games = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var daily = getOrCreateSheet(dailySS, CONFIG.SHEET_NAMES.DailyTotals, CONFIG.HEADERS.DailyTotals);
  if (daily.getLastRow() > 1) daily.getRange(2, 1, daily.getLastRow() - 1, daily.getLastColumn()).clearContent();
  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var values = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();
  var map = new Map(); // key: date|format
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var endTimeStr = row[1];
    var format = row[3];
    if (!endTimeStr || !format) continue;
    var dayStr = Utilities.formatDate(new Date(endTimeStr), getProjectTimeZone(), 'yyyy-MM-dd');
    var key = dayStr + '|' + format;
    var rec = map.get(key) || { date: dayStr, format: format, wins: 0, losses: 0, draws: 0, score: 0, rating_start: '', rating_end: '', games: 0, duration: 0 };
    var outcome = row[6];
    if (outcome === 'win') rec.wins++; else if (outcome === 'draw') rec.draws++; else if (outcome === 'loss') rec.losses++;
    rec.score += (outcome === 'win') ? 1 : (outcome === 'draw' ? 0.5 : 0);
    var rating = row[4];
    if (rec.rating_start === '') rec.rating_start = rating;
    rec.rating_end = rating;
    rec.games++;
    var dur = 0;
    if (!isNaN(dur)) rec.duration += dur;
    map.set(key, rec);
  }
  var out = buildDailyRowsWithMain3FromMap(map);
  if (out.length) {
    writeRowsChunked(daily, out, 2);
    applyDailyTotalsDefaultView(daily);
  }
}

// remove duplicate legacy recomputeDailyForDates implementation

function buildDailyRowsWithMain3(buckets) {
  var rows = [];
  var byDate = {};
  for (var key in buckets) {
    var b = buckets[key];
    var rs = '', re = '', rc = '';
    if (b.ratings.length) {
      rs = Math.min.apply(null, b.ratings);
      re = Math.max.apply(null, b.ratings);
      rc = Number(re) - Number(rs);
    }
    rows.push([b.date, b.format, b.wins, b.losses, b.draws, b.score, rs, re, rc, b.games, b.duration]);
    (byDate[b.date] = byDate[b.date] || {})[b.format] = { wins: b.wins, losses: b.losses, draws: b.draws, score: b.score, games: b.games, duration: b.duration, rs: rs, re: re };
  }
  // Add Main3 aggregates
  var main = ['bullet','blitz','rapid'];
  Object.keys(byDate).forEach(function(date){
    var d = byDate[date];
    var wins=0,losses=0,draws=0,score=0,games=0,duration=0;
    var starts=[], ends=[];
    for (var i=0;i<main.length;i++){
      var f = d[main[i]];
      if (!f) continue;
      wins+=f.wins; losses+=f.losses; draws+=f.draws; score+=f.score; games+=f.games; duration+=f.duration;
      if (f.rs !== '') starts.push(Number(f.rs));
      if (f.re !== '') ends.push(Number(f.re));
    }
    if (wins+losses+draws > 0) {
      var rs = starts.length ? Math.min.apply(null, starts) : '';
      var re = ends.length ? Math.max.apply(null, ends) : '';
      var rc = (rs === '' || re === '') ? '' : (Number(re) - Number(rs));
      rows.push([date, 'Main3', wins, losses, draws, score, rs, re, rc, games, duration]);
    }
  });
  // Sort by date asc; format order: bullet, blitz, rapid, Main3, others alpha
  var order = { bullet:1, blitz:2, rapid:3, Main3:4 };
  rows.sort(function(a,b){
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    var fa = a[1] || '';
    var fb = b[1] || '';
    var oa = (order[fa] !== undefined) ? order[fa] : 1000;
    var ob = (order[fb] !== undefined) ? order[fb] : 1000;
    if (oa !== ob) return oa - ob;
    if (fa < fb) return -1;
    if (fa > fb) return 1;
    return 0;
  });
  return rows;
}

function buildDailyRowsWithMain3FromMap(map) {
  var buckets = {};
  map.forEach(function(rec){
    var key = rec.date + '|' + rec.format;
    buckets[key] = {
      date: rec.date,
      format: rec.format,
      wins: rec.wins,
      losses: rec.losses,
      draws: rec.draws,
      score: rec.score,
      games: rec.games,
      duration: rec.duration,
      ratings: []
    };
    if (rec.rating_start !== '') buckets[key].ratings.push(Number(rec.rating_start));
    if (rec.rating_end !== '') buckets[key].ratings.push(Number(rec.rating_end));
  });
  return buildDailyRowsWithMain3(buckets);
}

function applyDailyTotalsDefaultView(sheet) {
  try {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    var formatCol = CONFIG.HEADERS.DailyTotals.indexOf('format') + 1; // 2
    var dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    var values = dataRange.getValues();
    var hideRows = [];
    for (var i = 0; i < values.length; i++) {
      var fmt = values[i][formatCol - 1];
      if (fmt && fmt !== 'bullet' && fmt !== 'blitz' && fmt !== 'rapid' && fmt !== 'Main3') {
        hideRows.push(2 + i);
      }
    }
    // First unhide all for safety
    sheet.showRows(2, Math.max(0, lastRow - 1));
    // Then hide non-main formats by default
    for (var j = 0; j < hideRows.length; j++) {
      try { sheet.hideRows(hideRows[j]); } catch (e) {}
    }
  } catch (e) {}
}

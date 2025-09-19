function runCallbacksBatch() {
  var ss = getOrCreateSpreadsheet();
  var games = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var cb = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var values = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();

  // Build a small batch of candidates not yet in CallbackStats
  var existing = buildCallbackUrlIndex(cb);
  var batch = [];
  for (var i = 0; i < values.length && batch.length < 30; i++) {
    var url = values[i][0];
    if (!url || existing.has(url)) continue;
    var type = values[i][1] || inferTypeFromUrl(url);
    var id = values[i][2] || extractIdFromUrl(url);
    if (!id) continue;
    batch.push({ url: url, type: type, id: id });
  }
  if (!batch.length) return;

  // Fetch each callback (serial is fine; could batch with fetchAll to speed up)
  var outRows = [];
  for (var j = 0; j < batch.length; j++) {
    var b = batch[j];
    var endpoint = b.type === 'daily' ? ('https://www.chess.com/callback/daily/game/' + b.id) : ('https://www.chess.com/callback/live/game/' + b.id);
    try {
      var resp = UrlFetchApp.fetch(endpoint, { muteHttpExceptions: true, headers: { 'User-Agent': 'ChessSheets/1.0 (AppsScript)' }});
      var code = resp.getResponseCode();
      if (code >= 200 && code < 300) {
        var json = JSON.parse(resp.getContentText());
        var exactChange = extractExactRatingChange(json, b);
        var pregame = extractPregameRating(json, b);
        outRows.push([b.url, b.type, b.id, exactChange, pregame, JSON.stringify(json), new Date()]);
      } else if (code === 404) {
        // record as not found to avoid retries soon
        outRows.push([b.url, b.type, b.id, '', '', '{"error":404}', new Date()]);
      } else {
        logEvent('WARN', 'CALLBACK_HTTP', 'Non-2xx from callback', {url: endpoint, code: code});
      }
    } catch (e) {
      logEvent('ERROR', 'CALLBACK_FETCH', 'Exception fetching callback', {url: endpoint, error: String(e)});
    }
  }
  if (outRows.length) writeRowsChunked(cb, outRows);

  // Update exact rating change in Games and propagate to daily totals
  if (outRows.length) applyExactChangesToGames(ss, outRows);
}

function buildCallbackUrlIndex(cbSheet) {
  var last = cbSheet.getLastRow();
  var set = new Set();
  if (last < 2) return set;
  var vals = cbSheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    var u = vals[i][0]; if (u) set.add(u);
  }
  return set;
}

function inferTypeFromUrl(url) {
  if (url.indexOf('/game/daily/') >= 0) return 'daily';
  return 'live';
}

function extractIdFromUrl(url) {
  var segs = url.split('/');
  return segs[segs.length - 1] || '';
}

function extractExactRatingChange(json, b) {
  try {
    if (!json || !json.game) return '';
    if (b.type === 'daily') {
      // Use ratingChange if present
      return (json.game.ratingChange !== undefined) ? json.game.ratingChange : '';
    }
    return (json.game.ratingChange !== undefined) ? json.game.ratingChange : '';
  } catch (e) { return ''; }
}

function extractPregameRating(json, b) {
  try {
    if (!json || !json.players) return '';
    // Try to map to player's color by username property if needed later; for now, return top/bottom rating heuristic
    var top = (json.players.top && json.players.top.rating) || '';
    var bottom = (json.players.bottom && json.players.bottom.rating) || '';
    return bottom || top || '';
  } catch (e) { return ''; }
}

function applyExactChangesToGames(ss, outRows) {
  var games = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var urls = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();
  var urlIdx = {};
  for (var i = 0; i < urls.length; i++) {
    var u = urls[i][0];
    if (u) urlIdx[u] = { rowNum: 2 + i, rowVals: urls[i] };
  }
  var idxPlayerColor = CONFIG.HEADERS.Games.indexOf('player_color');
  var idxEndTime = CONFIG.HEADERS.Games.indexOf('end_time');
  var idxExact = CONFIG.HEADERS.Games.indexOf('rating_change_exact');
  var idxExactFlag = CONFIG.HEADERS.Games.indexOf('rating_is_exact');

  var dateSet = {};
  for (var j = 0; j < outRows.length; j++) {
    var url = outRows[j][0];
    var rawJson = outRows[j][5];
    if (!url || !rawJson) continue;
    var entry = urlIdx[url];
    if (!entry) continue;
    var playerColor = entry.rowVals[idxPlayerColor];
    var exactForPlayer = '';
    try {
      var obj = JSON.parse(rawJson);
      if (obj && obj.game) {
        if (playerColor === 'white') exactForPlayer = (obj.game.ratingChangeWhite !== undefined) ? obj.game.ratingChangeWhite : obj.game.ratingChange;
        else if (playerColor === 'black') exactForPlayer = (obj.game.ratingChangeBlack !== undefined) ? obj.game.ratingChangeBlack : (obj.game.ratingChange ? -obj.game.ratingChange : '');
      }
    } catch (e) {}
    if (exactForPlayer === '' || exactForPlayer === null || exactForPlayer === undefined) continue;
    games.getRange(entry.rowNum, idxExact + 1).setValue(Number(exactForPlayer));
    games.getRange(entry.rowNum, idxExactFlag + 1).setValue(true);
    var d = entry.rowVals[idxEndTime];
    if (d) {
      var dateKey = Utilities.formatDate(new Date(d), getProjectTimeZone(), 'yyyy-MM-dd');
      dateSet[dateKey] = true;
    }
  }
  var dates = Object.keys(dateSet);
  if (dates.length) recomputeDailyForDates(dates);
}

function runCallbacksBatch() {
  var ss = getOrCreateSpreadsheet();
  var games = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var callbacks = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var values = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();
  // Simple queue: take latest N games without callback stats
  var maxBatch = 50;
  var toFetch = [];
  for (var i = values.length - 1; i >= 0 && toFetch.length < maxBatch; i--) {
    var url = values[i][0];
    var type = values[i][1];
    var id = values[i][2];
    if (!url || !type || !id) continue;
    if (!hasCallbackRow(callbacks, url)) {
      toFetch.push({ url: url, type: type, id: id });
    }
  }
  if (!toFetch.length) return;
  var rows = [];
  for (var j = 0; j < toFetch.length; j++) {
    var item = toFetch[j];
    try {
      var cb = fetchCallback(item.type, item.id);
      var exact = deriveExactRatingChange(cb);
      rows.push([item.url, item.type, item.id, exact.change, exact.pregame, JSON.stringify(cb), new Date()]);
      // Optionally update Games sheet with exact rating change in a later iteration (schema extension)
    } catch (e) {
      logWarn('CB_ERR', e && e.message, { id: item.id });
    }
  }
  if (rows.length) callbacks.getRange(callbacks.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function hasCallbackRow(callbackSheet, url) {
  var lastRow = callbackSheet.getLastRow();
  if (lastRow < 2) return false;
  var urls = callbackSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < urls.length; i++) {
    if (urls[i][0] === url) return true;
  }
  return false;
}

function fetchCallback(type, id) {
  var base = type === 'daily' ? 'https://www.chess.com/callback/daily/game/' : 'https://www.chess.com/callback/live/game/';
  var res = fetchJsonWithEtag(base + id);
  if (res.status !== 'ok' || !res.json) throw new Error('Callback fetch failed: ' + (res.error || res.code));
  return res.json;
}

function deriveExactRatingChange(cb) {
  try {
    var g = cb && cb.game;
    if (!g) return { change: '', pregame: '' };
    var change = g.ratingChange;
    var whiteElo = g.pgnHeaders && g.pgnHeaders.WhiteElo;
    var blackElo = g.pgnHeaders && g.pgnHeaders.BlackElo;
    // crude: if player color known, we could pick pregame more precisely; store both if needed
    var pre = (whiteElo || blackElo || '');
    return { change: change, pregame: pre };
  } catch (e) {
    return { change: '', pregame: '' };
  }
}


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


function runCallbacksBatch() {
  var gamesSS = getOrCreateGamesSpreadsheet();
  var metricsSS = getOrCreateMetricsSpreadsheet();
  var games = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var cb = getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
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
        var parsed = parseCallbackIdentity(json, b);
        outRows.push([
          b.url, b.type, b.id,
          parsed.myColor, parsed.myExactChange, parsed.myPregameRating,
          parsed.oppColor, parsed.oppPregameRating, parsed.oppExactChange,
          parsed.gameEndReason, parsed.isLive, parsed.isRated, parsed.plyCount,
          parsed.whiteUser, parsed.whiteRating, parsed.whiteCountry, parsed.whiteMembership, parsed.whiteDefaultTab, parsed.whitePostMove,
          parsed.blackUser, parsed.blackRating, parsed.blackCountry, parsed.blackMembership, parsed.blackDefaultTab, parsed.blackPostMove,
          parsed.ecoCode, parsed.pgnDate, parsed.pgnTime, parsed.baseTime1, parsed.timeIncrement1,
          JSON.stringify(json), new Date()
        ]);
      } else if (code === 404) {
        // record as not found to avoid retries soon
        outRows.push([b.url, b.type, b.id, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '{"error":404}', new Date()]);
      } else {
        logEvent('WARN', 'CALLBACK_HTTP', 'Non-2xx from callback', {url: endpoint, code: code});
      }
    } catch (e) {
      logEvent('ERROR', 'CALLBACK_FETCH', 'Exception fetching callback', {url: endpoint, error: String(e)});
    }
  }
  if (outRows.length) writeRowsChunked(cb, outRows);

  // Update exact rating change in Games and propagate to daily totals
  if (outRows.length) applyExactChangesToGames(gamesSS, metricsSS, outRows);
}

function buildCallbackUrlIndex(cbSheet) {
  var set = new Set();
  try {
    if (!cbSheet || typeof cbSheet.getLastRow !== 'function') return set;
    var last = cbSheet.getLastRow();
    if (last < 2) return set;
    var vals = cbSheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var u = vals[i][0]; if (u) set.add(u);
    }
  } catch (e) {}
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

function parseCallbackIdentity(json, b) {
  var g = (json && json.game) || {};
  var players = json && json.players;
  var top = (players && players.top) || {};
  var bottom = (players && players.bottom) || {};
  var isLive = !!g.isLiveGame;
  var isRated = !!g.isRated;
  var ply = g.plyCount || '';
  var endReason = g.gameEndReason || '';
  var pgn = g.pgnHeaders || {};
  var ecoCode = pgn.ECO || '';
  var pgnDate = pgn.Date || '';
  var pgnTime = pgn.EndTime || '';
  var base1 = g.baseTime1 || '';
  var inc1 = g.timeIncrement1 || '';

  var whiteUser = pgn.White || '';
  var blackUser = pgn.Black || '';

  // Determine my color by matching against configured username
  var me = getConfiguredUsername();
  var myColor = '';
  if (String(whiteUser || '').toLowerCase() === String(me).toLowerCase()) myColor = 'white';
  else if (String(blackUser || '').toLowerCase() === String(me).toLowerCase()) myColor = 'black';

  var myExact = '';
  var myPre = '';
  var oppExact = '';
  var oppPre = '';
  if (myColor === 'white') {
    myExact = (g.ratingChangeWhite !== undefined) ? g.ratingChangeWhite : g.ratingChange;
    myPre = (bottom && bottom.color === 'white') ? bottom.rating : (top && top.color === 'white' ? top.rating : (pgn.WhiteElo || ''));
    oppExact = (g.ratingChangeBlack !== undefined) ? g.ratingChangeBlack : (g.ratingChange !== undefined ? -g.ratingChange : '');
    oppPre = (bottom && bottom.color === 'black') ? bottom.rating : (top && top.color === 'black' ? top.rating : (pgn.BlackElo || ''));
  } else if (myColor === 'black') {
    myExact = (g.ratingChangeBlack !== undefined) ? g.ratingChangeBlack : g.ratingChange;
    myPre = (bottom && bottom.color === 'black') ? bottom.rating : (top && top.color === 'black' ? top.rating : (pgn.BlackElo || ''));
    oppExact = (g.ratingChangeWhite !== undefined) ? g.ratingChangeWhite : (g.ratingChange !== undefined ? -g.ratingChange : '');
    oppPre = (bottom && bottom.color === 'white') ? bottom.rating : (top && top.color === 'white' ? top.rating : (pgn.WhiteElo || ''));
  }

  return {
    myColor: myColor,
    myExactChange: (myExact === '' || myExact === null || myExact === undefined) ? '' : Number(myExact),
    myPregameRating: (myPre === '' || myPre === null || myPre === undefined) ? '' : Number(myPre),
    oppColor: (myColor === 'white') ? 'black' : (myColor === 'black' ? 'white' : ''),
    oppPregameRating: (oppPre === '' || oppPre === null || oppPre === undefined) ? '' : Number(oppPre),
    oppExactChange: (oppExact === '' || oppExact === null || oppExact === undefined) ? '' : Number(oppExact),
    gameEndReason: endReason,
    isLive: isLive,
    isRated: isRated,
    plyCount: ply,
    whiteUser: whiteUser,
    whiteRating: (players && players.top && players.top.color === 'white') ? players.top.rating : ((players && players.bottom && players.bottom.color === 'white') ? players.bottom.rating : (pgn.WhiteElo || '')),
    whiteCountry: (players && players.top && players.top.color === 'white') ? (players.top.countryName || '') : ((players && players.bottom && players.bottom.color === 'white') ? (players.bottom.countryName || '') : ''),
    whiteMembership: (players && players.top && players.top.color === 'white') ? (players.top.membershipCode || '') : ((players && players.bottom && players.bottom.color === 'white') ? (players.bottom.membershipCode || '') : ''),
    whiteDefaultTab: (players && players.top && players.top.color === 'white') ? (players.top.defaultTab || '') : ((players && players.bottom && players.bottom.color === 'white') ? (players.bottom.defaultTab || '') : ''),
    whitePostMove: (players && players.top && players.top.color === 'white') ? (players.top.postMoveAction || '') : ((players && players.bottom && players.bottom.color === 'white') ? (players.bottom.postMoveAction || '') : ''),
    blackUser: blackUser,
    blackRating: (players && players.top && players.top.color === 'black') ? players.top.rating : ((players && players.bottom && players.bottom.color === 'black') ? players.bottom.rating : (pgn.BlackElo || '')),
    blackCountry: (players && players.top && players.top.color === 'black') ? (players.top.countryName || '') : ((players && players.bottom && players.bottom.color === 'black') ? (players.bottom.countryName || '') : ''),
    blackMembership: (players && players.top && players.top.color === 'black') ? (players.top.membershipCode || '') : ((players && players.bottom && players.bottom.color === 'black') ? (players.bottom.membershipCode || '') : ''),
    blackDefaultTab: (players && players.top && players.top.color === 'black') ? (players.top.defaultTab || '') : ((players && players.bottom && players.bottom.color === 'black') ? (players.bottom.defaultTab || '') : ''),
    blackPostMove: (players && players.top && players.top.color === 'black') ? (players.top.postMoveAction || '') : ((players && players.bottom && players.bottom.color === 'black') ? (players.bottom.postMoveAction || '') : ''),
    ecoCode: ecoCode,
    pgnDate: pgnDate,
    pgnTime: pgnTime,
    baseTime1: base1,
    timeIncrement1: inc1
  };
}

function applyExactChangesToGames(gamesSS, metricsSS, outRows) {
  var games = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
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

// removed duplicate runCallbacksBatch implementation

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

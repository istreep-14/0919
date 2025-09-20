function runCallbacksBatch() {
  var gamesSS = getOrCreateGamesSpreadsheet();
  var cbSS = getOrCreateCallbacksSpreadsheet();
  var games = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var cb = getOrCreateSheet(cbSS, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  // Ensure header schema is up-to-date (migrate white_/black_ -> my_/opp_)
  upgradeCallbackStatsHeaderIfNeeded(cb);
  var lastRow = games.getLastRow();
  if (lastRow < 2) return;
  var values = games.getRange(2, 1, lastRow - 1, games.getLastColumn()).getValues();

  // Precompute last-game method map (url -> { change, pregame })
  var lastIndex = buildLastMethodIndexFromGames(values);

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

  // Parallel fetch callbacks
  var reqs = [];
  for (var j = 0; j < batch.length; j++) {
    var b = batch[j];
    var endpoint = b.type === 'daily' ? ('https://www.chess.com/callback/daily/game/' + b.id) : ('https://www.chess.com/callback/live/game/' + b.id);
    reqs.push({ url: endpoint, method: 'get', muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'ChessSheets/1.0 (AppsScript)' } });
  }
  var responses = UrlFetchApp.fetchAll(reqs);

  var outRows = [];
  for (var k = 0; k < responses.length; k++) {
    var b2 = batch[k];
    var resp = responses[k];
    var code = 0;
    try { code = resp.getResponseCode(); } catch (e) { code = 0; }
    if (code >= 200 && code < 300) {
      var json = {};
      try { json = JSON.parse(resp.getContentText() || '{}'); } catch (e) { json = {}; }
      var parsed = parseCallbackIdentity(json, b2);
      var cbChange = (parsed.myExactChange === '' || parsed.myExactChange === null || parsed.myExactChange === undefined) ? '' : Number(parsed.myExactChange);
      var oppCbChange = (parsed.oppExactChange === '' || parsed.oppExactChange === null || parsed.oppExactChange === undefined) ? '' : Number(parsed.oppExactChange);

      outRows.push([
        b2.url, b2.type, b2.id,
        parsed.myColor,
        parsed.myUser, parsed.myRating, parsed.myCountry, parsed.myMembership, parsed.myDefaultTab, parsed.myPostMove,
        parsed.oppUser, parsed.oppRating, parsed.oppCountry, parsed.oppMembership, parsed.oppDefaultTab, parsed.oppPostMove,
        cbChange, oppCbChange,
        JSON.stringify(json), new Date()
      ]);
    } else if (code === 404) {
      var total = CONFIG && CONFIG.HEADERS && CONFIG.HEADERS.CallbackStats ? CONFIG.HEADERS.CallbackStats.length : 0;
      var row = [b2.url, b2.type, b2.id];
      while (row.length < Math.max(0, total - 2)) row.push('');
      row.push('{"error":404}');
      row.push(new Date());
      outRows.push(row);
    } else {
      var endpoint2 = b2.type === 'daily' ? ('https://www.chess.com/callback/daily/game/' + b2.id) : ('https://www.chess.com/callback/live/game/' + b2.id);
      logEvent('WARN', 'CALLBACK_HTTP', 'Non-2xx from callback', {url: endpoint2, code: code});
    }
  }
  if (outRows.length) writeRowsChunked(cb, outRows);
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

function buildLastMethodIndexFromGames(values) {
  var index = {};
  try {
    var h = CONFIG && CONFIG.HEADERS && CONFIG.HEADERS.Games ? CONFIG.HEADERS.Games : [];
    var idxUrl = h.indexOf('url');
    var idxLast = h.indexOf('last_rating');
    var idxDeltaLast = h.indexOf('rating_change_last');
    if (idxUrl < 0) idxUrl = 0;
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var url = row[idxUrl];
      if (!url) continue;
      var pre = (idxLast >= 0) ? row[idxLast] : '';
      var chg = (idxDeltaLast >= 0) ? row[idxDeltaLast] : '';
      index[url] = { change: chg === '' ? '' : Number(chg), pregame: pre === '' ? '' : Number(pre) };
    }
  } catch (e) {}
  return index;
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

  function pickForColor(color, prop, fallback) {
    try {
      var fromTop = (players && players.top && players.top.color === color) ? players.top[prop] : '';
      var fromBottom = (players && players.bottom && players.bottom.color === color) ? players.bottom[prop] : '';
      var val = (fromTop !== '' && fromTop !== undefined && fromTop !== null) ? fromTop : ((fromBottom !== '' && fromBottom !== undefined && fromBottom !== null) ? fromBottom : '');
      return (val === '' || val === undefined || val === null) ? (fallback || '') : val;
    } catch (e) {
      return fallback || '';
    }
  }

  var oppColor = (myColor === 'white') ? 'black' : (myColor === 'black' ? 'white' : '');
  var myUser = (myColor === 'white') ? whiteUser : ((myColor === 'black') ? blackUser : '');
  var oppUser = (oppColor === 'white') ? whiteUser : ((oppColor === 'black') ? blackUser : '');
  // Choose the player blocks for white/black once, then pull properties consistently
  var whiteBlock = (players && players.top && players.top.color === 'white') ? players.top : ((players && players.bottom && players.bottom.color === 'white') ? players.bottom : {});
  var blackBlock = (players && players.top && players.top.color === 'black') ? players.top : ((players && players.bottom && players.bottom.color === 'black') ? players.bottom : {});
  function from(block, key, fallback) { var v = block && block[key]; return (v === undefined || v === null || v === '') ? (fallback || '') : v; }
  var myBlock = (myColor === 'white') ? whiteBlock : ((myColor === 'black') ? blackBlock : {});
  var oppBlock = (oppColor === 'white') ? whiteBlock : ((oppColor === 'black') ? blackBlock : {});
  var myRating2 = from(myBlock, 'rating', (myColor === 'white') ? (pgn.WhiteElo || '') : ((myColor === 'black') ? (pgn.BlackElo || '') : ''));
  var oppRating2 = from(oppBlock, 'rating', (oppColor === 'white') ? (pgn.WhiteElo || '') : ((oppColor === 'black') ? (pgn.BlackElo || '') : ''));
  var myCountry = from(myBlock, 'countryName', '');
  var oppCountry = from(oppBlock, 'countryName', '');
  var myMembership = from(myBlock, 'membershipCode', '');
  var oppMembership = from(oppBlock, 'membershipCode', '');
  var myDefaultTab = from(myBlock, 'defaultTab', '');
  var oppDefaultTab = from(oppBlock, 'defaultTab', '');
  var myPostMove = from(myBlock, 'postMoveAction', '');
  var oppPostMove = from(oppBlock, 'postMoveAction', '');

  return {
    myColor: myColor,
    myExactChange: (myExact === '' || myExact === null || myExact === undefined) ? '' : Number(myExact),
    myPregameRating: (myPre === '' || myPre === null || myPre === undefined) ? '' : Number(myPre),
    oppColor: oppColor,
    oppPregameRating: (oppPre === '' || oppPre === null || oppPre === undefined) ? '' : Number(oppPre),
    oppExactChange: (oppExact === '' || oppExact === null || oppExact === undefined) ? '' : Number(oppExact),
    gameEndReason: endReason,
    isLive: isLive,
    isRated: isRated,
    plyCount: ply,
    myUser: myUser,
    myRating: myRating2,
    myCountry: myCountry,
    myMembership: myMembership,
    myDefaultTab: myDefaultTab,
    myPostMove: myPostMove,
    oppUser: oppUser,
    oppRating: oppRating2,
    oppCountry: oppCountry,
    oppMembership: oppMembership,
    oppDefaultTab: oppDefaultTab,
    oppPostMove: oppPostMove,
    ecoCode: ecoCode,
    pgnDate: pgnDate,
    pgnTime: pgnTime,
    baseTime1: base1,
    timeIncrement1: inc1
  };
}

// Disabled writing back to Games; we only record unified values in CallbackStats now.

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

function upgradeCallbackStatsHeaderIfNeeded(sheet) {
  try {
    if (!sheet) return;
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return;
    var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    // Detect old schema by presence of 'white_username' column name
    var hasOld = false;
    for (var i = 0; i < header.length; i++) {
      if (String(header[i]).trim() === 'white_username') { hasOld = true; break; }
    }
    if (!hasOld) return;
    // Overwrite entire header row with new schema
    var newHeader = CONFIG && CONFIG.HEADERS && CONFIG.HEADERS.CallbackStats ? CONFIG.HEADERS.CallbackStats : null;
    if (!newHeader || !newHeader.length) return;
    sheet.getRange(1, 1, 1, newHeader.length).setValues([newHeader]);
    // If old sheet had more columns than new, clear the extras to avoid mismatches
    if (lastCol > newHeader.length) {
      sheet.getRange(1, newHeader.length + 1, 1, lastCol - newHeader.length).clearContent();
    }
  } catch (e) {
    // best-effort; ignore
  }
}

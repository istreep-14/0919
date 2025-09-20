function runGameDataBatch() {
  // Stub: iterate a small batch of Games rows lacking extra game data.
  // Read-only selection and external fetch to be implemented later.
}

function buildRatingsTimeline() {
  var ratingsSS = getOrCreateRatingsSpreadsheet();
  var gamesSS = getOrCreateGamesSpreadsheet();
  var callbacksSS = getOrCreateCallbacksSpreadsheet();
  var statsSS = getOrCreateStatsSpreadsheet();

  var ratingsSheet = getOrCreateSheet(ratingsSS, CONFIG.SHEET_NAMES.RatingsTimeline, CONFIG.HEADERS.Ratings);
  var gamesSheet = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var cbSheet = getOrCreateSheet(callbacksSS, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  var statsSheet = getOrCreateSheet(statsSS, CONFIG.SHEET_NAMES.PlayerStats, CONFIG.HEADERS.PlayerStats);

  // Clear old timeline
  if (ratingsSheet.getLastRow() > 1) ratingsSheet.getRange(2, 1, ratingsSheet.getLastRow() - 1, ratingsSheet.getLastColumn()).clearContent();

  // Load Games
  var gLast = gamesSheet.getLastRow();
  var games = gLast >= 2 ? gamesSheet.getRange(2, 1, gLast - 1, gamesSheet.getLastColumn()).getValues() : [];
  var gIdx = {
    url: CONFIG.HEADERS.Games.indexOf('url'),
    end: CONFIG.HEADERS.Games.indexOf('end_time'),
    rated: CONFIG.HEADERS.Games.indexOf('rated'),
    format: CONFIG.HEADERS.Games.indexOf('format'),
    myPost: CONFIG.HEADERS.Games.indexOf('player_rating'),
    oppPost: CONFIG.HEADERS.Games.indexOf('opponent_rating'),
    outcome: CONFIG.HEADERS.Games.indexOf('player_outcome')
  };

  // Load Callback deltas as map by url
  var cLast = cbSheet.getLastRow();
  var cbVals = cLast >= 2 ? cbSheet.getRange(2, 1, cLast - 1, cbSheet.getLastColumn()).getValues() : [];
  var cIdx = {
    url: CONFIG.HEADERS.CallbackStats.indexOf('url'),
    myDelta: CONFIG.HEADERS.CallbackStats.indexOf('my_delta_callback'),
    oppDelta: CONFIG.HEADERS.CallbackStats.indexOf('opp_delta_callback'),
    myRating: CONFIG.HEADERS.CallbackStats.indexOf('my_rating')
  };
  var urlToCb = {};
  for (var i = 0; i < cbVals.length; i++) {
    var r = cbVals[i];
    var u = r[cIdx.url]; if (!u) continue;
    urlToCb[u] = { myDelta: r[cIdx.myDelta], oppDelta: r[cIdx.oppDelta], myRating: r[cIdx.myRating] };
  }

  // Load Player Stats snapshots
  var sLast = statsSheet.getLastRow();
  var sVals = sLast >= 2 ? statsSheet.getRange(2, 1, sLast - 1, statsSheet.getLastColumn()).getValues() : [];

  // Event list: games + stats (adjustments to be added later via Adjustments sheet)
  var events = [];
  for (var j = 0; j < games.length; j++) {
    var g = games[j];
    events.push({
      ts: new Date(g[gIdx.end]).getTime(), kind: 'game',
      format: g[gIdx.format], url: g[gIdx.url], rated: g[gIdx.rated], outcome: g[gIdx.outcome],
      myPost: Number(g[gIdx.myPost] || ''), oppPost: Number(g[gIdx.oppPost] || '')
    });
  }
  for (var k = 0; k < sVals.length; k++) {
    var s = sVals[k];
    var ts = new Date(s[0]).getTime();
    events.push({ ts: ts, kind: 'stats', format: s[1], rating: Number(s[2] || ''), rd: Number(s[3] || ''), source: s[4], raw: s[5] });
  }
  // TODO: integrate adjustments similarly when helper is added

  // Sort by timestamp ascending
  events.sort(function(a,b){ return a.ts - b.ts; });

  // Walk timeline and build rows
  var byFormat = {};
  var out = [];
  for (var e = 0; e < events.length; e++) {
    var ev = events[e];
    var fmt = ev.format || '';
    if (!byFormat[fmt]) byFormat[fmt] = { my: '', opp: '' };
    if (ev.kind === 'stats') {
      if (ev.rating !== '' && !isNaN(ev.rating)) byFormat[fmt].my = Number(ev.rating);
      out.push([new Date(ev.ts), 'stats', fmt, '', '', '', '', '', '', '', '', '', '', '', ev.source || 'stats', ev.raw || '']);
      continue;
    }
    // game
    var cb = urlToCb[ev.url] || {};
    var myPregameLast = (byFormat[fmt].my === '' ? '' : Number(byFormat[fmt].my));
    var oppPregameLast = (byFormat[fmt].opp === '' ? '' : Number(byFormat[fmt].opp));
    var myDeltaLast = (myPregameLast === '' || ev.myPost === '' ? '' : Number(ev.myPost) - Number(myPregameLast));
    var oppDeltaLast = (oppPregameLast === '' || ev.oppPost === '' ? '' : Number(ev.oppPost) - Number(oppPregameLast));
    var myDeltaCb = (cb.myDelta === '' || cb.myDelta === undefined || cb.myDelta === null) ? '' : Number(cb.myDelta);
    var oppDeltaCb = (cb.oppDelta === '' || cb.oppDelta === undefined || cb.oppDelta === null) ? '' : Number(cb.oppDelta);
    var myPregameCb = (myDeltaCb === '' || ev.myPost === '' ? '' : Number(ev.myPost) - Number(myDeltaCb));
    var oppPregameCb = (oppDeltaCb === '' || ev.oppPost === '' ? '' : Number(ev.oppPost) - Number(oppDeltaCb));
    // Update state with post ratings
    if (ev.myPost !== '' && !isNaN(ev.myPost)) byFormat[fmt].my = Number(ev.myPost);
    if (ev.oppPost !== '' && !isNaN(ev.oppPost)) byFormat[fmt].opp = Number(ev.oppPost);
    out.push([
      new Date(ev.ts), 'game', fmt, ev.url, ev.rated, ev.outcome,
      myPregameLast, myDeltaLast, oppPregameLast, oppDeltaLast,
      myPregameCb, myDeltaCb, oppPregameCb, oppDeltaCb,
      '', ''
    ]);
  }

  if (out.length) writeRowsChunked(ratingsSheet, out);
}


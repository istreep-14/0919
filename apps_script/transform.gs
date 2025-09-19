function gameJsonToRow(meUsername, game) {
  var url = game.url || (game.pgn && extractPgnHeader(game.pgn, 'Link')) || '';
  var type = ''; // optional if wanted, else infer from time_class
  var id = '';
  if (url) {
    var segs = url.split('/');
    id = segs[segs.length - 1] || '';
    if (url.indexOf('/game/daily/') >= 0) type = 'daily';
    else if (url.indexOf('/game/live/') >= 0) type = 'live';
  }
  var tc = game.time_control || (game.pgn && extractPgnHeader(game.pgn, 'TimeControl')) || '';
  var tcParts = parseTimeControl(tc);

  var startUnix = game.start_time || null;
  // PGN UTCDate/UTCTime fallback could be added here if needed later
  var endUnix = game.end_time || null;
  var startLocal = startUnix ? toLocalDateTimeStringFromUnixSeconds(startUnix) : '';
  var endLocal = endUnix ? toLocalDateTimeStringFromUnixSeconds(endUnix) : '';
  var duration = (startUnix && endUnix) ? computeDurationSeconds(startUnix, endUnix) : '';

  var timeClass = game.time_class || '';
  var rules = game.rules || '';
  var format = deriveFormat(timeClass, rules, type || (timeClass === 'daily' ? 'daily' : 'live'));

  var white = game.white || {};
  var black = game.black || {};
  var meColor = pickPlayerColor(meUsername, white.username, black.username);
  var oppColor = (meColor === 'white') ? 'black' : (meColor === 'black' ? 'white' : '');

  var player = meColor === 'white' ? white : (meColor === 'black' ? black : {});
  var opponent = oppColor === 'white' ? white : (oppColor === 'black' ? black : {});

  var playerOutcome = '';
  if (player && player.result) {
    if (player.result === 'win') playerOutcome = 'win';
    else if (player.result === 'agreed' || player.result === 'repetition' || player.result === 'stalemate' || player.result === 'insufficient' || player.result === '50move' || player.result === 'timevsinsufficient') playerOutcome = 'draw';
    else playerOutcome = 'loss';
  }
  var playerScore = playerOutcome === 'win' ? 1 : (playerOutcome === 'draw' ? 0.5 : 0);

  var ecoCode = '';
  var ecoUrl = '';
  if (game.pgn) {
    ecoCode = extractPgnHeader(game.pgn, 'ECO') || '';
    ecoUrl = extractPgnHeader(game.pgn, 'ECOUrl') || (game.eco || '');
  } else {
    ecoUrl = game.eco || '';
  }

  var uuid = game.uuid || '';

  return [
    safe(url), safe(type), safe(id), safe(tc), safe(tcParts.base), safe(tcParts.inc), safe(tcParts.corr),
    safe(startLocal), safe(endLocal), safe(duration), safe(game.rated), safe(timeClass), safe(rules), safe(format),
    safe(player.username), safe(meColor), safe(player.rating), safe(player.result), safe(playerOutcome), safe(playerScore),
    safe(opponent.username), safe(oppColor), safe(opponent.rating),
    safe(ecoCode), safe(ecoUrl), safe(uuid)
  ];
}

function extractPgnHeader(pgn, key) {
  try {
    var re = new RegExp('\\[' + key + ' "([\\s\\S]*?)"\\]');
    var m = pgn.match(re);
    return m && m[1] ? m[1] : '';
  } catch (e) {
    return '';
  }
}

function transformArchiveToRows(meUsername, archiveJson) {
  if (!archiveJson || !archiveJson.games || !archiveJson.games.length) return [];
  var rows = [];
  for (var i = 0; i < archiveJson.games.length; i++) {
    rows.push(gameJsonToRow(meUsername, archiveJson.games[i]));
  }
  return rows;
}


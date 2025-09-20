function gameJsonToRow(meUsername, game) {
  var url = game.url || (game.pgn && extractPgnHeader(game.pgn, 'Link')) || '';
  var id = extractIdFromUrl(url);
  var timeControl = game.time_control || (game.pgn && extractPgnHeader(game.pgn, 'TimeControl')) || '';
  var tc = parseTimeControl(timeControl);
  var timeClass = game.time_class || '';
  var rules = game.rules || '';
  var type = (timeClass === 'daily') ? 'daily' : 'live';
  var format = deriveFormat(timeClass, rules, type);
  var startUnix = game.start_time || parsePgnUtcToUnixSeconds(game.pgn);
  var endUnix = game.end_time || null;
  var startLocal = startUnix ? toLocalDateTimeStringFromUnixSeconds(startUnix) : '';
  var endLocal = endUnix ? toLocalDateTimeStringFromUnixSeconds(endUnix) : '';
  var durationSeconds = computeDurationSeconds(startUnix, endUnix);
  var white = game.white || {};
  var black = game.black || {};
  var meColor = pickPlayerColor(meUsername, white.username, black.username);
  var oppColor = (meColor === 'white') ? 'black' : (meColor === 'black' ? 'white' : '');
  var player = meColor === 'white' ? white : (meColor === 'black' ? black : {});
  var opponent = oppColor === 'white' ? white : (oppColor === 'black' ? black : {});
  var playerResult = player && player.result ? String(player.result) : '';
  var playerOutcome = mapResultToOutcome(playerResult);
  var playerScore = scoreFromOutcome(playerOutcome);
  var opponentResult = opponent && opponent.result ? String(opponent.result) : '';
  var ecoCode = (game.pgn && extractPgnHeader(game.pgn, 'ECO')) || game.eco || '';
  var ecoUrl = (game.pgn && extractPgnHeader(game.pgn, 'ECOUrl')) || game.eco_url || '';
  var uuid = game.uuid || '';
  var endReason = normalizeEndReason(playerOutcome, opponentResult, game.pgn);
  var pgnMoves = extractPgnMoves(game.pgn);
  return [
    safe(url),
    safe(type), safe(id),
    safe(timeControl), safe(tc.base), safe(tc.inc), safe(tc.corr),
    safe(startLocal), safe(endLocal), safe(durationSeconds),
    safe(game.rated), safe(timeClass), safe(rules), safe(format),
    safe(player.username), safe(meColor), safe(player.rating), safe(playerResult), safe(playerOutcome), safe(playerScore),
    safe(opponent.username), safe(oppColor), safe(opponent.rating),
    safe(ecoCode), safe(ecoUrl), safe(uuid), safe(endReason), safe(pgnMoves)
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

function parsePgnUtcToUnixSeconds(pgn) {
  try {
    if (!pgn) return null;
    var d = extractPgnHeader(pgn, 'UTCDate'); // e.g., 2025.08.02
    var t = extractPgnHeader(pgn, 'UTCTime'); // e.g., 13:52:33
    if (!d || !t) return null;
    var ds = d.replace(/\./g, '-');
    var iso = ds + 'T' + t + 'Z';
    var ms = Date.parse(iso);
    if (isNaN(ms)) return null;
    return Math.floor(ms / 1000);
  } catch (e) {
    return null;
  }
}

function extractPgnMoves(pgn) {
  try {
    if (!pgn) return '';
    var lines = String(pgn).split(/\r?\n/);
    var i = 0;
    // Skip header lines starting with [
    while (i < lines.length && /^\s*\[/.test(lines[i])) i++;
    // Skip blank line after headers
    if (i < lines.length && /^\s*$/.test(lines[i])) i++;
    return lines.slice(i).join(' ').trim();
  } catch (e) {
    return '';
  }
}

function mapResultToOutcome(result) {
  if (!result) return '';
  if (result === 'win') return 'win';
  if (result === 'agreed' || result === 'repetition' || result === 'stalemate' || result === 'insufficient' || result === '50move' || result === 'timevsinsufficient') return 'draw';
  return 'loss';
}

function scoreFromOutcome(outcome) {
  if (outcome === 'win') return 1;
  if (outcome === 'draw') return 0.5;
  if (outcome === 'loss') return 0;
  return '';
}

function normalizeEndReason(playerOutcome, opponentResult, pgn) {
  // Prefer PGN Termination if available
  var term = (pgn && extractPgnHeader(pgn, 'Termination')) || '';
  if (term) {
    var tl = term.toLowerCase();
    if (tl.indexOf('checkmate') >= 0) return 'checkmate';
    if (tl.indexOf('resign') >= 0) return 'resign';
    if (tl.indexOf('time forfeit') >= 0 || tl.indexOf('timeout') >= 0) return 'timeout';
    if (tl.indexOf('abandon') >= 0) return 'abandoned';
    if (tl.indexOf('stalemate') >= 0) return 'stalemate';
    if (tl.indexOf('repetition') >= 0) return 'repetition';
    if (tl.indexOf('insufficient') >= 0) return 'insufficient';
    if (tl.indexOf('50-move') >= 0 || tl.indexOf('50 move') >= 0) return '50move';
    if (tl.indexOf('draw') >= 0) return 'agreed';
  }
  var r = String(opponentResult || '').toLowerCase();
  if (!r) return '';
  if (r === 'checkmated') return 'checkmate';
  if (r === 'timeout') return 'timeout';
  if (r === 'resigned') return 'resign';
  if (r === 'abandoned') return 'abandoned';
  if (r === 'stalemate') return 'stalemate';
  if (r === 'repetition') return 'repetition';
  if (r === 'insufficient') return 'insufficient';
  if (r === '50move') return '50move';
  if (r === 'timevsinsufficient') return 'timevsinsufficient';
  if (playerOutcome === 'draw') return 'agreed';
  return '';
}

function transformArchiveToRows(meUsername, archiveJson) {
  if (!archiveJson || !archiveJson.games || !archiveJson.games.length) return [];
  var rows = [];
  for (var i = 0; i < archiveJson.games.length; i++) {
    rows.push(gameJsonToRow(meUsername, archiveJson.games[i]));
  }
  return rows;
}

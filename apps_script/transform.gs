function gameJsonToRow(meUsername, game) {
  var url = game.url || (game.pgn && extractPgnHeader(game.pgn, 'Link')) || '';
  var endUnix = game.end_time || null;
  var endLocal = endUnix ? toLocalDateTimeStringFromUnixSeconds(endUnix) : '';
  var timeClass = game.time_class || '';
  var rules = game.rules || '';
  var type = (timeClass === 'daily') ? 'daily' : 'live';
  var format = deriveFormat(timeClass, rules, type);
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
  return [
    safe(url), safe(endLocal), safe(game.rated), safe(format),
    safe(player.rating), safe(opponent.rating), safe(playerOutcome)
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

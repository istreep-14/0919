function healthCheck() {
  var username = getConfiguredUsername();
  var archivesUrl = 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/games/archives';
  var start = new Date();
  var res = fetchJsonWithEtag(archivesUrl);
  var ms = new Date().getTime() - start.getTime();
  var code = res.code || (res.status === 'ok' ? 200 : (res.status === 'not_modified' ? 304 : 0));
  logEvent('INFO', 'HEALTH', 'Ping archives list', { ms: ms, code: code });
  return code;
}


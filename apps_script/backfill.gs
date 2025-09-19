function fullBackfill() {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var gamesSS = getOrCreateGamesSpreadsheet();
    var metricsSS = getOrCreateMetricsSpreadsheet();
    var username = getConfiguredUsername();
    var archivesSheet = getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
    var lastRow = archivesSheet.getLastRow();
    if (lastRow < 2) return;
    var data = archivesSheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.Archives.length).getValues();

    // Process older months first, active last
    data.sort(function(a,b){
      var ka = a[0] + '-' + a[1];
      var kb = b[0] + '-' + b[1];
      return ka < kb ? -1 : (ka > kb ? 1 : 0);
    });

    var gamesSheet = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
    var urlIndex = buildExistingUrlIndex(ss);

    var props = getScriptProps();
    var cursor = props.getProperty('BACKFILL_CURSOR');
    var startIndex = cursor ? parseInt(cursor, 10) : 0;
    var startTime = new Date().getTime();
    var batchSize = 8;
    for (var i = startIndex; i < data.length; i += batchSize) {
      var slice = data.slice(i, Math.min(i + batchSize, data.length));
      for (var s = 0; s < slice.length; s++) {
        var row = slice[s];
        var year = row[0];
        var month = row[1];
        var url = row[2];
        var etag = row[4];
        var response = fetchJsonWithEtag(url, etag);
      var now = new Date();
        var rowNumber = findArchiveRowNumber(archivesSheet, year, month);
      if (response.status === 'error') {
        archivesSheet.getRange(rowNumber, 11).setValue(String(response.error || response.code));
        archivesSheet.getRange(rowNumber, 7).setValue(now);
        logEvent('ERROR', 'BACKFILL_FETCH', 'Failed to fetch archive', {url:url, code: response.code});
        continue;
      }
      if (response.status === 'not_modified') {
        archivesSheet.getRange(rowNumber, 7).setValue(now);
        continue;
      }
      var json = response.json;
      if (json) {
        var rows = transformArchiveToRows(username, json);
        var newRows = [];
        for (var j = 0; j < rows.length; j++) {
          var u = rows[j][0];
          if (u && !urlIndex.has(u)) {
            newRows.push(rows[j]);
            urlIndex.add(u);
          }
        }
        if (newRows.length) writeRowsChunked(gamesSheet, newRows);
        var apiCount = (json && json.games) ? json.games.length : '';
        var ingestedCount = countIngestedForArchive(ss, parseInt(year,10), parseInt(month,10));
        if (response.etag) archivesSheet.getRange(rowNumber, 5).setValue(response.etag);
        if (response.lastModified) archivesSheet.getRange(rowNumber, 6).setValue(response.lastModified);
        archivesSheet.getRange(rowNumber, 7).setValue(now);
        archivesSheet.getRange(rowNumber, 8).setValue(apiCount);
        archivesSheet.getRange(rowNumber, 9).setValue(ingestedCount);
        logEvent('INFO', 'BACKFILL_WRITE', 'Wrote rows for month', {year:year, month:month, rows:newRows.length});
      }
      }
      // time guard ~5.5 minutes
      var elapsed = new Date().getTime() - startTime;
      if (elapsed > 330000) {
        props.setProperty('BACKFILL_CURSOR', String(i + batchSize));
        return; // resume next run
      }
    }
    props.deleteProperty('BACKFILL_CURSOR');
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function findArchiveRowNumber(sheet, year, month) {
  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(year) && String(values[i][1]) === String(month)) return 2 + i;
  }
  return -1;
}

function fullBackfill() {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var start = Date.now();
    var gamesSS2 = getOrCreateGamesSpreadsheet();
    var metricsSS2 = getOrCreateMetricsSpreadsheet();
    var username = getConfiguredUsername();
    var archivesSheet = getOrCreateSheet(metricsSS2, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
    var rawFolder = getOrCreateRawFolder();
    var lastRow = archivesSheet.getLastRow();
    if (lastRow < 2) return;
    var data = archivesSheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.Archives.length).getValues();

    // Build URL index once
    var urlIndex = buildExistingUrlIndex(gamesSS2);

    for (var i = 0; i < data.length; i++) {
      // Time budget guard (~5.5 min)
      if (Date.now() - start > 330000) {
        logInfo('BACKFILL_STOP', 'Time budget reached, resume next run', { processed: i });
        break;
      }

      var row = data[i];
      var year = row[0];
      var month = row[1];
      var archiveUrl = row[2];
      var etag = row[4];

      var resp = fetchJsonWithEtag(archiveUrl, etag);
      var now = new Date();
      if (resp.status === 'error') {
        archivesSheet.getRange(2 + i, 11).setValue(String(resp.error || resp.code));
        archivesSheet.getRange(2 + i, 7).setValue(now);
        continue;
      }
      if (resp.status === 'not_modified') {
        archivesSheet.getRange(2 + i, 7).setValue(now);
        continue;
      }
      var json = resp.json || {};
      var rows = transformArchiveToRows(username, json);
      var newRows = [];
      for (var r = 0; r < rows.length; r++) {
        var u = rows[r][0];
        if (u && !urlIndex.has(u)) {
          newRows.push(rows[r]);
          urlIndex.add(u);
        }
      }
      if (newRows.length) {
        var gamesSheet = getOrCreateSheet(gamesSS2, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
        writeRowsChunked(gamesSheet, newRows);
      }
      var apiCount = (json && json.games) ? json.games.length : '';
      var ingestedCount = countIngestedForArchive(gamesSS2, parseInt(year,10), parseInt(month,10));
      if (resp.etag) archivesSheet.getRange(2 + i, 5).setValue(resp.etag);
      if (resp.lastModified) archivesSheet.getRange(2 + i, 6).setValue(resp.lastModified);
      archivesSheet.getRange(2 + i, 7).setValue(now);
      archivesSheet.getRange(2 + i, 8).setValue(apiCount);
      archivesSheet.getRange(2 + i, 9).setValue(ingestedCount);
    }

    // Rebuild historical daily totals once after backfill
    buildDailyTotalsInitial();
    logInfo('BACKFILL_DONE', 'Full backfill completed or timed-out slice finished');
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


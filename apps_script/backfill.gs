function fullBackfill() {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var start = Date.now();
    var ss = getOrCreateSpreadsheet();
    var username = getConfiguredUsername();
    var archivesSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
    var rawFolder = getOrCreateRawFolder();
    var lastRow = archivesSheet.getLastRow();
    if (lastRow < 2) return;
    var data = archivesSheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.Archives.length).getValues();

    // Build URL index once
    var urlIndex = buildExistingUrlIndex(ss);

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
      // Persist raw
      saveRawJsonToDrive(String(year) + '-' + pad2(parseInt(month,10)) + '.json', json);
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
        var gamesSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
        writeRowsChunked(gamesSheet, newRows);
      }
      var apiCount = (json && json.games) ? json.games.length : '';
      var ingestedCount = countIngestedForArchive(ss, parseInt(year,10), parseInt(month,10));
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


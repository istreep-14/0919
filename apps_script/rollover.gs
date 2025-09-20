function ensureMonthRollover() {
  var archivesSS = getOrCreateArchivesSpreadsheet();
  var archivesSheet = getOrCreateSheet(archivesSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
  var lastRow = archivesSheet.getLastRow();
  if (lastRow < 2) return; // nothing yet
  var values = archivesSheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.Archives.length).getValues();
  var activeRows = values.filter(function(r){ return String(r[3]) === 'active'; });
  var now = new Date();
  var yNow = now.getFullYear();
  var mNow = now.getMonth() + 1; // 1..12

  if (activeRows.length === 0) {
    // No active row. Create one for current month.
    var newUrl = buildArchiveUrl(getConfiguredUsername(), yNow, mNow);
    var newRow = [String(yNow), pad2(mNow), newUrl, 'active', '', '', now, '', '', '', '', CONFIG.SCHEMA_VERSION];
    archivesSheet.appendRow(newRow);
    return;
  }

  var active = activeRows[0];
  var activeYear = parseInt(active[0], 10);
  var activeMonth = parseInt(active[1], 10);
  if (activeYear === yNow && activeMonth === mNow) {
    // Same month; nothing to do.
    return;
  }

  // We are in a new month. Finalize previous active month.
  finalizePreviousActiveMonth(values, active);

  // Create and activate the new month row (if not existing)
  var exists = values.some(function(r){ return parseInt(r[0],10) === yNow && parseInt(r[1],10) === mNow; });
  if (!exists) {
    var url = buildArchiveUrl(getConfiguredUsername(), yNow, mNow);
    archivesSheet.appendRow([String(yNow), pad2(mNow), url, 'active', '', '', now, '', '', '', '', CONFIG.SCHEMA_VERSION]);
  } else {
    // Flip that row to active
    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      if (parseInt(r[0],10) === yNow && parseInt(r[1],10) === mNow) {
        archivesSheet.getRange(2 + i, 4).setValue('active');
        break;
      }
    }
  }
}

function buildArchiveUrl(username, year, month) {
  return 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/games/' + String(year) + '/' + pad2(month);
}

function finalizePreviousActiveMonth(allRows, activeRow) {
  var archivesSS = getOrCreateArchivesSpreadsheet();
  var gamesSS = getOrCreateGamesSpreadsheet();
  var archivesSheet = getOrCreateSheet(archivesSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
  var username = getConfiguredUsername();
  var now = new Date();
  var idx = allRows.indexOf(activeRow);
  var rowNumber = 2 + idx;
  var year = parseInt(activeRow[0], 10);
  var month = parseInt(activeRow[1], 10);
  var url = activeRow[2];
  var etag = activeRow[4];

  // One last conditional fetch to ensure we have all games
  var response = fetchJsonWithEtag(url, etag);
  if (response.status === 'ok') {
    var json = response.json;
    var rows = transformArchiveToRows(username, json);
    var urlIndex = buildExistingUrlIndex(gamesSS);
    var newRows = [];
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i][0];
      if (u && !urlIndex.has(u)) newRows.push(rows[i]);
    }
    if (newRows.length) {
      var gamesSheet = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
      upgradeGamesHeaderIfNeeded(gamesSheet);
      writeRowsChunked(gamesSheet, newRows);
    }
    var apiCount = (json && json.games) ? json.games.length : '';
    var ingestedCount = countIngestedForArchive(gamesSS, year, month);
    if (response.etag) archivesSheet.getRange(rowNumber, 5).setValue(response.etag);
    if (response.lastModified) archivesSheet.getRange(rowNumber, 6).setValue(response.lastModified);
    archivesSheet.getRange(rowNumber, 7).setValue(now);
    archivesSheet.getRange(rowNumber, 8).setValue(apiCount);
    archivesSheet.getRange(rowNumber, 9).setValue(ingestedCount);
  } else {
    // still mark checked
    archivesSheet.getRange(rowNumber, 7).setValue(now);
    archivesSheet.getRange(rowNumber, 11).setValue(String(response.error || response.code));
  }

  // DailyTotals is consolidated; rebuild for accuracy
  rebuildDailyTotals();

  // Mark month inactive
  archivesSheet.getRange(rowNumber, 4).setValue('inactive');
}

// DailyTotals now a single sheet; archival move removed

function recheckInactiveArchives() {
  var archivesSS = getOrCreateArchivesSpreadsheet();
  var gamesSS = getOrCreateGamesSpreadsheet();
  var sheet = getOrCreateSheet(archivesSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var data = sheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.Archives.length).getValues();
  var now = new Date();
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (String(row[3]) !== 'inactive') continue;
    var url = row[2];
    var etag = row[4];
    var resp = fetchJsonWithEtag(url, etag);
    if (resp.status === 'ok') {
      var json = resp.json || {};
      var rows = transformArchiveToRows(getConfiguredUsername(), json);
      var urlIndex = buildExistingUrlIndex(gamesSS);
      var newRows = [];
      for (var r = 0; r < rows.length; r++) {
        var u = rows[r][0];
        if (u && !urlIndex.has(u)) newRows.push(rows[r]);
      }
      if (newRows.length) {
        var gamesSheet = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
        upgradeGamesHeaderIfNeeded(gamesSheet);
        writeRowsChunked(gamesSheet, newRows);
      }
      var apiCount = (json && json.games) ? json.games.length : '';
      var ingestedCount = countIngestedForArchive(gamesSS, parseInt(row[0],10), parseInt(row[1],10));
      if (resp.etag) sheet.getRange(2 + i, 5).setValue(resp.etag);
      if (resp.lastModified) sheet.getRange(2 + i, 6).setValue(resp.lastModified);
      sheet.getRange(2 + i, 7).setValue(now);
      sheet.getRange(2 + i, 8).setValue(apiCount);
      sheet.getRange(2 + i, 9).setValue(ingestedCount);
    } else if (resp.status === 'not_modified') {
      sheet.getRange(2 + i, 7).setValue(now);
    } else {
      sheet.getRange(2 + i, 7).setValue(now);
      sheet.getRange(2 + i, 11).setValue(String(resp.error || resp.code));
    }
  }
}

function ensureMonthRollover() {
  var metricsSS = getOrCreateMetricsSpreadsheet();
  var archivesSheet = getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
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
  var metricsSS = getOrCreateMetricsSpreadsheet();
  var gamesSS = getOrCreateGamesSpreadsheet();
  var archivesSheet = getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
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

  // Move DailyTotals_Active rows for that month to archive and clear
  moveDailyTotalsForMonth(year, month);

  // Mark month inactive
  archivesSheet.getRange(rowNumber, 4).setValue('inactive');
}

function moveDailyTotalsForMonth(year, month) {
  var metricsSS = getOrCreateMetricsSpreadsheet();
  var active = getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.DailyActive, CONFIG.HEADERS.DailyActive);
  var archive = getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.DailyArchive, CONFIG.HEADERS.DailyArchive);
  var lastRow = active.getLastRow();
  if (lastRow < 2) return;
  var rows = active.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.DailyActive.length).getValues();
  var keep = [];
  var move = [];
  for (var i = 0; i < rows.length; i++) {
    var d = new Date(rows[i][0]);
    if (d.getFullYear() === year && (d.getMonth() + 1) === month) move.push(rows[i]); else keep.push(rows[i]);
  }
  if (move.length) {
    writeRowsChunked(archive, move);
  }
  // Rewrite active with keep rows
  active.getRange(2, 1, Math.max(0, lastRow - 1), active.getLastColumn()).clearContent();
  if (keep.length) active.getRange(2, 1, keep.length, keep[0].length).setValues(keep);
}


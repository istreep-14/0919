function ingestActiveMonth() {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    // Ensure month rollover without hitting archives-list API
    ensureMonthRollover();
    var gamesSS = getOrCreateGamesSpreadsheet();
    var archivesSS = getOrCreateArchivesSpreadsheet();
    var username = getConfiguredUsername();
    var archivesSheet = getOrCreateSheet(archivesSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);

    var lastRow = archivesSheet.getLastRow();
    if (lastRow < 2) return;
    var data = archivesSheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.Archives.length).getValues();
    var active = data.filter(function(r){ return String(r[3]) === 'active'; });
    if (!active.length) return;
    var row = active[0];
    var year = row[0];
    var month = row[1];
    var archiveUrl = row[2];
    var etag = row[4];

    var response = fetchJsonWithEtag(archiveUrl, etag);
    var now = new Date();
    if (response.status === 'not_modified') {
      // update last_checked only
      var idx = data.indexOf(row);
      archivesSheet.getRange(idx + 2, 7).setValue(now); // last_checked
      return;
    }
    if (response.status !== 'ok') {
      var idx2 = data.indexOf(row);
      archivesSheet.getRange(idx2 + 2, 11).setValue(String(response.error || response.code)); // errors
      archivesSheet.getRange(idx2 + 2, 7).setValue(now); // last_checked
      // If new month not yet available (404), mark as active_pending to avoid noise
      if (response.code === 404 || String(response.error).indexOf('HTTP_404') >= 0) {
        archivesSheet.getRange(idx2 + 2, 4).setValue('active_pending');
      }
      return;
    }

    var json = response.json;
    // Use per-month last_ingested_end_time pointer to avoid duplicates
    var props = getScriptProps();
    var cursorKey = 'CURSOR_' + year + '_' + month + '_END_EPOCH';
    var lastEpochStr = props.getProperty(cursorKey);
    var lastEpoch = lastEpochStr ? parseInt(lastEpochStr, 10) : 0;
    var allRows = transformArchiveToRows(username, json);
    var endTimeIdx = CONFIG.HEADERS.Games.indexOf('end_time');
    var newRows = [];
    for (var i = 0; i < allRows.length; i++) {
      var r = allRows[i];
      var endStr = r[endTimeIdx];
      var epoch = 0;
      try { epoch = endStr ? Math.floor(new Date(endStr).getTime() / 1000) : 0; } catch (e) { epoch = 0; }
      if (lastEpoch && epoch && epoch <= lastEpoch) continue;
      newRows.push(r);
    }

    if (newRows.length) {
      var gamesSheet = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
      var startRow = gamesSheet.getLastRow() + 1;
      var colCount = newRows[0].length;
      gamesSheet.getRange(startRow, 1, newRows.length, colCount).setValues(newRows);
    }

    // Update archive metadata: etag, last_modified, last_checked, counts
    var apiCount = (json && json.games) ? json.games.length : '';
    var ingestedCount = countIngestedForArchive(gamesSS, parseInt(year,10), parseInt(month,10));
    var idx3 = data.indexOf(row);
    if (response.etag) archivesSheet.getRange(idx3 + 2, 5).setValue(response.etag);
    if (response.lastModified) archivesSheet.getRange(idx3 + 2, 6).setValue(response.lastModified);
    archivesSheet.getRange(idx3 + 2, 7).setValue(now);
    archivesSheet.getRange(idx3 + 2, 8).setValue(apiCount);
    archivesSheet.getRange(idx3 + 2, 9).setValue(ingestedCount);
    // Update cursor to newest row's end_time_epoch
    if (newRows.length) {
      var newest = newRows[newRows.length - 1];
      var newestEndStr = newest[endTimeIdx];
      var newestEpoch = newestEndStr ? Math.floor(new Date(newestEndStr).getTime() / 1000) : 0;
      if (newestEpoch) props.setProperty(cursorKey, String(newestEpoch));
    }
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function buildExistingUrlIndex(gamesSS) {
  var sheet = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var lastRow = sheet.getLastRow();
  var index = new Set();
  if (lastRow < 2) return index;
  var urls = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < urls.length; i++) {
    var u = urls[i][0];
    if (u) index.add(u);
  }
  return index;
}

function countIngestedForArchive(ss, year, month) {
  var sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var endIdx = CONFIG.HEADERS.Games.indexOf('end_time');
  if (endIdx < 0) return 0;
  var rng = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var y = parseInt(year, 10); var m = parseInt(month, 10);
  var count = 0;
  for (var i = 0; i < rng.length; i++) {
    var endTimeStr = rng[i][endIdx];
    if (!endTimeStr) continue;
    var d = new Date(endTimeStr);
    if (d.getFullYear() === y && (d.getMonth() + 1) === m) count++;
  }
  return count;
}

function backfillLastRatings() { return; }

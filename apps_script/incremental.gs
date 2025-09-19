function ingestActiveMonth() {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    // Ensure month rollover without hitting archives-list API
    ensureMonthRollover();
    var gamesSS = getOrCreateGamesSpreadsheet();
    var metricsSS = getOrCreateMetricsSpreadsheet();
    var username = getConfiguredUsername();
    var archivesSheet = getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);

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
    // Use per-month last_ingested_end_time pointer to avoid URL index scan
    var props = getScriptProps();
    var cursorKey = 'CURSOR_' + year + '_' + month + '_END_EPOCH';
    var lastEpochStr = props.getProperty(cursorKey);
    var lastEpoch = lastEpochStr ? parseInt(lastEpochStr, 10) : 0;
    var allRows = transformArchiveToRows(username, json);
    // Scan backwards and keep order newest-first for append-at-top UX
    var newRows = [];
    for (var i = allRows.length - 1; i >= 0; i--) {
      var r = allRows[i];
      var endEpoch = Number(r[CONFIG.HEADERS.Games.indexOf('end_time_epoch')]);
      if (lastEpoch && endEpoch && endEpoch <= lastEpoch) break;
      newRows.push(r);
    }

    if (newRows.length) {
      var gamesSheet = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
      // Compute last_rating and rating_change_last for each row (needs format & prior rows)
      var formatIdx = CONFIG.HEADERS.Games.indexOf('format');
      var playerRatingIdx = CONFIG.HEADERS.Games.indexOf('player_rating');
      var lastRatingIdx = CONFIG.HEADERS.Games.indexOf('last_rating');
      var deltaLastIdx = CONFIG.HEADERS.Games.indexOf('rating_change_last');
      // Build map of format → latest post rating from existing top rows
      var existingLastRow = gamesSheet.getLastRow();
      var existingVals = existingLastRow >= 2 ? gamesSheet.getRange(2, 1, existingLastRow - 1, gamesSheet.getLastColumn()).getValues() : [];
      var latestPostByFormat = {};
      for (var ex = 0; ex < existingVals.length; ex++) {
        var f = existingVals[ex][formatIdx];
        var r = existingVals[ex][playerRatingIdx];
        if (f && r !== '' && latestPostByFormat[f] === undefined) {
          latestPostByFormat[f] = Number(r);
        }
      }
      // Process newRows in reverse (oldest first) to compute last_rating properly
      for (var k = newRows.length - 1; k >= 0; k--) {
        var row = newRows[k];
        var f2 = row[formatIdx];
        var post = row[playerRatingIdx];
        var last = (f2 && latestPostByFormat.hasOwnProperty(f2)) ? latestPostByFormat[f2] : '';
        // Ensure new columns present
        while (row.length <= lastRatingIdx) row.push('');
        row[lastRatingIdx] = (last === '' ? '' : Number(last));
        while (row.length <= deltaLastIdx) row.push('');
        row[deltaLastIdx] = (last === '' || post === '' ? '' : Number(post) - Number(last));
        if (f2 && post !== '') latestPostByFormat[f2] = Number(post);
      }
      // Insert at top (after header) so newest appear first
      var startRow = 2;
      var colCount = newRows[0].length;
      try {
        gamesSheet.insertRowsBefore(startRow, newRows.length);
      } catch (e) {}
      gamesSheet.getRange(startRow, 1, newRows.length, colCount).setValues(newRows);
    }

    // Update archive metadata: etag, last_modified, last_checked, counts
    var apiCount = (json && json.games) ? json.games.length : '';
    var prevIngested = row[8] || 0;
    var ingestedCount = Number(prevIngested) + Number(newRows.length || 0);
    var idx3 = data.indexOf(row);
    if (response.etag) archivesSheet.getRange(idx3 + 2, 5).setValue(response.etag);
    if (response.lastModified) archivesSheet.getRange(idx3 + 2, 6).setValue(response.lastModified);
    archivesSheet.getRange(idx3 + 2, 7).setValue(now);
    archivesSheet.getRange(idx3 + 2, 8).setValue(apiCount);
    archivesSheet.getRange(idx3 + 2, 9).setValue(ingestedCount);
    // Update cursor to newest row's end_time_epoch
    if (newRows.length) {
      var newest = newRows[newRows.length - 1];
      var newestEpoch = Number(newest[CONFIG.HEADERS.Games.indexOf('end_time_epoch')]);
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
  var rng = sheet.getRange(2, 1, lastRow - 1, 9).getValues(); // url..end_time
  var y = parseInt(year, 10); var m = parseInt(month, 10);
  var count = 0;
  for (var i = 0; i < rng.length; i++) {
    var endTimeStr = rng[i][8];
    if (!endTimeStr) continue;
    var d = new Date(endTimeStr);
    if (d.getFullYear() === y && (d.getMonth() + 1) === m) count++;
  }
  return count;
}

function backfillLastRatings() {
  var gamesSS = getOrCreateGamesSpreadsheet();
  var sheet = getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var idxFormat = CONFIG.HEADERS.Games.indexOf('format');
  var idxPost = CONFIG.HEADERS.Games.indexOf('player_rating');
  var idxLast = CONFIG.HEADERS.Games.indexOf('last_rating');
  var idxDelta = CONFIG.HEADERS.Games.indexOf('rating_change_last');
  var latestByFormat = {};
  // Rows are newest-first; traverse bottom-up to compute historical last
  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    var f = row[idxFormat];
    var post = row[idxPost];
    var last = (f && latestByFormat.hasOwnProperty(f)) ? latestByFormat[f] : '';
    row[idxLast] = (last === '' ? '' : Number(last));
    row[idxDelta] = (last === '' || post === '' ? '' : Number(post) - Number(last));
    if (f && post !== '') latestByFormat[f] = Number(post);
  }
  sheet.getRange(2, 1, values.length, sheet.getLastColumn()).setValues(values);
}

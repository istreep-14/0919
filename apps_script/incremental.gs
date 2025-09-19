function ingestActiveMonth() {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    // Ensure month rollover without hitting archives-list API
    ensureMonthRollover();
    var ss = getOrCreateSpreadsheet();
    var username = getConfiguredUsername();
    var archivesSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);

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
      return;
    }

    var json = response.json;
    // Transform all rows then filter by new URLs against Games sheet index
    var allRows = transformArchiveToRows(username, json);
    var urlIndex = buildExistingUrlIndex(ss);
    var newRows = [];
    for (var i = 0; i < allRows.length; i++) {
      var url = allRows[i][0];
      if (!url) continue;
      if (!urlIndex.has(url)) newRows.push(allRows[i]);
    }

    if (newRows.length) {
      var gamesSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
      writeRowsChunked(gamesSheet, newRows);
    }

    // Update archive metadata: etag, last_modified, last_checked, counts
    var apiCount = (json && json.games) ? json.games.length : '';
    var ingestedCount = countIngestedForArchive(ss, year, month);
    var idx3 = data.indexOf(row);
    if (response.etag) archivesSheet.getRange(idx3 + 2, 5).setValue(response.etag);
    if (response.lastModified) archivesSheet.getRange(idx3 + 2, 6).setValue(response.lastModified);
    archivesSheet.getRange(idx3 + 2, 7).setValue(now);
    archivesSheet.getRange(idx3 + 2, 8).setValue(apiCount);
    archivesSheet.getRange(idx3 + 2, 9).setValue(ingestedCount);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function buildExistingUrlIndex(ss) {
  var sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
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


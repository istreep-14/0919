function writeDeadLetter(stage, url, error, context) {
  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DeadLetters, CONFIG.HEADERS.DeadLetters);
  sheet.appendRow([new Date(), stage, url || '', String(error || ''), context ? JSON.stringify(context) : '']);
}

function replayDeadLetters(limit) {
  var ss = getOrCreateSpreadsheet();
  var sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DeadLetters, CONFIG.HEADERS.DeadLetters);
  var last = sheet.getLastRow();
  if (last < 2) return;
  var rows = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  var max = limit || 50;
  var kept = [];
  for (var i = 0; i < rows.length && i < max; i++) {
    var r = rows[i];
    try {
      // Simple policy: if stage is INGEST, try ingestActiveMonth; for CB, try runCallbacksBatch
      var stage = r[1];
      if (stage === 'INGEST') ingestActiveMonth();
      else if (stage === 'CB') runCallbacksBatch();
      else if (stage === 'BACKFILL') fullBackfill();
      // success: drop row
    } catch (e) {
      kept.push(r); // keep if still failing
    }
  }
  // Rewrite remaining
  sheet.getRange(2, 1, Math.max(0, last - 1), sheet.getLastColumn()).clearContent();
  if (kept.length) sheet.getRange(2, 1, kept.length, kept[0].length).setValues(kept);
}


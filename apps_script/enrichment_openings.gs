function runOpeningAnalysisBatch() {
  // Stub: iterate a small batch of Games rows lacking opening analysis.
  // Read-only selection and external fetch to be implemented later.
}

function appendAdjustment(timestamp, format, delta, before, after, note) {
  var ratingsSS = getOrCreateRatingsSpreadsheet();
  var sheet = getOrCreateSheet(ratingsSS, CONFIG.SHEET_NAMES.RatingsAdjustments, CONFIG.HEADERS.Adjustments);
  var row = [new Date(timestamp), String(format || ''), (delta === '' ? '' : Number(delta)), (before === '' ? '' : Number(before)), (after === '' ? '' : Number(after)), String(note || '')];
  writeRowsChunked(sheet, [row]);
}


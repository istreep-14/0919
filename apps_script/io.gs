// Project folder and raw staging removed for simplified standalone script

function getOrCreateGamesSpreadsheet() {
  var props = getScriptProps();
  var existingId = props.getProperty('SPREADSHEET_ID_GAMES');
  if (existingId) {
    try {
      return SpreadsheetApp.openById(existingId);
    } catch (e) {}
  }
  var ss = SpreadsheetApp.create(getSpreadsheetNameGames());
  props.setProperty('SPREADSHEET_ID_GAMES', ss.getId());
  return ss;
}

function getOrCreateMetricsSpreadsheet() {
  var props = getScriptProps();
  var existingId = props.getProperty('SPREADSHEET_ID_METRICS');
  if (existingId) {
    try {
      return SpreadsheetApp.openById(existingId);
    } catch (e) {}
  }
  var ss = SpreadsheetApp.create(getSpreadsheetNameMetrics());
  props.setProperty('SPREADSHEET_ID_METRICS', ss.getId());
  return ss;
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    if (headers && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function writeRowsChunked(sheet, rows, startRow) {
  if (!rows || rows.length === 0) return;
  var maxChunk = 5000;
  var offset = 0;
  var colCount = rows[0].length;
  var start = startRow || sheet.getLastRow() + 1;
  while (offset < rows.length) {
    var chunk = rows.slice(offset, offset + maxChunk);
    sheet.getRange(start + offset, 1, chunk.length, colCount).setValues(chunk);
    offset += chunk.length;
  }
}

// Raw JSON staging removed


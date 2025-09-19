// Project folder and raw staging removed for simplified standalone script

function getOrCreateSpreadsheet() {
  const props = getScriptProps();
  const existingId = props.getProperty('SPREADSHEET_ID');
  if (existingId) {
    try {
      return SpreadsheetApp.openById(existingId);
    } catch (e) {}
  }
  const ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
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
  const maxChunk = 5000;
  let offset = 0;
  const colCount = rows[0].length;
  const start = startRow || sheet.getLastRow() + 1;
  while (offset < rows.length) {
    const chunk = rows.slice(offset, offset + maxChunk);
    sheet.getRange(start + offset, 1, chunk.length, colCount).setValues(chunk);
    offset += chunk.length;
  }
}

// Raw JSON staging removed


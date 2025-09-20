// Project folder and raw staging removed for simplified standalone script

function getOrCreateGamesSpreadsheet() {
  const props = getScriptProps();
  const existingId = props.getProperty('SPREADSHEET_ID_GAMES');
  if (existingId) {
    try {
      var ssExisting = SpreadsheetApp.openById(existingId);
      ensureFileInProjectFolder(ssExisting.getId());
      return ssExisting;
    } catch (e) {}
  }
  const ss = SpreadsheetApp.create(getSpreadsheetNameGames());
  props.setProperty('SPREADSHEET_ID_GAMES', ss.getId());
  ensureFileInProjectFolder(ss.getId());
  return ss;
}

function getOrCreateCallbacksSpreadsheet() {
  const props = getScriptProps();
  const key = 'SPREADSHEET_ID_CALLBACKS';
  const existingId = props.getProperty(key);
  if (existingId) {
    try { var ssExisting = SpreadsheetApp.openById(existingId); ensureFileInProjectFolder(ssExisting.getId()); return ssExisting; } catch (e) {}
  }
  const ss = SpreadsheetApp.create(getSpreadsheetNameCallbacks());
  props.setProperty(key, ss.getId());
  ensureFileInProjectFolder(ss.getId());
  return ss;
}

function getOrCreateRatingsSpreadsheet() {
  const props = getScriptProps();
  const key = 'SPREADSHEET_ID_RATINGS';
  const existingId = props.getProperty(key);
  if (existingId) {
    try { var ssExisting = SpreadsheetApp.openById(existingId); ensureFileInProjectFolder(ssExisting.getId()); return ssExisting; } catch (e) {}
  }
  const ss = SpreadsheetApp.create(getSpreadsheetNameRatings());
  props.setProperty(key, ss.getId());
  ensureFileInProjectFolder(ss.getId());
  return ss;
}

function getOrCreateStatsSpreadsheet() {
  const props = getScriptProps();
  const key = 'SPREADSHEET_ID_STATS';
  const existingId = props.getProperty(key);
  if (existingId) {
    try { var ssExisting = SpreadsheetApp.openById(existingId); ensureFileInProjectFolder(ssExisting.getId()); return ssExisting; } catch (e) {}
  }
  const ss = SpreadsheetApp.create(getSpreadsheetNameStats());
  props.setProperty(key, ss.getId());
  ensureFileInProjectFolder(ss.getId());
  return ss;
}

function getOrCreateLiveStatsSpreadsheet() {
  const props = getScriptProps();
  const key = 'SPREADSHEET_ID_LIVESTATS';
  const existingId = props.getProperty(key);
  if (existingId) {
    try { var ssExisting = SpreadsheetApp.openById(existingId); ensureFileInProjectFolder(ssExisting.getId()); return ssExisting; } catch (e) {}
  }
  const ss = SpreadsheetApp.create(getSpreadsheetNameLiveStats());
  props.setProperty(key, ss.getId());
  ensureFileInProjectFolder(ss.getId());
  return ss;
}

function getOrCreateArchivesSpreadsheet() {
  const props = getScriptProps();
  const key = 'SPREADSHEET_ID_ARCHIVES';
  const existingId = props.getProperty(key);
  if (existingId) {
    try { var ssExisting = SpreadsheetApp.openById(existingId); ensureFileInProjectFolder(ssExisting.getId()); return ssExisting; } catch (e) {}
  }
  const ss = SpreadsheetApp.create(getSpreadsheetNameArchives());
  props.setProperty(key, ss.getId());
  ensureFileInProjectFolder(ss.getId());
  return ss;
}

function getOrCreateDailyTotalsSpreadsheet() {
  const props = getScriptProps();
  const key = 'SPREADSHEET_ID_DAILYTOTALS';
  const existingId = props.getProperty(key);
  if (existingId) {
    try { var ssExisting = SpreadsheetApp.openById(existingId); ensureFileInProjectFolder(ssExisting.getId()); return ssExisting; } catch (e) {}
  }
  const ss = SpreadsheetApp.create(getSpreadsheetNameDailyTotals());
  props.setProperty(key, ss.getId());
  ensureFileInProjectFolder(ss.getId());
  return ss;
}

function getOrCreateLogsSpreadsheet() {
  const props = getScriptProps();
  const key = 'SPREADSHEET_ID_LOGS';
  const existingId = props.getProperty(key);
  if (existingId) {
    try { var ssExisting = SpreadsheetApp.openById(existingId); ensureFileInProjectFolder(ssExisting.getId()); return ssExisting; } catch (e) {}
  }
  const ss = SpreadsheetApp.create(getSpreadsheetNameLogs());
  props.setProperty(key, ss.getId());
  ensureFileInProjectFolder(ss.getId());
  return ss;
}

function getOrCreateSheet(ss, sheetName, headers) {
  // Guard against undefined spreadsheet handles from callers
  if (!ss || typeof ss.getSheetByName !== 'function') {
    try {
      ss = SpreadsheetApp.getActive();
    } catch (e) {}
    if (!ss) {
      // Default fallback: use Games spreadsheet if unknown
      ss = getOrCreateGamesSpreadsheet();
    }
  }
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

function getOrCreateProjectFolder() {
  var name = getProjectRootFolderName();
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

function ensureFileInProjectFolder(fileId) {
  try {
    var folder = getOrCreateProjectFolder();
    var file = DriveApp.getFileById(fileId);
    folder.addFile(file);
    try {
      DriveApp.getRootFolder().removeFile(file);
    } catch (e) {}
  } catch (e) {}
}

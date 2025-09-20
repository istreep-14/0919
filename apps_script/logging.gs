function logEvent(level, code, message, context) {
  try {
    var logsSS = getOrCreateLogsSpreadsheet();
    var sheet = getOrCreateSheet(logsSS, CONFIG.SHEET_NAMES.Logs, CONFIG.HEADERS.Logs);
    var row = [new Date(), String(level || 'INFO'), String(code || ''), String(message || ''), context ? JSON.stringify(context) : ''];
    writeRowsChunked(sheet, [row]);
  } catch (e) {
    // swallow logging errors
  }
}


function logRow(level, code, message, context) {
  try {
    var metricsSS = getOrCreateMetricsSpreadsheet();
    var sheet = getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Logs, CONFIG.HEADERS.Logs);
    var ts = new Date();
    var ctx = context ? JSON.stringify(context) : '';
    writeRowsChunked(sheet, [[ts, level || 'INFO', code || '', String(message || ''), ctx]]);
  } catch (e) {
    // swallow
  }
}

function logInfo(code, message, context) {
  logRow('INFO', code, message, context);
}

function logWarn(code, message, context) {
  logRow('WARN', code, message, context);
}

function logError(code, message, context) {
  logRow('ERROR', code, message, context);
}

function setupProject() {
  const ss = getOrCreateSpreadsheet();
  // Ensure sheets and headers exist
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DailyActive, CONFIG.HEADERS.DailyActive);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DailyArchive, CONFIG.HEADERS.DailyArchive);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Logs, CONFIG.HEADERS.Logs);
  // DeadLetters and Config sheets removed for simplified standalone script

  // Discover archives and write
  const username = getConfiguredUsername();
  const rows = discoverArchives(username);
  writeArchivesSheet(ss, rows);

  return ss.getUrl();
}

// Backfill implemented in backfill.gs

// Orchestrators exposed for triggers/cron
function ingestActiveMonth() { /* implemented in incremental.gs */ }
function rebuildDailyTotals() { /* implemented in daily.gs */ }
function runCallbacksBatch() { /* implemented in callbacks.gs */ }


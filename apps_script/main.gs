function setupProject() {
  applySetupFromCode();
  const gamesSS = getOrCreateGamesSpreadsheet();
  const metricsSS = getOrCreateMetricsSpreadsheet();
  // Ensure sheets and headers exist in the proper files
  getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);

  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.DailyActive, CONFIG.HEADERS.DailyActive);
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.DailyArchive, CONFIG.HEADERS.DailyArchive);
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Logs, CONFIG.HEADERS.Logs);

  // Discover archives and write
  const username = getConfiguredUsername();
  const rows = discoverArchives(username);
  writeArchivesSheet(metricsSS, rows);

  return JSON.stringify({ gamesUrl: gamesSS.getUrl(), metricsUrl: metricsSS.getUrl() });
}

// Backfill implemented in backfill.gs

// Orchestrators exposed for triggers/cron
function ingestActiveMonth() { /* implemented in incremental.gs */ }
function rebuildDailyTotals() { /* implemented in daily.gs */ }
function runCallbacksBatch() { /* implemented in callbacks.gs */ }
function fullBackfill() { /* implemented in backfill.gs */ }

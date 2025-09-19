function setupProject() {
  applySetupFromCode();
  const gamesSS = getOrCreateGamesSpreadsheet();
  const metricsSS = getOrCreateMetricsSpreadsheet();
  // Ensure sheets and headers exist in the proper files
  getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);

  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
  // Consolidated DailyTotals sheet is authoritative
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.DailyTotals, CONFIG.HEADERS.DailyTotals);
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.LiveStatsEOD, CONFIG.HEADERS.LiveStatsEOD);
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.LiveStatsMeta, CONFIG.HEADERS.LiveStatsMeta);
  getOrCreateSheet(metricsSS, CONFIG.SHEET_NAMES.Logs, CONFIG.HEADERS.Logs);

  // Discover archives and write
  const username = getConfiguredUsername();
  const rows = discoverArchives(username);
  writeArchivesSheet(metricsSS, rows);

  return JSON.stringify({ gamesUrl: gamesSS.getUrl(), metricsUrl: metricsSS.getUrl() });
}

// Orchestrator implementations live in their respective files:
// - ingestActiveMonth: incremental.gs
// - rebuildDailyTotals: daily.gs
// - runCallbacksBatch: callbacks.gs
// - fullBackfill: backfill.gs
// - backfillLastRatings: incremental.gs
// - recheckInactiveArchives: rollover.gs

// Enrichment jobs implementations:
// - runOpeningAnalysisBatch: enrichment_openings.gs
// - runGameDataBatch: enrichment_gamedata.gs

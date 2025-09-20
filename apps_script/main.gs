function setupProject() {
  applySetupFromCode();
  const gamesSS = getOrCreateGamesSpreadsheet();
  const callbacksSS = getOrCreateCallbacksSpreadsheet();
  const ratingsSS = getOrCreateRatingsSpreadsheet();
  const statsSS = getOrCreateStatsSpreadsheet();
  const liveSS = getOrCreateLiveStatsSpreadsheet();
  const archivesSS = getOrCreateArchivesSpreadsheet();
  const dailySS = getOrCreateDailyTotalsSpreadsheet();
  const logsSS = getOrCreateLogsSpreadsheet();
  // Ensure sheets and headers exist in the proper files
  getOrCreateSheet(gamesSS, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  getOrCreateSheet(callbacksSS, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  getOrCreateSheet(ratingsSS, CONFIG.SHEET_NAMES.RatingsTimeline, CONFIG.HEADERS.Ratings);
  getOrCreateSheet(ratingsSS, CONFIG.SHEET_NAMES.RatingsAdjustments, CONFIG.HEADERS.Adjustments);
  getOrCreateSheet(statsSS, CONFIG.SHEET_NAMES.PlayerStats, CONFIG.HEADERS.PlayerStats);
  getOrCreateSheet(liveSS, CONFIG.SHEET_NAMES.LiveStatsEOD, CONFIG.HEADERS.LiveStatsEOD);
  getOrCreateSheet(liveSS, CONFIG.SHEET_NAMES.LiveStatsMeta, CONFIG.HEADERS.LiveStatsMeta);
  getOrCreateSheet(archivesSS, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
  getOrCreateSheet(dailySS, CONFIG.SHEET_NAMES.DailyTotals, CONFIG.HEADERS.DailyTotals);
  getOrCreateSheet(logsSS, CONFIG.SHEET_NAMES.Logs, CONFIG.HEADERS.Logs);

  // Discover archives and write
  const username = getConfiguredUsername();
  const rows = discoverArchives(username);
  writeArchivesSheet(archivesSS, rows);

  return JSON.stringify({ gamesUrl: gamesSS.getUrl(), callbacksUrl: callbacksSS.getUrl(), ratingsUrl: ratingsSS.getUrl(), statsUrl: statsSS.getUrl(), liveUrl: liveSS.getUrl(), archivesUrl: archivesSS.getUrl(), dailyTotalsUrl: dailySS.getUrl(), logsUrl: logsSS.getUrl() });
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

function setupProject() {
  const ss = getOrCreateSpreadsheet();
  // Ensure sheets and headers exist
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Archives, CONFIG.HEADERS.Archives);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Games, CONFIG.HEADERS.Games);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DailyActive, CONFIG.HEADERS.DailyActive);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DailyArchive, CONFIG.HEADERS.DailyArchive);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.CallbackStats, CONFIG.HEADERS.CallbackStats);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Logs, CONFIG.HEADERS.Logs);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DeadLetters, CONFIG.HEADERS.DeadLetters);
  getOrCreateSheet(ss, CONFIG.SHEET_NAMES.Config, CONFIG.HEADERS.Config);

  // Discover archives and write
  const username = getConfiguredUsername();
  const rows = discoverArchives(username);
  writeArchivesSheet(ss, rows);

  return ss.getUrl();
}

function fullBackfill() {
  // Stub: will orchestrate fetch of all archives, transform, and write in chunks
  const username = getConfiguredUsername();
  Logger.log('Full backfill starting for %s', username);
}

function ingestActiveMonth() {
  // Stub: will fetch active month with ETag and append new games only
}

function rebuildDailyTotals() {
  // Stub: recompute daily totals
}

function runCallbacksBatch() {
  // Stub: process a batch of callback lookups
}


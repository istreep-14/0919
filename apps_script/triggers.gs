function installTriggers() {
  // Clear existing project triggers first
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    ScriptApp.deleteTrigger(all[i]);
  }
  // Ingest active month every 15 minutes
  ScriptApp.newTrigger('ingestActiveMonth')
    .timeBased()
    .everyMinutes(15)
    .create();
  // Month rollover check at 01:10 daily (cheap, fast)
  ScriptApp.newTrigger('ensureMonthRollover')
    .timeBased()
    .atHour(1)
    .nearMinute(10)
    .everyDays(1)
    .create();
  // Monthly recheck of inactive archives on the 2nd of each month at ~02:15
  ScriptApp.newTrigger('recheckInactiveArchives')
    .timeBased()
    .atHour(2)
    .nearMinute(15)
    .onMonthDay(2)
    .create();
}

function resetTriggers() {
  installTriggers();
}

function healthCheck() {
  try {
    var ss = getOrCreateSpreadsheet();
    // Touch active month ETag with HEAD-style (GET with If-None-Match only); we reuse ingest path which is safe
    ensureMonthRollover();
    logInfo('HEALTH_OK', 'Health check completed');
  } catch (e) {
    logError('HEALTH_ERR', e && e.message, {});
  }
}

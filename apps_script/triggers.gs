function installTriggers() {
  // Clear existing project triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  // Ingest active month every 5 minutes
  ScriptApp.newTrigger('ingestActiveMonth').timeBased().everyMinutes(5).create();
  // Monthly rollover on the 1st at 00:10
  ScriptApp.newTrigger('ensureMonthRollover').timeBased().onMonthDay(1).atHour(0).nearMinute(10).create();
  // Nightly health check at 01:00
  ScriptApp.newTrigger('healthCheck').timeBased().atHour(1).everyDays(1).create();
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


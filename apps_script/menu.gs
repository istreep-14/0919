function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Chess Ingest')
    .addItem('Setup Project', 'setupProject')
    .addSeparator()
    .addItem('Full Backfill', 'fullBackfill')
    .addItem('Ingest Active Month', 'ingestActiveMonth')
    .addItem('Rebuild Daily Totals', 'rebuildDailyTotals')
    .addItem('Finalize Month Now', 'ensureMonthRollover')
    .addItem('Install Triggers', 'installTriggers')
    .addSeparator()
    .addItem('Run Callback Batch', 'runCallbacksBatch')
    .addItem('Replay DeadLetters', 'replayDeadLetters')
    .addToUi();
}


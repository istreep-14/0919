function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Chess Ingest')
    .addItem('Setup Project', 'setupProject')
    .addSeparator()
    .addItem('Full Backfill', 'fullBackfill')
    .addItem('Ingest Active Month', 'ingestActiveMonth')
    .addItem('Rebuild Daily Totals', 'rebuildDailyTotals')
    .addSeparator()
    .addItem('Run Callback Batch', 'runCallbacksBatch')
    .addToUi();
}


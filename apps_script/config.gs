// SETUP: Fill these values, run setupProject(), then set DONE to true.
// Where to input: edit the values below directly in this file.
const SETUP = {
  DONE: false, // set to true after setup is applied successfully
  CHESS_USERNAME: 'ians141',
  TIMEZONE: 'America/New_York', // optional; leave empty to use project timezone
  SPREADSHEET_NAME_GAMES: 'Chess Data - Games',
  SPREADSHEET_NAME_METRICS: 'Chess Data - Metrics'
};

function applySetupFromCode() {
  if (!SETUP || SETUP.DONE !== false) return;
  const props = PropertiesService.getScriptProperties();
  if (SETUP.CHESS_USERNAME) props.setProperty('CHESS_USERNAME', SETUP.CHESS_USERNAME);
  if (SETUP.TIMEZONE) props.setProperty('TIMEZONE', SETUP.TIMEZONE);
  if (SETUP.SPREADSHEET_NAME_GAMES) props.setProperty('SPREADSHEET_NAME_GAMES', SETUP.SPREADSHEET_NAME_GAMES);
  if (SETUP.SPREADSHEET_NAME_METRICS) props.setProperty('SPREADSHEET_NAME_METRICS', SETUP.SPREADSHEET_NAME_METRICS);
}

const CONFIG = {
  PROJECT_NAME: 'Chess Ingest',
  FOLDER_NAME: 'Chess Ingest',
  SPREADSHEET_NAME: 'Chess Ingest',
  SCHEMA_VERSION: '1.0.0',
  SHEET_NAMES: {
    Archives: 'Archives',
    Games: 'Games',
    DailyActive: 'DailyTotals_Active',
    DailyArchive: 'DailyTotals_Archive',
    DailyTotals: 'DailyTotals',
    CallbackStats: 'CallbackStats',
    Logs: 'Logs'
  },
  HEADERS: {
    Archives: [
      'year', 'month', 'archive_url', 'status', 'etag', 'last_modified', 'last_checked',
      'game_count_api', 'game_count_ingested', 'callback_completed', 'errors', 'schema_version'
    ],
    Games: [
      'url', 'type', 'id', 'time_control', 'base_time', 'increment', 'correspondence_time',
      'start_time', 'end_time', 'duration_seconds', 'rated', 'time_class', 'rules', 'format',
      'player_username', 'player_color', 'player_rating', 'player_result', 'player_outcome', 'player_score',
      'opponent_username', 'opponent_color', 'opponent_rating',
      'eco_code', 'eco_url', 'uuid', 'end_reason', 'pgn_moves',
      'start_time_epoch', 'end_time_epoch', 'rating_change_exact', 'rating_is_exact'
    ],
    DailyTotals: [
      'date', 'format', 'wins', 'losses', 'draws', 'score', 'rating_start', 'rating_end', 'rating_change', 'games', 'duration_seconds', 'rating_change_exact', 'is_rating_exact'
    ],
    DailyActive: [
      'date', 'format', 'wins', 'losses', 'draws', 'score', 'rating_start', 'rating_end', 'rating_change', 'games', 'duration_seconds', 'rating_change_exact', 'is_rating_exact'
    ],
    DailyArchive: [
      'date', 'format', 'wins', 'losses', 'draws', 'score', 'rating_start', 'rating_end', 'rating_change', 'games', 'duration_seconds', 'rating_change_exact', 'is_rating_exact'
    ],
    CallbackStats: [
      'url', 'type', 'id', 'exact_rating_change', 'pregame_rating', 'data_json', 'fetched_at'
    ],
    Logs: ['timestamp', 'level', 'code', 'message', 'context_json']
  }
};

function getScriptProps() {
  return PropertiesService.getScriptProperties();
}

function getConfiguredUsername() {
  const value = getScriptProps().getProperty('CHESS_USERNAME');
  if (!value) {
    throw new Error('Set CHESS_USERNAME in Script Properties.');
  }
  return value;
}

function getProjectTimeZone() {
  const tz = getScriptProps().getProperty('TIMEZONE');
  return tz || Session.getScriptTimeZone() || 'Etc/UTC';
}

function getProjectRootFolderName() {
  const overrideName = getScriptProps().getProperty('PROJECT_FOLDER_NAME');
  return overrideName || CONFIG.FOLDER_NAME;
}

function getSpreadsheetNameGames() {
  const props = getScriptProps();
  return props.getProperty('SPREADSHEET_NAME_GAMES') || (CONFIG.SPREADSHEET_NAME + ' - Data-Games');
}

function getSpreadsheetNameMetrics() {
  const props = getScriptProps();
  return props.getProperty('SPREADSHEET_NAME_METRICS') || (CONFIG.SPREADSHEET_NAME + ' - Metrics');
}

function setProjectProperties(obj) {
  const props = getScriptProps();
  Object.keys(obj || {}).forEach(function(k){
    if (obj[k] === undefined || obj[k] === null) return;
    props.setProperty(String(k), String(obj[k]));
  });
}

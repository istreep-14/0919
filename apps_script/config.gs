// SETUP: Fill these values, run setupProject(), then set DONE to true.
// Where to input: edit the values below directly in this file.
const SETUP = {
  DONE: false, // set to true after setup is applied successfully
  CHESS_USERNAME: 'ians141',
  TIMEZONE: 'America/New_York', // optional; leave empty to use project timezone
  SPREADSHEET_NAME_GAMES: 'Chess Data - Games',
  SPREADSHEET_NAME_CALLBACKS: 'Chess Data - Callbacks',
  SPREADSHEET_NAME_RATINGS: 'Chess Data - Ratings',
  SPREADSHEET_NAME_STATS: 'Chess Data - Stats',
  SPREADSHEET_NAME_LIVESTATS: 'Chess Data - LiveStats',
  SPREADSHEET_NAME_ARCHIVES: 'Chess Data - Archives',
  SPREADSHEET_NAME_DAILYTOTALS: 'Chess Data - DailyTotals',
  SPREADSHEET_NAME_LOGS: 'Chess Data - Logs'
};

function applySetupFromCode() {
  if (!SETUP || SETUP.DONE !== false) return;
  const props = PropertiesService.getScriptProperties();
  if (SETUP.CHESS_USERNAME) props.setProperty('CHESS_USERNAME', SETUP.CHESS_USERNAME);
  if (SETUP.TIMEZONE) props.setProperty('TIMEZONE', SETUP.TIMEZONE);
  if (SETUP.SPREADSHEET_NAME_GAMES) props.setProperty('SPREADSHEET_NAME_GAMES', SETUP.SPREADSHEET_NAME_GAMES);
  if (SETUP.SPREADSHEET_NAME_CALLBACKS) props.setProperty('SPREADSHEET_NAME_CALLBACKS', SETUP.SPREADSHEET_NAME_CALLBACKS);
  if (SETUP.SPREADSHEET_NAME_RATINGS) props.setProperty('SPREADSHEET_NAME_RATINGS', SETUP.SPREADSHEET_NAME_RATINGS);
  if (SETUP.SPREADSHEET_NAME_STATS) props.setProperty('SPREADSHEET_NAME_STATS', SETUP.SPREADSHEET_NAME_STATS);
  if (SETUP.SPREADSHEET_NAME_LIVESTATS) props.setProperty('SPREADSHEET_NAME_LIVESTATS', SETUP.SPREADSHEET_NAME_LIVESTATS);
  if (SETUP.SPREADSHEET_NAME_ARCHIVES) props.setProperty('SPREADSHEET_NAME_ARCHIVES', SETUP.SPREADSHEET_NAME_ARCHIVES);
  if (SETUP.SPREADSHEET_NAME_DAILYTOTALS) props.setProperty('SPREADSHEET_NAME_DAILYTOTALS', SETUP.SPREADSHEET_NAME_DAILYTOTALS);
  if (SETUP.SPREADSHEET_NAME_LOGS) props.setProperty('SPREADSHEET_NAME_LOGS', SETUP.SPREADSHEET_NAME_LOGS);
}

const CONFIG = {
  PROJECT_NAME: 'Chess Ingest',
  FOLDER_NAME: 'Chess Ingest',
  SPREADSHEET_NAME: 'Chess Ingest',
  SCHEMA_VERSION: '1.0.0',
  SHEET_NAMES: {
    Archives: 'Archives',
    Games: 'Games',
    DailyTotals: 'DailyTotals',
    CallbackStats: 'CallbackStats',
    RatingsTimeline: 'Ratings',
    RatingsAdjustments: 'Adjustments',
    PlayerStats: 'PlayerStats',
    LiveStatsEOD: 'LiveStatsEOD',
    LiveStatsMeta: 'LiveStatsMeta',
    Logs: 'Logs'
  },
  HEADERS: {
    Archives: [
      'year', 'month', 'archive_url', 'status', 'etag', 'last_modified', 'last_checked',
      'game_count_api', 'game_count_ingested', 'callback_completed', 'errors', 'schema_version'
    ],
    Games: [
      'url',
      'type', 'id',
      'time_control', 'base_time', 'increment', 'correspondence_time',
      'start_time', 'end_time', 'duration_seconds',
      'rated', 'time_class', 'rules', 'format',
      'player_username', 'player_color', 'player_rating', 'player_result', 'player_outcome', 'player_score',
      'opponent_username', 'opponent_color', 'opponent_rating', 'opponent_result', 'opponent_outcome', 'opponent_score',
      'eco_code', 'eco_url', 'uuid', 'end_reason', 'pgn_moves'
    ],
    DailyTotals: [
      'date', 'format', 'wins', 'losses', 'draws', 'score', 'rating_start', 'rating_end', 'rating_change', 'games', 'duration_seconds'
    ],
    DailyActive: [
      'date', 'format', 'wins', 'losses', 'draws', 'score', 'rating_start', 'rating_end', 'rating_change', 'games', 'duration_seconds'
    ],
    DailyArchive: [
      'date', 'format', 'wins', 'losses', 'draws', 'score', 'rating_start', 'rating_end', 'rating_change', 'games', 'duration_seconds'
    ],
    CallbackStats: [
      'url', 'type', 'id', 'my_color',
      'my_username', 'my_rating', 'my_country', 'my_membership', 'my_default_tab', 'my_post_move_action',
      'opp_username', 'opp_rating', 'opp_country', 'opp_membership', 'opp_default_tab', 'opp_post_move_action',
      'my_delta_callback', 'opp_delta_callback',
      'data_json', 'fetched_at'
    ],
    Ratings: [
      'timestamp', 'kind', 'format', 'url', 'rated', 'player_outcome',
      'my_pregame_last', 'my_delta_last', 'opp_pregame_last', 'opp_delta_last',
      'my_pregame_cb', 'my_delta_cb', 'opp_pregame_cb', 'opp_delta_cb',
      'note', 'source_json'
    ],
    Adjustments: [
      'timestamp', 'format', 'delta', 'before', 'after', 'note'
    ],
    PlayerStats: [
      'timestamp', 'format', 'rating', 'rd', 'source', 'raw_json'
    ],
    LiveStatsEOD: [
      'date', 'format', 'eod_rating', 'rating_raw', 'day_close_rating_raw', 'timestamp_ms', 'day_index'
    ],
    LiveStatsMeta: [
      'fetched_at', 'format',
      'count', 'rated_count',
      'opponent_rating_avg', 'opponent_rating_win_avg', 'opponent_rating_draw_avg', 'opponent_rating_loss_avg',
      'white_game_count', 'black_game_count', 'white_win_count', 'white_draw_count', 'white_loss_count', 'black_win_count', 'black_draw_count', 'black_loss_count',
      'rating_last', 'rating_first', 'rating_max', 'rating_max_timestamp',
      'moves_count', 'streak_last', 'streak_max', 'streak_max_timestamp',
      'opponent_rating_max', 'opponent_rating_max_timestamp', 'opponent_rating_max_uuid',
      'accuracy_count', 'accuracy_avg', 'starting_day',
      'progress', 'rank', 'percentile', 'playersCount', 'friendRank', 'friendRankIsExpired'
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

function getSpreadsheetNameCallbacks() { const props = getScriptProps(); return props.getProperty('SPREADSHEET_NAME_CALLBACKS') || (CONFIG.SPREADSHEET_NAME + ' - Callbacks'); }
function getSpreadsheetNameRatings() { const props = getScriptProps(); return props.getProperty('SPREADSHEET_NAME_RATINGS') || (CONFIG.SPREADSHEET_NAME + ' - Ratings'); }
function getSpreadsheetNameStats() { const props = getScriptProps(); return props.getProperty('SPREADSHEET_NAME_STATS') || (CONFIG.SPREADSHEET_NAME + ' - Stats'); }
function getSpreadsheetNameLiveStats() { const props = getScriptProps(); return props.getProperty('SPREADSHEET_NAME_LIVESTATS') || (CONFIG.SPREADSHEET_NAME + ' - LiveStats'); }
function getSpreadsheetNameArchives() { const props = getScriptProps(); return props.getProperty('SPREADSHEET_NAME_ARCHIVES') || (CONFIG.SPREADSHEET_NAME + ' - Archives'); }
function getSpreadsheetNameDailyTotals() { const props = getScriptProps(); return props.getProperty('SPREADSHEET_NAME_DAILYTOTALS') || (CONFIG.SPREADSHEET_NAME + ' - DailyTotals'); }
function getSpreadsheetNameLogs() { const props = getScriptProps(); return props.getProperty('SPREADSHEET_NAME_LOGS') || (CONFIG.SPREADSHEET_NAME + ' - Logs'); }

function setProjectProperties(obj) {
  const props = getScriptProps();
  Object.keys(obj || {}).forEach(function(k){
    if (obj[k] === undefined || obj[k] === null) return;
    props.setProperty(String(k), String(obj[k]));
  });
}


init setup

run function to create a google drive folder and multiple google sheets files within it for this project. seperate for ease and preformance



backfill: backfill all chess games into a google sheet with desired headers for each game. may do in chunks. 
  fetch archive list and store in a google sheet
  log meta data per archive in column of that sheet
    amount of games checked, etag, last modified last checked, amount of games from that api in the database , status (whether or not api database is inactive (past that month) or active (current month). 
  once all games added
  
backfill daily totals
  sheet with every date from account creation (from profile api) to today using filters and or query style functions find wins losses draws rating at beginning of day, rating at end of day, rating change, game duration of that rating for each of the 3 main formats icare about: blitz, bullet, rapid, and overall (sum rating values for overall)
  link dates to archive month as well they will be pushed to an archive sheet of their when moved to archive


estbalish active daily totals sheet, sheet with all dates from beginning of active archive month(s) to end as dates with daily total stats as columns. establish functions that can auto update daily stats of affected date every time new games appended

function to push inactive months to archive sheet or multiple

add new games:
  using preformance ideas like etag, pointers of last seen url and others, check current archive for new games and append them to sheet
  make sure no duplicates
    update archive metadata, if that fetch and check archive was after the end of that month change the status


function to update archive list
  beginning of each month new archive will be made of same style of old ones
  once new month is created fetch old month to ensure it is inactive then update status

game call backs
  establish queue of games to check callback stats for
  write in seperate google sheet with all headers each game linked by url
  batch style let me set max amount 
  update meta data of archives (callback progress) and overall callback progress
    update pregame ratings for that batch of games to be exact (have some sort of way for me to know if value of rating change and pregame rating is exact or estimate) maybe and header stating either
  


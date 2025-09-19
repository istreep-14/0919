table showing every header i will have for games i pull from chess.com from the monthly archive apis.

data came from https://www.chess.com/news/view/published-data-api#pubapi-endpoint-games-archive that is where
you can see more about each key. every key will be listed as object.key if they have a containing object or just key if not


source	object	key	derived	note	display	example if needed
json		url		ex: https://www.chess.com/game/live/141381993160 ex: https://www.chess.com/game/daily/141381993160	yes	
derived		type	url	derived from url - live or daily or if easier in stead of parsing from url, can establish based on time_class (if time_class is daily then so is type, if time class is any of the other 3, bullet, blitz, rapid, then type is live)	yes	
derived		id	url	derived from url - number after last / in url ex: 141381993160 (ids are split by the two types as live game with the same id as daily are different games, they are just counts of the game number in chess.com universe of that type, would need way to establish or connect type and id or just use url as anchor for dedupe occurances	yes	
json		pgn		after parsing the pgn by header, full pgn from the json is not needeed as all parts are parsed into their own column	no	
json		time_control		seconds per person: example "60" (1 minute per side) or {seconds per person}+{incriment} example: "180+2" (3 minutes per person to start, beach ading 2 seconds to their clock after each on of their moves) , or 1/86400 (/ establishing daily game meaning it is correspondence game,  the number after1/ is amount of seconds to make a response move example 1/86400 you get 1 day to respond	yes	time_control: "1/259200",
derived		base_time		start time per person of live game (display as value in seconds so do not change number like 180+2 base time would be 180,  if time control is 1/number then leave null as incriment iis conly for live games	yes	
derived		incriment		seconds added from time control so 180+2 would yield 2 as incriment if no+ like 300 is the time control then value is 0 not null, if time control is 1/number then leave null as incriment iis conly for live games	yes	
derived		correspondence_time		time after 1/ , leave null if live game meaning time control would have no / vaue is the amount after / meaning seconds to respond to a move	yes	
json/derived		start_time		only shown in daily games but i would like to know the start time for all live games too so i can track duration of each game. have column fill when start time not shown, merge utc date and time into one date time value right now theyre formatted as [UTCDate "2018.02.03"][UTCTime "11:19:16"] . but make sure you localize them to my used time zone in project settings, then merge them into one date and time, then format it so it can be seen in google sheets easily, YYYY-MM-DD hh:mm:ss.	yes	start_time: 1254438881 (example as output of daily game, ussually will not be there because most games i play are live
json		end_time		format it same to end time YYYY-MM-DD hh:mm:ss as it comes out now as timestamp    "end_time": 1254670734	yes	end_time: 1254670734 (again needs to be formatted differently
derived		duration	start_time, end_time	end time - start time shown as value in seconds (make sure end_time and start_time include dates too so if a game runs through midnight, duration would still be correct	yes	
json		rated			yes	rated: true,
json	accuracies	white			yes	white: 96.18,
json	accuracies	black			yes	black: 83.72
json		tcn			yes	tcn": "mCZRlB!Tbs2Ucu92dlYQgv6EfAXHArWGiq5ZvM8!pxENoE"
json		uuid			yes	uuid: "3277772e-aee0-11de-830e-00000001000b"
json		initial_setup			yes	initial_setup: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
json		fen			yes	"fen": "r2q1rk1/3nppbp/2pp1np1/pp4Nb/3PP1P1/PBN1B2P/1PPQ1P2/R3K2R b KQ g3 1 12"
json		time_class		constants: bullet, blitz, rapid, daily	yes	time_class: "daily"
json		rules		constants: chess, chess960, threecheck, kingofthehill, oddschess, bughouse, crazyhouse	yes	rules: "chess"
derived		format	time_class, rules, type	for when rule is chess , this is standard format, all time classes have their own rating and thus own format, because it is standard rules, format name is just time_class if game rules are chess. for chess960 this is the only variant that can be live or daily, if gametype is daily then format: daily960 if live then live960. (threecheck, kingofthehill, oddschess, bughouse, crazyhouse) all only have one format for entire variant so format is just the rule, (oddschess is an unrated format and is not needed for any rating stats or any thing players in that game will not will show ratings based on something else). formats: (bullet, blitz, rapid, daily, live960, daily960, threecheck, kingofthehill, oddschess, bughouse, crazyhouse). all rating types(for when i track my rating over time per format): (bullet, blitz, rapid, daily, live960, daily960, threecheck, kingofthehill, bughouse, crazyhouse) - establish as constants with formats but note that oddschess is not part of rating type.	yes	
json	white	rating		derives identity all keys from white or black should just be used to fill in identity stats but then removed from game when writing to sheet	no	rating: 1633
json	white	result		derives identity	no	result: "win"
json	white	@id		derives identity	no	@id: "https://api.chess.com/pub/player/mainline_novelty"
json	white	username		derives identity	no	username: "Mainline_Novelty"
json	white	uuid		derives identity	no	uuid: "9c535e34-2dd0-11dd-8006-000000000000"
json	black	rating		derives identity	no	
json	black	result		derives identity	no	
json	black	@id		derives identity	no	
json	black	username		derives identity	no	
json	black	uuid		derives identity	no	
derived		game_end_reason	white.result and black.result	Results Code (can be constants, table showing code (the code of result for each player in a game) , description(description of what the code means), and the outcome that comes from that result). obviously when one person wins then the other person loses and if one draws then other draws as well. results codes for draws will be the same for both players. include code and related outcome as constants, i do not need decription of it in the code. table is comma seperated by columns. \n\Code,Description,Outcome\n\win,Win,Win\n\checkmated,Checkmated,Loss\n\agreed,Draw agreed,Draw\n\repetition,Draw by repetition,Draw\n\timeout,Timeout,Loss\n\resigned,Resigned,Loss\n\stalemate,Stalemate,Draw\n\insufficient,Insufficient material,Draw\n\50move,Draw by 50-move rule,Draw\n\abandoned,Abandoned,Loss\n\kingofthehill,Opponent king reached the hill,Loss\n\threecheck,Checked for the 3rd time,Loss\n\timevsinsufficient,Draw by timeout vs insufficient material,Draw\n\bughousepartnerlose,Bughouse partner lost,Loss	yes	
json		eco		eco in json refers to the eco url but i want to use pgn ECOUrl in stead	no	"eco": "https://www.chess.com/openings/Modern-Defense-Standard-Two-Knights-Suttles-Variation-5.Be3-Nf6-6.Qd2"
pgn		Event	parsed		no	[Event "Live Chess"]
pgn		Site	parsed		no	[Site "Chess.com"]
pgn		Date	parsed		no	[Date "2009.10.30"]
pgn		Round	parsed		no	[Round "-"]
pgn		White	parsed		no	[White "erik"]
pgn		Black	parsed		no	[Black "robottawa"]
pgn		Result	parsed		no	[Result "0-1"]
pgn		CurrentPosition	parsed		no	[CurrentPosition "rn3rk1/pp3ppp/2pbp3/8/N2N1nqP/1P4P1/PB1PQPK1/R4R2 w - -"]
pgn		Timezone	parsed		no	[Timezone "UTC"]
pgn		ECO	parsed	eco in pgn refers to actual eco code and isn't present in json so it should be kept	yes	[ECO "B01"]
pgn		ECOUrl	parsed	likely the same as "eco" from raw json of game but i will be using this for my column first to avoid name of key confusion and secondly because this one is more accurate, have json value be used for header if this one is empty	yes	[ECOUrl "https://www.chess.com/openings/Scandinavian-Defense-Mieses-Kotrc-Variation-3.Nc3"]
pgn		UTCDate	parsed	using timezone and these values , fill in start_time but then do not keep this data or others used for calculation, i only need one alue for start and one for end in local time	no	[UTCDate "2009.10.30"]
pgn		UTCTime	parsed		no	[UTCTime "02:10:01"]
pgn		WhiteElo	parsed		no	[WhiteElo "1650"]
pgn		BlackElo	parsed		no	[BlackElo "1736"]
pgn		TimeControl	parsed		no	[TimeControl "60"]
pgn		Termination	parsed		no	[Termination "robottawa won by resignation"]
pgn		StartTime	parsed		no	[StartTime "02:10:01"]
pgn		EndDate	parsed		no	[EndDate "2009.10.30"]
pgn		EndTime	parsed		no	[EndTime "02:11:20"]
pgn		Link	parsed		no	[Link "https://www.chess.com/game/live/13172"]
pgn		Moves	parsed	(has no header exsits at end of games pgn) shows each move and that players clock value after the move was made, 1. meanign whites first move , then 1... meaning blacks first move after move notation then {[%clk 0:00:59]} shows the clock of that person in H:MM:SS or H:MM:SS.(decimal of second). clock time is always within the {[]}, outside of the bracketing for clock times, only the periods are used after the number of move 3 periods meaning that number move for black and 1 period shows that number move for white. after last moves the result which shows who one by 0-1 or 1-0 or 1/2-1/2 present. that isn't a move though	yes	1. e4 {[%clk 0:01:00]} 1... d5 {[%clk 0:01:00]} 2. exd5 {[%clk 0:00:59]} 2... Qxd5 {[%clk 0:01:00]} 3. Nc3 {[%clk 0:00:59]} 3... Qe6+ {[%clk 0:01:00]} 4. Be2 {[%clk 0:00:57.4]} 4... Qg6 {[%clk 0:01:00]} 5. Bf3 {[%clk 0:00:55.5]} 5... c6 {[%clk 0:00:58.8]} 6. Nge2 {[%clk 0:00:54.8]} 6... Bf5 {[%clk 0:00:58]} 7. O-O {[%clk 0:00:53.9]} 7... Bxc2 {[%clk 0:00:56.9]} 8. Qe1 {[%clk 0:00:53.5]} 8... Bd3 {[%clk 0:00:54.1]} 9. b3 {[%clk 0:00:46.9]} 9... e6 {[%clk 0:00:53]} 10. Bb2 {[%clk 0:00:46.2]} 10... Bd6 {[%clk 0:00:51.5]} 11. g3 {[%clk 0:00:38.8]} 11... Nf6 {[%clk 0:00:49.9]} 12. Kg2 {[%clk 0:00:37.9]} 12... Bf5 {[%clk 0:00:48.9]} 13. h4 {[%clk 0:00:35.7]} 13... Bg4 {[%clk 0:00:46.6]} 14. Nd4 {[%clk 0:00:31.4]} 14... O-O {[%clk 0:00:41.9]} 15. Bxg4 {[%clk 0:00:30.1]} 15... Qxg4 {[%clk 0:00:39.8]} 16. Na4 {[%clk 0:00:19.9]} 16... Nh5 {[%clk 0:00:37.3]} 17. Qe2 {[%clk 0:00:14.9]} 17... Nf4+ {[%clk 0:00:35.4]} 0-1
derived	player	username	identity	all values with player object or opponent are just the corresponding keys after figuring out what color the "player" is which is me	yes	
derived	player	color	identity	white or black	yes	
derived	player	rating	identity		yes	
derived	player	rating_last	player.rating, end_time, format	of other games that are also rows in the database, value is the player.rating of the game with max end_time such that its end_time is less then this games end_time and its format is same as this games format. for this method of calculating rating change and last rating, it isn;t perfect, i will later on add an exact way that it is tracked that will overrite this	yes	
derived	player	rating_change	player.rating_last , player.rating	rating change so its the delta meaning player.rating - player.rating_last	yes	
derived	player	result	identity		yes	
derived	player	outcome	player.result	outcome from this person's result, "win","loss","draw" , (based on result code constants) - derives identity	yes	
derived	player	score	outcome	score value of the game for this person as a value (1,0.5,0). 1 comes from win 0.5 comes from draw, 0 comes from loss- derives identity	yes	
derived	player	@id	identity		no	
derived	player	uuid	identity		no	
derived	opponent	username	identity		yes	
derived	opponent	color	identity	white or black	yes	
derived	opponent	rating	identity		yes	
derived	opponent	rating_last	opponent.rating, opponent.rating_change	opponent.rating - opponent.rating_change	yes	
derived	opponent	rating_change	player.rating_change	corresponding rating change of player as they should sum to 0. if player.rating_change is 8 then opponent.rating_change is -8	yes	
derived	opponent	result	identity		yes	
derived	opponent	outcome	oppponent.result	outcome from this person's result, "win","loss","draw" , (based on result code constants) - derives identity	yes	
derived	opponent	score	opponent.outcome	score value of the game for this person as a value (1,0.5,0). 1 comes from win 0.5 comes from draw, 0 comes from loss- derives identity	yes	
derived	opponent	@id	identity		no	
derived	opponent	uuid	identity		no	

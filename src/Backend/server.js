import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { getDraftOrder, makeId, getTeams, setMatchups, calculateWeeklyPoints, ROSTER_TEMPLATE } from '../Web/utils/leagueUtils.js';
import db from './db.js';
import { register_user, login_user, sessionAuth, adminAuth, leagueAuth, internalAuth, sanitize } from '../Web/utils/sessionUtils.js';
import session from 'express-session';
import { RiQqFill } from 'react-icons/ri';
import players from '../Web/utils/draftUtils.js';
import bcrypt from 'bcrypt';
import { getLiveGames, processLiveRosters, getLiveStats, standingsOrder } from './serverUtils.js';
import cron from 'node-cron';


const app = express();
//const db = new Database('fantasy.db');
const server = http.createServer(app);
const wss = new WebSocketServer({server});

const MAX_SLOTS = 14;
const MAX_TEAMS = 10;
const DRAFT_TIME = 0 * 1000;

const AUTO_DRAFT_LIMITS = {
    "QB" : 3,
    "RB" : 5,
    "WR" : 5,
    "TE" : 2,
    "PK" : 2
}

var leagueDraftOrders = new Map();
var leagueMatchups = new Map();
leagueMatchups.set("leagues", new Map());
var draftTimers = new Map();

// live weekly variables
var weekNum = 0;
var liveStats = {
    "week": {
        "1": {}
    }
};
var livePlayers = new Set();
var liveGames = new Set();


// for TESTING!!!!!
const leagueId = '3z0GR3';
//db.prepare('INSERT INTO leagues (league_id) VALUES (?)').run("""123ABC");
//const SALT_ROUNDS = 10;
//const password = 'Test!1234';
//const hash = await bcrypt.hash(password, SALT_ROUNDS);
//db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('test', hash);
/*for(let i = 2; i < 10; i++){
    //db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('test'+i, hash);
    db.prepare('INSERT INTO teams (league_id, owner) VALUES (?,?)').run(leagueId, 'test'+i);
        
       
}
/*var teams = db.prepare('SELECT * FROM teams WHERE league_id=?').all(leagueId);
if(teams.length >= MAX_TEAMS){
    setMatchups(leagueId, teams, leagueMatchups.get("leagues"), db);
}*/
//db.prepare('DELETE FROM teams WHERE id=?').run(10);
db.prepare('DELETE FROM roster_slots WHERE league_id=?').run(leagueId);
db.prepare('UPDATE players SET drafted=? WHERE league_id=?').run(0, leagueId);
db.prepare('UPDATE leagues SET draft_status=? WHERE league_id=?').run('NOT_STARTED', leagueId);

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true               
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET, // Used to sign the session ID cookie
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000, // 15 minutes 
        secure: false,          // Set to true for https!!!!!!!
        httpOnly: true,       
        sameSite: 'lax' // set to lax later
    }
}));

/*
    TODO: validate inputs
    on all: check input for unique identifier
    check if team id matches owner
*/

// reset weekly states/variables every tuesday at 3:00am
cron.schedule('0 0 3 * * 2', async () => {
    try{
        weekNum++;
        livePlayers.clear();
        liveGames.clear();
        processLiveGames(weekNum, processLiveStats);
    }
    catch(err){
        console.log(err);
    }
});





async function processLiveStats(weekNum, liveGames) {
    liveStats = await getLiveStats(weekNum, liveGames);
}

async function processLiveGames(weekNum, processLiveStats) {
    try{
        const games = await getLiveGames(weekNum); 
        for (const game of games) {
            let gameTime = new Date(game['date']).getTime();
            let curTime = Date.now();
            let timeDiff = gameTime - curTime;

            if (timeDiff <= 0 ){
                liveGames.add(game['id']);
                processLiveRosters(game['competitions'][0]['competitors'][0]['id'], livePlayers);
                processLiveRosters(game['competitions'][0]['competitors'][1]['id'], livePlayers);
            }
            else{
                setTimeout(processLiveRosters, timeDiff, game['competitions'][0]['competitors'][0]['id'], livePlayers);
                setTimeout(processLiveRosters, timeDiff, game['competitions'][0]['competitors'][1]['id'], livePlayers);
                setTimeout(() => {
                    liveGames.add(game['id']);
                }, timeDiff);
            }
        };
        processLiveStats(weekNum, liveGames);

        // run every minute
        setInterval(async () => {
            processLiveStats(weekNum, liveGames);
        }, 60000);
    }
    catch(err){
        console.log(err);
    }
}

// api endpoint to process the end of the season
app.post('/api/admin/process-season-end', adminAuth, (req, res) => {
    const {weekNum} = req.body;
    try{
        if(!weekNum || weekNum != 18){
            return res.status(400).json({message : "non playoff week given"});
        }

        const leagues = db.prepare('SELECT league_id FROM leagues WHERE completed=?').all(0);

        const getMatchups = db.prepare('SELECT * from matchups WHERE week=? AND league_id=?');
        const setFinalRank = db.prepare('UPDATE teams SET final_rank=? WHERE id=?');

        const setComplete = db.prepare('UPDATE leagues SET completed=? WHERE league_id=?');

        leagues.forEach((leagueId) => {
            let matchups = getMatchups.all(weekNum-1, leagueId["league_id"]);

            matchups.forEach((matchup) => {
                let winner = matchup["home_team_id"];
                let loser = matchup["away_team_id"];
                let playoffRound = matchup["playoff_round"];

                if(matchup["away_points"] > matchup["home_points"]){
                    winner = matchup["away_team_id"];
                    loser = matchup["home_team_id"];
                }

                if(playoffRound == "championship"){
                    setFinalRank.run(1, winner);
                    setFinalRank.run(2, loser);
                }
                else if(playoffRound == "third_place"){
                    setFinalRank.run(3, winner);
                    setFinalRank.run(4, loser);
                }
                else{ // consolation game
                    // TODO: change placeholder and order rank of consolation games
                    setFinalRank.run(5, winner);
                    setFinalRank.run(6, loser);
                }
            });

            setComplete.run(1, leagueId["league_id"]); // set the league as completed
        });

        return res.status(200).json({message: "successfully processed end of season rankings"});
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "failure to process end of season rankings"});
    }
});

// TODO: iterate through leagues on backend 
// api endpoint to set playoff matchups
app.post('/api/admin/set-playoffs', adminAuth, (req, res) => {
    const {leagueId, weekNum} = req.body;
    
    try{
        if(!weekNum || !leagueId || weekNum < 14 || weekNum > 17){
            return res.status(400).json({message : "non playoff week given"});
        }

        const getTeam = db.prepare('SELECT * FROM teams WHERE id=?');
        const standings = db.prepare('SELECT * FROM teams WHERE league_id=?').all(leagueId);
        const addMatchup =  db.prepare('INSERT INTO matchups (league_id, home_team_id, away_team_id, week, playoff_round) VALUES (?,?,?,?,?)');

        if(weekNum == 14 || weekNum == 15){ // first round
            standings.sort(standingsOrder);
            const playoffTeams = standings.slice(0,4);
            const consolationTeams = standings.slice(4,);

            // add playoff matchups
            addMatchup.run(leagueId, playoffTeams[0]["id"], playoffTeams[3]["id"], weekNum, 'semifinals');  
            addMatchup.run(leagueId, playoffTeams[1]["id"], playoffTeams[2]["id"], weekNum, 'semifinals');    
            
            // add consolation matchups
            while(consolationTeams.length > 0){
                addMatchup.run(leagueId, consolationTeams.shift()["id"], consolationTeams.pop()["id"], weekNum, "consolation");
            }
        }
        else if (weekNum == 16 || weekNum == 17){ // second round
            const matchups = db.prepare('SELECT * FROM matchups WHERE week=? AND league_id=?').all(15, leagueId);
            let winners = new Array();
            let losers = new Array();

            matchups.forEach((matchup) => {
                let winner = matchup["home_team_id"];
                let loser = matchup["away_team_id"];
                if(matchup["away_points"] > matchup["home_points"]){
                    winner = matchup["away_team_id"];
                    loser = matchup["home_team_id"];
                }
                winners.push(getTeam.get(winner));
                losers.push(getTeam.get(loser));
               
            });

            // sort in standings order to get original seeding
            winners.sort(standingsOrder);
            losers.sort(standingsOrder);

            addMatchup.run(leagueId, winners.shift()["id"], winners.shift()["id"], weekNum, "championship");
            addMatchup.run(leagueId, losers.shift()["id"], losers.shift()["id"], weekNum, "third_place");

            while(winners.length > 1){
                addMatchup.run(leagueId, winners.shift()["id"], winners.pop()["id"], weekNum, "consolation");
            }

            while(losers.length > 1){
                addMatchup.run(leagueId, losers.shift()["id"], losers.pop()["id"], weekNum, "consolation");
            }

            // add leftover matchup
            if(winners.length == 1 && losers.length == 1){
                addMatchup.run(leagueId, winners.pop()["id"], losers.pop()["id"], weekNum, "consolation");
            }


        }
        
        return res.status(200).json({message : "successfully set playoff matchups!"});
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "failed to set playoff matchtups"});
    }
});

// api endpoint to update weekly standings
app.post('/api/admin/process-week', adminAuth, (req, res) => {
    const { weekNum } = req.body;
    try{
        if(!weekNum){
            return res.status(400).json({message : "no week to process"});
        }

        const matchups = db.prepare('SELECT * from matchups WHERE week=?').all(weekNum);

        const getRoster = db.prepare('SELECT player_name, player_slot from roster_slots WHERE team_id=?');

        const updateMatchupPoints = db.prepare('UPDATE matchups SET home_points=?, away_points=? WHERE id=?');

        const getWins = db.prepare('SELECT wins FROM teams WHERE id=?');
        const updateWins = db.prepare('UPDATE teams SET wins=? WHERE id=?');

        const getLosses =  db.prepare('SELECT losses FROM teams WHERE id=?');
        const updateLosses = db.prepare('UPDATE teams SET losses=? WHERE id=?');

        const getPoints = db.prepare('SELECT points_for, points_against FROM teams WHERE id=?');
        const setPoints = db.prepare('UPDATE teams SET points_for=?, points_against=? WHERE id=?');

        const getHomePoints = db.prepare('SELECT home_points FROM matchups WHERE week=? AND home_team_id=?');
        const getAwayPoints = db.prepare('SELECT away_points FROM matchups WHERE week=? AND away_team_id=?');


        matchups.forEach((matchup) => {

            let homeTeam = matchup["home_team_id"];
            let awayTeam = matchup["away_team_id"];
            let roster1 = getRoster.all(homeTeam);
            let roster2 = getRoster.all(awayTeam);

            let totalPoints1 = 0;
            let totalPoints2 = 0;

        
            roster1.forEach((player) => {
                if(!player["player_slot"].includes("BN")){
                    totalPoints1 += calculateWeeklyPoints(weekNum, player["player_name"]);
                }
            });
            roster2.forEach((player) => {
                if(!player["player_slot"].includes("BN")){
                    totalPoints2 += calculateWeeklyPoints(weekNum, player["player_name"]);
                }
            });

            // add points to last week if in second round of playoffs
      
            weekNum == 15 || weekNum == 17 ? totalPoints1 += getHomePoints.get(weekNum-1, homeTeam)["home_points"] : undefined;
            weekNum == 15 || weekNum == 17 ? totalPoints2 += getAwayPoints.get(weekNum-1, awayTeam)["away_points"] : undefined;

            // store matchup points, total for second week of playoff matchup
            updateMatchupPoints.run(totalPoints1, totalPoints2, matchup["id"]);

            // update the standings if in regular season
            if(!matchup["playoff_round"]){    

                let winner = totalPoints1 > totalPoints2 ? homeTeam : awayTeam;
        
                if(winner === homeTeam){
                    let wins = getWins.get(homeTeam);
                    updateWins.run(wins["wins"]+1, homeTeam);

                    let losses = getLosses.get(awayTeam);
                    updateLosses.run(losses["losses"]+1, awayTeam);
                }
                else{
                    let wins = getWins.get(awayTeam);
                    updateWins.run(wins["wins"]+1, awayTeam);

                    let losses = getLosses.get(homeTeam);
                    updateLosses.run(losses["losses"]+1, homeTeam);
                }

                 // update points for and points against
                let points1 = getPoints.get(homeTeam);
                let points2 =  getPoints.get(awayTeam);

                setPoints.run(points1["points_for"]+totalPoints1, points1["points_against"]+totalPoints2, homeTeam);
                setPoints.run(points2["points_for"]+totalPoints2, points2["points_against"]+totalPoints1, awayTeam); 
            }            
        });

        /*
            set the poop medal holder
        */
        const getStandings = db.prepare('SELECT * FROM teams WHERE league_id=?');
        const setPoopMedal = db.prepare('UPDATE teams SET has_poop=? WHERE id=?');
        const updateName = db.prepare('UPDATE teams SET name=? WHERE id=?');
        const findPoopMedal = db.prepare('SELECT id FROM teams WHERE has_poop=? AND league_id=?');

        const leagues = db.prepare('SELECT league_id FROM leagues').all();
        leagues.forEach((league) => {
            let standings = getStandings.all(league['league_id']).sort(standingsOrder);
            let lastPlace = standings.at(-1);
            let currentPoopHolder = findPoopMedal.get(1, league['league_id']);
            if(lastPlace['id'] != currentPoopHolder['id']){
                setPoopMedal.run(0, currentPoopHolder['id']);
                setPoopMedal.run(1, lastPlace['id']);
                updateName.run('ThePoopGodPicks', lastPlace['id']);
            }
        });

        return res.status(200).json({message: "successfully processed week!"})
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "error processing week"+err})
    }
});

// api endpoint to process trades
app.post('/api/admin/process-trades', (req, res) => {
    try{
        const trades = db.prepare('SELECT * FROM trades').all();
        const deleteTrade = db.prepare('DELETE FROM trades WHERE id=?');
        const getItems = db.prepare('SELECT * FROM trade_items WHERE trade_id=?');
        const addToRoster = db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name, player_pos, player_slot)'
                + 'VALUES (?, ?, ?, ?, ?, ?)');
        const deleteFromRoster = db.prepare('DELETE FROM roster_slots WHERE team_id=? AND player_id=?');
        const getPlayer = db.prepare('SELECT player_name, player_pos FROM roster_slots WHERE team_id=? AND player_id=?'); 
        const updateRoster = db.prepare('UPDATE roster_slots SET player_slot=? WHERE team_id=? AND player_id=?');
        trades.forEach((trade) => {
            let notRostered = false;
            if(trade["status"] == "accepted"){
                let items = getItems.all(trade["id"]);

                // check if players in trade are still on the respective rosters
                items.forEach((item) => {
                    let player = getPlayer.get(item["sender_id"], item["player_id"]);
                    if(!player){
                        deleteTrade.run(trade["id"]);
                        notRostered = true;
                        return;
                    }
                })
                if(notRostered){
                    return;
                }

                // remove and add players to respective rosters
                items.forEach((item) => {
                    let player = getPlayer.get(item["sender_id"], item["player_id"]);
                    deleteFromRoster.run(item["sender_id"], item["player_id"]);
                    addToRoster.run(item["receiver_id"], trade["league_id"], item["player_id"], player["player_name"], player["player_pos"], "pending");
                });

                // update slots after players have been moved successfully
                let slotAllocation = {};
                slotAllocation[trade["proposer_id"]] = {"open_slots" : getEmptySlots(trade["proposer_id"]), "overflow_slot" : 7};
                slotAllocation[trade["receiver_id"]] = {"open_slots" : getEmptySlots(trade["receiver_id"]), "overflow_slot" : 7};
                items.forEach((item) => {
                    var slot;
                    let player = getPlayer.get(item["receiver_id"], item["player_id"]);
                    let openIndex = slotAllocation[item["receiver_id"]]["open_slots"].findIndex((slot) => 
                        slot["eligiblePositions"].includes(player["player_pos"]));
                    if(openIndex > -1){
                        slot = slotAllocation[item["receiver_id"]]["open_slots"].splice(openIndex, 1)[0]["id"];
                    }
                    else{
                        slot = "BN"+slotAllocation[item["receiver_id"]]["overflow_slot"]++;
                    }
                    updateRoster.run(slot, item["receiver_id"], item["player_id"]);
                });
                deleteTrade.run(trade["id"]);
            }
        });
        return res.status(200).json({message: "Successfully Processed trades!"});  

    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Failure to process trades"});
    }

});

// api endpoint to process waivers
app.post('/api/admin/process-waivers', adminAuth, async (req, res) => {
    try{
        const leagues = db.prepare('SELECT league_id FROM leagues').all();
        const getWaivers = db.prepare('SELECT * FROM waivers WHERE league_id=?');
        const getStandings = db.prepare('SELECT * FROM teams WHERE league_id=?');
        const deleteWaiver = db.prepare('DELETE FROM waivers WHERE id=?');
        const addToRoster = db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name, player_pos, player_slot)'
                + 'VALUES (?, ?, ?, ?, ?, ?)');
        const deleteFromRoster = db.prepare('DELETE FROM roster_slots WHERE team_id=? AND player_id=?');
        const updatePlayerAvailablity = db.prepare('UPDATE players SET drafted=? WHERE league_id=? AND player_id=?');
        const getPlayer = db.prepare('SELECT * FROM players WHERE league_id=? AND player_id=?'); 
        const getTeam = db.prepare('SELECT * FROM roster_slots WHERE team_id=?');
            
        leagues.forEach((league) => {
            let waivers = getWaivers.all(league['league_id']);
            let waiverOrder = getStandings.all(league['league_id']).sort(standingsOrder).reverse();

            while (waivers.length > 0){
                // check first team in waiver priority for active waiver claim
                for (const waiver of waivers){
                    if(waiverOrder[0]['id'] == waiver['team_id']){
                        // check if player is available
                        let player = getPlayer.get(waiver['league_id'], waiver['player_id']);
                        if (player['drafted'] == 1){
                            deleteWaiver.run(waiver['id']);
                            waiverOrder.push(waiverOrder.shift());
                            waivers = waivers.filter((w) => w['id'] != waiver['id'] );
                            break;
                        }
                        // drop player if needed
                        if(waiver['dropped_player_id']){
                            deleteFromRoster.run(waiver['team_id'], waiver['dropped_player_id']);
                            updatePlayerAvailablity.run(0, waiver['league_id'], waiver['dropped_player_id']);
                        }

                        // check if roster has empty slot
                        const rosteredPlayers = getTeam.all(waiver['team_id']);
                        if(rosteredPlayers.length >= MAX_SLOTS){
                            deleteWaiver.run(waiver['id']);
                            waiverOrder.push(waiverOrder.shift());
                            waivers = waivers.filter((w) => w['id'] != waiver['id'] );
                            break;
                        }
                        // check for available slot
                        let openSlots = getEmptySlots(waiver['team_id']);
                        var slot;
                        let openIndex = openSlots.findIndex((slot) => slot['eligiblePositions'].includes(player['player_pos']));
                        if(openIndex > -1){
                            slot = openSlots.splice(openIndex, 1)[0]["id"];
                        }
                        else{
                            deleteWaiver.run(waiver['id']);
                            waiverOrder.push(waiverOrder.shift());
                            waivers = waivers.filter((w) => w['id'] != waiver['id'] );
                            break;
                        }
                        // add player and update status
                        addToRoster.run(waiver['team_id'], waiver['league_id'], player['player_id'], player['player_name'], player['player_pos'], slot);
                        updatePlayerAvailablity.run(1, waiver['league_id'], player['player_id']);

                        deleteWaiver.run(waiver['id']);
                        waiverOrder.push(waiverOrder.shift());
                        waivers = waivers.filter((w) => w['id'] != waiver['id'] );
                    }
                }
                waiverOrder.push(waiverOrder.shift());
            }
        });
        
        return res.status(200).json({message: "Successfully Processed waivers!"});  

    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Failure to process trades"});
    }
});

// api endpoint to check admin session
app.get('/api/admin/session', (req, res) => {
    if(req.session.logged&&req.session.admin){
        return res.status(200).json({logged: true, username: req.session.username, admin: req.session.admin});
    }
    return res.status(200).json({logged: false, admin: false});
});

// api endpoint to check session
app.get('/api/session', (req, res) => {
    if(req.session.logged){
        if(req.session.activeTeam){
            const isLegal = checkRosterLegality(req.session.activeTeam);
            req.session.legalRoster = isLegal;
            return res.status(200).json({logged: true, username: req.session.username, legalRoster: isLegal});
        }
        return res.status(200).json({logged: true, username: req.session.username});
    }
    return res.status(200).json({logged: false});
});

// api endpoint to check league
app.get('/api/league', (req, res) => {
    try{
        if(req.session.activeLeague){
            const hasPoop = db.prepare('SELECT has_poop FROM teams WHERE id=?').get(req.session.activeTeam);
            return res.status(200).json({activeLeague: req.session.activeLeague, leagueOwner : req.session.leagueOwner, 
                activeTeam: req.session.activeTeam, weekNum: weekNum, hasPoop: hasPoop["has_poop"]});
        }
        return res.status(200).json({activeLeague: null, leagueOwner: null});
    }
    catch(err){
        console.log(err);
    }  
});

// api endpoint to logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err){
            return res.status(500).json({message: "Could not logout"});
        }
    });
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: "Logged out successfully" });
});

// api endpoint to create a league
app.post('/api/leagues/create', sessionAuth, (req, res) => {
    var {leagueName, owner} = req.body;
    leagueName = sanitize(leagueName);
    const leagueId = makeId(6);  

    if(!leagueName || leagueName.length == 0 || leagueName.length > 100){
        return res.status(400).json({message: "League Name not valid"});
    }

    try{
        db.prepare('INSERT INTO leagues (league_id, league_name, league_owner) VALUES (?,?,?)').run(leagueId, leagueName, owner);
        try{
            db.prepare('INSERT INTO teams (league_id, owner) VALUES (?,?)').run(leagueId, owner);
            
            const insertPlayer = db.prepare('INSERT INTO players (league_id, player_id, player_name, player_pos, drafted, projected_points, adp)'
                +  'VALUES (?,?,?,?,?,?,?)');
            const insertAllPlayers = db.transaction((players) => {
                players.forEach((player) => {
                    insertPlayer.run(leagueId, player["id"], player["name"], player["position"], 0, player["points"], player["ADP"]);
                });
            });
            insertAllPlayers(players["all"]);
           
        }
        catch(err){
            console.log(err);
            db.prepare('DELETE FROM leagues WHERE league_id=?').run(leagueId);
            return res.status(400).json({message: "Error adding user to league"});
        }
        return res.status(200).json({message: "Successfully created league!", league_id: leagueId});
    }
    catch(err){
        return res.status(400).json({message: "Could not create league"});
    }

});

// api endpoint to join a league
app.post('/api/leagues/join', sessionAuth, (req,res) => {
    const {leagueId, owner} = req.body;
    /*if(isNaN(leagueId)){
        return res.status(400).json({ message: "League not found" });
    }*/
    try{
        const league = db.prepare('SELECT * FROM leagues WHERE league_id=?').get(leagueId);
        if(!league){
            return res.status(404).json({message: "League not found"});
        }

        var teams = db.prepare('SELECT * FROM teams WHERE league_id=?').all(leagueId);
        if(teams.length >= MAX_TEAMS){
            return res.status(400).json({message: "League is full!"});
        }

        const team = db.prepare('INSERT INTO teams (league_id, owner) VALUES (?,?)').run(leagueId, owner);
        
        var teams = db.prepare('SELECT * FROM teams WHERE league_id=?').all(leagueId);
        if(teams.length >= MAX_TEAMS){
            db.prepare('UPDATE teams SET has_poop=?, name=? WHERE id=?').run(1, "ThePoopGodPicks", team.lastInsertRowid);
            setMatchups(leagueId, teams, leagueMatchups.get("leagues"), db);
            //leagueMatchups.get("leagues").get(leagueId).get("week").forEach((week) => {
              //   leagueMatchups.get("leagues").get(leagueId).get("week").get()
            //})
            //db.prepare('INSERT INTO matchups (l')
        }

        return res.status(200).json({message: "Successfully added to league!"});
    }
    catch(err){
        if(err.code === 'SQLITE_CONSTRAINT_UNIQUE'){
            return res.status(400).json({message: "User already in league!"});

        }
        console.log(err);
        return res.status(400).json({message: "Could not add to league"});
    }
});

// api endpoint to enter a league
app.post('/api/leagues/enter', sessionAuth, (req,res) => {
    const {leagueId, owner} = req.body;
    if (!leagueId || !owner || owner != req.session.username){
        return res.status(400).json({message: "League invalid"});
    }
    try{
        const teamId = db.prepare('SELECT id FROM teams WHERE league_id=? AND owner=?').get(leagueId, owner);
        if(teamId){
            const leagueOwner = db.prepare('SELECT league_owner FROM leagues WHERE league_id=?').get(leagueId);
            const hasPoop = db.prepare('SELECT has_poop FROM teams WHERE id=?').get(teamId["id"]);
            req.session.activeLeague = leagueId;
            req.session.leagueOwner = leagueOwner["league_owner"];
            req.session.activeTeam = teamId["id"];
            return res.status(200).json({message: "successfully entered league", activeLeague: leagueId, 
                leagueOwner: leagueOwner["league_owner"], activeTeam: teamId["id"], weekNum: weekNum, hasPoop: hasPoop["has_poop"]});
        }
        else{
            return res.status(400).json({message: "User not in valid league"});
        }
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "User not in valid league"});
    }
});

// api endpoint to start the draft
app.post('/api/leagues/start-draft', sessionAuth, leagueAuth, (req, res) => {
    const {teamId, leagueId} = req.body;
    if(!teamId || !leagueId || teamId != req.session.activeTeam || req.session.username != req.session.leagueOwner || leagueId != req.session.activeLeague){
        return res.status(400).json({message: "Not league owner, cannot start draft"});
    }
    try{
        db.prepare('UPDATE leagues SET draft_status=? WHERE league_id=? AND league_owner=?').run('IN_PROGRESS', leagueId, req.session.username);
        broadcastUpdate('UPDATE_DRAFT_STATUS', 'IN_PROGRESS', leagueId);
        wss.clients.forEach(client =>
        {
            if(client.readyState == 1 && client.leagueId == leagueId){
                sendDraftOrder(client, leagueId);
            }
        });
        return res.status(200).json({message : "Draft has begun!"});
    }   
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Error while trying to start draft"});
    }
});

// api endpoint to propose a trade
app.post('/api/trades/propose-trade', sessionAuth, leagueAuth, (req, res) => {
    const {receiverId, senderId, leagueId, sendPlayers, recvPlayers} = req.body;
    if (!receiverId || !senderId || !leagueId || !sendPlayers || !recvPlayers || senderId != req.session.activeTeam){
        return res.status(400).json({message: "Missing trade fields"});
    }
    try{
        const trade = db.prepare('INSERT INTO trades (league_id, proposer_id, receiver_id) VALUES(?,?,?)').run(leagueId, senderId, receiverId);
        try{
            const insertItem = db.prepare('INSERT INTO trade_items (trade_id, league_id, sender_id, receiver_id, player_id) VALUES (?,?,?,?,?)');
            const checkPlayer = db.prepare('SELECT * FROM roster_slots WHERE team_id=? AND player_id=?');

            // players sent for team proposing the trade
            sendPlayers.forEach((player) => { 
                let check = checkPlayer.get(senderId, player.id);
                if(check.length == 0){ // throws error
                    return res.status(400).json({message: "Trade pieces not rostered on team"});
                }
                insertItem.run(trade["lastInsertRowid"], leagueId, senderId, receiverId, player.id);
            });

            // players received for team proposing the trade
            recvPlayers.forEach((player) => {
                let check = checkPlayer.get(receiverId, player.id);
                if(check.length == 0){ // throws error
                    return res.status(400).json({message: "Trade pieces not rostered on team"});
                }
                insertItem.run(trade["lastInsertRowid"], leagueId, receiverId, senderId, player.id);
            });

            return res.status(200).json({message: "Successfully proposed Trade!"});
        }
        catch(err){
            console.log(err);
            db.prepare('DELETE FROM trades WHERE id=?').run(trade["lastInsertRowid"]);
            return res.status(400).json({message: "Could not add trade pieces; players involved may not be rostered"});
        }

    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Could not propose trade"});
    }

});

// api endpoint to decline a trade
app.post('/api/trades/decline-trade', sessionAuth, leagueAuth, (req, res) => {
    const {trade} = req.body;
    if (!trade || (trade["proposer_id"] != req.session.activeTeam && trade["receiver_id"] != req.session.activeTeam)){
        return res.status(400).json({message: "Team not part of trade"});
    }
    try{
        const deleteTrade = db.transaction((trade) => {
            const tradeStatus = db.prepare('SELECT status FROM trades WHERE id=?').get(trade["id"]);
            if(tradeStatus["status"] == 'accepted'){
                throw new Error('Trade has already been accepted! Cannot delete/decline');
            }
            db.prepare('DELETE FROM trades WHERE id=?').run(trade["id"]);
        });

        deleteTrade(trade);
       
        return res.status(200).json({message: "Successfully declined trade!"});  
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: err || "Failure to delete selected trade"});
    }

});

// api endpoint to accept a trade
app.post('/api/trades/accept-trade', sessionAuth, leagueAuth, (req, res) => {
    const {trade} = req.body;
    if (!trade || (trade["proposer_id"] != req.session.activeTeam && trade["receiver_id"] != req.session.activeTeam)){
        return res.status(400).json({message: "Team not part of trade"});
    }
    try{
        db.prepare('UPDATE trades SET status=? WHERE id=?').run("accepted", trade["id"]);
        return res.status(200).json({message: "Successfully accepted trade!"});  
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Failure to accept selected trade"});
    }

});

// api endpoint to change display name
app.post('/api/teams/change-name', sessionAuth, leagueAuth, (req, res) => {
    const {displayName} = req.body;
    sanitize(displayName);

    // don't let user change name if they have the poop medal
    const hasPoop = db.prepare('SELECT has_poop FROM teams WHERE id=?').get(req.session.activeTeam);
    if(hasPoop["has_poop"]){
        return res.status(400).json({message: "You cannot change your name while you have the poop medal!"});
    }
    
    const newName = displayName.substring(0,50); // truncate name if too long
    if (!newName){
        return res.status(400).json({message: "Missing name field"});
    }
    try{
       db.prepare('UPDATE teams SET name=? WHERE id=?').run(newName, req.session.activeTeam);
       return res.status(200).json({message: "Succesfully updated name!"})

    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Team or name invalid"});
    }

});

// api endpoint to update roster slots
app.post('/api/updateLineup', sessionAuth, leagueAuth, (req,res) => {
    const {player1, slot1, player2, slot2, teamId} = req.body;
    if (!slot1|| !slot2 || !teamId || player1 == player2 || teamId != req.session.activeTeam){
        return res.status(400).json({message: "Invalid slots to change"});
    }
    try{
        req.session.legalRoster = checkRosterLegality(teamId);
        
        let livePlayer1 = player1 ? checkLivePlayer(player1.id) : false;
        let livePlayer2 = player2 ? checkLivePlayer(player2.id) : false;

        if(livePlayer1 || livePlayer2){
            return res.status(400).json({message : "Player is locked for the week!"})
        }
        

        if(!player1){ // fill button clicked on empty position
            if(!slot1.eligiblePositions.includes(player2.position) || !slot2.eligiblePositions.includes(player2.position)) {
                return res.status(400).json({message: "Invalid positions to change"});
            }
            db.prepare('UPDATE roster_slots SET player_slot=? WHERE team_id=? AND player_id=?').run(slot1.id, teamId, player2.id);
            return res.status(200).json({message: "Sucessfully updated team!"});
        }

        if(!player2){ // move player to empty position
            if(!slot1.eligiblePositions.includes(player1.position) || !slot2.eligiblePositions.includes(player1.position)) {
                return res.status(400).json({message: "Invalid positions to change"});
            }
            db.prepare('UPDATE roster_slots SET player_slot=? WHERE team_id=? AND player_id=?').run(slot2.id, teamId, player1.id);
            return res.status(200).json({message: "Sucessfully updated team!"});
        }

        // move two players
        if(!req.session.legalRoster){ // do not let user switch players if roster is illegal
            return res.status(400).json({message: "Too many players! Drop a player or add to an empty slot"});
        }

        if(!slot1.eligiblePositions.includes(player1.position) || !slot1.eligiblePositions.includes(player2.position) 
        || !slot2.eligiblePositions.includes(player1.position) || !slot2.eligiblePositions.includes(player2.position)) {
            return res.status(400).json({message: "Invalid positions to change"});
        }

        db.prepare('UPDATE roster_slots SET player_slot=? WHERE team_id=? AND player_id=?').run(slot2.id, teamId, player1.id);
        db.prepare('UPDATE roster_slots SET player_slot=? WHERE team_id=? AND player_id=?').run(slot1.id, teamId, player2.id);
        return res.status(200).json({message: "Sucessfully updated team!"});
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Error switching slots"});
    }
});

// apit endpoint to get league standings
app.get('/api/leagues/:league_id/standings', sessionAuth, leagueAuth, (req, res) => {
    const {league_id} = req.params;
    if(!league_id || league_id != req.session.activeLeague){
        return res.status(400).json({message: "invalid league"});
    }

    try{
        const standings = db.prepare('SELECT owner, name, wins, losses, points_for, points_against FROM teams WHERE league_id=?').all(league_id);
        return res.status(200).json({message: 'successfully got standings data', data: standings})
    }   
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Error getting standings data"});
    }
});

// api endpoint to get draft status
app.get('/api/leagues/draft-status', sessionAuth, leagueAuth, (req, res) => {
    try{
        const draftStatus = db.prepare('SELECT draft_status FROM leagues WHERE league_id=?').get(req.session.activeLeague);
        return res.status(200).json({message : "got draft status", data: draftStatus});
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message : "could not determine the draft status"})
    }
});

// api endpoint to get matchup 
app.get('/api/leagues/:league_id/matchups/:week/:team_id', sessionAuth, leagueAuth, (req, res) => {
    const {league_id, week, team_id} = req.params;
    if(!league_id || !week || !team_id || league_id != req.session.activeLeague){
        return res.status(400).json({message: "invalid league or week"});
    }

    try{
        const matchup = db.prepare('SELECT * FROM matchups WHERE league_id=? AND week=? AND (home_team_id=? OR away_team_id=?)')
        .get(league_id, week, team_id, team_id);
        return res.status(200).json({message: 'successfully got matchup data', data: matchup})
    }   
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Error getting matchup data"});
    }
});

// api endpoint to get all matchups
app.get('/api/leagues/:league_id/matchups/:week', sessionAuth, leagueAuth, (req, res) => {
    const {league_id, week} = req.params;
    if(!league_id || !week || league_id != req.session.activeLeague){
        return res.status(400).json({message: "invalid league or week"});
    }

    try{
        const matchups = db.prepare('SELECT * FROM matchups WHERE league_id=? AND week=?')
        .all(league_id, week);
        return res.status(200).json({message: 'successfully got matchup data', data: matchups})
    }   
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Error getting matchup data"});
    }
});

// api endpoint to get team trades 
app.get('/api/leagues/:league_id/teams/:team_id/trades', sessionAuth, leagueAuth, (req, res) => {
    const {league_id, team_id} = req.params;
    if(!league_id || !team_id || league_id != req.session.activeLeague){
        return res.status(400).json({message: "invalid league or team"});
    }

    try{
        const trades = db.prepare('SELECT * FROM trades WHERE league_id=? AND (proposer_id=? OR receiver_id=?)')
        .all(league_id, team_id, team_id);

        const itemsStmt =  db.prepare('SELECT sender_id, receiver_id, player_id FROM trade_items WHERE trade_id=?');

        const tradeDetails = trades.map((trade) => {
            const items = itemsStmt.all(trade["id"]);
            return(
                {
                    ...trade,
                    items: items
                }
            );
        });

        return res.status(200).json({message: 'successfully got trade data', data: tradeDetails})
    }   
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Error getting trade data"});
    }
});

// /api Endpoint to get a team's roster
app.get('/api/team/:id', sessionAuth, leagueAuth, (req, res) => {
    const players = db.prepare('SELECT * FROM roster_slots WHERE team_id = ?').all(req.params.id);
    res.json(players);
});



// /api Endpoint to get league team is in
app.get('/api/:owner', sessionAuth, (req, res) => {
    try{
        const leagues = db.prepare(`SELECT leagues.league_name, teams.* FROM teams JOIN leagues ON teams.league_id = leagues.league_id 
                                     WHERE teams.owner = ?`).all(req.params.owner);
        return res.status(200).json(leagues);
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "No leagues associated with user"});
    }
});

// /api Endpoint to get all teams from league
app.get('/api/leagues/:league_id/teams', sessionAuth, leagueAuth, (req, res) => {
    const league_id = req.params.league_id;
    /*if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }*/
   try{
        const teams = db.prepare('SELECT * FROM teams WHERE league_id=?').all(league_id);
        return res.status(200).json({message: "successfully found teams", data: teams});
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "error: teams not fuond"});
    }
});

// /api Endpoint to get team from league
app.get('/api/leagues/:league_id/teams/:owner', sessionAuth, leagueAuth, (req, res) => {
    const league_id = req.params.league_id;
    /*if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }*/
    try{
        const team = db.prepare('SELECT * FROM teams WHERE league_id=? AND owner=?').get(league_id, req.params.owner);
        return res.status(200).json({message: "successfully found team", data: team});
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "error: team not found"});
    }
   
});


// /api Endpoint to get rostered data from league
app.get('/api/leagues/:league_id/rostered', sessionAuth, leagueAuth, (req, res) => {
    const league_id = req.params.league_id;
    /*if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }*/
    const players = db.prepare('SELECT player_id FROM roster_slots WHERE league_id=?').all(league_id);
    res.json(players);
});

// api endpoint to get specific team's roster
app.get('/api/leagues/:league_id/teams/:team_id/roster', sessionAuth, leagueAuth, (req, res) => {
    const {league_id, team_id} = req.params;
    if(!league_id || !team_id || league_id != req.session.activeLeague){
        return res.status(400).json({message: "invalid league or team"});
    }
    try{
        const roster = db.prepare('SELECT * FROM roster_slots WHERE league_id=? AND team_id=?').all(league_id, team_id);
        return res.status(200).json({message: "got roster data", data: roster});
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "error fetching roster info for team"});
    }
});

// api endpoint to get specific each team's roster
app.get('/api/leagues/:league_id/rosters', sessionAuth, leagueAuth, (req, res) => {
    const {league_id} = req.params;
    if(!league_id || league_id != req.session.activeLeague){
        return res.status(400).json({message: "invalid league or team"});
    }
    try{
        const teams = db.prepare('SELECT id FROM teams WHERE league_id=?').all(league_id);
        const getRoster = db.prepare('SELECT * FROM roster_slots WHERE team_id=?');
        const rosters = {};

        teams.forEach((teamId) => {
            rosters[teamId["id"]] = getRoster.all(teamId["id"]);
        });

        return res.status(200).json({message: "Got roster data", data: rosters});
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Error fetching roster info for team"});
    }
});

// api endpoint fo fetch live stats
app.get('/api/stats/live-stats', (req, res) => {
    return res.status(200).json({ data: liveStats });
});


// /api Endpoint to draft a player
app.post('/api/draft', sessionAuth, leagueAuth, (req, res) => {

    const { teamId, leagueId, playerId } = req.body;

    if(!teamId || !leagueId || !playerId || teamId != req.session.activeTeam){
        return res.status(400).json({error: "invalid drafting parameters"});
    }

    if(leagueDraftOrders.has(leagueId)){
        const draftOrder = leagueDraftOrders.get(leagueId)[0];
        let draftIndex = leagueDraftOrders.get(leagueId)[1];

        if(teamId != draftOrder[draftIndex]["id"]){ // check if team should be drafting first
            return res.status(400).json({ error: "Invalid team selection" });
        }

        try{
            const rosteredPlayers = db.prepare('SELECT * FROM roster_slots WHERE team_id=?').all(teamId);
            if(rosteredPlayers.length >= MAX_SLOTS){
                return res.status(400).json({message: "roster already full"});
            }

            // get player and check if they are alrady drafted
            const player = db.prepare('SELECT player_name, player_pos, drafted FROM players WHERE league_id=? AND player_id=?')
            .get(leagueId, playerId);

            if(player["drafted"] != 0){
                return res.status(400).json({message: "Player has already been drafted!"});
            }

            // determine the slot to draft into
            let openSlots =  getEmptySlots(teamId);
            var slot;
            let openIndex = openSlots.findIndex((slot) => 
                slot["eligiblePositions"].includes(player["player_pos"]));
            if(openIndex > -1){
                slot = openSlots.splice(openIndex, 1)[0]["id"];
            }
            else{
                slot = "BN7"; // TODO: for TESTING!!!!
            }

            // draft the player
            const draftPlayer = db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name, player_pos, player_slot)'
                + 'VALUES (?, ?, ?, ?, ?, ?)')
                   .run(teamId, leagueId, playerId, player["player_name"], player["player_pos"], slot);
            db.prepare('UPDATE players SET drafted=? WHERE league_id=? AND player_id=?').run(1, leagueId, playerId);

            draftIndex = (draftIndex + 1) % draftOrder.length;
            const nextDrafter = draftOrder[draftIndex]["id"];
            leagueDraftOrders.set(leagueId,[draftOrder, draftIndex]);

            broadcastUpdate('UPDATE_DRAFTER', draftIndex, leagueId);
            broadcastUpdate('UPDATE_BOARD', Number(playerId), leagueId);
            clearTimeout(draftTimers.get(teamId));
            draftTimers.delete(teamId);
            
            if(!checkDraftStatus(draftOrder, teamId, rosteredPlayers, leagueId)){
                startDraftTimer(leagueId, nextDrafter);
            }

            const data = {id: draftPlayer.lastInsertRowid, league_id: leagueId, player_id: playerId, player_name: player["player_name"],
                 player_pos: player["player_pos"], player_slot: slot, team_id: teamId};

            return res.json({ message: "Successfully drafted player!", data: data });
        }
        catch(err){
            console.log(err);
            return res.status(400).json({message: "Error while trying to draft player"});
        }
        
    }
    res.json({sucess: false});
    
});

// /api Endpoint to add a player
app.post('/api/add', sessionAuth, leagueAuth, (req, res) => {

    const { teamId, leagueId, playerId, playerName, playerPos, slot, droppedPlayerId } = req.body;
    if(!teamId || !leagueId || !playerId || !playerName || !playerPos || !slot || teamId != req.session.activeTeam){
        return res.status(400).json({message: "invalid adding parameters"});
    }

    try{
        // submit waiver claim if player is live
        if(checkLivePlayer(playerId)){
            const draftStatus = db.prepare('SELECT draft_status FROM leagues WHERE league_id=?').get(leagueId);
            if(draftStatus["draft_status"] != 'COMPLETE'){
                throw new Error("Complete the draft first!");
            }

            const playerIsRostered = db.prepare('SELECT drafted FROM players WHERE league_id=? AND player_id=?').get(leagueId, playerId);
            if(playerIsRostered["drafted"]){
                throw new Error("Player has been taken! You got sniped!");
            }

            db.prepare('INSERT INTO waivers (league_id, team_id, player_id, dropped_player_id) VALUES (?,?,?,?)')
            .run(leagueId, teamId, playerId, droppedPlayerId);

            return res.status(200).json({message: "Waiver claim sent!", waiver: true});
        }

        const addPlayer = db.transaction((teamId, leagueId, playerId, playerName, playerPos, slot, droppedPlayerId) => {
            const draftStatus = db.prepare('SELECT draft_status FROM leagues WHERE league_id=?').get(leagueId);
            if(draftStatus["draft_status"] != 'COMPLETE'){
                throw new Error("Complete the draft first!");
            }

            // check if player is still available
            const playerIsRostered = db.prepare('SELECT drafted FROM players WHERE league_id=? AND player_id=?').get(leagueId, playerId);
            if(playerIsRostered["drafted"]){
                throw new Error("Player has been taken! You got sniped!");
            }

            // check if player is in live game
            if(checkLivePlayer(playerId) || checkLivePlayer(droppedPlayerId)){
                throw new Error("Player is locked for the week!");
            }
            
            // drop player if needed
            if(droppedPlayerId){
                const deleted = db.prepare('DELETE FROM roster_slots WHERE league_id=? AND team_id=? AND player_id=?')
                .run(leagueId, teamId, droppedPlayerId);
                if(deleted["changes"] === 0){
                    throw new Error("error dropping player, player not found on roster");
                }
                db.prepare('UPDATE players SET drafted=? WHERE league_id=? AND player_id=?').run(0, leagueId, droppedPlayerId);
            }
            // check if roster has empty slot
            const rosteredPlayers = db.prepare('SELECT * FROM roster_slots WHERE team_id=?').all(teamId);
            if(rosteredPlayers.length >= MAX_SLOTS){
                throw new Error("roster already full");
            }
            db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name, player_pos, player_slot)'
                + 'VALUES (?, ?, ?, ?, ?, ?)')
                    .run(teamId, leagueId, playerId, playerName, playerPos, slot);

            // updated available status for newly added player
            const add = db.prepare('UPDATE players SET drafted=? WHERE league_id=? AND player_id=?').run(1, leagueId, playerId);
            return add.lastInsertRowid;
        });

        const addId = addPlayer(teamId, leagueId, playerId, playerName, playerPos, slot, droppedPlayerId);
        
         const addData = {id: addId, league_id: leagueId, player_id: playerId, player_name: playerName,
                 player_pos: playerPos, player_slot: slot, team_id: teamId};
        //broadcastUpdate('UPDATE_DRAFTER', nextDrafter, leagueId);
        //broadcastUpdate('UPDATE_BOARD', null, leagueId);
        return res.status(200).json({ message: "successfully added player!", addData: addData, dropData: droppedPlayerId });
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: err.message || "error while adding player"});
    }    
});

// /api Endpoint to drop a player
app.post('/api/drop', sessionAuth, leagueAuth, (req, res) => {
    const { teamId, leagueId, playerId } = req.body;
    if(!teamId || !leagueId || !playerId || teamId != req.session.activeTeam){
        return res.status(400).json({message: "invalid dropping parameters"});
    }

    try{
        if(checkLivePlayer(playerId)){
            return res.status(400).json({message : 'Player is locked for the week!'});
        }
        const deleted = db.prepare('DELETE FROM roster_slots WHERE league_id=? AND team_id=? AND player_id=?')
        .run(leagueId, teamId, playerId);
        if(deleted["changes"] === 0){
            return res.status(404).json({message: "error, player not found on roster"});
        }

        // change status to available
        db.prepare('UPDATE players SET drafted=? WHERE league_id=? AND player_id=?').run(0, leagueId, playerId);

        return res.status(200).json({message: "successfully dropped player" });
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "error, could not drop player"});
    } 
});

app.post('/api/login', async (req, res) => {
    var { username, password } = req.body;

    username = sanitize(username);

    // validate inputs
    if (!username || !password){
        return res.status(400).json({ message: "Invalid username or password" });
    }

    if(await login_user(username, password)){
        req.session.logged = true;
        req.session.username = username;
        req.session.browser = req.headers['user-agent'];
        //req.session.save((err) => {
          //  if (err) {
            //    console.error("Session save error:", err);
              //  return res.status(500).json({ message: "Server error" });
            //}
        return res.status(200).json({message: "Successfully logged in!", success: true});
       // });
    }
    else{
        return res.status(400).json({ message: "Error logging in; invalid username or password" });
    }
});

app.post('/api/admin/login', async (req, res) => {
    var { username, password } = req.body;

    username = sanitize(username);

    // validate inputs
    if (!username || !password){
        return res.status(400).json({ message: "Invalid username or password" });
    }
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD){
        req.session.logged = true;
        req.session.username = username;
        req.session.browser = req.headers['user-agent'];
        req.session.admin = true;
        return res.status(200).json({message: "Successfully logged in as admin!", success: true});
    }
});

app.post('/api/register', async (req, res) => {
    var { username, password } = req.body;

    username = sanitize(username);

    // validate inputs
    if (!username || !password){
        return res.status(400).json({ message: "Invalid username or password" });
    }
   
    if(password.length < 8){
        return res.status(400).json({ message: "Password not long enough" });
    }
    
    // check password regex requirements
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&])[\w!@#$%^&]{8,}$/;
    if(!regex.test(password)){
        return res.status(400).json({ message: "Invalid Password format" });
    }


    if(await register_user(username, password)){
        req.session.logged = true;
        req.session.username = username;
        req.session.browser = req.headers['user-agent'];
        return res.status(200).json({message: "Successfully created account!", success: true});
    }
    else{
        return res.status(400).json({ message: "Username taken or other error" });
    }

});

// api endpoint for live stats
/*app.post('/api/internal/live-updates', internalAuth, (req, res) => {
    liveStats = req.body;
    return res.status(200);
});*/

function checkRosterLegality(team){
    const roster = db.prepare('SELECT * FROM roster_slots WHERE team_id=?').all(team);
    return roster.length <= ROSTER_TEMPLATE.length;
}

wss.on('connection', (ws, req) => {
    const url = 'http://localhost' + req.url;
    const parameters = new URL(url);
    const leagueId = parameters.searchParams.get('league');
    const teamId = parameters.searchParams.get('team');
    //const teams = parameters.searchParams.get('teams');
    //console.log('web-teams',teams);
    ws.leagueId = leagueId;
    ws.teamId = teamId
    if(parameters['pathname'] == '/draft'){
        sendDraftOrder(ws, leagueId);
        draftTimers.get(leagueId) ? ws.send(JSON.stringify({'type' : 'UPDATE_CLOCK', 'data': draftTimers.get(leagueId)})) : undefined;
    }

    /*ws.on('message', (message) => {
        const messageString = Buffer.isBuffer(message) ? message.toString() : message;
        const data = JSON.parse(messageString);

        if(data['type'] == 'UPDATE_DRAFTER'){
            const league_id = data['data'];
            if(leagueDraftOrders.has(league_id)){
                const draftOrder = leagueDraftOrders.get(league_id)[0];
                let draftIndex = leagueDraftOrders.get(league_id)[1];
                //draftIndex = (draftIndex + 1) % draftOrder.length;
                const curDrafter = draftOrder[draftIndex];
                //leagueDraftOrders.set(league_id,[draftOrder, draftIndex]);
                broadcastUpdate('UPDATE_DRAFTER', curDrafter);
            }
        }
    });*/
  
});

async function sendDraftOrder(ws, league_id){
    const draft_status = db.prepare('SELECT draft_status FROM leagues WHERE league_id=?').get(league_id);
    if(draft_status["draft_status"] != "IN_PROGRESS"){
        return;
    }
    var draftOrder;
    const teams = db.prepare('SELECT * FROM teams WHERE league_id=?').all(league_id);
    
    // create the draft order if it has not been created already 
    if(!leagueDraftOrders.has(league_id) || leagueDraftOrders.get(league_id)[0].length != teams.length*2){
        draftOrder = await getDraftOrder(league_id, teams);
        leagueDraftOrders.set(league_id, [draftOrder, 0]);
        startDraftTimer(league_id, leagueDraftOrders.get(league_id)[0][0]["id"]); // start initial draft timer
    }
    else{
        draftOrder = leagueDraftOrders.get(league_id)[0];
    }
    ws.send(JSON.stringify({type: "DRAFT_ORDER", data: draftOrder}));
    ws.send(JSON.stringify({type : 'UPDATE_DRAFTER', data : leagueDraftOrders.get(league_id)[1]}));
}

function autoDraft(leagueId, teamId){
    try{
        const rosteredPlayers = db.prepare('SELECT * FROM roster_slots WHERE team_id=?').all(teamId);
        if(rosteredPlayers.length >= MAX_SLOTS){
            return;
        }

        let openPositions = {
            "QB" : AUTO_DRAFT_LIMITS["QB"],
            "RB" : AUTO_DRAFT_LIMITS["RB"],
            "WR" : AUTO_DRAFT_LIMITS["WR"],
            "TE" : AUTO_DRAFT_LIMITS["TE"],
            "PK" : AUTO_DRAFT_LIMITS["PK"]
        }

        rosteredPlayers.forEach((player) => {
            openPositions[player["player_pos"]]--;
        });

        let availablePositions = new Array();
        Object.entries(openPositions).forEach(([pos, value]) => {
            if (value > 0){
                availablePositions.push(pos);
            }
        });

        const bestPlayer = db.prepare(`SELECT * FROM players WHERE league_id=? AND drafted=?` 
           + ` AND player_pos IN ( ${availablePositions.map(() => "?").join(",")} ) ORDER BY adp = 0, adp ASC LIMIT 1`)
                            .get(leagueId, 0, ...availablePositions);
        
        // determine the slot to autodraft to
        let slotAllocation = {"open_slots" : getEmptySlots(teamId), "overflow_slot" : 7};
        var slot;
        let openIndex = slotAllocation["open_slots"].findIndex((slot) => 
            slot["eligiblePositions"].includes(bestPlayer["player_pos"]));
        if(openIndex > -1){
            slot = slotAllocation["open_slots"].splice(openIndex, 1)[0]["id"];
        }
        else{
            slot = "BN"+slotAllocation["overflow_slot"]++;
        }   

        const draftPlayer = db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name, player_pos, player_slot)'
            + 'VALUES (?, ?, ?, ?, ?, ?)')
                .run(teamId, leagueId, bestPlayer["player_id"], bestPlayer["player_name"], bestPlayer["player_pos"], slot);
        db.prepare('UPDATE players SET drafted=? WHERE league_id=? AND player_id=?').run(1, leagueId, bestPlayer["player_id"]);

        const draftOrder = leagueDraftOrders.get(leagueId)[0];
        let draftIndex = leagueDraftOrders.get(leagueId)[1];
        
        draftIndex = (draftIndex + 1) % draftOrder.length;
        const nextDrafter = draftOrder[draftIndex]["id"];
        leagueDraftOrders.set(leagueId,[draftOrder, draftIndex]);

        const draftedData = {id: draftPlayer.lastInsertRowid, league_id: leagueId, player_id: bestPlayer["player_id"], player_name: bestPlayer["player_name"],
                 player_pos: bestPlayer["player_pos"], player_slot: slot, team_id: teamId};

        broadcastUpdate('UPDATE_DRAFTER', draftIndex, leagueId);
        broadcastUpdate('UPDATE_BOARD', bestPlayer["player_id"], leagueId);
        draftTimers.delete(teamId);
        wss.clients.forEach((client) => {
            if(client.teamId == teamId && client.readyState == 1){
                client.send(JSON.stringify({'type' : 'AUTODRAFTED', 'data': draftedData}));
            }
        })
        
        if(!checkDraftStatus(draftOrder, teamId, rosteredPlayers, leagueId)){
            startDraftTimer(leagueId, nextDrafter);
        }

    }
    catch(err){
        console.log(err);
        return;
    }
}

async function startDraftTimer(leagueId, teamId){
    draftTimers.set(teamId, setTimeout(autoDraft, DRAFT_TIME, leagueId, teamId));
    let pickDeadline = Date.now() + DRAFT_TIME;
    draftTimers.set(leagueId, pickDeadline);
    broadcastUpdate('UPDATE_CLOCK', pickDeadline, leagueId);
}

function checkDraftStatus(draftOrder, teamId, rosteredPlayers, leagueId){
    if(draftOrder[draftOrder.length-1]["id"] == teamId && rosteredPlayers.length+1 >= MAX_SLOTS){
        db.prepare('UPDATE leagues SET draft_status=? WHERE league_id=?').run('COMPLETE', leagueId);
        broadcastUpdate('UPDATE_DRAFT_STATUS', 'COMPLETE', leagueId);
        return true;
    }
    return false;
}

function getEmptySlots(team){
    let slots = db.prepare('SELECT player_slot FROM roster_slots WHERE team_id=?').all(team);
    slots = new Set(slots.map((row) => row["player_slot"]));
    let openSlots = ROSTER_TEMPLATE.filter((slot) => !slots.has(slot["id"]));
    return openSlots;
}

/*async function fetchLiveData(gameIds) {
    for (const gameId of gameIds){
        try{
            const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`);
            const data = await response.json();

            var drives; 
            data.drives?.previous ? drives = data.drives.previous : drives = [];

            for (const drive of drives){
                for (const play of drive["plays"]) {
                    if (processedPlays.has(play["id"])){
                        continue;
                    }
                    processedPlays.add(play["id"]);
                    calculateLivePoints(play);
                }
            }
        }
        catch(err){
            console.log(err, gameId);
        }
    }
}

// fetch data during active games every 20 seconds
setInterval(() => {
    const liveGameIds = ['401873275']; 
    if (liveGameIds.length > 0) {
        fetchLiveData(liveGameIds);
    }
}, 20000);

function calculateLivePoints(play){
    switch(play["type"]["text"]){

        case "Punt Return Touchdown" :
        case "Kickoff Return Touchdown" :
            // handle kick return
            break;
        
        case "Field Goal Good" :
        case "Extra Point Good" :
            // handle kick good
            break;
        
        case "Field Goal Blocked"  :
        case "Field Goal Missed"   :
        case "Extra Point Missed"  : 
        case "Extra Point Blocked" :
            // handle kick no good 
            break;
  
        case "Pass Reception" :
        case "Passing Touchdown" :
        case "Pass Interception Return" :
            // handle pass play
            handlePassPlay(play);
            break;
        
        case "Rush" :
        case "Rushing Touchdown" :
        case "Fumble Recovery (Opponent)" :
            // handle rushing play
            break;

        case "Two-Point Pass" :
        case "Two-Point Rush" :
            // handle two point conversion
            break;

        // cases to ignore
        case "Timeout"     :
        case "Penalty"     :
        case "End Period"  :
        case "End of Half" :
        case "End of Game" :
        case "Coin Toss"   :
            break;
    }
  
}

function handlePassPlay(play) {
    console.log(play);
    switch (play["type"]["text"]){
        case "Pass Reception":
            
    }
}*/

function checkLivePlayer(player){
    return livePlayers.has(Number(player));
}


function broadcastUpdate(type, data, league_id){
    wss.clients.forEach(client =>
    {
        if(client.readyState == 1 && client.leagueId == league_id){
            client.send(JSON.stringify({'type' : type, 'data': data}));
        }
    });
    
}

server.listen(3001, () => console.log('Backend running on port 3001'));
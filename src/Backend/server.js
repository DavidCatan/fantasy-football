import express from 'express';
import 'dotenv/config'
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { getDraftOrder, makeId, getTeams, setMatchups, calculateWeeklyPoints, ROSTER_TEMPLATE } from '../Web/utils/leagueUtils.js';
import db from './db.js';
import { register_user, login_user, sessionAuth, adminAuth, leagueAuth, sanitize } from '../Web/utils/sessionUtils.js';
import session from 'express-session';
import { RiQqFill } from 'react-icons/ri';
import players from '../Web/utils/draftUtils.js';
import bcrypt from 'bcrypt';


const app = express();
//const db = new Database('fantasy.db');
const server = http.createServer(app);
const wss = new WebSocketServer({server});

const MAX_SLOTS = 13;
const MAX_TEAMS = 10;
const DRAFT_TIME = 10 * 1000; 

var leagueDraftOrders = new Map();
var leagueMatchups = new Map();
leagueMatchups.set("leagues", new Map());
var draftTimers = new Map();

/*
    Leagues : {
        1234 : {
            week : {
                1 : [ [1,2], [3,4] ]
            }
        },

        5678 : {
            week :{
                1 : 
            }
        }
    }
*/

// for TESTING!!!!!
const leagueId = '1ybxKK';
//db.prepare('INSERT INTO leagues (league_id) VALUES (?)').run("""123ABC");
//const SALT_ROUNDS = 10;
//const password = 'Test!1234';
//const hash = await bcrypt.hash(password, SALT_ROUNDS);
//db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('test', hash);
/*for(let i = 2; i < 11; i++){
    //db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('test'+i, hash);
    db.prepare('INSERT INTO teams (league_id, owner) VALUES (?,?)').run(leagueId, 'test'+i);
        
       
}
var teams = db.prepare('SELECT * FROM teams WHERE league_id=?').all(leagueId);
if(teams.length >= MAX_TEAMS){
    setMatchups(leagueId, teams, leagueMatchups.get("leagues"), db);
}*/

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
/*const matchups = db.prepare('SELECT * from matchups WHERE week=?').all(10);
matchups.forEach((matchup) => {
    let team1 = matchup["home_team_id"];
    let team2 = matchup["away_team_id"];

    db.prepare('UPDATE teams SET wins=? WHERE id=?').run(0, team1);

    db.prepare('UPDATE teams SET losses=? WHERE id=?').run(0, team2);
    db.prepare('UPDATE teams SET wins=? WHERE id=?').run(0, team2);

    db.prepare('UPDATE teams SET losses=? WHERE id=?').run(0, team1);
    db.prepare('UPDATE teams SET points_for=?, points_against=? WHERE id=?')
    .run(0, 0, team1);
    
    db.prepare('UPDATE teams SET points_for=?, points_against=? WHERE id=?')
    .run(0,0, team2);
})*/

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
    function standingsOrder(team1, team2) {
        return team1["wins"] < team2["wins"] ? 1 : team1["wins"] > team2["wins"] ? -1 : team1["points_for"] < team2["points_for"] ? 1 : -1;
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
    if(req.session.activeLeague){
        return res.status(200).json({activeLeague: req.session.activeLeague, leagueOwner : req.session.leagueOwner});
    }
    return res.status(200).json({activeLeague: null});
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
            
            const insertPlayer = db.prepare('INSERT INTO players (league_id, player_id, player_name, player_pos, drafted, projected_points)'
                +  'VALUES (?,?,?,?,?,?)');
            const insertAllPlayers = db.transaction((players) => {
                players.forEach((player) => {
                    insertPlayer.run(leagueId, player["id"], player["name"], player["position"], 0, player["points"]);
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

        db.prepare('INSERT INTO teams (league_id, owner) VALUES (?,?)').run(leagueId, owner);
        
        var teams = db.prepare('SELECT * FROM teams WHERE league_id=?').all(leagueId);
        if(teams.length >= MAX_TEAMS){
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
            req.session.activeLeague = leagueId;
            req.session.leagueOwner = leagueOwner["league_owner"];
            req.session.activeTeam = teamId["id"];
            return res.status(200).json({message: "successfully entered league"});
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
        db.prepare('DELETE FROM trades WHERE id=?').run(trade["id"]);
        return res.status(200).json({message: "Successfully declined trade!"});  
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "Failure to delete selected trade"});
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
    if (!displayName){
        return res.status(400).json({message: "Missing name field"});
    }
    try{
       db.prepare('UPDATE teams SET name=? WHERE id=?').run(displayName, req.session.activeTeam);
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


// /api Endpoint to draft a player
app.post('/api/draft', sessionAuth, leagueAuth, (req, res) => {

    const { teamId, leagueId, playerId, playerName, playerPos, slot } = req.body;

    if(!teamId || !leagueId || !playerId || !playerName || !playerPos || !slot || teamId != req.session.activeTeam){
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
        }
        catch(err){
            console.log(err);
            return res.status(400).json({message: "could not draft player"});
        }


        try{
            const info = db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name, player_pos, player_slot)'
                + 'VALUES (?, ?, ?, ?, ?, ?)')
                   .run(teamId, leagueId, playerId, playerName, playerPos, slot);
            db.prepare('UPDATE players SET drafted=? WHERE league_id=? AND player_id=?').run(1, leagueId, playerId);
            draftIndex = (draftIndex + 1) % draftOrder.length;
            const nextDrafter = draftOrder[draftIndex]["id"];
            leagueDraftOrders.set(leagueId,[draftOrder, draftIndex]);
            broadcastUpdate('UPDATE_DRAFTER', draftIndex, leagueId);
            broadcastUpdate('UPDATE_BOARD', null, leagueId);
            clearTimeout(draftTimers.get(teamId));
            draftTimers.delete(teamId);
            startDraftTimer(leagueId, nextDrafter);
            return res.json({ success: true, rowId: info.lastInsertRowid });
        }
        catch(err){
            console.log(err);
            return res.status(400).json({message: "could not draft player"});
        }
        
    }
    res.json({sucess: false});
    
});

// /api Endpoint to add a player
app.post('/api/add', sessionAuth, leagueAuth, (req, res) => {

    const { teamId, leagueId, playerId, playerName, playerPos, slot } = req.body;
    if(!teamId || !leagueId || !playerId || !playerName || !playerPos || !slot || teamId != req.session.activeTeam){
        return res.status(400).json({message: "invalid adding parameters"});
    }

    // check if roster has empty slot
    try{
        const rosteredPlayers = db.prepare('SELECT * FROM roster_slots WHERE team_id=?').all(teamId);
        if(rosteredPlayers.length >= MAX_SLOTS){
            return res.status(400).json({message: "roster already full"});
        }
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "could not add player"});
    }
    try{
        const info = db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name, player_pos, player_slot)'
            + 'VALUES (?, ?, ?, ?, ?, ?)')
                .run(teamId, leagueId, playerId, playerName, playerPos, slot);
   
        //broadcastUpdate('UPDATE_DRAFTER', nextDrafter, leagueId);
        //broadcastUpdate('UPDATE_BOARD', null, leagueId);
        return res.status(200).json({ success: true, rowId: info.lastInsertRowid });
    }
    catch(err){
        console.log(err);
        return res.status(400).json({message: "error while adding player"});
    }    
});

// /api Endpoint to drop a player
app.post('/api/drop', sessionAuth, leagueAuth, (req, res) => {
    const { teamId, leagueId, playerId } = req.body;
    if(!teamId || !leagueId || !playerId || teamId != req.session.activeTeam){
        return res.status(400).json({message: "invalid dropping parameters"});
    }

    try{
        const deleted = db.prepare('DELETE FROM roster_slots WHERE league_id=? AND team_id=? AND player_id=?')
        .run(leagueId, teamId, playerId);
        if(deleted["changes"] === 0){
            return res.status(404).json({message: "error, player not found on roster"});
        }

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

function checkRosterLegality(team){
    const roster = db.prepare('SELECT * FROM roster_slots WHERE team_id=?').all(team);
    return roster.length <= ROSTER_TEMPLATE.length;
}

wss.on('connection', (ws, req) => {
    const url = 'http://localhost' + req.url;
    const parameters = new URL(url);
    const leagueId = parameters.searchParams.get('league');
    //const teams = parameters.searchParams.get('teams');
    //console.log('web-teams',teams);
    ws.leagueId = leagueId;
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

        let slotAllocation = {"open_slots" : getEmptySlots(teamId), "overflow_slot" : 7};

        // determine open position if any
        var pos;
        if(slotAllocation["open_slots"].find((slot) => slot["label"] == "RB")){
            pos = "RB";
        }
        else if(slotAllocation["open_slots"].find((slot) => slot["label"] == "WR")){
            pos = "WR";
        }
        else if(slotAllocation["open_slots"].find((slot) => slot["label"] == "QB")){
            pos = "QB";
        }
        else if(slotAllocation["open_slots"].find((slot) => slot["label"] == "TE")){
            pos = "TE";
        }

        

        const bestPlayer = !pos ? db.prepare('SELECT * FROM players WHERE league_id=? AND drafted=? ORDER BY projected_points DESC LIMIT 1')
                            .get(leagueId, 0)
                        : db.prepare('SELECT * FROM players WHERE league_id=? AND drafted=? AND player_pos=? ORDER BY projected_points DESC LIMIT 1')
                            .get(leagueId, 0, pos);

        // determine the slot to autodraft to
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
        broadcastUpdate('UPDATE_DRAFTER', draftIndex, leagueId);
        broadcastUpdate('UPDATE_BOARD', null, leagueId);
        draftTimers.delete(teamId);
        startDraftTimer(leagueId, nextDrafter);
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

function getEmptySlots(team){
    let slots = db.prepare('SELECT player_slot FROM roster_slots WHERE team_id=?').all(team);
    slots = new Set(slots.map((row) => row["player_slot"]));
    let openSlots = ROSTER_TEMPLATE.filter((slot) => !slots.has(slot["id"]));
    return openSlots;
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
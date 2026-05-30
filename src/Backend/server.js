import express from 'express';
import 'dotenv/config'
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { getDraftOrder, makeId, getTeams } from '../Web/utils/leagueUtils.js';
import db from './db.js';
import { register_user, login_user, sessionAuth, leagueAuth, sanitize } from '../Web/utils/sessionUtils.js';
import session from 'express-session';

const app = express();
//const db = new Database('fantasy.db');
const server = http.createServer(app);
const wss = new WebSocketServer({server});

const MAX_SLOTS = 14;

var leagueDraftOrders = new Map();

// for TESTING!!!!!
//db.prepare('INSERT INTO leagues (league_id) VALUES (?)').run("123ABC");

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

// api endpoint to check session
app.get('/api/session', (req, res) => {
    if(req.session.logged){
        return res.status(200).json({logged: true, username: req.session.username});
    }
    return res.status(200).json({logged: false});
});

// api endpoint to check league
app.get('/api/league', (req, res) => {
    if(req.session.activeLeague){
        return res.status(200).json({activeLeague: req.session.activeLeague});
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
        }
        catch(err){
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
        db.prepare('INSERT INTO teams (league_id, owner) VALUES (?,?)').run(leagueId, owner);
        return res.status(200).json({message: "Successfully added to league!"});
    }
    catch(err){
        if(err.code === 'SQLITE_CONSTRAINT_UNIQUE'){
            return res.status(400).json({message: "User already in league!"});

        }
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
        const league_team = db.prepare('SELECT * FROM teams WHERE league_id=? AND owner=?').get(leagueId, owner);
        if(league_team){
            req.session.activeLeague = leagueId;
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
    const team_ids = db.prepare('SELECT * FROM teams WHERE league_id=?').all(league_id);
    res.json(team_ids);
});

// /api Endpoint to get team from league
app.get('/api/leagues/:league_id/teams/:owner', sessionAuth, leagueAuth, (req, res) => {
    const league_id = req.params.league_id;
    /*if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }*/
    const team_id = db.prepare('SELECT id FROM teams WHERE league_id=? AND owner=?').get(league_id, req.params.owner);
    res.json(team_id);
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

    if(!teamId || !leagueId || !playerId || !playerName || !playerPos || !slot){
        return res.status(400).json({error: "invalid drafting parameters"});
    }

    if(leagueDraftOrders.has(leagueId)){
        const draftOrder = leagueDraftOrders.get(leagueId)[0];
        let draftIndex = leagueDraftOrders.get(leagueId)[1];

        if(teamId != draftOrder[draftIndex]){ // check if team should be drafting first
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
            draftIndex = (draftIndex + 1) % draftOrder.length;
            const nextDrafter = draftOrder[draftIndex];
            leagueDraftOrders.set(leagueId,[draftOrder, draftIndex]);
            broadcastUpdate('UPDATE_DRAFTER', nextDrafter, leagueId);
            broadcastUpdate('UPDATE_BOARD', null, leagueId);
            return res.json({ success: true, rowId: info.lastInsertRowid });
        }
        catch(err){
            console.log(err);
            return res.status(400).json({message: "could not draft player"});
        }
        
    }
    res.json({sucess: false});
    
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

wss.on('connection', (ws, req) => {
    const url = 'http://localhost' + req.url;
    const parameters = new URL(url);
    const leagueId = parameters.searchParams.get('league');
    //const teams = parameters.searchParams.get('teams');
    //console.log('web-teams',teams);
    ws.leagueId = leagueId;
    if(parameters['pathname'] == '/draft'){
        sendDraftOrder(ws, leagueId);
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
    var draftOrder;
    const teams = db.prepare('SELECT * FROM teams WHERE league_id=?').all(league_id);
    //league_id = JSON.parse(league_id);
    if(!leagueDraftOrders.has(league_id) || leagueDraftOrders.get(league_id)[1].length != teams.length){
        draftOrder = await getDraftOrder(league_id, teams);
        leagueDraftOrders.set(league_id, [draftOrder, 0]);
    }
    else{
        draftOrder = leagueDraftOrders.get(league_id)[0];
    }
    ws.send(JSON.stringify({type: "DRAFT_ORDER", data: draftOrder}));
    broadcastUpdate('UPDATE_DRAFTER', draftOrder[leagueDraftOrders.get(league_id)[1]], league_id);
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
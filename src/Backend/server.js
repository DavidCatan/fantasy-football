import express from 'express';
import 'dotenv/config'
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { getDraftOrder, makeId, getTeams } from '../Web/utils/leagueUtils.js';
import db from './db.js';
import { register_user, login_user, sessionAuth, sanitize } from '../Web/utils/sessionUtils.js';
import session from 'express-session';

const app = express();
//const db = new Database('fantasy.db');
const server = http.createServer(app);
const wss = new WebSocketServer({server});

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
        maxAge: 15 * 60 * 1000, // 15 minutes 
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
    const {leagueName, owner} = req.body;
    const leagueId = makeId(6);  

    if(!leagueName || leagueName.length == 0 || leagueName.length > 100){
        return res.status(400).json({message: "League Name not valid"});
    }

    try{
        db.prepare('INSERT INTO leagues (league_id, name, owner) VALUES (?,?,?)').run(leagueId, leagueName, owner);
        try{
            db.prepare('INSERT INTO teams (league_id, owner) VALUES (?,?)').run(leagueId, owner);
        }
        catch(err){
            db.prepare('DELETE FROM leagues WHERE league_id=?').run(leagueId);
            return res.status(400).json({message: "Error adding user to league"});
        }
        return res.status(200).json({message: "Successfully created league!"});
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

// /api Endpoint to get a team's roster
app.get('/api/team/:id', sessionAuth, (req, res) => {
    const players = db.prepare('SELECT * FROM roster_slots WHERE team_id = ?').all(req.params.id);
    res.json(players);
});

// /api Endpoint to get team's league id
//app.get

// /api Endpoint to get league team is in
app.get('/api/:owner', sessionAuth, (req, res) => {
    const league_id = db.prepare('SELECT league_id FROM teams WHERE owner=?').get(req.params.owner);
    res.json(league_id);
});

// /api Endpoint to get all teams from league
app.get('/api/leagues/:league_id/teams', sessionAuth, (req, res) => {
    const league_id = req.params.league_id;
    /*if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }*/
    const team_ids = db.prepare('SELECT * FROM teams WHERE league_id=?').all(league_id);
    res.json(team_ids);
});

// /api Endpoint to get team from league
app.get('/api/leagues/:league_id/teams/:owner', sessionAuth, (req, res) => {
    const league_id = req.params.league_id;
    /*if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }*/
    const team_id = db.prepare('SELECT id FROM teams WHERE league_id=? AND owner=?').get(league_id, req.params.owner);
    res.json(team_id);
});

// /api Endpoint to get rostered data from league
app.get('/api/leagues/:league_id/rostered', sessionAuth, (req, res) => {
    const league_id = req.params.league_id;
    /*if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }*/
    const players = db.prepare('SELECT player_id FROM roster_slots WHERE league_id=?').all(league_id);
    res.json(players);
});

// /api Endpoint to draft a player
app.post('/api/draft', sessionAuth, (req, res) => {

    const { teamId, leagueId, playerId, playerName } = req.body;

    if(leagueDraftOrders.has(leagueId)){
        const draftOrder = leagueDraftOrders.get(leagueId)[0];
        let draftIndex = leagueDraftOrders.get(leagueId)[1];

        if(teamId != draftOrder[draftIndex]){ // check if team should be drafting first
            return res.status(400).json({ error: "Invalid team selection" });
        }

        draftIndex = (draftIndex + 1) % draftOrder.length;
        const nextDrafter = draftOrder[draftIndex];
        leagueDraftOrders.set(leagueId,[draftOrder, draftIndex]);
        broadcastUpdate('UPDATE_DRAFTER', nextDrafter, leagueId);
        
        const info = db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name) VALUES (?, ?, ?, ?)')
                   .run(teamId, leagueId, playerId, playerName);

        broadcastUpdate('UPDATE_BOARD', null, leagueId);
        res.json({ success: true, rowId: info.lastInsertRowid });
        return;
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
    if(!leagueDraftOrders.has(league_id)){
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
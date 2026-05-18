import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { getDraftOrder } from '../Web/utils/leagueUtils.js';

const app = express();
const db = new Database('fantasy.db');
const server = http.createServer(app);
const wss = new WebSocketServer({server});

var leagueDraftOrders = new Map();




app.use(cors());
app.use(express.json());

db.exec(`

    CREATE TABLE IF NOT EXISTS users(
        username VARCHAR(50) PRIMARY KEY,
        password VARCHAR(100) NOT NULL,
        display_name VARCHAR(50) NOT NULL
    )

    CREATE TABLE IF NOT EXISTS leagues(
        id INTEGER PRIMARY KEY UNIQUE
    )

    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        league_id INTEGER,
        name VARCHAR(50) NOT NULL,
        owner VARCHAR(50) UNIQUE NOT NULL

    );

    CREATE TABLE IF NOT EXISTS roster_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        player_id INTEGER UNIQUE NOT NULL,
        player_name VARCHAR(100) NOT NULL,

        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
`);
//db.prepare("DELETE FROM roster_slots WHERE team_id=1").run();
//db.prepare("DELETE FROM teams").run();
//db.prepare("INSERT INTO teams (league_id, name, owner) VALUES (1234, 'team1', 'ERIC')").run();
//db.prepare("INSERT INTO teams (league_id, name, owner) VALUES (1234, 'team2', 'DAVID')").run();
//db.prepare("INSERT INTO teams (league_id, name, owner) VALUES (1234, 'team3', 'OSCAR')").run();
//db.prepare("INSERT INTO teams (league_id, name, owner) VALUES (1234, 'team4', 'LIAM')").run();

/*
    TODO: validate inputs
    on all: check input for unique identifier
    check if team id matches owner
*/

// API Endpoint to get a team's roster
app.get('/team/:id', (req, res) => {
    const players = db.prepare('SELECT * FROM roster_slots WHERE team_id = ?').all(req.params.id);
    res.json(players);
});

// API Endpoint to get team's league id
//app.get

// API Endpoint to get league team is in
app.get('/:owner', (req, res) => {
    const league_id = db.prepare('SELECT league_id FROM teams WHERE owner=?').get(req.params.owner);
    res.json(league_id);
});

// API Endpoint to get all teams from league
app.get('/leagues/:league_id/teams', (req, res) => {
    const league_id = req.params.league_id;
    if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }
    const team_ids = db.prepare('SELECT * FROM teams WHERE league_id=?').all(league_id);
    res.json(team_ids);
});

// API Endpoint to get team from league
app.get('/leagues/:league_id/teams/:owner', (req, res) => {
    const league_id = req.params.league_id;
    if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }
    const team_id = db.prepare('SELECT id FROM teams WHERE league_id=? AND owner=?').get(league_id, req.params.owner);
    res.json(team_id);
});

// API Endpoint to get rostered data from league
app.get('/leagues/:league_id/rostered', (req, res) => {
    const league_id = req.params.league_id;
    if(isNaN(league_id)){
        return res.status(400).json({ error: "Invalid League ID" });
    }
    const players = db.prepare('SELECT player_id FROM roster_slots WHERE league_id=?').all(league_id);
    res.json(players);
});

// API Endpoint to draft a player
app.post('/draft', (req, res) => {

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

wss.on('connection', (ws, req) => {
    const url = 'http://localhost' + req.url;
    const parameters = new URL(url);
    const leagueId = parameters.searchParams.get('league');
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
    league_id = JSON.parse(league_id);
    if(!leagueDraftOrders.has(league_id)){
        draftOrder = await getDraftOrder(league_id);
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
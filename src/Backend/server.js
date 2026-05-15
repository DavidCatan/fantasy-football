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
    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        league_id INTEGER,
        name TEXT NOT NULL,
        owner TEXT UNIQUE NOT NULL

    );

    CREATE TABLE IF NOT EXISTS roster_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        player_id TEXT UNIQUE NOT NULL,
        player_name TEXT NOT NULL,

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
    const info = db.prepare('INSERT INTO roster_slots (team_id, league_id, player_id, player_name) VALUES (?, ?, ?, ?)')
                   .run(teamId, leagueId, playerId, playerName);

    broadcastUpdate();
    res.json({ success: true, rowId: info.lastInsertRowid });
});

wss.on('connection', (ws, req) => {
    const url = 'http://localhost' + req.url;
    const parameters = new URL(url);
    if(parameters['pathname'] == '/draft'){
        const leagueId = parameters.searchParams.get('league');
        sendDraftOrder(ws, leagueId);
    }
  
});

async function sendDraftOrder(ws, league_id){
    var draftOrder;
    if(!leagueDraftOrders.has(league_id)){
        draftOrder = await getDraftOrder(league_id);
        leagueDraftOrders.set(league_id, draftOrder);
    }
    else{
        draftOrder = leagueDraftOrders.get(league_id);
    }
    ws.send(JSON.stringify({type: "DRAFT_ORDER", data: draftOrder}));
}

function broadcastUpdate(){
    wss.clients.forEach(client =>
    {
        if(client.readyState == 1){
            client.send(JSON.stringify({type : 'UPDATE'}));
        }
    });
}

server.listen(3001, () => console.log('Backend running on port 3001'));
import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
const db = new Database('fantasy.db');
const server = http.createServer(app);
const wss = new WebSocketServer({server});

function broadcastUpdate(){
    wss.clients.forEach(client =>
    {
        if(client.readyState == 1){
            client.send(JSON.stringify({type : 'UPDATE'}));
        }
    });
}

app.use(cors());
app.use(express.json());

db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        owner TEXT
    );

    CREATE TABLE IF NOT EXISTS roster_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER,
        player_id TEXT UNIQUE,
        player_name TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id)
    );
`);

db.prepare("INSERT INTO teams (name, owner) VALUES ('team1', 'ERIC')").run();

// API Endpoint to get a team's roster
app.get('/team/:id', (req, res) => {
    const players = db.prepare('SELECT * FROM roster_slots WHERE team_id = ?').all(req.params.id);
    res.json(players);
});

app.get('/rostered', (req, res) => {
    const players = db.prepare('SELECT player_id FROM roster_slots').all();
    res.json(players);
});

// API Endpoint to draft a player
app.post('/draft', (req, res) => {
    const { teamId, playerId, playerName } = req.body;
    const info = db.prepare('INSERT INTO roster_slots (team_id, player_id, player_name) VALUES (?, ?, ?)')
                   .run(teamId, playerId, playerName);

    broadcastUpdate();
    res.json({ success: true, rowId: info.lastInsertRowid });
});

server.listen(3001, () => console.log('Backend running on port 3001'));
import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';

const app = express();
const db = new Database('fantasy.db');
app.use(cors());
app.use(express.json());

db.exec(`
    DROP TABLE IF EXISTS teams;
    
    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        owner TEXT
    );
    DROP TABLE IF EXISTS roster_slots;

    CREATE TABLE IF NOT EXISTS roster_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER,
        player_id TEXT,
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

// API Endpoint to draft a player
app.post('/draft', (req, res) => {
    const { teamId, playerId, playerName } = req.body;
    const info = db.prepare('INSERT INTO roster_slots (team_id, player_id, player_name) VALUES (?, ?, ?)')
                   .run(teamId, playerId, playerName);
    res.json({ success: true, rowId: info.lastInsertRowid });
});

app.listen(3001, () => console.log('Backend running on port 3001'));
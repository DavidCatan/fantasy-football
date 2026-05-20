import Database from 'better-sqlite3';

const db = new Database('fantasy.db');

db.exec(`

    CREATE TABLE IF NOT EXISTS users(
        username VARCHAR(50) PRIMARY KEY,
        password VARCHAR(100) NOT NULL,
        display_name VARCHAR(50) DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS leagues(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id INTEGER UNIQUE
    );

    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        league_id INTEGER,
        name VARCHAR(50) DEFAULT '',
        owner VARCHAR(50) NOT NULL

    );

    CREATE TABLE IF NOT EXISTS roster_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        player_id INTEGER UNIQUE NOT NULL,
        player_name VARCHAR(100) NOT NULL,

        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_league ON teams (owner, league_id);
`);

export default db;
import Database from 'better-sqlite3';

const db = new Database('fantasy.db');
// make roster slot unique for each user and player id for each league
db.exec(`

    CREATE TABLE IF NOT EXISTS users(
        username VARCHAR(50) PRIMARY KEY,
        password VARCHAR(100) NOT NULL,
        display_name VARCHAR(50) DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS leagues(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id VARCHAR(6) UNIQUE,
        league_name VARCHAR(100) NOT NULL,
        league_owner VARCHAR(50) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        league_id VARCHAR(6) NOT NULL,
        name VARCHAR(50) DEFAULT '',
        owner VARCHAR(50) NOT NULL

    );

    CREATE TABLE IF NOT EXISTS roster_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        league_id VARCHAR(6) NOT NULL,
        player_id INTEGER NOT NULL,
        player_name VARCHAR(100) NOT NULL,
        player_pos VARCHAR(2) NOT NULL,
        player_slot VARCHAR(5) NOT NULL, 

        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matchups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id VARCHAR(6) NOT NULL,
        home_team_id INTEGER NOT NULL,
        away_team_id INTEGER NOT NULL,
        week INTEGER NOT NULL,

        FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
        FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_league ON teams (owner, league_id);
`);

export default db;
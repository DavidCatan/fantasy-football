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
        league_owner VARCHAR(50) NOT NULL,
        draft_status VARCHAR(15) NOT NULL DEFAULT 'NOT_STARTED',
        completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        league_id VARCHAR(6) NOT NULL,
        name VARCHAR(50) DEFAULT '',
        owner VARCHAR(50) NOT NULL,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        points_for REAL NOT NULL DEFAULT 0,
        points_against REAL NOT NULL DEFAULT 0,
        final_rank INTEGER DEFAULT NULL,
        FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE

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
        home_points REAL NOT NULL DEFAULT 0.0,
        away_points REAL NOT NULL DEFAULT 0.0,
        week INTEGER NOT NULL,
        playoff_round VARCHAR(20) DEFAULT NULL,

        FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE,
        FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS waivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        dropped_player_id INTEGER DEFAULT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'pending',

        FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id INTEGER NOT NULL,
        proposer_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'pending',

        FOREIGN KEY (league_id) REFERENCES leagues(league_id) ON DELETE CASCADE,
        FOREIGN KEY (proposer_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trade_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,

        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id VARCHAR(6) NOT NULL,
        player_id INTEGER NOT NULL,
        player_name VARCHAR(100) NOT NULL,
        player_pos VARCHAR(2) NOT NULL,
        drafted INTEGER NOT NULL DEFAULT 0,
        projected_points REAL NOT NULL DEFAULT 0.0,
        adp REAL NOT NULL DEFAULT 0.0

    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_league ON teams (owner, league_id);
`);

export default db;
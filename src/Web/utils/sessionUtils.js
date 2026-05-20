import db from "../../Backend/db.js";
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function register_user(username, password){

    if (!username || !password){
        return false;
    }

    if(password.length < 8){
        return false;
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    try{
        db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);
        // for TESTING!!!
        db.prepare('INSERT INTO teams (league_id, name, owner) VALUES (?,?,?)').run(1234,'E','ERIC');
    }
    catch(e){
        if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            console.log("Username already taken");
        } else {
            console.log("Database error:", e.message);
        }
        return false;
    }

    return true;
}

export async function login_user(username, password){

    if (!username || !password){
        return false;
    }

    try{
        const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
        if(!user){
            return false;
        }
        if(await bcrypt.compare(password, user.password)){
            return true;
        }
    }
    catch(e){
        console.log("Database error:", e.message);
        return false;
    }

    return false;
}

export function sessionAuth(req, res, next) {
    // 1. Check if logged in 
    if (!req.session.logged) {
        return res.status(401).json({ message: "Please login first" });
    }

    // 2. Check User Agent 
    if (req.session.browser !== req.headers['user-agent']) {
        req.session.destroy();
        return res.status(403).json({ message: "Session hijacking detected!" });
    }

    next(); 
};

export function sanitize(input){
    return input.trim();
}
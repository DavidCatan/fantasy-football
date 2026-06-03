import roundrobin from 'roundrobin-tournament-js';

export const ROSTER_TEMPLATE = [
    { id: "QB",   label: "QB",   eligiblePositions: ["QB"] },
    { id: "RB1",  label: "RB",   eligiblePositions: ["RB"] },
    { id: "RB2",  label: "RB",   eligiblePositions: ["RB"] },
    { id: "WR1",  label: "WR",   eligiblePositions: ["WR"] },
    { id: "WR2",  label: "WR",   eligiblePositions: ["WR"] },
    { id: "TE",   label: "TE",   eligiblePositions: ["TE"] },
    { id: "FLEX", label: "FLEX", eligiblePositions: ["RB", "WR", "TE"] },
    //{ id: "K",    label: "K",    eligiblePositions: ["K"] },
    { id: "BN1",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "K"] },
    { id: "BN2",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "K"] },
    { id: "BN3",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "K"] },
    { id: "BN4",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "K"] },
    { id: "BN5",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "K"] },
    { id: "BN6",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "K"] }
];

const API_HOST = "localhost";
const API_PORT = 3001;

export async function getRosteredPlayers(league_id){
    const response = await fetch(`http://${API_HOST}:${API_PORT}/api/leagues/${league_id}/rostered`, {credentials: 'include'});
    const data = await response.json();
    const ids = data.map(item => item.player_id);
    return ids;
}

export async function getTeamRoster(league_id, team_id){
    const response = await fetch(`http://${API_HOST}:${API_PORT}/api/leagues/${league_id}/teams/${team_id}/roster`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        //const ids = data["data"].map(item => item.player_id);
        //return ids;
        return data["data"];
    }
    return null;
}

export async function getLeagues(user){
    try{
        const response = await fetch(`http://${API_HOST}:${API_PORT}/api/${user}`, {credentials: 'include'});
        const data = await response.json();
        return {success: true, leagues: data};
    }
    catch(err){
        return {success: false};
    }
    
}

export async function getTeam(league_id, owner){
    const response = await fetch(`http://${API_HOST}:${API_PORT}/api/leagues/${league_id}/teams/${owner}`, {credentials: 'include'});
    const data = await response.json();
    return data["id"];
}

export async function getTeams(league_id){
    const response = await fetch(`http://${API_HOST}:${API_PORT}/api/leagues/${league_id}/teams`, {credentials: 'include'});
    const data = await response.json();
    return data;
}

export async function getDraftOrder(league_id, teams){
    let shuffledArray = [teams.length];
    for(let i = 0; i < teams.length; i++){
        shuffledArray[i] = teams[i]["id"];
    }

    // shuffle the draft order
    shuffle(shuffledArray);

    return shuffledArray;
}

export function makeId(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export function setMatchups(leagueId, teams, leagueMatchups ) { // implement a rival system?????
    leagueMatchups.set(leagueId , new Map());
    leagueMatchups.get(leagueId).set("week", new Map());
    //console.log(leagueMatchups);
    const schedule = roundrobin(teams);
    //console.log(schedule);
    for(let i = 0; i < 9; i++){
        leagueMatchups.get(leagueId).get("week").set(i+1, schedule[i]);
    }
    for(let i = 9; i < 13; i++){
        leagueMatchups.get(leagueId).get("week").set(i+1, generateMatchups(teams));
    }
    console.log(leagueMatchups.get(leagueId).get("week"));
    console.log(leagueMatchups.get(leagueId).get("week").get(1));
    console.log(leagueMatchups.get(leagueId).get("week").get(13));

}

function generateMatchups(teams){
    shuffle(teams);
    if(teams.length == 10){
        return [teams.slice(0,2), teams.slice(2,4), teams.slice(4,6), teams.slice(6,8), teams.slice(8,10)];
    }
    else{
        return null;
    }
}

function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}


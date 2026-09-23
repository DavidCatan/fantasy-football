import roundrobin from 'roundrobin-tournament-js';
import playerStats from "../../Backend/nfl_stats.js";

export const ROSTER_TEMPLATE = [
    { id: "QB",   label: "QB",   eligiblePositions: ["QB"], abbreviation: ["QB"] },
    { id: "RB1",  label: "RB",   eligiblePositions: ["RB"], abbreviation: ["RB"] },
    { id: "RB2",  label: "RB",   eligiblePositions: ["RB"], abbreviation: ["RB"] },
    { id: "WR1",  label: "WR",   eligiblePositions: ["WR"], abbreviation: ["WR"] },
    { id: "WR2",  label: "WR",   eligiblePositions: ["WR"], abbreviation: ["WR"] },
    { id: "TE",   label: "TE",   eligiblePositions: ["TE"], abbreviation: ["TE"]},
    { id: "FLEX", label: "FLEX", eligiblePositions: ["RB", "WR", "TE"], abbreviation: ["FX"] },
    { id: "PK",    label: "K",    eligiblePositions: ["PK"], abbreviation: ["PK"] },
    { id: "BN1",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "PK"], abbreviation: ["BN"] },
    { id: "BN2",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "PK"], abbreviation: ["BN"] },
    { id: "BN3",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "PK"], abbreviation: ["BN"] },
    { id: "BN4",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "PK"], abbreviation: ["BN"] },
    { id: "BN5",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "PK"], abbreviation: ["BN"] },
    { id: "BN6",  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "PK"], abbreviation: ["BN"] }//,

];

export async function getLiveStats(){
    const response = await fetch(`/api/stats/live-stats`, {credentials: 'include', cache: 'no-store'});
    const data = await response.json();
    if(response.ok){
        return data["data"];
    }
    return null;
}

export async function getProjections(){
    const response = await fetch(`/api/stats/projections`, {credentials: 'include', cache: 'no-store'});
    const data = await response.json();
    if(response.ok){
        return data["data"];
    }
    return null;
}

export async function getRosteredPlayers(league_id){
    const response = await fetch(`/api/leagues/${league_id}/rostered`, {credentials: 'include'});
    const data = await response.json();
    const ids = data.map(item => item.player_id);
    return ids;
}

export async function getTeamRoster(league_id, team_id){
    const response = await fetch(`/api/leagues/${league_id}/teams/${team_id}/roster`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        return data["data"];
    }
    return null;
}

export async function getTeamRosters(league_id){
    const response = await fetch(`/api/leagues/${league_id}/rosters`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        return data["data"];
    }
    return null;
}

export async function getLeagues(user){
    try{
        const response = await fetch(`/api/${user}`, {credentials: 'include'});
        const data = await response.json();
        return {success: true, leagues: data};
    }
    catch(err){
        return {success: false};
    }
    
}

export async function getTeam(league_id, owner){
    const response = await fetch(`/api/leagues/${league_id}/teams/${owner}`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        return data;
    }
    return null;
    
}

export async function getTeams(league_id){
    const response = await fetch(`/api/leagues/${league_id}/teams`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        return data["data"];
    }
    return null;
}

export async function getStandings(league_id){
    const response = await fetch(`/api/leagues/${league_id}/standings`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        return data["data"];
    }
    return null;
}

export async function getMatchup(league_id, team, week){
    const response = await fetch(`/api/leagues/${league_id}/matchups/${week}/${team}`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        return data;
    }
    return null;
}

export async function getMatchups(league_id, week){
    const response = await fetch(`/api/leagues/${league_id}/matchups/${week}`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        return data;
    }
    return null;
}

export async function getTrades(league_id, team){
    const response = await fetch(`/api/leagues/${league_id}/teams/${team}/trades`, {credentials: 'include'});
    const data = await response.json();
    if(response.ok){
        return data;
    }
    return null;
}

export async function dropPlayer(team, league_id, player){
    if(!league_id || !team || !player){
        return {success: false, message: "something went wrong"};
    }
    const response = await fetch ('/api/drop', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body:
        JSON.stringify({
            teamId: team,
            leagueId: league_id,
            playerId: player.id,
        }),
        credentials: 'include'
    });
    const data = await response.json();
    if(response.ok){
        return {success: true, message: "successfully dropped player"};
    }
    return {success: false, message: data['message'] || "error, could not drop player" };
}


export async function getDraftOrder(league_id, teams){
    let shuffledArray = [teams.length];
    for(let i = 0; i < teams.length; i++){
        shuffledArray[i] = teams[i];
    }

    // shuffle the draft order
    shuffle(shuffledArray);

    // fill other half of array for snake draft
    for(let i = teams.length-1; i >= 0; i--){
        shuffledArray.push(shuffledArray[i]);
    }

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

export function setMatchups(leagueId, teams, leagueMatchups, db ) { // TODO: implement a rival system?????
    leagueMatchups.set(leagueId , new Map());
    leagueMatchups.get(leagueId).set("week", new Map());
    const schedule = roundrobin(teams);
    schedule.forEach((week, weekNum) => {
        week.forEach((matchup) => {
            if(matchup){
                db.prepare('INSERT INTO matchups (league_id, home_team_id, away_team_id, week) VALUES (?,?,?,?)')
                .run(leagueId, matchup[0]["id"], matchup[1]["id"], weekNum+1);
            }

        })
    });
    
    //}
    // fill remaining weeks with random matchups
    for(let i = teams.length-1; i < 13; i++){
        let randomMatchups = generateMatchups(teams);
        randomMatchups.forEach((matchup) => {
                db.prepare('INSERT INTO matchups (league_id, home_team_id, away_team_id, week) VALUES (?,?,?,?)')
                .run(leagueId, matchup[0]["id"], matchup[1]["id"], i+1);
        });
  
    }

}

export function calculateWeeklyPoints(week, player, newStats){
    var totalPoints = 0;

    if (!newStats){
        newStats = playerStats;
    }

    const PASSING_MULTIPLIER = 0.04;
    const RUSHING_MULTIPLIER = 0.1;
    const RECEIVING_MULTIPLIER = 0.1;
    const RECEPTION_MULTIPLIER = 1;
    const PASS_TD_MULTIPLIER = 4;
    const TD_MULITIPLER = 6;
    const TURNOVER_MULTIPLIER = -2;
    const MADE_FG_MULTIPLIER = 1;
    const MISSED_FG_MULTIPLIER = -1;
    const MADE_XP_MULTIPLIER = 1;
    const MISSED_XP_MULTIPLIER = -1;

    const pointDistr = {
        "passingYards" : PASSING_MULTIPLIER,
        "passingTouchdowns" : PASS_TD_MULTIPLIER,
        "interceptions" : TURNOVER_MULTIPLIER,
        "rushingYards" : RUSHING_MULTIPLIER,
        "rushingTouchdowns" : TD_MULITIPLER,
        "receptions" : RECEPTION_MULTIPLIER,
        "receivingYards" : RECEIVING_MULTIPLIER,
        "receivingTouchdowns" : TD_MULITIPLER,
        "fumblesLost" :  TURNOVER_MULTIPLIER,
        "kickReturnTouchdowns" : TURNOVER_MULTIPLIER,
        "puntReturnTouchdowns" : TURNOVER_MULTIPLIER,
        "madeFG" : MADE_FG_MULTIPLIER,
        "missedFG" : MISSED_FG_MULTIPLIER,
        "madeXP" : MADE_XP_MULTIPLIER,
        "missedXP" : MISSED_XP_MULTIPLIER
    };
    if(newStats["week"][week]?.hasOwnProperty(player)){
        for (const stat in pointDistr){
            if (newStats["week"][week][player].hasOwnProperty(stat)){

                if (stat == "madeFG"){ // calculate points from array
                    newStats["week"][week][player][stat].forEach((fg) => {
                        totalPoints += Math.floor(fg / 10) * pointDistr[stat];
                    });
                }
                else{
                    totalPoints += newStats["week"][week][player][stat] * pointDistr[stat];
                }
            }          
        }
    }
  totalPoints = Math.round((totalPoints + Number.EPSILON) * 100) / 100;
  return totalPoints;
}


// TODO: make generalized function
function generateMatchups(teams){
    shuffle(teams);
    if(teams.length == 10){
        return [teams.slice(0,2), teams.slice(2,4), teams.slice(4,6), teams.slice(6,8), teams.slice(8,10)];
    }
    else if (teams.length == 4){
        return [teams.slice(0,2), teams.slice(2,4)];
    }
    else{
        return null;
    }
}

function shuffle(array) {
  let currentIndex = array.length;

  while (currentIndex != 0) {

    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}


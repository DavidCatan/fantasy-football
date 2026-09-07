//import playerData from '../../nfl_players.json'  with { type: 'json' };


import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const playerData = require('../../nfl_players.json');

const SEASON = 2026;
const SEASON_TYPE = 2;
//const WEEK_NUM = 3;
const POSITIONS = ["QB", "WR", "RB", "TE", "PK"];


export async function getLiveGames(weekNum){
    
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${weekNum}&dates=${SEASON}&seasontype=${SEASON_TYPE}`);
    const data = await response.json();
    if(response.ok){
        return data['events'];
    }
    return null;
}

export async function getLiveStats(weekNum, liveGameIds) {
    const liveData = {"week" : {}};
    liveData['week'][weekNum] = {};
    for (const gameId of liveGameIds) {
        const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`);
        const box = await response.json();

        const teamData = box?.boxscore?.players || box?.boxscore?.teams || [];
        teamData?.forEach((team) => {
            team?.statistics?.forEach((statCategory) => {
                let keys = statCategory['keys'];
                statCategory?.athletes?.forEach((athlete) => {
                    let playerName = athlete['athlete']['displayName'];
                    let playerStats = null;
                    if(!playerData.hasOwnProperty(playerName)){
                        return;
                    }

                    if(statCategory['name'] == 'kicking'){
                        let madeFG = [];
                        let missedFG = 0;
                        let madeXP = 0;
                        let missedXP = 0;

                        box?.drives?.previous.forEach((drive) => {
                            if(drive?.team?.displayName != playerData[playerName]['team']){
                                return;
                            }
                            if(drive['result'] == 'FG'){
                                drive?.plays.forEach((play) => {
                                    if(play.hasOwnProperty('scoringPlay') && play['scoringPlay']){
                                        madeFG.push(play['statYardage']);
                                    }
                                });
                            }
                            else if(drive['result'] == 'MISSED FG'){
                                missedFG++;
                            }
                            else if(drive['result'] == 'TD'){
                                drive?.plays.forEach((play) => {
                                    if(play.hasOwnProperty('pointAfterAttempt')){
                                        if(play['pointAfterAttempt']['text'] == 'Extra Point Good'){
                                            madeXP++;
                                        }
                                        else if(play['pointAfterAttempt']['text'] == 'Extra Point Missed'){
                                            missedXP++;
                                        }
                                    }
                                });
                            }
                        });
                        playerStats =  {
                            'madeFG' : madeFG,
                            'missedFG' : missedFG,
                            'madeXP' : madeXP,
                            'missedXP' : missedXP
                        }
                    }
                    else{
                        let statValues = athlete?.stats;
                        playerStats = Object.fromEntries(
                            keys.map((key, index) => [key, statValues[index]])
                        );
                    }
                    if (liveData['week'][weekNum].hasOwnProperty(playerName)){
                        Object.assign(liveData["week"][weekNum][playerName], playerStats);
                    }
                    else{
                        liveData['week'][weekNum][playerName] = {...playerStats};
                    }
                });
            });
        });
        
    }
    return liveData;
}

export async function processLiveRosters(teamId, livePlayers){
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`);
    const data = await response.json();
    if(response.ok){
        data['athletes'].forEach((position) => {
            position['items'].forEach((player) => {
                if(POSITIONS.includes(player['position']['abbreviation'])){
                    livePlayers.add(Number(player['id']));
                }
            });
        });
    }
}

export function standingsOrder(team1, team2) {
    return team1["wins"] < team2["wins"] ? 1 : team1["wins"] > team2["wins"] ? -1 : team1["points_for"] < team2["points_for"] ? 1 : -1;
}
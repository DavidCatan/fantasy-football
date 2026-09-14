import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const playerData = require('../../nfl_players.json');

const SEASON = 2026;
const SEASON_TYPE = 2;
const POSITIONS = ["QB", "WR", "RB", "TE", "PK"];


export async function getLiveGames(weekNum){
    
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${weekNum}&dates=${SEASON}&seasontype=${SEASON_TYPE}`);
    const data = await response.json();
    if(response.ok){
        return data['events'];
    }
    return null;
}

export async function getProjections(weekNum, liveProjections){
    const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/players?scoringPeriodId=${weekNum}&view=players_wl&view=kona_player_info`;
    const filterHeader = {
        players: {
            limit: 2000, 
            filterSlotIds: {
                value: [0, 2, 4, 6, 17] // QB, RB, WR, TE, K
            }
        }    
    };
    const response = await fetch(url, {
        headers:{'X-Fantasy-Filter' : JSON.stringify(filterHeader)}
    });
    const data = await response.json();
    data.forEach((player) => {
        const projections = player?.stats?.find(
            s => s.statSourceId == 1 && s.statSplitTypeId == 1 && s.scoringPeriodId == weekNum && s.seasonId == 2026
        );
        const stats = projections?.stats || {};
    
        // populate projections with corresponding stat code    
        liveProjections['week'][weekNum][player?.id] = {
            passingYards: stats[3] || 0,
            passingTouchdowns: stats[4] || 0,
            interceptions: stats[20] || 0,
            rushingYards: stats[24] || 0,
            rushingTouchdowns: stats[25] || 0,
            receptions: stats[53] || 0,
            receivingYards: stats[42] || 0,
            receivingTouchdowns: stats[43] || 0,
            fumblesLost: stats[72] || 0,
            madeFG50: stats[74] || 0,
            madeFG40: stats[77] || 0,
            madeFG0: stats[80] || 0,
            missedFg: stats[85] || 0,
            madeXP : stats[86] || 0,
            missedXP: stats[88] || 0,
            kickReturnTouchdowns: stats[101] || 0,
            puntReturnTouchdowns: stats[102] || 0
        }
    });
}

export async function getLiveStats(weekNum, liveGameIds, liveData) {

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
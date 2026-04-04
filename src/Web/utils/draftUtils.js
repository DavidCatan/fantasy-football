import playerData from "../../../nfl_players.json";
import playerStats from "../../Backend/nfl_stats.json"

//console.log(playerData);
var players = {
  "all" : [],
  "QB" : [],
  "WR" : [],
  "RB" : [],
  "TE" : []
};
export var playerNames = [];
export var nameSet = new Set();

// add isRostered field, add into players only if not rostered
for (const player in playerData) {
    /*players["ids"].push(playerData[player].id);
    players["names"].push(playerData[player].name);
    players["positions"].push(playerData[player].position);
    players["headshots"].push(playerData[player].headshot);*/
    let newPlayer = playerData[player];
    newPlayer["points"] = calculatePoints(playerData[player]["name"]).reduce((a, b) => a + b, 0);
    players["all"].push(newPlayer);
    players[playerData[player]["position"]].push(newPlayer);
    playerNames.push(playerData[player]["name"]);
    nameSet.add(playerData[player]["name"]);
}

for (const key in players){
  players[key].sort((a,b) => b.points - a.points);
}

export async function fetchPlayerStats(season, playerId) {
  try {
    const response = await fetch(
      `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${season}/types/2/athletes/${playerId}/statistics`
    );
    const data = await response.json();

    return data; 
  } catch (error) {
    console.error("ESPN API Error:", error);
  }
}

export function calculatePoints(player){
  var totalPoints = new Array(18).fill(0);
  const PASSING_MULTIPLIER = 0.04;
  const RUSHING_MULTIPLIER = 0.1;
  const RECEIVING_MULTIPLIER = 0.1;
  const RECEPTION_MULTIPLIER = 1;
  const PASS_TD_MULTIPLIER = 4;
  const TD_MULITIPLER = 6;
  const TURNOVER_MULTIPLIER = -2;

  const statCategories = [
    "passingYards", "passingTouchdowns", "interceptions", "rushingYards", 
    "rushingTouchdowns", "receptions", "receivingYards", "receivingTouchdowns", "fumbles", 
    "kickReturnTouchdowns", "puntReturnTouchdowns"
  ];

  const pointDistr = {
    "passingYards" : PASSING_MULTIPLIER,
    "passingTouchdowns" : PASS_TD_MULTIPLIER,
    "interceptions" : TURNOVER_MULTIPLIER,
    "rushingYards" : RUSHING_MULTIPLIER,
    "rushingTouchdowns" : TD_MULITIPLER,
    "receptions" : RECEPTION_MULTIPLIER,
    "receivingYards" : RECEIVING_MULTIPLIER,
    "receivingTouchdowns" : TD_MULITIPLER,
    "fumbles" :  TURNOVER_MULTIPLIER,
    "kickReturnTouchdowns" : TURNOVER_MULTIPLIER,
    "puntReturnTouchdowns" : TURNOVER_MULTIPLIER
  };

  for(let i = 0; i < 18; i++){
    if(playerStats["week"][i+1].hasOwnProperty(player)){
      for (const stat in pointDistr){
        if(playerStats["week"][i+1][player].hasOwnProperty(stat)){
          totalPoints[i] += playerStats["week"][i+1][player][stat] * pointDistr[stat];
          //console.log(playerStats["week"][i][player][stat]);
        }
      }
    }

  }
  
  return totalPoints;
}

export default players;

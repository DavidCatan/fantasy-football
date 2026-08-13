import playerData from "../../../nfl_players.json"  with { type: 'json' };
import playerStats from "../../Backend/nfl_stats.json"  with { type: 'json' };

//console.log(playerData);
var players = {
  "all" : [],
  "QB" : [],
  "WR" : [],
  "RB" : [],
  "TE" : [],
  "PK" : []
};
export var playerNames = new Map();
export var nameSet = new Set();
export var nameArray = new Array();

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
    playerNames.set(Number(newPlayer["id"]), newPlayer["name"]);
    nameArray.push(playerData[player]["name"]);
    nameSet.add(playerData[player]["name"]);
    //playerData[player]["available"] = true;
}

for (const key in players){
  players[key].sort((a, b) => {
    if (a.ADP == 0) return 1;        
    if (b.ADP == 0) return -1;      
    return a.ADP - b.ADP;
  });
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
  const MADE_FG_MULTIPLIER = 1;
  const MISSED_FG_MULTIPLIER = -1;
  const MADE_XP_MULTIPLIER = 1;
  const MISSED_XP_MULTIPLIER = -1;

  const statCategories = [
    "passingYards", "passingTouchdowns", "interceptions", "rushingYards", 
    "rushingTouchdowns", "receptions", "receivingYards", "receivingTouchdowns", "fumbles", 
    "kickReturnTouchdowns", "puntReturnTouchdowns", "madeFG", "missedFG", "madeXP", "missedXP"
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
    "puntReturnTouchdowns" : TURNOVER_MULTIPLIER,
    "madeFG" : MADE_FG_MULTIPLIER,
    "missedFG" : MISSED_FG_MULTIPLIER,
    "madeXP" : MADE_XP_MULTIPLIER,
    "missedXP" : MISSED_XP_MULTIPLIER
  };

  for(let i = 0; i < 18; i++){
    if(playerStats["week"][i+1].hasOwnProperty(player)){
      for (const stat in pointDistr){
        if (playerStats["week"][i+1][player].hasOwnProperty(stat)){

          if (stat == "madeFG"){ // calculate points from array
            playerStats["week"][i+1][player][stat].forEach((fg) => {
                totalPoints[i] += Math.floor(fg / 10) * pointDistr[stat];
            });
          }
          else{
            totalPoints[i] += playerStats["week"][i+1][player][stat] * pointDistr[stat];
          }
          //console.log(playerStats["week"][i][player][stat]);
        }
      }
      
    }
    totalPoints[i] = Math.round((totalPoints[i] + Number.EPSILON) * 100) / 100;
  }
  
  return totalPoints;
}

export function determineSlot(pos, posCount){
  let slot = pos;
  if(pos == "QB"){
    if(posCount["qb"] > 0){
      slot = "BN"+ ++posCount["bn"];
    }
    posCount["qb"]++;
  }
  else if(pos == "RB"){
      if(posCount["rb"] > 1){
          if(posCount["flex"] > 0){
              slot = "BN"+ ++posCount["bn"];
          }
          else{
              slot = "FLEX";
              posCount["flex"]++;
          }
          posCount["rb"]++;
      }
      else{
          slot = "RB"+ ++posCount["rb"];
      }
  }
  else if(pos == "WR"){
    if(posCount["wr"] > 1){
        if(posCount["flex"] > 0){
            slot = "BN"+ ++posCount["bn"];
        }
        else{
            slot = "FLEX";
            posCount["flex"]++;
        }
        posCount["wr"]++;
    }
    else{
        slot = "WR"+ ++posCount["wr"];
    }
  }
  else if(pos == "TE"){
    if(posCount["te"] > 0){
        if(posCount["flex"] > 0){
            slot = "BN"+ ++posCount["bn"];
        }
        else{
            slot = "FLEX";
            posCount["flex"]++;
        }
        posCount["te"]++;
    }
    else{
        slot = "TE";
        posCount["te"]++;
    }
  }
  else if(pos == "PK"){
    if(posCount["k"] > 0){
      slot = "BN"+posCount["bn"]++;
    }
  }

  posCount["total"]++;

  return slot;
}

export function draftPlayer(team, player){
  team["roster"].push(player);
}

export default players;

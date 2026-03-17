import playerData from "../../../nfl_players.json";
//console.log(playerData);
var players = [];
export var playerNames = [];
export var nameSet = new Set()

// add isRostered field, add into players only if not rostered
for (const player in playerData) {
    /*players["ids"].push(playerData[player].id);
    players["names"].push(playerData[player].name);
    players["positions"].push(playerData[player].position);
    players["headshots"].push(playerData[player].headshot);*/
    players.push(playerData[player]);
    playerNames.push(playerData[player].name);
    nameSet.add(playerData[player].name);
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

export default players;

import playerData from "../../../nfl_players.json";
//console.log(playerData);
var players = [];

// add isRostered field, add into players only if not rostered
for (const player in playerData) {
    /*players["ids"].push(playerData[player].id);
    players["names"].push(playerData[player].name);
    players["positions"].push(playerData[player].position);
    players["headshots"].push(playerData[player].headshot);*/
    players.push(playerData[player]);
}

/*export function clickPlayer(){
    return (alert('you clicked'));
}*/


export default players;

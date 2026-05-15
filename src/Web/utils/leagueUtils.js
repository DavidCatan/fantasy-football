export var teams = [
    {
        "id": 1,
        "name" : "team1",
        "roster" : []
    },
    {
        "id": 2,
        "name" : "team2",
        "roster" : []
    },
    {
        "id": 3,
        "name" : "team3",
        "roster" : []
    },
    {
        "id": 4,
        "name" : "team4",
        "roster" : []
    }
]

const API_HOST = "localhost";
const API_PORT = 3001;

export async function getRosteredPlayers(){
    const response = await fetch(`http://${API_HOST}:${API_PORT}/leagues/1234/rostered`);
    const data = await response.json();
    const ids = data.map(item => item.player_id);
    return ids;
}

export async function getLeagueId(owner){
    const response = await fetch(`http://${API_HOST}:${API_PORT}/${owner}`);
    const data = await response.json();
    return data["league_id"];
}

export async function getTeam(league_id, owner){
    const response = await fetch(`http://${API_HOST}:${API_PORT}/leagues/${league_id}/teams/${owner}`);
    const data = await response.json();
    return data["id"];
}

async function getTeams(league_id){
    const response = await fetch(`http://${API_HOST}:${API_PORT}/leagues/${league_id}/teams`);
    const data = await response.json();
    return data;
}

export async function getDraftOrder(league_id){
    const teams = await getTeams(league_id);
    let shuffledArray = [teams.length];
    for(let i = 0; i < teams.length; i++){
        shuffledArray[i] = teams[i]["id"];
    }

    // shuffle the draft order
    shuffle(shuffledArray);

    return shuffledArray;
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


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


export async function getRosteredPlayers(){
    const response = await fetch(`http://localhost:3001/leagues/1234/rostered`);
    const data = await response.json();
    const ids = data.map(item => item.player_id);
    return ids;
}

export async function getLeagueId(owner){
    const response = await fetch(`http://localhost:3001/${owner}`);
    const data = await response.json();
    return data["league_id"];
}

export async function getTeam(league_id, owner){
    const response = await fetch(`http://localhost:3001/leagues/${league_id}/teams/${owner}`);
    const data = await response.json();
    return data["id"];
}


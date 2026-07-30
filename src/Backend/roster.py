import espn_api.football as espn
import requests
import json

SEASON = 2026

def get_rosters():
    positions = ["QB", "WR", "RB", "TE", "K"]
    all_players = {}
    for id in range(1,35):
        url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/roster"
        data = requests.get(url).json()
        #print (data)
        team = data['team']['displayName']
        for group in data['athletes']:
            for athlete in group['items']:
                if athlete['position']['abbreviation'] in positions:
                    all_players.update({ athlete['fullName']: {
                        'id': athlete['id'],
                        'name': athlete['fullName'],
                        'position': athlete['position']['abbreviation'],
                        'team': team,
                        'headshot': athlete.get('headshot', {}).get('href')
                    }
                    })
    return all_players

def get_attributes(all_players):
    url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{SEASON}/players?view=kona_player_info"
    
    # filter and sort needed to get all of the players
    filter_header = {
        "limit": 1500,
        "filterStatus": {
            "value": ["ACTIVE"]
        },
        "sortDraftRanks": {
            "sortPriority": 1,
            "sortAsc": True,
            "value": "STANDARD"  
        },
    }
    header = {'x-fantasy-filter' : json.dumps(filter_header)}
    data = requests.get(url,headers=header).json()
    for player in data:
        player_name = player["fullName"]
        ownership = player.get('ownership') or {}
        adp = ownership.get('averageDraftPosition')
        if adp is None:
            adp = 0.0
        if player_name in all_players:
            all_players[player_name]['ADP'] = adp
    for player in all_players:
        if 'ADP' not in all_players[player]:
            all_players[player]['ADP'] = 0.0
    return all_players



roster = get_rosters()
attributes = get_attributes(roster)

# To Save
with open('nfl_players.json', 'w') as f:
    json.dump(attributes, f, indent=4)
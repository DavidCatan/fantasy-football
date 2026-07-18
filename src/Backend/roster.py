import espn_api.football as espn
import requests
import json

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

roster = get_rosters()
# To Save
with open('nfl_players.json', 'w') as f:
    json.dump(roster, f, indent=4)
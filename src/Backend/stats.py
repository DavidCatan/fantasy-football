import requests
import json 

def get_weekly_stats(week_num):
    # 1. Get Game IDs for the week
    scoreboard_url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week={week_num}"
    games = requests.get(scoreboard_url).json()['events']
    
    weekly_data = {}

    for game in games:
        game_id = game['id']
        # 2. Get Boxscore for each game
        summary_url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={game_id}"
        box = requests.get(summary_url).json()
        
        # 3. Parse players out of the boxscore
        for team_data in box.get('boxscore', {}).get('players', []):
            team_name = team_data['team']['displayName']
            for stat_category in team_data['statistics']:
                keys = stat_category['keys'] # ['passingYards', 'passingTouchdowns', etc]
                for athlete_entry in stat_category['athletes']:
                    player_name = athlete_entry['athlete']['displayName']
                    stats_values = athlete_entry['stats']
                    
                    # Map keys to values
                    player_stats = dict(zip(keys, stats_values))
                 #   player_stats['name'] = player_name
                  #  player_stats['team'] = team_name
                    if player_name in weekly_data:
                        weekly_data[player_name].update(player_stats)
                    else:
                        weekly_data.update({player_name: 
                            player_stats
                        })
    
    return weekly_data

stats = get_weekly_stats(1)
with open('nfl_stats.json', 'w') as f:
    json.dump(stats, f, indent=4)
# Example: Get all stats for NFL Week 1
# week_1_stats = get_weekly_stats(1)
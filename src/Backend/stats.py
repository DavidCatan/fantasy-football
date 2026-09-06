import requests
import json 

with open('nfl_players.json') as f:
    player_data = json.load(f)

def get_weekly_stats(player_data):
    SEASON = 2026
    weekly_data = {"week" :  {}}
    for week_num in range(1,2):
        # 1. Get Game IDs for the week
        scoreboard_url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week={week_num}&dates={SEASON}"
        games = requests.get(scoreboard_url).json()['events']
        weekly_data["week"].update({week_num :{}})
        print(1)
        for game in games:
            game_id = game['id']
            # 2. Get Boxscore for each game
            summary_url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={game_id}"
            box = requests.get(summary_url).json()
            print(2)
            # 3. Parse players out of the boxscore
            for team_data in box.get('boxscore', {}).get('players', []):
                print(3)
                #team_name = team_data['team']['displayName']
                for stat_category in team_data['statistics']:
                    keys = stat_category['keys'] # ['passingYards', 'passingTouchdowns', etc]
                    for athlete_entry in stat_category['athletes']:
                        player_name = athlete_entry['athlete']['displayName']
                        player_stats = None

                        if player_name not in player_data:
                            continue
                        
                        if stat_category['name'] == 'kicking':
                            madeFG = []
                            missedFG = 0
                            madeXP = 0
                            missedXP = 0

                            for drive in box['drives']['previous']:
                                if drive['team']['displayName'] != player_data[player_name]['team']:
                                    continue
                                # Find the play that resulted in the kicking stat
                                if drive['result'] == 'FG':
                                    for play in drive['plays']:
                                        if 'scoringPlay' in play and play['scoringPlay']:
                                            madeFG.append(play['statYardage'])
                                            break                                    
                                    
                                elif drive['result'] == 'MISSED FG':
                                    missedFG += 1

                                elif drive['result'] == 'TD':
                                    for play in drive['plays']:
                                        if 'pointAfterAttempt' in play:
                                            if play['pointAfterAttempt']['text'] == 'Extra Point Good':
                                                madeXP += 1
                                            elif play['pointAfterAttempt']['text'] == 'Extra Point Missed':
                                                missedXP += 1
                                            break

                            player_stats = {
                                'madeFG' : madeFG,
                                'missedFG' : missedFG,
                                'madeXP' : madeXP,
                                'missedXP' : missedXP
                            }
                        else:    
                            # Map keys to values
                            stats_values = athlete_entry['stats']
                            player_stats = dict(zip(keys, stats_values))
                        #   player_stats['name'] = player_name
                        #  player_stats['team'] = team_name

                        if player_name in weekly_data["week"][week_num]:
                            weekly_data["week"][week_num][player_name].update(player_stats)
                        else:
                            weekly_data["week"][week_num].update({player_name: 
                                player_stats
                            })
    
    return weekly_data

#for i in range(1,19):
 #   stats = get_weekly_stats(i)

stats = get_weekly_stats(player_data)

with open('src/backend/2026_stats.json', 'w') as f:
    json.dump(stats, f, indent=4)
# Example: Get all stats for NFL Week 1
# week_1_stats = get_weekly_stats(1)
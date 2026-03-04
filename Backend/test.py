import json
from PIL import Image
from io import BytesIO
import requests

# To Load 
with open('nfl_players.json', 'r') as f:
    players = json.load(f)

George = players.get("George Pickens")
print(George)
url = George.get("headshot")
response = requests.get(url)
img = Image.open(BytesIO(response.content))

img.show()
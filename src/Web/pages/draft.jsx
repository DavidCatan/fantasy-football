import React from "react";
import players from "../utils/draftUtils";
import playerData from "../../../nfl_players.json";
import { playerNames, calculatePoints } from "../utils/draftUtils";
import Modal from "react-modal";
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Button, ButtonGroup, TextField } from "@mui/material";
import {draftPlayer, determineSlot} from "../utils/draftUtils";
import { data } from "react-router-dom";
import {getRosteredPlayers, getLeagues, getTeam, getDraftOrder, getTeamRoster} from '../utils/leagueUtils';

const SEASON = "2025"; 

var DRAFT_ORDER;
const MAX_SLOTS = 13;

// TODO: disable ability to change roster lineup while drafting!!


const Draft = () => {
    const [pos, setPosition] = React.useState("all");
    const [team, setTeam] = React.useState(null);
    const [league, setLeague] = React.useState(null);
    const [draftedPlayers, setDraftedPlayers] = React.useState([]);
    const [curDraftTeam, setDraftTeam] = React.useState();
    const [owner, setOwner] = React.useState();
    const [loading, setLoading] = React.useState(true);
    const [roster, setRoster] = React.useState([]);
    const [posCount, setPosCount] = React.useState({"qb": 0, "rb" : 0, "wr": 0, "flex": 0, "te": 0, "k" : 0, "bn" : 0, "total": 0});

    const ws = React.useRef(null);


    const getRostered = async () => {
        try{
            setDraftedPlayers(await getRosteredPlayers(league));
            setLoading(false);
        } catch(err){
            alert('error getting rostered data');
        }
    };

    // check session and league
    React.useEffect(() => {
        fetch('http://localhost:3001/api/session', {credentials: 'include'})
            .then(res => res.json())
            .then(data => {
                if(data.logged){
                setOwner(data['username']);
                }
                else{
                setOwner(null);
                }
            });
        fetch('http://localhost:3001/api/league', {credentials: 'include'})
            .then(res => res.json())
            .then(data => {
                if(data.activeLeague){
                    setLeague(data["activeLeague"]);
                }
                else{
                    setLeague(null);
                }
            });
    }, [])
    
    React.useEffect(() => {
        if(!owner || !league){
            return;
        }
        const loadLeagueData = async () => {
            try{
                let t = await getTeam(league, owner);
                let r = await getTeamRoster(league, t["data"]["id"]);
                if(r){
                    setRoster(r);
                    console.log(r);
                    r.forEach((player) => {
                        determineSlot(player.player_pos, posCount);
                    })
                }
                setTeam(t["data"]["id"]);
            } catch(err){
                console.log(err);
                alert('error getting league data');
            }
        }
       
        loadLeagueData();

    },[owner, league]);

    React.useEffect(() => {
        
        if(!league || !team || !owner){
            return;
        }
      
        getRostered();

        ws.current = new WebSocket(`ws://localhost:3001/draft?league=${league}`);

        ws.current.onopen = () => {
            console.log("Connected to WebSocket Server!");
        };

        // update page when message received from server
        ws.current.onmessage = (message) => {
            //console.log(message);
            const data = JSON.parse(message.data);
            if(data['type'] == 'UPDATE_BOARD'){
                getRostered();
            }
            if(data['type'] == 'DRAFT_ORDER'){
                DRAFT_ORDER = data['data'];
                //setDraftTeam(DRAFT_ORDER[0]);
                console.log(DRAFT_ORDER);
            }
            if(data['type'] == 'UPDATE_DRAFTER'){
                console.log('setting draft team');
                setDraftTeam(data['data']);
            }
        }
        ws.current.onerror = (error) => {
            console.log(error);
        }

        return () => {
            if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
                console.log('closing');
                ws.current.close();
            }
        };

    }, [league, team]);

    
    if(loading){
        return <div className="text-3xl font-bold mb-4 text-slate-800">Loading...</div>;
    }

    if(posCount["total"] >= MAX_SLOTS){
        return <div className="text-3xl font-bold mb-4 text-slate-800">Draft Complete!</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl mt-5">
            <h1 className="text-3xl font-bold mb-4 text-slate-800 text-center">Draft</h1>
            <div className="mb-6">


                <ButtonGroup variant="outlined" disableElevation>
                    {["all", "QB", "RB", "WR", "TE"].map((p) => (
                        <Button key={p} onClick={() => setPosition(p)} className="capitalize">
                            {p}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>
            <PlayerList pos={pos} draftedPlayers={draftedPlayers} setDraftedPlayers={setDraftedPlayers} curDraftTeam={curDraftTeam} team={team} league={league} ws={ws}
            posCount={posCount} />
        </div>
    );

    
};

function PlayerList({ pos, draftedPlayers, setDraftedPlayers, curDraftTeam, team, league, posCount, ws }) {
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [curPlayer, setPlayer] = React.useState("");

    const displayedPlayers = isExpanded ? players[pos] : players[pos].slice(0, 30);

    function openModal(player) {
        if (!player) return;
        setPlayer(player);
        setIsOpen(true);
    }
    /*
        TODO for autocomplete: 
            make search bar clear after player selected
            use arrow keys to select 
            sort by points like the main list
    */
    return (
        <div className="space-y-4">
            <Autocomplete
                disablePortal
                options={playerNames}
                noOptionsText="No Players"
                filterOptions={createFilterOptions({ limit: 20 })}
                renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    const isAvailable = !draftedPlayers.includes(Number(playerData[option].id));
                    if (isAvailable){
                        return (
                            <li key={key} {...optionProps} className="flex items-center gap-3 p-2 hover:bg-slate-100 cursor-pointer">
                                <img src={playerData[option].headshot} className="w-12 h-12 rounded-full border border-slate-200 
                                bg-radial via-yellow-400 to-orange-700 object-cover" loading="lazy" alt={option.name} />
                                <div className="font-bold text-slate-700">{option}</div>
                            </li>
                        );
                    }
                }}
                renderInput={(params) => <TextField {...params} label="Search for a player" />}
                onChange={(event, player) => openModal(playerData[player])}
                className="bg-white rounded-lg shadow-sm"
            />

            <ul className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                {displayedPlayers.map((player) => {
                    const isAvailable = !draftedPlayers.includes(Number(player.id));
                    if (isAvailable){
                        return (
                            <li key={player.id} className="list-none">
                                <button 
                                    onClick={() => openModal(player)} 
                                    className="w-full flex items-center gap-4 p-3 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <img src={player.headshot} className="w-15 h-12 rounded-full border border-slate-200 bg-radial
                                    via-yellow-400 to-orange-700" loading="lazy" alt={player.name} />
                                    <span className="font-semibold text-slate-700">
                                        {player.name} <span className="text-slate-400 font-normal ml-2">| {player.position}</span>
                                    </span>
                                </button>
                            </li>
                        )
                    }
                    
                }
                )}
            </ul>

            {!isExpanded && (
                <button 
                    onClick={() => setIsExpanded(true)} 
                    className="mt-4 mx-auto flex px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-all font-medium"
                >
                    View All
                </button>
            )}

            <PlayerModal player={curPlayer} isOpen={modalIsOpen} draftedPlayers={draftedPlayers} 
            setDraftedPlayers={setDraftedPlayers} close={() => setIsOpen(false)} curDraftTeam={curDraftTeam} team={team} league={league} ws={ws}
            posCount={posCount} />
        </div>
    );
}

function PlayerModal({ player, isOpen, close, draftedPlayers, setDraftedPlayers, curDraftTeam, league, team, posCount, ws }) {
    if (!player) return null;

    React.useEffect(() => {
        if(draftedPlayers.includes(Number(player.id)) && isOpen) {
            alert('player has been drafted! you got sniped!');
            close();
        }

    }, [draftedPlayers, isOpen]);

    const data = calculatePoints(player.name);
    
    const modalStyles = {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '16px',
            border: 'none',
            padding: '24px',
            maxWidth: '90%',
            width: '400px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        },
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }
    };
    console.log(curDraftTeam);
    console.log('team', team);

    var wideimage; 
    if (Math.floor(Math.random() * 20) == 0){
        wideimage = "w-500 h-30 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner bg-radial via-yellow-400 to-orange-700";
    } 
    else{
        wideimage = "w-36 h-30 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner bg-radial via-yellow-400 to-orange-700";
    }

    var draftbutton;
    if (team["id"] == curDraftTeam){
        draftbutton = "px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-all font-medium";
    }
    else{
        draftbutton = "px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-gray-400 text-white rounded-full font-medium";
    }
    
    function draftPlayer(team, player){
        if(posCount["total"] >= MAX_SLOTS){
            alert('Draft is complete!');
            close();
            return;
        }
        if(draftedPlayers.includes(player.id)){
            alert('Player is rostered!');
            close();
            return;
        }
        if(team["id"] != curDraftTeam){
            alert('you are not on the clock!');
            close();
            return;
        }
        if(ws.current && ws.current.readyState === WebSocket.OPEN){
            let slot = determineSlot(player.position, posCount);  
            console.log(slot);          
            updateDraftDB(team["id"], league, player, slot);
            ws.current.send(JSON.stringify({'type': 'UPDATE_DRAFTER', 'data' : league}));
        }
        else{
            alert('websocket connection error');
        }
        //setDraftedPlayers((prev) => [...prev, player.id]);
        close();
    }

    return (
        <Modal isOpen={isOpen} style={modalStyles} onRequestClose={close} closeTimeoutMS={200}>
            <div className="relative">
                <button onClick={close} className="absolute -top-2 -right-2 text-slate-400 hover:text-slate-600 font-bold">✕</button>
                
                <div className="text-center mb-4">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{player.name}</h2>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">{player.team} | {player.position}</h3>
                    <img src={player.headshot} className={wideimage} alt={player.name} />
                </div>

                <button 
                    onClick={() => 
                        {if(team["id"] == curDraftTeam){
                            draftPlayer(team["id"], player);
                        }}
                    }
                    className={draftbutton}
                >
                    Draft
                </button>

                <div className="max-h-[400px] overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-center border-collapse">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Week</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((points, index) => (
                                <tr key={index} className="hover:bg-blue-50 transition-colors even:bg-slate-50/50">
                                    <td className="p-3 text-slate-500 font-medium">{index + 1}</td>
                                    <td className="p-3 font-bold text-slate-800">{points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}

async function updateDraftDB(teamId, leagueId, player, slot){
    const response = await fetch ('http://localhost:3001/api/draft', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body:
        JSON.stringify({
            teamId: teamId,
            leagueId: leagueId,
            playerId: player.id,
            playerName: player.name,
            playerPos: player.position,
            slot: slot
        }),
        credentials: 'include'
    });

}




export default Draft;
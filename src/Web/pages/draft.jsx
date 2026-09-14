import React from "react";
import players from "../utils/draftUtils";
import playerData from "../../../nfl_players.json";
import { nameArray } from "../utils/draftUtils";
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Button, ButtonGroup, TextField } from "@mui/material";
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import {determineSlot} from "../utils/draftUtils";
import {getRosteredPlayers} from '../utils/leagueUtils';
import { useLeague } from "../utils/LeagueContext";
import { PlayerModal } from "../utils/playerUtils";

const MAX_SLOTS = 14;
let timerInterval = null;

// TODO: disable ability to change roster lineup while drafting!!


const Draft = () => {

    const {showAlert, owner, league, leagueOwner, team, posCount, draftStatus, setDraftStatus, setRoster} = useLeague();

    const [pos, setPosition] = React.useState("all");
    const [draftedPlayers, setDraftedPlayers] = React.useState([]);
    const [curDraftTeam, setDraftTeam] = React.useState();
    const [loading, setLoading] = React.useState(true);
    
    const [draftClock, setDraftClock] = React.useState(0);
    const [draftOrder, setDraftOrder] = React.useState([]);
    const [draftIndex, setDraftIndex] = React.useState();

    const ws = React.useRef(null);


    const getRostered = async () => {
        try{
            setDraftedPlayers(await getRosteredPlayers(league));
            setLoading(false);
        } catch(err){
            showAlert('error', 'Error fetching rostered data. Try refreshing');
        }
    };

    React.useEffect(() => {
        if(draftOrder.length == 0 || draftIndex == undefined){
            return;
        }
        let draftTeam = draftOrder[draftIndex];
        setDraftTeam(draftTeam);
        
        if(draftTeam?.id == team){
            showAlert('success', 'You are on the clock!');
        }

    }, [draftIndex, team]);

    React.useEffect(() => {
        
        if(!league || !team || !owner){
            return;
        }
      
        getRostered();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/draft?league=${league}&team=${team}`;

        ws.current = new WebSocket(wsUrl); 
        //ws.current = new WebSocket(`ws://localhost:3000/draft?league=${league}&team=${team}`);

        ws.current.onopen = () => {
            console.log("Connected to WebSocket Server!");
        };

        // update page when message received from server
        ws.current.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if(data['type'] == 'UPDATE_BOARD'){
                setDraftedPlayers((prev) => [...prev, data['data']]);
            }
            else if(data['type'] == 'DRAFT_ORDER'){
                setDraftOrder(data['data']);
            }
            else if(data['type'] == 'UPDATE_DRAFTER'){
                setDraftIndex(data['data']);
            }
            else if(data['type'] == 'UPDATE_DRAFT_STATUS'){
                setDraftStatus(data['data']);
            }
            else if(data['type'] == 'UPDATE_CLOCK'){
                startDraftTimer(data['data'], setDraftClock);
            }
            else if(data['type'] == 'AUTODRAFTED'){
                setRoster((prev) => [...prev, data['data']]);
            }

        }
        ws.current.onerror = (error) => {
            showAlert("error", error);
        }

        return () => {
            if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
                ws.current.close();
            }
        };

    }, [league, team]);

    const handleStartDraft = async () => {
        const response = await fetch('/api/leagues/start-draft', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({teamId : team, leagueId : league}),
        });

        const data = await response.json();
        if(response.ok){
            showAlert('success', data.message);
        }
        else{
            showAlert('error', data.message);
        }
    }

    
    if(loading){
        return <div className="text-3xl font-bold mb-4 text-slate-800">Loading...</div>;
    }

    if(draftStatus == 'NOT_STARTED'){
        return(
            <>
                {owner == leagueOwner ? 
                    <button className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 
                    transition-all font-medium" onClick={handleStartDraft}>
                        Begin Draft
                    </button>
                :  <div className="text-3xl font-bold mb-4 text-slate-800">Draft has not begun!</div>
                
                }
            </>
        )
    }
    else if(draftStatus == 'COMPLETE'){
        return <div className="text-3xl font-bold mb-4 text-slate-800">Draft Complete!</div>;
    }

    if(posCount["total"] >= MAX_SLOTS){
        return <div className="text-3xl font-bold mb-4 text-slate-800">Draft Complete!</div>;
    }

    return (
        <div className="p-6 max-w-8xl mx-auto bg-white w-full">
            <h1 className="text-3xl font-bold mb-4 text-slate-800 text-center">Draft</h1>
            <PickOrder draftOrder={draftOrder} draftIndex={draftIndex} picksShown={10} draftClock={draftClock} userTeam={team} />
            <br></br>
            <div className="mb-6">

                <ButtonGroup variant="outlined" disableElevation>
                    {["all", "QB", "RB", "WR", "TE", "PK"].map((p) => (
                        <Button key={p} onClick={() => setPosition(p)} className="capitalize">
                            {p}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>
            <PlayerList pos={pos} draftedPlayers={draftedPlayers} setDraftedPlayers={setDraftedPlayers} curDraftTeam={curDraftTeam?.id} team={team} league={league} ws={ws}
             />
        </div>
    );

    
};

function PickOrder({ draftOrder, draftIndex, picksShown, draftClock, userTeam }){
    if(!draftOrder || draftIndex == undefined) return;

    const {showAlert} = useLeague();

    var teams = [];
    for(let i = 0; i < picksShown; i++){
        teams[i] = draftOrder[(draftIndex+i) % draftOrder.length];
    }

    return(
        <>
            <Stack spacing={1} direction={"row"}   divider={<Divider orientation="vertical" flexItem />} 
                sx={{
                    justifyContent: "flex-start",
                    alignItems: "center",
                }}
            >
                {teams.map((team, index) => {
                    let curTeam = team?.name ? team["name"] : team?.owner
                    return(
                        <div key={index} className={` 
                            flex flex-col justify-center items-center text-center p-2 text-sm font-semibold h-30 break-all 
                            ${team?.id == userTeam ? "bg-green-500" : "bg-gray-300"}
                            ${index == 0 ? "w-1/4 " 
                                : "w-1/10 text-xs"}`
                        }>
                                <span className="w-full break-all line-clamp-2">
                                    {curTeam}
                                </span>
                                
                                <span className="mt-1 block truncate w-full">
                                    {index == 0 ? " is on the clock! " : undefined}
                                </span>
                                <span className="mt-1 block truncate w-full">
                                    {index == 0 ? draftClock : undefined}
                                </span>
                               
                        </div>
                    );
                })}
            </Stack>  
        </>
    );
}

function PlayerList({ pos, draftedPlayers, setDraftedPlayers, curDraftTeam, team, league, ws }) {
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
                options={nameArray}
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

            <DraftModal player={curPlayer} modalIsOpen={modalIsOpen} draftedPlayers={draftedPlayers} setIsOpen={setIsOpen}
            setDraftedPlayers={setDraftedPlayers} close={() => setIsOpen(false)} curDraftTeam={curDraftTeam} team={team} league={league} ws={ws}
            />
        </div>
    );
}

function DraftModal({ player, close, modalIsOpen, setIsOpen, draftedPlayers, setDraftedPlayers, curDraftTeam, league, team, ws }) {
    if (!player) return null;

    const {showAlert, posCount, setRoster} = useLeague();    

    React.useEffect(() => {
        if(draftedPlayers.includes(Number(player.id)) && modalIsOpen) {
            showAlert('warning', 'Player has been drafted! You got sniped!');
            close();
        }

    }, [draftedPlayers, modalIsOpen]);

    var draftbutton;
    if (team == curDraftTeam){
        draftbutton = "px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-all font-medium";
    }
    else{
        draftbutton = "px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-gray-400 text-white rounded-full font-medium";
    }
    function draftPlayer(team, player){
        if(posCount["total"] >= MAX_SLOTS){
            showAlert('info', 'Draft is complete!');
            close();
            return;
        }
        if(draftedPlayers.includes(player.id)){
            showAlert('warning', 'Player is rostered!');
            close();
            return;
        }
        if(team != curDraftTeam){
            showAlert('warning', 'You are not on the clock!');
            close();
            return;
        }
        if(ws.current && ws.current.readyState === WebSocket.OPEN){
            let slot = determineSlot(player.position, posCount);  
            updateDraftDB(team, league, player, slot, showAlert, setRoster);
            ws.current.send(JSON.stringify({'type': 'UPDATE_DRAFTER', 'data' : league}));
        }
        else{
            showAlert('error', 'Websocket connection error');
        }
        close();
    }

    return (
        <PlayerModal player={player} isOpen={modalIsOpen} close={() => setIsOpen(false)} zIndex={1000}
            button={<button
                    onClick={() => 
                        {if(team == curDraftTeam){
                            draftPlayer(team, player);
                        }}
                    }
                    className={draftbutton}
                
                >
                Draft
                </button>
            }

        />
    );
}

function startDraftTimer(pickDeadline, setDraftClock){
    if(timerInterval){
        clearInterval(timerInterval);
    }

    updateTime();
    timerInterval = setInterval(updateTime, 1000);

    function updateTime(){
        let timeDiff = pickDeadline - Date.now();
        let clock = [
                Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
                    .toString()
                    .padStart(2, "0"),
                Math.floor((timeDiff % (1000 * 60)) / 1000)
                    .toString()
                    .padStart(2, "0")
        ];
        if(timeDiff < 0){
            clearInterval(timerInterval);
        }
        else{
            setDraftClock(clock.join(":"));
        }
    }
       
}

async function updateDraftDB(teamId, leagueId, player, slot, showAlert, setRoster){
    const response = await fetch ('/api/draft', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body:
        JSON.stringify({
            teamId: teamId,
            leagueId: leagueId,
            playerId: Number(player.id)
        }),
        credentials: 'include'
    });
    let data = await response.json();
    if(!response.ok){
        showAlert('error', data.message);
    }
    else{
        showAlert('success', data.message);
        setRoster((prev) => [...prev, data.data]);
    }

}


export default Draft;
import React from "react";
import players from "../utils/draftUtils";
import playerData from "../../../nfl_players.json";
import { playerNames, calculatePoints } from "../utils/draftUtils";
import Modal from "react-modal";
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Button, ButtonGroup, TextField } from "@mui/material";
import {draftPlayer, determineSlot} from "../utils/draftUtils";
import { data } from "react-router-dom";
import {getRosteredPlayers, getLeagues, getTeam, getDraftOrder, getTeamRoster, ROSTER_TEMPLATE, dropPlayer} from '../utils/leagueUtils';
import { PlayerModal } from "../utils/playerUtils";

const SEASON = "2025"; 
const MAX_SLOTS = 13;

const Players = () => {
    const [pos, setPosition] = React.useState("all");
    const [team, setTeam] = React.useState(null);
    const [league, setLeague] = React.useState(null);
    const [rosteredPlayers, setRosteredPlayers] = React.useState([]);
    const [owner, setOwner] = React.useState();
    const [loading, setLoading] = React.useState(true);
    const [roster, setRoster] = React.useState([]);
    const [lineup, setLineup] = React.useState({});
    const [posCount, setPosCount] = React.useState({"qb": 0, "rb" : 0, "wr": 0, "flex": 0, "te": 0, "k" : 0, "bn" : 0, "total": 0});
    const [changedLineup, setChangedLineup] = React.useState(false);

    const getRostered = async () => {
        try{
            setRosteredPlayers(await getRosteredPlayers(league));
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
                let l = new Map();
                let p = {"qb": 0, "rb" : 0, "wr": 0, "flex": 0, "te": 0, "k" : 0, "bn" : 0, "total": 0};
                if(r){
                    setRoster(r);
                    console.log(r);
                    r.forEach((player) => {
                        determineSlot(player.player_pos, p);
                        l.set(player["player_slot"], player["player_name"]);
                    })
                }
                setLineup(l);
                setTeam(t["data"]["id"]);
                setPosCount(p);
            } catch(err){
                console.log(err);
                alert('error getting league data');
            }
        }
       
        loadLeagueData();

    },[owner, league, changedLineup]);

    React.useEffect(() => {
        
        if(!league || !team || !owner){
            return;
        }
      
        getRostered();

    }, [league, team, changedLineup]);

    
    if(loading){
        return <div className="text-3xl font-bold mb-4 text-slate-800">Loading...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl mt-5">
            <h1 className="text-3xl font-bold mb-4 text-slate-800 text-center">Players</h1>
            <div className="mb-6">
                <ButtonGroup variant="outlined" disableElevation>
                    {["all", "QB", "RB", "WR", "TE"].map((p) => (
                        <Button key={p} onClick={() => setPosition(p)} className="capitalize">
                            {p}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>
               <PlayerList pos={pos} rosteredPlayers={rosteredPlayers} setRosteredPlayers={setRosteredPlayers} team={team} league={league}
            posCount={posCount} roster={roster} lineup={lineup} changedLineup={changedLineup} setChangedLineup={setChangedLineup}  />
        </div>
    );
};

function PlayerList({ pos, rosteredPlayers, setRosteredPlayers, team, league, posCount, roster, lineup, changedLineup, setChangedLineup }) {
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [curPlayer, setPlayer] = React.useState("");
    const [dropIsOpen, setDropOpen] = React.useState(false);

    const displayedPlayers = isExpanded ? players[pos] : players[pos].slice(0, 30);

    function openModal(player) {
        if (!player) return;
        setPlayer(player);
        setIsOpen(true);
    }

    const openDropModal = () => {
        setDropOpen(true);
    };
    const closeDropModal = () => {
        setDropOpen(false);
    };
    
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
                    const isAvailable = !rosteredPlayers.includes(Number(playerData[option].id));
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
                    const isAvailable = !rosteredPlayers.includes(Number(player.id));
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

            {/* Modal that opens after initial click on player */}
            <PlayerModal player={curPlayer} isOpen={modalIsOpen} close={() => setIsOpen(false)} 
                button={<AddButton open={openDropModal} zIndex={1000}/>} 
            />

            <DropModal player={curPlayer} rosteredPlayers={rosteredPlayers}
                setRosteredPlayers={setRosteredPlayers} team={team} league={league} isOpen={dropIsOpen}
                posCount={posCount} roster={roster} lineup={lineup} closeParent={() => setIsOpen(false)}
                setChangedLineup={setChangedLineup} changedLineup={changedLineup} close={closeDropModal}/>
        </div>
    );
}


function AddButton({open}) {
    return(
        <button 
            onClick={open}
            className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-all font-medium"
        >
            Add
        </button>
    )
}

function DropModal({ player, rosteredPlayers, setRosteredPlayers, roster, lineup, league, team, posCount, closeParent, changedLineup, setChangedLineup, close, isOpen}) {
    if (!player) return null;
    const[droppedPlayer, setDroppedPlayer] = React.useState();
    const [updatedSlot, setUpdatedSlot] = React.useState();
    const [emptySlot, setEmptySlot] = React.useState(false);

    function addPlayer(team, player){
         if(rosteredPlayers.includes(player.id)){
            alert('Player is rostered!');
            handleClose();
            closeParent();
            return;
        }
        if(!updatedSlot){
            alert("select slot to add player to!");
            return;
        }
        if(!updatedSlot["eligiblePositions"].includes(player["position"])){
            alert("positions don't match");
            return;
        }
        else if(droppedPlayer){
            // if player is successfully dropped, update lineup before adding new player
            dropPlayer(team, league, droppedPlayer)
                .then(data => {  
                    alert(data["message"]);
                    if(data["success"]){
                        posCount[droppedPlayer["position"]]--;
                        posCount[player["position"]]++;
                    }    
                    else{
                        handleClose();
                        closeParent();
                        return;
                    }             
                })
                .catch(err => {                   
                    console.error("Request failed:", err);
                });
        }
        else if(emptySlot){ // update lineup if an open slot is selected
            posCount[player["position"]]++;
            posCount["total"]++;
        }
       
        // add new player if slot is open or player is dropped  
        updatePlayerDB(team, league, player, updatedSlot["id"]);
        setChangedLineup(!changedLineup);
        close();
        closeParent();
    }

    React.useEffect(() => {
        if(rosteredPlayers.includes(Number(player.id)) && isOpen) {
            alert('player has been rostered! you got sniped!');
            close();
        }

    }, [rosteredPlayers, isOpen]);
    
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
            width: '70%',
            height: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            backgroundColor: '#1e293b'
        },
        overlay: { backgroundColor: 'rgba(16, 15, 15, 0.5)', zIndex: 1001 }
    };

    return (
        <>
            
            <Modal isOpen={isOpen} style={modalStyles} onRequestClose={close} closeTimeoutMS={200}
                >
                <Lineup team={team} league={league} roster={roster} lineup={lineup} player={player} setDroppedPlayer={setDroppedPlayer} 
                droppedPlayer={droppedPlayer} setUpdatedSlot={setUpdatedSlot} updatedSlot={updatedSlot} setEmptySlot={setEmptySlot}/>
                <button 
                    onClick={() => addPlayer(team, player)}
                    className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all font-medium"
                >
                Add Player
                </button>
            </Modal>
        </>
    );
}

async function updatePlayerDB(teamId, leagueId, player, slot){
    const response = await fetch ('http://localhost:3001/api/add', {
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
    const data = await response.json();
    if(response.ok){
        alert('successfully added player!');
    }
    else{
        alert(data["message"]);
    }

}

function Lineup({team, league, roster, lineup, changedLineup, setChangedLineup, player, setDroppedPlayer, droppedPlayer, updatedSlot, setUpdatedSlot, setEmptySlot}){
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [curPlayer, setPlayer] = React.useState("");
    const [eligibleSlots, setEligibleSlots] = React.useState([]);
    const [clicked, setClicked] = React.useState(false);

    function openModal(player) {
        if (!player) return;
        setPlayer(player);
        setIsOpen(true);
    }

    return(
        <div className="max-w-4xl mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Roster</h2>
            
            <div className="flex flex-col gap-2">
                {ROSTER_TEMPLATE.map((slot, index) => {
                    const playerInSlot = playerData[lineup?.get(slot["id"])];

                    return(
                        <div key={slot["id"]} className='flex items-center justify-between pl-3 rounded-md border'>
                            <div className= 
                            {
                                ` px-2 py-1 rounded text-md
                                ${slot["label"] == "QB" ? 'bg-red-900' 
                                    : slot["label"] == "RB" ? 'bg-blue-900' 
                                    : slot["label"] == "WR" ? 'bg-green-900'
                                    : slot["label"] == "TE" ? 'bg-purple-900'
                                    : slot["label"] == "FLEX" ? 'bg-pink-900'
                                    : 'bg-gray-700'
                                }`
                            }>
                                {slot["label"]}
                            </div>
                            <div className='flex-1 items-center justify-between p-3'>
                            {playerInSlot ? 
                                    <button 
                                        onClick={() => openModal(playerInSlot)} 
                                        className="w-full flex items-center gap-4 text-left hover:bg-slate-50 hover:text-slate-700 transition-colors rounded-md"
                                    >
                                        <img src={playerInSlot.headshot} className="w-15 h-12 rounded-full border border-slate-200 bg-radial
                                        via-yellow-400 to-orange-700" loading="lazy" alt={playerInSlot.name} />
                                        <span className="font-semibold text-white-700">
                                            {playerInSlot.name} <span className="text-slate-400 font-normal ml-2">| {playerInSlot.position}</span>
                                        </span>
                                    </button>
                            : <span className="italic text-slate-500" >Empty</span>
                            }
                            </div>
                            
                                
                            <div>
                                <button onClick={() => 
                                    {
                                        if( playerInSlot&&slot["eligiblePositions"].includes(player["position"])&&!droppedPlayer ){
                                            setDroppedPlayer(playerInSlot);
                                            setClicked(true);
                                            setUpdatedSlot(slot);
                                        }
                                        else if(slot == updatedSlot){
                                            setDroppedPlayer(null);
                                            setClicked(false);
                                            setUpdatedSlot(null);
                                        }
                                        else if(!playerInSlot&&slot["eligiblePositions"].includes(player["position"])){
                                            setEmptySlot(true);
                                            setDroppedPlayer(null);
                                            setUpdatedSlot(slot);
                                            setClicked(true);
                                        }
                                        else{
                                            undefined;
                                        }
                                    }
                                   //</div> playerInSlot&&slot["eligiblePositions"].includes(player["position"])&&!droppedPlayer ? setDroppedPlayer(playerInSlot)
                                    //</div>: playerInSlot==droppedPlayer ? setDroppedPlayer(null)
                                   //: undefined
                                }

                                className={`px-6 mb-4 mt-4 mr-2 mx-auto flex px-6 py-2 rounded-full border transition-all font-medium 
                                ${clicked&&playerInSlot&&slot==updatedSlot ? "bg-red-700 text-white border-10 border-red-900 hover:bg-red-300 hover:text-black"
                                    :playerInSlot&&slot["eligiblePositions"].includes(player["position"]) ? "bg-red-300 text-black hover:bg-red-700 hover:text-white"
                                    :!playerInSlot&&clicked&&slot==updatedSlot ? "bg-green-600 text-white border-10 border-green-900 hover:bg-green-400 hover:text-black"
                                    :!playerInSlot&&slot["eligiblePositions"].includes(player["position"]) ? "bg-green-400 text-black hover:bg-green-600 hover:text-white"
                                    : "bg-black"
                                } `}>
                                    {playerInSlot&&slot["eligiblePositions"].includes(player.position) ? "Drop" 
                                    :!playerInSlot&&slot["eligiblePositions"].includes(player.position) ? "Open"
                                    : "Locked"}
                                </button>
                            </div>
                        </div>

                    );
                })}
            </div>
            {/* Modal for player data from roster modal */}
            <PlayerModal player={curPlayer} isOpen={modalIsOpen} close={() => setIsOpen(false)} zIndex={1002}/>
        </div>
    );
}

export default Players;
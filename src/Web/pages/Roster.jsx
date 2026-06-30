import React from "react";
import players from "../utils/draftUtils";
import playerData from "../../../nfl_players.json";
import { playerNames, calculatePoints } from "../utils/draftUtils";
import Modal from "react-modal";
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Button, ButtonGroup, TextField } from "@mui/material";
import {getTeam, getTeamRoster, ROSTER_TEMPLATE, dropPlayer, getTrades, getTeams} from '../utils/leagueUtils';
import { PlayerModal, RosterSlots } from "../utils/playerUtils";

const MODAL_STYLES = {
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
            width: '700px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        },
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }
    };

const Roster = () => {

    const [team, setTeam] = React.useState(null);
    const [teams, setTeams] = React.useState([]);
    const [league, setLeague] = React.useState(null);
    const [owner, setOwner] = React.useState();
    const [roster, setRoster] = React.useState();
    const [lineup, setLineup] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [changedLineup, setChangedLineup] = React.useState(false);
    const [trades, setTrades] = React.useState([]);

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
        const loadTeamData = async () => {
            try{
                // get team, roster, trades, and lineup
                let t = await getTeam(league, owner);
                let r = await getTeamRoster(league, t["data"]["id"]);
                let tr = await getTrades(league, t["data"]["id"]);
                let allTeams = await getTeams(league); // subject to change
                let l = new Map();
                if(r){
                    r.forEach((player) => {
                        l.set(player["player_slot"], player["player_name"]);
                    })
                }
                /*ROSTER_TEMPLATE.forEach((slot) => {
                    if(!l.has(slot["id"])){
                        l.set(slot["id"], "empty");
                    }
                });*/

                setTeam(t["data"]);
                setRoster(r);
                setLineup(l);
                setTrades(tr["data"]);
                setTeams(allTeams);
                console.log(l);
                console.log(r);
                setLoading(false);
            } catch(err){
                console.log(err);
                alert('error getting team data');
            }
        }
        
        loadTeamData();

    },[owner, league, changedLineup]);

    if(loading){
        return <div className="text-3xl font-bold mb-4 text-slate-800">Loading...</div>;
    }

    return(
        <Lineup team={team} league={league} roster={roster} lineup={lineup} changedLineup={changedLineup} setChangedLineup={setChangedLineup} 
        trades={trades} teams={teams}/>
        
    );
}

function Lineup({team, league, roster, lineup, changedLineup, setChangedLineup, trades, teams}){
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [curPlayer, setPlayer] = React.useState("");
    const [moving, setMoving] = React.useState(false);
    const [movingPlayer, setMovingPlayer] = React.useState();
    const [movingSlot, setMovingSlot] = React.useState();
    const [eligibleSlots, setEligibleSlots] = React.useState([]);


    function openModal(player) {
        if (!player) return;
        setPlayer(player);
        setIsOpen(true);
    }

    const movePlayer = (player, curSlot, index) => {
        if(moving&&player==movingPlayer){
            setMoving(false);
            setMovingPlayer();
            setMovingSlot();
            return;
        }

        if(moving && movingSlot){
            if(!movingPlayer){ // fill button clicked
                if(eligibleSlots.length > 0){
                    if(eligibleSlots.includes(player.position)){
                        console.log('interesting');
                        changeSlots(movingPlayer, movingSlot, player, curSlot, team);
                    }
                }
            }
            else if(!player){ // move player to empty slot
                if(eligibleSlots.length > 0){
                    if(eligibleSlots[index]){
                        console.log('interesting');
                        changeSlots(movingPlayer, movingSlot, player, curSlot, team);
                    }
                }
            }
            else{ // moving two players
                if(eligibleSlots.length > 0){
                    if(eligibleSlots[index] && movingSlot.eligiblePositions.includes(player.position)){
                        console.log('interesting');
                        changeSlots(movingPlayer, movingSlot, player, curSlot, team);
                    }
                }
            }
            
            setMoving(false);
            setMovingPlayer();
            setMovingSlot();
            setChangedLineup(!changedLineup);
        }
        else{
            if(player){
                const eSlots = [ROSTER_TEMPLATE.length];
                for(let i = 0; i < ROSTER_TEMPLATE.length; i++){
                    if(ROSTER_TEMPLATE[i].eligiblePositions.includes(player.position)){
                        eSlots[i] = true;
                    }
                }
                setEligibleSlots(eSlots);
            }
            else{
                setEligibleSlots(ROSTER_TEMPLATE[index]["eligiblePositions"]);
            }
           
            setMoving(true);
            setMovingPlayer(player);
            setMovingSlot(curSlot);
        }   
    }

    return(
        <div className="max-w-4xl mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-xl">
            <div className="flex">
                <ProfileModal name={team["name"]}/>

                <h2 className="flex text-2xl font-bold mb-4 pb-2 mt-4">Roster</h2>

                <TradeModal trades={trades}  teams={teams}/>

            </div>
            <hr className="border-b border-gray-700"></hr>
            <br></br>

            {/* Show team lineup */}
            <RosterSlots lineup={lineup} openModal={openModal}
                button={({ playerInSlot, slot, index }) => (
                    <MoveButton 
                        moving={moving} 
                        movingSlot={movingSlot} 
                        movingPlayer={movingPlayer}
                        movePlayer={movePlayer} 
                        playerInSlot={playerInSlot}
                        slot={slot}
                        index={index}
                    />
                )}
            />
    
            {/* Modal to show player data and option to drop */}
            <PlayerModal player={curPlayer} isOpen={modalIsOpen} close={() => setIsOpen(false)} zIndex={1000}
                button={<DropButton 
                            team={team} league={league} player={curPlayer} changedLineup={changedLineup}
                            setChangedLineup={setChangedLineup} close={() => setIsOpen(false)}
                        />} 
            />
        </div>
    );
}

function MoveButton({moving, movingSlot, movingPlayer, movePlayer, playerInSlot, slot, index}){
    return(
        <button onClick={() => moving&&playerInSlot&&!movingSlot.eligiblePositions.includes(playerInSlot.position) ?
            undefined 
            : moving&&movingPlayer&&!slot.eligiblePositions.includes(movingPlayer.position) ? undefined 
            : moving&&!playerInSlot&&!movingPlayer&&slot!=movingSlot ? undefined // clicking fill
            : movePlayer(playerInSlot, slot, index)} 
            className={`px-6 mb-4 mt-4 mr-2 mx-auto flex px-6 py-2 rounded-full transition-all font-medium 
                ${moving&&playerInSlot==movingPlayer ? "bg-blue-700 hover:bg-blue-500"
                    :moving&&playerInSlot&&!movingSlot.eligiblePositions.includes(playerInSlot.position) ? "bg-gray-500 text-black"
                    : moving&&!playerInSlot&&!movingPlayer&&slot!=movingSlot ? "bg-gray-500 text-black" // clicking fill
                    : moving&&movingPlayer&&!slot.eligiblePositions.includes(movingPlayer.position) ? "bg-gray-500 text-black" 
                    :"bg-slate-800 text-white hover:bg-blue-700"}
            `}>
                {playerInSlot ? "Move" : "Fill"}
        </button>
    );
}

function DropButton({team, league, player, changedLineup, setChangedLineup, close}) {
    return(
        <button 
            onClick={() =>{
                dropPlayer(team["id"], league, player)
                .then(data => {  
                    alert(data["message"]);
                    if(data["success"]){
                        setChangedLineup(!changedLineup);
                    }    
                })
                .catch(err => {                   
                    console.error("Request failed:", err);
                });
                ;
                close();
            }}
            className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all font-medium"
            >
            Drop
        </button>
    );
}

function ProfileModal({name}){
    const [profileIsOpen, setProfileOpen] = React.useState(false);
    const [displayName, setDisplayName] = React.useState(name);
    
    const openProfileModal = () => {
        setProfileOpen(true);
    }

    const handleClose = () => {
        setProfileOpen(false);
    }

    const handleDisplayName = async (e) => {
        e.preventDefault(); 

        if(!displayName){
            return(alert("Please enter a name!"));
        }

        const response = await fetch('http://localhost:3001/api/teams/change-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ displayName })
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            handleClose();
            location.reload(); // maybe put displayName in an earlier react state instead
        } else {
            alert("Could not change display name: " + data.message);
        }
    };


    return(
        <>
            <button className="flex w-40 px-6 mb-4 mt-2 ml-2 mx-auto flex px-6 py-2 rounded-full transition-all font-medium text-lg bg-blue-700 
                border hover:bg-blue-600 justify-center" onClick={openProfileModal}>
                    Profile
            </button>
            <Modal isOpen={profileIsOpen} style={MODAL_STYLES} onRequestClose={handleClose} closeTimeoutMS={200}>
                <div className="max-h-[400px] overflow-auto rounded-lg border border-slate-200">
                    <form onSubmit={handleDisplayName} className="space-y-6 ">
                        <div className="text-black">
                            <label className="block text-sm/6 font-medium">
                                Display Name
                            </label>
                            <div className="mt-2">
                                <input
                                id="displayName"
                                name="displayName"
                                type="text"
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                    placeholder={displayName}
                                className="block w-full rounded-md bg-gray-200 px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-black/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>
                        <div>
                        <button
                            type="submit"
                            className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                            Change Name
                        </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </>
    );
}

function TradeModal({trades, teams}) {
    const [tradeIsOpen, setTradeOpen] = React.useState(false);
    
    const openTradeModal = () => {
        setTradeOpen(true);
    }

    const handleClose = () => {
        setTradeOpen(false);
    }

    console.log(teams);
    

    return(
        <>
            <button className="flex w-40 px-6 mb-4 mt-2 mr-2 mx-auto flex px-6 py-2 rounded-full transition-all font-medium text-lg bg-green-700 
                border hover:bg-green-600 justify-center" onClick={openTradeModal}>
                    Trades
            </button>
            <Modal isOpen={tradeIsOpen} style={MODAL_STYLES} onRequestClose={handleClose} closeTimeoutMS={200}>
                <div className="max-h-[400px] overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-center border-collapse table-fixed">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Proposing Team</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Receiving Team</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Trade Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trades.map((trade) => {
                                var proposerName = teams.find(team => team["id"] == trade["proposer_id"]);
                                var receiverName = teams.find(team => team["id"] == trade["receiver_id"]);
                                proposerName["name"] ? proposerName = proposerName["name"] : proposerName = proposerName["owner"];
                                receiverName["name"] ? receiverName = receiverName["name"] : receiverName = receiverName["owner"];
                                return(
                                    <tr key={trade["id"]} className="hover:bg-blue-50 transition-colors even:bg-slate-50/50 truncate">
                                        <td title={proposerName} className="p-3 font-bold text-slate-800 truncate">{proposerName}</td>
                                        <td title={receiverName} className="p-3 font-bold text-slate-800 truncate">{receiverName}</td>
                                        <td className="p-3 font-bold text-slate-800">{trade["status"]}</td>
                                    </tr>
                                );
                                
                            })}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </>
    );
}

async function changeSlots(player1, slot1, player2, slot2, team){
    const response = await fetch ('http://localhost:3001/api/updateLineup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body:
        JSON.stringify({
            player1: player1,
            slot1: slot1,
            player2: player2,
            slot2: slot2,
            teamId: team["id"]
        }),
        credentials: 'include'
    });
    const data = await response.json();
    if(response.ok){
        alert(data.message);
    }
    else{
        alert(data.message);
    }
}

export default Roster;
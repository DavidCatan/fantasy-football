import React from "react";
import players from "../utils/draftUtils";
import playerData from "../../../nfl_players.json";
import { playerNames, calculatePoints } from "../utils/draftUtils";
import Modal from "react-modal";
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Button, ButtonGroup, TextField } from "@mui/material";
import {getTeam, getTeamRoster, ROSTER_TEMPLATE, getMatchup, getTeams, getMatchups} from '../utils/leagueUtils';
import {Swiper, SwiperSlide} from 'swiper/react';
import { Navigation, Pagination, EffectCoverflow, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { PlayerModal, RosterSlots } from "../utils/playerUtils";

const WEEK_NUM = 14;

const Matchup = () => {

    const [team, setTeam] = React.useState(null);
    const [league, setLeague] = React.useState(null);
    const [owner, setOwner] = React.useState();
    const [roster, setRoster] = React.useState();
    const [lineup, setLineup] = React.useState(new Map());
    const [userLineup, setUserLineup] = React.useState(new Map());
    const [loading, setLoading] = React.useState(true);
    const [changedLineup, setChangedLineup] = React.useState(false);
    const [totalPoints, setTotalPoints] = React.useState(0.0);
    const [user, setUser] = React.useState();
    const [userTeam, setUserTeam] = React.useState();

    const [oppTeam, setOppTeam] = React.useState(null);
    const [oppRoster, setOppRoster] = React.useState();
    const [oppLineup, setOppLineup] = React.useState({});
    const [oppTotalPoints, setOppTotalPoints] = React.useState(0.0);

    const [matchups, setMatchups] = React.useState([]);
    const [teams, setTeams] = React.useState([]);


      // check session and league
    React.useEffect(() => {
        fetch('http://localhost:3001/api/session', {credentials: 'include'})
            .then(res => res.json())
            .then(data => {
                if(data.logged){
                    setOwner(data['username']);
                    setUser(data["username"]);
                }
                else{
                    setOwner(null);
                    setUser(null);
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
                // get user data
                let t = await getTeam(league, owner);
                let r = await getTeamRoster(league, t["data"]["id"]);
                let l = new Map();
                let tp = 0.0;

                let allTeams = await getTeams(league);    

                if(r){
                    r.forEach((player) => {
                        l.set(player["player_slot"], player["player_name"]);
                        if(!player["player_slot"].includes("BN")){
                            tp += calculatePoints(player["player_name"])[WEEK_NUM-1];
                        }
                    })
                }
                tp = Math.round((tp + Number.EPSILON) * 100) / 100;

                // get opponent data 
                let matchup = await getMatchup(league, t["data"]["id"], WEEK_NUM);
                console.log(t, matchup);
                let matchups = await getMatchups(league, WEEK_NUM);
                var oppR;
                var oppT;
                let oppL = new Map();
                let oppTp = 0.0;


                if(matchup["data"]){
                    if(matchup["data"]["home_team_id"] == t["data"]["id"]){
                        oppT = (matchup["data"]["away_team_id"]);
                        oppR = await getTeamRoster(league, matchup["data"]["away_team_id"]);
                    }
                    else{
                        oppT = (matchup["data"]["home_team_id"]);
                        oppR = await getTeamRoster(league, matchup["data"]["home_team_id"]);
                    }
                }
                if(allTeams){
                    allTeams.forEach((team) => {
                        if(team["id"] == oppT){
                            setOppTeam(team);
                        }
                    })
                }

                if(oppR){
                    oppR.forEach((player) => {
                        oppL.set(player["player_slot"], player["player_name"]);
                        if(!player["player_slot"].includes("BN")){
                            oppTp += calculatePoints(player["player_name"])[WEEK_NUM-1];
                        }
                    })
                }
                oppTp = Math.round((oppTp + Number.EPSILON) * 100) / 100;

                // swap matchups so user matchup is first in array and first to display
                matchups = matchups["data"];
                for(let i = 0; i < matchups.length; i++){
                    if(matchups[i]["home_team_id"] == t["data"]["id"] || matchups[i]["away_team_id"] == t["data"]["id"]){
                        let temp = matchups[0];
                        matchups[0] = matchups[i];
                        matchups[i] = temp;
                    }
                }
                // set user data
                setTeam(t["data"]);
                setRoster(r);
                setLineup(l);
                t["data"]["owner"] == user ? setUserLineup(l)&setUserTeam(t["data"]) : undefined;

                setTotalPoints(tp);

                // set opponent data
                setOppRoster(oppR);
                setOppLineup(oppL);
                setOppTotalPoints(oppTp);

                setMatchups(matchups);
                setTeams(allTeams);
                //console.log(l);
                //console.log(r);
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
        <div className="max-w-4xl mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Matchup</h2>
                {/*<div className="grid grid-cols-2 gap-4 justify-items-center m-auto">
                    <Lineup team={team} league={league} roster={roster} lineup={lineup} totalPoints={totalPoints} oppPoints={oppTotalPoints}/>
                    <Lineup team={oppTeam} league={league} roster={oppRoster} lineup={oppLineup} totalPoints={oppTotalPoints} oppPoints={totalPoints}/>
                </div>*/}

                <Swiper navigation={true} modules={[Navigation, Pagination, Keyboard]}
                    keyboard={true}
                    centeredSlides={true} slidesPerView={1}
                    loop={false} 
                    onSlideChange={(swiper) => {
                        let t = swiper.realIndex != 0 ? matchups[swiper.realIndex]["home_team_id"] : 1;
                        console.log(swiper.realIndex);
                        teams.forEach((team) => {
                            if(team["id"] == t){
                                setOwner(team["owner"]);
                            }
                        })                    
                    }}
                    className="mySwiper h-fit">
                    {matchups.length > 0 ? matchups.map((matchup, index) => {
                            return(
                                <SwiperSlide key={matchup["id"]} className="text-center truncate z-10" >
                                    <div className="grid grid-cols-2 gap-4 justify-items-center m-auto">
                                        <Lineup team={team} league={league} roster={roster} lineup={lineup} totalPoints={totalPoints} oppPoints={oppTotalPoints} user={user} userLineup={userLineup} userTeam={userTeam}/>
                                        <Lineup team={oppTeam} league={league} roster={oppRoster} lineup={oppLineup} totalPoints={oppTotalPoints} oppPoints={totalPoints} user={user} userLineup={userLineup} userTeam={userTeam}/>
                                    </div>
                                </SwiperSlide>    
                            );         
                            
                        })
                        : undefined
                    }
                    </Swiper>
        </div>
        
    );
}

function Lineup({team, league, roster, lineup, totalPoints, oppPoints, user, userLineup, userTeam}){
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [tradeIsOpen, setTradeOpen] = React.useState(false);
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

    const openTradeModal = () => {
        setTradeOpen(true);
    }


    return(
        <div className="max-w-4xl mx-auto p-4 bg-gray-800 text-white rounded-lg shadow-xl">
            <div className={`mb-4 text-white rounded-lg shadow-xl border border-dotted ${totalPoints >= oppPoints ? "bg-green-600" : "bg-red-600"}`}>
                <h1 className="text-2xl font-bold mb-4 pb-2 justify-self-center w-100 truncate">{team["name"] ? team["name"] : team["owner"]}</h1>
                <h2 className="text-2xl font-bold mb-4 pb-2 justify-self-center">{totalPoints}</h2>
            </div>
           
           {/* Show team's roster in the matchup list */}
           <RosterSlots lineup={lineup} openModal={openModal} 
           points={({playerInSlot}) => <span className="p-2">{playerInSlot ? calculatePoints(playerInSlot.name)[WEEK_NUM-1] : 0.0}</span>}/>
            
            {/* Modal that opens after initial click on player */}
            <PlayerModal player={curPlayer} isOpen={modalIsOpen} close={() => setIsOpen(false)} zIndex={1000}
                            button={user!=team["owner"] ? <TradeButton open={openTradeModal} /> : undefined}  
            />
            <TradeModal player={curPlayer} /*rosteredPlayers={rosteredPlayers} 
                    setRosteredPlayers={setRosteredPlayers}*/ team={team} league={league} 
                    /*roster={roster}*/ lineup={userLineup} closeParent={() => setIsOpen(false)} user={user} userTeam={userTeam}
                    isOpen={tradeIsOpen} setIsOpen={setTradeOpen}
                />
        </div>
    );
}

function TradeButton({open}){
    return(
        <button className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 rounded-full transition-all font-medium text-lg bg-green-700 
            border hover:bg-green-600 justify-center text-white" onClick={open}>
            Trade
        </button>
    )
}

function TradeModal({ player, rosteredPlayers, setRosteredPlayers, roster, lineup, league, team, closeParent, changedLineup, setChangedLineup, user, userTeam, isOpen, setIsOpen}){
   

    const[tradePlayers, setTradePlayers] = React.useState([]);
    const [updatedSlots, setUpdatedSlots] = React.useState([]);
    const [emptySlot, setEmptySlot] = React.useState(false);

    
    /*const openTradeModal = () => {
        setTradeOpen(true);
    }

    const handleClose = () => {
        setTradeOpen(false);
    }*/

        
    const close = () => {
        setIsOpen(false);
        setTradePlayers([]);
    }

    function sendTrade(recvTeam, sendTeam, players){
       /* if(!rosteredPlayers.includes(player.id)){
            alert("You don't have those players!");
            handleClose();
            closeParent();
            return;
        }*/
        /*if(!updatedSlot){
            alert("select slot to add player to!");
            return;
        }*/
        /*if(!updatedSlot["eligiblePositions"].includes(player["position"])){
            alert("positions don't match");
            return;
        }*/
        /*else if(droppedPlayer){
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
        }*/

        if(!players || players.length == 0){
            alert("Select player to trade!");
            return;
        }
        
        // send trade
        updateTradeDB(recvTeam, sendTeam, league, players, [player]);
        close();
        closeParent();
    }

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

    return(
        <>
            {user!=team["owner"] ?
                <div className="flex justify-center">

                    <Modal isOpen={isOpen} style={modalStyles} onRequestClose={close} closeTimeoutMS={200}>
                        <UserLineup team={team} league={league} roster={roster} lineup={lineup} player={player} setTradePlayers={setTradePlayers} 
                                tradePlayers={tradePlayers} setUpdatedSlots={setUpdatedSlots} updatedSlots={updatedSlots} setEmptySlot={setEmptySlot} />
                        <button 
                        onClick={() => sendTrade(team, userTeam, tradePlayers)}
                            className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all font-medium"
                        >
                        Send Trade
                        </button>
                    </Modal>
                    
                </div>
                
                : undefined
            }
        </>
    );
}

function UserLineup({team, league, roster, lineup, player, setTradePlayers, tradePlayers, updatedSlots, setUpdatedSlots, setEmptySlot}){
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [curPlayer, setPlayer] = React.useState("");
    const [eligibleSlots, setEligibleSlots] = React.useState([]);

    function openModal(player) {
        if (!player) return;
        setPlayer(player);
        setIsOpen(true);
    }

    return(
        <div className="max-w-4xl mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Roster</h2>

            {/* Show user roster when proposing trade */}
            <RosterSlots lineup={lineup} openModal={openModal}
                button={({ playerInSlot, slot }) => (
                    <TradeTransactionButton 
                        tradePlayers={tradePlayers} 
                        setTradePlayers={setTradePlayers} 
                        setUpdatedSlots={setUpdatedSlots}
                        playerInSlot={playerInSlot}
                        slot={slot}
                    />
                )}
            />
            {/* Modal for player data from roster modal */}
            <PlayerModal player={curPlayer} isOpen={modalIsOpen} close={() => setIsOpen(false)} zIndex={1002}/>
        </div>
    );
}

function TradeTransactionButton({playerInSlot, slot, tradePlayers, setTradePlayers, setUpdatedSlots}){
    //const [clicked, setClicked] = React.useState(new Map());
    return(
        <button onClick={() => 
            {
                if( playerInSlot&&!tradePlayers.includes(playerInSlot) ){
                    setTradePlayers((prev) => [...prev, playerInSlot]);
                    //let c = clicked;
                    //c.set(playerInSlot, true);
                    //setClicked(c);
                    setUpdatedSlots((prev) => [...prev, slot]);
                }
                else if(tradePlayers.includes(playerInSlot)){
                    let p = tradePlayers;
                    p.splice(p.indexOf(playerInSlot), 1);
                    setTradePlayers((prev) => prev.filter(player => player != playerInSlot));
                    setUpdatedSlots((prev) => prev.filter(s => s != slot));
                }
                else{
                    undefined;
                }
            }
        }

        className={`px-6 mb-4 mt-4 mr-2 mx-auto flex px-6 py-2 rounded-full border transition-all font-medium 
            ${playerInSlot&&tradePlayers.includes(playerInSlot) ?  "bg-green-600 text-white border-10 border-green-900 hover:bg-green-400 hover:text-black"
            : playerInSlot? "bg-green-400 text-black hover:bg-green-600 hover:text-white"
            : "bg-black"
            } 
        `}>
            {playerInSlot ? "Trade" : "Locked"}
        </button>
    );
}

async function updateTradeDB(recvTeam, sendTeam, leagueId, sendPlayers, recvPlayers){
    let response = await fetch ('http://localhost:3001/api/trades/propose-trade', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body:
            JSON.stringify({
                receiverId: recvTeam["id"],
                senderId: sendTeam["id"],
                leagueId: leagueId, 
                sendPlayers: sendPlayers,
                recvPlayers: recvPlayers
            }),
            credentials: 'include'
            });
    let data = await response.json();
    if(!response.ok){
        alert('error preparing trade: ' + data.message);
    }
    else{
        alert(data.message);
    }
}

export default Matchup;
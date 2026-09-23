import React from "react";
import Modal from "react-modal";
import {getTeamRosters, getTeams, getMatchups, getLiveStats, calculateWeeklyPoints, ROSTER_TEMPLATE} from '../utils/leagueUtils';
import {Swiper, SwiperSlide} from 'swiper/react';
import { Navigation, Pagination, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { LoadingScreen, PlayerModal, RosterSlots, calculateProjections } from "../utils/playerUtils";
import { useLeague } from "../utils/LeagueContext";

const Matchup = () => {

    const { showAlert, league, owner, userTeam, weekNum, projections, isMobile } = useLeague();
    
    const [lineups, setLineups] = React.useState(new Map());
    const [loading, setLoading] = React.useState(true);
    const [matchups, setMatchups] = React.useState([]);
    const [teams, setTeams] = React.useState([]);
    const [totalPoints, setTotalPoints] = React.useState(new Map());
    const [livePlayerStats, setLivePlayerStats] = React.useState({});
    const [projectedPoints, setProjectedPoints] = React.useState(0.0);
    const fetchStats = async () => {
        let stats = await getLiveStats();
        if(stats){
            setLivePlayerStats(stats);
        }
    }

    setInterval(() => {
       fetchStats();
    }, 100000);
    
    React.useEffect(() => {
        if(!owner || !league || !userTeam){
            return;
        }
        const loadTeamData = async () => {
            try{
                // get user data
                let r = await getTeamRosters(league);
                let l = new Map();
                let tp = new Map(); 
                let projP = new Map();
                
                let allTeams = await getTeams(league);    
                let stats = await getLiveStats();
                if(stats){
                    setLivePlayerStats(stats);
                }

                if(r && stats){
                    Object.entries(r).forEach(([team, players]) => {
                        let slots = new Map();
                        let points = 0.0;
                        let projPoints = 0.0;
                        players.forEach((player) => {
                            slots.set(player["player_slot"], player["player_name"]);
                            if(!player["player_slot"].includes("BN")){
                                points += calculateWeeklyPoints(weekNum, player["player_name"], stats);
                                projPoints += calculateProjections(projections["week"][weekNum][player.player_id]);
                            }
                        });
                        projPoints = Math.round((projPoints + Number.EPSILON) * 100) / 100;
                        points = Math.round((points + Number.EPSILON) * 100) / 100;
                        tp.set(Number(team), points);
                        projP.set(Number(team), projPoints);
                        l.set(Number(team), slots);
                    });
                }
                setTotalPoints(tp);
                setProjectedPoints(projP);

                // swap matches so user matchup is first in array and first to display
                let matches = await getMatchups(league, weekNum);
                matches = matches["data"];
                let id = userTeam["id"];
                for(let i = 0; i < matches.length; i++){
                    if(matches[i]["home_team_id"] == id || matches[i]["away_team_id"] == id){
                        let temp = matches[0];
                        matches[0] = matches[i];
                        matches[i] = temp;
                        break;
                    }
                }       
                setLineups(l);
                setMatchups(matches);
                setTeams(allTeams);
                setLoading(false);
            } catch(err){
                showAlert('error', 'Error getting team data. Try refreshing');
            }
        }
        
        loadTeamData();

    },[owner, league, userTeam]);

    if(loading){
        return <LoadingScreen></LoadingScreen>
    }
    return(
            <div className="max-w-4xl mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Matchup</h2>

                    <Swiper navigation={true} modules={[Navigation, Pagination, Keyboard]}
                        keyboard={true}
                        centeredSlides={true} slidesPerView={1}
                        loop={false} 
                        className="mySwiper h-fit">
                        {matchups.length > 0 ? matchups.map((matchup, index) => {
                            let homeTeam = matchup["home_team_id"];
                            let awayTeam = matchup["away_team_id"];
                            let homePoints = totalPoints.get(homeTeam);
                            let awayPoints = totalPoints.get(awayTeam);
                                return(
                                    <SwiperSlide key={matchup["id"]} className="text-center truncate z-10" >
                                        <div className={`grid ${!isMobile ?  ' gap-4 grid-cols-2 justify-items-center m-auto'
                                            : 'text-sm grid-cols-[1fr_auto_1fr]'
                                        }`}>
                                            <Lineup team={teams.find(team => team["id"] == homeTeam)} lineup={lineups.get(homeTeam)} 
                                                totalPoints={homePoints} oppPoints={awayPoints} playerStats={livePlayerStats} 
                                                projectedPoints={projectedPoints.get(homeTeam)} 
                                            />
                                            {isMobile ? 
                                                <div className="flex flex-col gap-2 w-5 mt-34 items-center z-10">
                                                    {ROSTER_TEMPLATE.map((slot, index) => {
                                                        return (
                                                        <div key={index} className={`py-3 rounded text-sm h-12 w-6
                                                            ${slot["label"] == "QB" ? 'bg-red-900'
                                                                : slot["label"] == "RB" ? 'bg-blue-900' 
                                                                : slot["label"] == "WR" ? 'bg-green-900'
                                                                : slot["label"] == "TE" ? 'bg-purple-900'
                                                                : slot["label"] == "FLEX" ? 'bg-pink-900'
                                                                : slot["label"] == "K" ? "bg-cyan-700"
                                                                : 'bg-gray-700'
                                                            }`}
                                                        
                                                        >
                                                            {slot["abbreviation"]}
                                                        </div>
                                                        )
                                                    })}
                                                </div>
                                                : undefined
                                            }
                                        
                                            <Lineup team={teams.find(team => team["id"] == awayTeam)} lineup={lineups.get(awayTeam)}
                                                totalPoints={awayPoints} oppPoints={homePoints} playerStats={livePlayerStats} 
                                                projectedPoints={projectedPoints.get(awayTeam)} isRightSide={true}
                                            />
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

function Lineup({team, lineup, totalPoints, oppPoints, playerStats, projectedPoints, isRightSide}){
    const { owner, weekNum, isMobile } = useLeague();
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [tradeIsOpen, setTradeOpen] = React.useState(false);
    const [curPlayer, setPlayer] = React.useState("");

    function openModal(player) {
        if (!player) return;
        setPlayer(player);
        setIsOpen(true);
    }

    const openTradeModal = () => {
        setTradeOpen(true);
    }

    return(
        <div className={` ${!isMobile ? 'max-w-4xl mx-auto p-4 bg-gray-800 text-white rounded-lg shadow-xl'
        : 'min-w-35 max-w-48'}`}>
            <div className={`mb-4 text-white rounded-lg shadow-xl border border-dotted ${totalPoints >= oppPoints ? "bg-green-600" : "bg-red-600"}`}>
                <h1 className={` font-bold mb-4 pb-2 justify-self-center w-100 truncate ${isMobile ? 'text-md'
                : 'text-2xl truncate'}`}>
                    {team["name"] ? team["name"] : team["owner"]}</h1>
                <h2 className="text-2xl font-bold mb-4 pb-2 justify-self-center">{totalPoints}</h2>
                <h3 className="text-slate-800 font-normal mr-2">
                    {projectedPoints}
                </h3>
            </div>
           
           {/* Show team's roster in the matchup list */}
           <RosterSlots lineup={lineup} openModal={openModal} isRightSide={isRightSide}
           points={({playerInSlot}) => <span className="p-2">{playerInSlot ? calculateWeeklyPoints(weekNum, playerInSlot.name, playerStats) : 0.0}</span>}/>
            
            {/* Modal that opens after initial click on player */}
            <PlayerModal player={curPlayer} isOpen={modalIsOpen} close={() => setIsOpen(false)} zIndex={1000}
                            button={owner!=team["owner"] ? <TradeButton open={openTradeModal} /> : undefined}  
            />
            <TradeModal player={curPlayer}
                     team={team} 
                    closeParent={() => setIsOpen(false)}
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

function TradeModal({ player, rosteredPlayers, setRosteredPlayers, team, closeParent, isOpen, setIsOpen}){
   
    const { showAlert, league, owner, lineup, userTeam } = useLeague();

    const [tradePlayers, setTradePlayers] = React.useState([]);
    const [updatedSlots, setUpdatedSlots] = React.useState([]);
    const [emptySlot, setEmptySlot] = React.useState(false);

        
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
            showAlert('info', 'Select player to trade!');
            return;
        }
        
        // send trade
        updateTradeDB(recvTeam, sendTeam, league, players, [player], showAlert);
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
            {owner!=team["owner"] ?
                <div className="flex justify-center">

                    <Modal isOpen={isOpen} style={modalStyles} onRequestClose={close} closeTimeoutMS={200}>
                        <UserLineup team={team} lineup={lineup} player={player} setTradePlayers={setTradePlayers} 
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

function UserLineup({team, lineup, setTradePlayers, tradePlayers, setUpdatedSlots, setEmptySlot}){

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
    return(
        <button onClick={() => 
            {
                if( playerInSlot&&!tradePlayers.includes(playerInSlot) ){
                    setTradePlayers((prev) => [...prev, playerInSlot]);
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

async function updateTradeDB(recvTeam, sendTeam, leagueId, sendPlayers, recvPlayers, showAlert){
    const response = await fetch ('api/trades/propose-trade', {
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
        showAlert('error', 'error preparing trade: ' + data.message);
    }
    else{
        showAlert('success', data.message);
    }
}

export default Matchup;
    
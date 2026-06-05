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

const WEEK_NUM = 10;

const Matchup = () => {


    const [team, setTeam] = React.useState(null);
    const [league, setLeague] = React.useState(null);
    const [owner, setOwner] = React.useState();
    const [roster, setRoster] = React.useState();
    const [lineup, setLineup] = React.useState(new Map());
    const [loading, setLoading] = React.useState(true);
    const [changedLineup, setChangedLineup] = React.useState(false);
    const [totalPoints, setTotalPoints] = React.useState(0.0);

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

                if(allTeams["data"]){
                    allTeams["data"].forEach((team) => {
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

                // set user data
                setTeam(t["data"]);
                setRoster(r);
                setLineup(l);
                setTotalPoints(tp);

                // set opponent data
                setOppRoster(oppR);
                setOppLineup(oppL);
                setOppTotalPoints(oppTp);

                setMatchups(matchups["data"]);
                setTeams(allTeams["data"]);
                console.log(matchups["data"]);
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
                    loop={true} 
                    onSlideChange={(swiper) => {
                        let t = matchups[swiper.realIndex]["home_team_id"];
                        console.log(t, swiper.realIndex);
                        teams.forEach((team) => {
                            if(team["id"] == t){
                                setOwner(team["owner"]);
                            }
                        })                    
                //    setActiveLeague(userLeagues[swiper.realIndex]);
                    //  setActiveSlide(swiper.realIndex);
                    }}
                    className="mySwiper h-fit">
                    {matchups.length > 0 ? matchups.map((matchup, index) => {
                        //if(!matchup.hasOwnProperty(team["id"])){
                            return(
                                <SwiperSlide key={league["league_id"]} className="text-center truncate z-10" >
                                    <div className="grid grid-cols-2 gap-4 justify-items-center m-auto">
                                        <Lineup team={team} league={league} roster={roster} lineup={lineup} totalPoints={totalPoints} oppPoints={oppTotalPoints}/>
                                        <Lineup team={oppTeam} league={league} roster={oppRoster} lineup={oppLineup} totalPoints={oppTotalPoints} oppPoints={totalPoints}/>
                                    </div>
                                </SwiperSlide>    
                            );         
                            
                        })//})  
                        : undefined
                    }
                    </Swiper>
        </div>
        
    );
}

function Lineup({team, league, roster, lineup, totalPoints, oppPoints}){
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

    return(
        <div className="max-w-4xl mx-auto p-4 bg-gray-800 text-white rounded-lg shadow-xl">
            <div className={`mb-4 text-white rounded-lg shadow-xl border border-dotted ${totalPoints >= oppPoints ? "bg-green-600" : "bg-red-600"}`}>
                <h1 className="text-2xl font-bold mb-4 pb-2 justify-self-center">{team["owner"]}</h1>
                <h2 className="text-2xl font-bold mb-4 pb-2 justify-self-center">{totalPoints}</h2>
            </div>
           
            
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
                            
                                
                            <div className="p-3">
                                <span>{playerInSlot ? calculatePoints(playerInSlot.name)[WEEK_NUM-1] : 0.0}</span>
                            </div>
                        </div>

                    );
                })}
            </div>
            <PlayerModal player={curPlayer} isOpen={modalIsOpen} close={() => setIsOpen(false)} team={team} league={league}/>
        </div>
    );
}

function PlayerModal({ player, isOpen, close, league, team}) {
    if (!player) return null;

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

    var wideimage; 
    if (Math.floor(Math.random() * 20) == 0){
        wideimage = "w-500 h-30 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner bg-radial via-yellow-400 to-orange-700";
    } 
    else{
        wideimage = "w-36 h-30 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner bg-radial via-yellow-400 to-orange-700";
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

export default Matchup;
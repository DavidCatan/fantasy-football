import Modal from 'react-modal';
import playerData from "../../../nfl_players.json";
import playerStats from "../../Backend/nfl_stats.json";
import { ROSTER_TEMPLATE, getLiveStats } from "./leagueUtils";
import { calculatePoints } from "./draftUtils";
import { Button, ButtonGroup } from "@mui/material";
import { useLeague } from './LeagueContext';
import React from 'react';

const STATS = {"2025" : playerStats, "2026": await getLiveStats()};

export function PlayerModal({ player, isOpen, close, button, zIndex}) {
    const [year, setYear] = React.useState("2026");
    const [stats, setStats] = React.useState(STATS["2026"]);
    // change displayed stats
    const data = React.useMemo(() => {
        return player?.name ? calculatePoints(player.name, stats) : [];
    }, [player?.name, stats]);

    // fetch 2026 stats
    React.useEffect(() => {
        const fetchStats = async () => {
            year == "2026" ? STATS[year] = await getLiveStats() : undefined;
            setStats(STATS[year]);
        };
        fetchStats();
        
    }, [year]);
    
    

    const wideimage = React.useMemo(() => {
        if(!player) return '';
        if (Math.floor(Math.random() * 20) == 0){
            return "w-500 h-30 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner bg-radial via-yellow-400 to-orange-700";
        } 
        else{
            return "w-36 h-30 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner bg-radial via-yellow-400 to-orange-700";
        }
    }, [player]); 

    
const modalStyles =  React.useMemo(() => {
    return { content: {
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
    overlay: { backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: zIndex }}
}, [zIndex]);
    

    return (
        <Modal isOpen={Boolean(isOpen && player)} style={modalStyles} onRequestClose={close} closeTimeoutMS={200}>
            <div className="relative">
                <button onClick={close} className="absolute -top-2 -right-2 text-slate-400 hover:text-slate-600 font-bold">✕</button>
                
                <div className="text-center mb-4">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{player.name}</h2>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">{player.team} | {player.position}</h3>
                    <img src={player.headshot} className={wideimage} alt={player.name} />
                </div>

                {button ? button : undefined}

                <ButtonGroup variant="outlined" disableElevation sx={{ display: 'flex', width: 'fit-content', mx: 'auto' }}>
                    {["2025", "2026"].map((y) => (
                        <Button key={y} onClick={() => setYear(y)} className="capitalize">
                            {y}
                        </Button>
                    ))}
                </ButtonGroup>

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

export function RosterSlots({lineup, button, points, openModal, isRightSide=false}) {
    const {weekNum, projections, isMobile} = useLeague();
    
  
    var roster = ROSTER_TEMPLATE.slice();
    lineup.forEach((player, slot) => {
        let pos = slot.slice(0,2);
        let num = slot.slice(2);
        if(pos == "BN" && num > 6){
            roster.push({ id: "BN"+num,  label: "BENCH", eligiblePositions: ["QB", "RB", "WR", "TE", "PK"] })
        }
    });
    return(
        <div className="flex flex-col gap-2">
            {roster.map((slot, index) => {
                const playerInSlot = playerData[lineup?.get(slot["id"])];
                let name = playerInSlot?.name;
                if(isMobile && name){
                    name = name.split(" ");
                    name = name[0].at(0)+". " + name[1];
                }
                return(
                    <div key={slot["id"]} className={`flex items-center justify-between pl-3 rounded-md border ${isMobile ? 'h-12' : undefined} 
                    ${index>ROSTER_TEMPLATE.length-1 ? 'border-red-500' : undefined}`}>
                        <div className= 
                        {isMobile && points ? undefined :
                            ` px-2 py-1 rounded text-md
                            ${slot["label"] == "QB" ? 'bg-red-900'// mr-6' 
                                : slot["label"] == "RB" ? 'bg-blue-900'// mr-7' 
                                : slot["label"] == "WR" ? 'bg-green-900'// mr-6'
                                : slot["label"] == "TE" ? 'bg-purple-900'// mr-8'
                                : slot["label"] == "FLEX" ? 'bg-pink-900'// mr-4'
                                : slot["label"] == "K" ? "bg-cyan-700"
                                : 'bg-gray-700'
                            }`
                        }>
                            {isMobile && points ? undefined : slot["label"]}
                        </div>
                        <div className='flex-1 items-center justify-between p-3'>
                        {playerInSlot ?
                                <button 
                                    onClick={() => openModal(playerInSlot)} 
                                    className="w-full flex items-center gap-4 text-left hover:bg-yellow-500 hover:text-slate-700 transition-colors rounded-md"
                                >
                                    {!isMobile || !points ? <img src={playerInSlot.headshot} className="w-15 h-12 rounded-full border border-slate-200 bg-radial
                                    via-yellow-400 to-orange-700" loading="lazy" alt={playerInSlot.name} /> : undefined}
                                    <span className="font-semibold text-white-700">
                                        {name} {!isMobile ? <span className="text-slate-400 font-normal ml-2">| {playerInSlot.position}</span> : undefined}
                                    </span>
                                </button>
                        : <span className="italic text-slate-500" >Empty</span>
                        }
                        </div>

                        {button ? <div className="text-slate-400 font-normal mr-2">
                                {playerInSlot ? calculateProjections(projections["week"][weekNum][playerInSlot.id]) : undefined}
                            </div> : undefined}
                        
                            
                        <div>
                            {button ? button({ playerInSlot, slot, index })
                            : undefined}

                            
                            {points ? points({playerInSlot}) : undefined}

                            {!button ? <div className="text-slate-400 font-normal mr-2">
                                {playerInSlot ? calculateProjections(projections["week"][weekNum][playerInSlot.id]) : undefined}
                            </div> : undefined}
                        </div>
                    </div>

                );
            })}
        </div>
    );
}

export function calculateProjections(stats){
    if(!stats){
        return;
    }

    var totalPoints = 0;

    const PASSING_MULTIPLIER = 0.04;
    const RUSHING_MULTIPLIER = 0.1;
    const RECEIVING_MULTIPLIER = 0.1;
    const RECEPTION_MULTIPLIER = 1;
    const PASS_TD_MULTIPLIER = 4;
    const TD_MULITIPLER = 6;
    const TURNOVER_MULTIPLIER = -2;
    const FG_50_MULTIPLIER = 5;
    const FG_40_MULTIPLIER = 4;
    const FG_0_MULTIPLIER = 3;
    const MISSED_FG_MULTIPLIER = -1;
    const MADE_XP_MULTIPLIER = 1;
    const MISSED_XP_MULTIPLIER = -1;

    const pointDistr = {
        "passingYards" : PASSING_MULTIPLIER,
        "passingTouchdowns" : PASS_TD_MULTIPLIER,
        "interceptions" : TURNOVER_MULTIPLIER,
        "rushingYards" : RUSHING_MULTIPLIER,
        "rushingTouchdowns" : TD_MULITIPLER,
        "receptions" : RECEPTION_MULTIPLIER,
        "receivingYards" : RECEIVING_MULTIPLIER,
        "receivingTouchdowns" : TD_MULITIPLER,
        "fumblesLost" :  TURNOVER_MULTIPLIER,
        "kickReturnTouchdowns" : TURNOVER_MULTIPLIER,
        "puntReturnTouchdowns" : TURNOVER_MULTIPLIER,
        "madeFG50" : FG_50_MULTIPLIER,
        "madeFG40" : FG_40_MULTIPLIER,
        "madeFG0" : FG_0_MULTIPLIER,
        "missedFG" : MISSED_FG_MULTIPLIER,
        "madeXP" : MADE_XP_MULTIPLIER,
        "missedXP" : MISSED_XP_MULTIPLIER
    };
    for (const stat in pointDistr){
        if(stats.hasOwnProperty(stat)){
             totalPoints += stats[stat] * pointDistr[stat];
        }
    }
    totalPoints = Math.round((totalPoints + Number.EPSILON) * 100) / 100;
    return totalPoints;
}
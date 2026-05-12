import React from "react";
import players from "../utils/draftUtils";
import playerData from "../../../nfl_players.json";
import { playerNames } from "../utils/draftUtils";
import { calculatePoints } from "../utils/draftUtils";
import Modal from "react-modal";
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Button, ButtonGroup, TextField } from "@mui/material";
import { teams } from "../utils/leagueUtils";
import {draftPlayer} from "../utils/draftUtils";

const SEASON = "2025"; 

const Draft = () => {
    const [pos, setPosition] = React.useState("all");
    const [team, setTeam] = React.useState(teams[0]);
    const [draftedPlayers, setDraftedPlayers] = React.useState([]);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-4 text-slate-800">Draft</h1>
            <div className="mb-6">
                <ButtonGroup variant="outlined" disableElevation>
                    {["all", "QB", "RB", "WR", "TE"].map((p) => (
                        <Button key={p} onClick={() => setPosition(p)} className="capitalize">
                            {p}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>
            <PlayerList pos={pos} team={team} draftedPlayers={draftedPlayers} setDraftedPlayers={setDraftedPlayers}/>
        </div>
    );
};

function PlayerList({ pos, team, draftedPlayers, setDraftedPlayers }) {
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [curPlayer, setPlayer] = React.useState("");

    const displayedPlayers = isExpanded ? players[pos] : players[pos].slice(0, 30);

    function openModal(player) {
        if (!player) return;
        setPlayer(player);
        setIsOpen(true);
    }

    return (
        <div className="space-y-4">
            <Autocomplete
                disablePortal
                options={playerNames}
                noOptionsText="No Players"
                filterOptions={createFilterOptions({ limit: 20 })}
                renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                        <li key={key} {...optionProps} className="flex items-center gap-3 p-2 hover:bg-slate-100 cursor-pointer">
                            <img src={playerData[option].headshot} className="w-10 h-10 rounded-full object-cover" loading="lazy" alt="" />
                            <div className="font-bold text-slate-700">{option}</div>
                        </li>
                    );
                }}
                renderInput={(params) => <TextField {...params} label="Search for a player" />}
                onChange={(event, player) => openModal(playerData[player])}
                className="bg-white rounded-lg shadow-sm"
            />

            <ul className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                {displayedPlayers.map((player) => {
                    const isAvailable = !draftedPlayers.includes(player.id);
                    if (isAvailable){
                        return (
                            <li key={player.id} className="list-none">
                                <button 
                                    onClick={() => openModal(player)} 
                                    className="w-full flex items-center gap-4 p-3 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <img src={player.headshot} className="w-12 h-12 rounded-full border border-slate-200" loading="lazy" alt="" />
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

            <PlayerModal player={curPlayer} isOpen={modalIsOpen} team={team} draftedPlayers={draftedPlayers} 
            setDraftedPlayers={setDraftedPlayers} close={() => setIsOpen(false)} />
        </div>
    );
}

function PlayerModal({ player, isOpen, close, team, draftedPlayers, setDraftedPlayers }) {
    if (!player) return null;
    const data = calculatePoints(player.name);
    
    var drafted = [];

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

    function draftPlayer(team, player){
        if(draftedPlayers.includes(player.id)){
            console.log('hello');
            return;
        }
        team["roster"].push(player);
        drafted.push(player.id);
        setDraftedPlayers((prev) => [...prev, player.id]);
        close();
        console.log(teams);
    }

    return (
        <Modal isOpen={isOpen} style={modalStyles} onRequestClose={close} closeTimeoutMS={200}>
            <div className="relative">
                <button onClick={close} className="absolute -top-2 -right-2 text-slate-400 hover:text-slate-600 font-bold">✕</button>
                
                <div className="text-center mb-4">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{player.name}</h2>
                    <img src={player.headshot} className="w-32 h-32 mx-auto my-4 rounded-full border-4 border-slate-100 shadow-inner" alt="" />
                </div>

                <button 
                    onClick={() => draftPlayer(team, player)}
                    className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-all font-medium"
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

export default Draft;
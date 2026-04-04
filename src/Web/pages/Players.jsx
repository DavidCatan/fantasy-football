import React from "react";
import styled from "styled-components"
import players from "../utils/draftUtils";
import playerData from "../../../nfl_players.json"
import { playerNames } from "../utils/draftUtils";
//import { fetchPlayerStats } from "../utils/draftUtils";
import { calculatePoints } from "../utils/draftUtils";
import Modal from "react-modal";
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Button, ButtonGroup, TextField } from "@mui/material";

var SEASON = "2025"; 
//var curPlayer = players["all"][0]; // fix this 
//console.log(players);
const Players = () => {
    const [pos, setPosition] = React.useState("all");

    return(
        <div>
            <h1>Players</h1>
            <ButtonGroup variant="outlined" disableElevation>
                <Button onClick={() => setPosition("all")}>All</Button>
                <Button onClick={() => setPosition("QB")}>QB</Button>
                <Button onClick={() => setPosition("RB")}>RB</Button>
                <Button onClick={() => setPosition("WR")}>WR</Button>
                <Button onClick={() => setPosition("TE")}>TE</Button>
            </ButtonGroup>
            <PlayerList pos={pos}/>
        </div>
    );
};


function PlayerList({pos}) {
  
    const [modalIsOpen, setIsOpen] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [curPlayer, setPlayer] = React.useState("");

    var displayedPlayers;
    if (!isExpanded){
        displayedPlayers  = players[pos].slice(0,30); // initial first thirty players
    }
    else{
        displayedPlayers = players[pos];
    }

    function openModal(player) {
        if(!player || player == ""){
            return null;
        }
        setIsOpen(true);
        setPlayer(player);
    }

    function afterOpenModal() {
    // references are now sync'd and can be accessed.
    }

    function closeModal() {
        setIsOpen(false);
    }
    
    return (
        <div>
            <Autocomplete
                disablePortal
                options={playerNames}
                noOptionsText="No Players"
                filterOptions={createFilterOptions({
                        limit: 20
                    })
                }
                renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                        <li key={key} {...optionProps}>  
                            <img src={playerData[option].headshot} style={{width:"10%"}} loading="lazy"></img>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{option}</div>
                            </div>
                        </li>
                    );
                    }
                }
                renderInput={(params) => <TextField {...params} label="Search for a player" />}
                onChange={(event, player) => openModal(playerData[player])}
            />
        <ul>
                {displayedPlayers.map((player) => (
                    <PlayerItem key={player.id}>
                        <PlayerButton onClick={() => openModal(player)}>
                            <div style={{fontWeight:'bold'}}>
                                <img src={player.headshot} style={{width:"10%"}} loading="lazy"></img> 
                                {player.name} - {player.position}
                            </div>
                        </PlayerButton>
                    </PlayerItem>
                ))}
                <PlayerModal
                    player={curPlayer}
                    isOpen={modalIsOpen}
                    close={() => closeModal()}
                    
                />
        </ul>
            <button onClick={() => setIsExpanded(true)} style={{cursor: 'pointer', display: 'flex', margin: '0 auto'}}>
                 View All </button>
            
        </div>
        

    );
}

const PlayerItem = styled.li`
    list-style-type: none;  
`;

const PlayerButton = styled.button`
    width: 100%;
    text-align: left;
`;

function PlayerModal({player, isOpen, close}){
    
    //let data = fetchPlayerStats(SEASON, player.id);
    let data = calculatePoints(player.name);
    console.log(data);
    const customStyles = {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
        },
    };

    return(
        <div>
          <Modal
                isOpen={isOpen}
                style={customStyles}
                onRequestClose={close}
                contentLabel="Example Modal"
                closeTimeoutMS={200}
            >
                <div>
                    <button onClick={close}>close</button>
                    <span style={{display:'flex', justifyContent: 'center', fontWeight: 'bold', fontSize: '150%'}}>
                        {player.name}
                    </span>
                    <img src={player.headshot} style={{width:'50%', display:'flex', margin:'auto'}}></img>
                    <div style={{height: '450px', overflow: 'auto'}}>
                        <table align='center'>
                            <style>{`
                                    td, th { border: 1px solid #ddd; padding: 8px; text-align: center;}
                                    tr:nth-child(even) { background-color: #f2f2f2; }
                                `}
                            </style>
                            <thead>
                                <tr>
                                    <th>Week</th>
                                    <th>Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((points, index) =>(
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                  
                </div>
                <div>
                </div>
                
            </Modal>
            
       
        </div>
    );
}

/*function makeTable({data}){
    return(
        
    )
    
}*/

/*function PlayerSearch(playerData, playerNames) {
  return (
    
  );
}*/

export default Players;
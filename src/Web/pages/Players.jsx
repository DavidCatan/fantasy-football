import React from "react";
import styled from "styled-components"
import players from "../utils/draftUtils";
import playerData from "../../../nfl_players.json"
import { playerNames } from "../utils/draftUtils";
import { fetchPlayerStats } from "../utils/draftUtils";
import Modal from "react-modal";
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { TextField } from "@mui/material";

var SEASON = "2025"; 
var curPlayer = players[0];
//console.log(players);
const Players = () => {
    return(
        <div>
            <h1>Players</h1>
            {playerList()}
        </div>
    );
};



function playerList() {
  
    const [modalIsOpen, setIsOpen] = React.useState(false);

    function openModal(player) {
        if(!player || player == ""){
            return null;
        }
        setIsOpen(true);
        curPlayer = player;
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
                            <img src={playerData[option].headshot} style={{width:"10%"}}></img>
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
                {players.map((player) => (
                    <PlayerItem key={player.id}>
                        <PlayerButton onClick={() => openModal(player)}>
                            <div style={{fontWeight:'bold'}}>
                                <img src={player.headshot} style={{width:"10%"}}></img> 
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
    
    let data = fetchPlayerStats(SEASON, player.id);
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
                    <img src={player.headshot} style={{width:'50%', display:'flex', margin:'auto'}}></img>
                    <div>I am a modal</div>
                  
                </div>
                <div>
                </div>
                
            </Modal>
            
       
        </div>
    );
}


/*function PlayerSearch(playerData, playerNames) {
  return (
    
  );
}*/

export default Players;
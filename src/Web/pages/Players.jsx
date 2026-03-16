import React from "react";
import styled from "styled-components"
import playerData from "../utils/draftUtils";
import Modal from "react-modal";
//import clickPlayer  from "../utils/draftUtils";

var players = playerData;
var curPlayer = players[0];
//console.log(players);
const Players = () => {
    return(
        <div>
            <h1>Players</h1>
            <input placeholder="Search for a player" type="text"></input>
            {playerList()}
        </div>
    );
};



function playerList() {
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
    const [modalIsOpen, setIsOpen] = React.useState(false);
    console.log(curPlayer);
    function openModal(player) {
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
        <ul>
            {players.map((player) => (
                <PlayerItem key={player.id}>
                    <PlayerButton onClick={() => openModal(player)}>
                        <img src={player.headshot} style={{width:"10%"}}></img> {player.name} - {player.position}
                    </PlayerButton>
                </PlayerItem>
            ))}
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                style={customStyles}
                contentLabel="Example Modal"
                closeTimeoutMS={200}
            >
                <button onClick={closeModal}>close</button>
                <div>I am a modal</div>
                <form>
                {clickedPlayer(curPlayer)}

                </form>
            </Modal>
        </ul>

    );
}

const PlayerItem = styled.li`
    list-style-type: none;  
`;

const PlayerButton = styled.button`
    width: 100%;
    text-align: left;
`;

/*
    player modal
*/

function clickedPlayer(player){
    return(
        <div>
            <img src={player.headshot}></img>
        </div>
    );
}

export default Players;
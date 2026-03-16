import React from "react";
import playerData from "../utils/draftUtils";

var players = playerData;
//console.log(players);
const Draft = () => {
    return(
        <div>
            <h1>Fantasy Draft</h1>
            <input placeholder="Search for a player" type="text"></input>
        </div>
    );
};

export default Draft;
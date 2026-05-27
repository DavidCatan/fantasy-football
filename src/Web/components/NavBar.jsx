import React from "react";
import { useLocation } from "react-router-dom";
import { Nav, NavLink, NavMenu } from "./NavbarElements.jsx";
import { Button } from "@mui/material";

const Navbar = () => {
    const [league, setLeague] = React.useState(null);
    const [owner, setOwner] = React.useState(null);
    const location = useLocation();

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
        }, [location])

        
    return (
        <>
            <Nav>
                <NavMenu>
                    <NavLink to="/">
                        Home
                    </NavLink>
                    {league && owner ? 
                        <>
                            <NavLink to="/Roster">
                                Roster
                            </NavLink>
                            <NavLink to="/Draft">
                                Draft
                            </NavLink>
                            <NavLink to="/Players">
                                Players
                            </NavLink>
                        </>
                        : <></>
                    }
                    
                        <Button onClick={logout}>Logout</Button>
                </NavMenu>
            </Nav>
        </>
    );
};

async function logout(){
    try{
        const response = await fetch('http://localhost:3001/api/logout', {
            credentials: 'include',
            method: 'POST'
        })
        const data = await response.json();
        if(response.ok){
            alert(data.message);
            location.reload();
        }
   
    }
    catch(err){
        console.log(err);
    }
}

export default Navbar;
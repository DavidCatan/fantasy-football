import React from "react";
import { Nav, NavLink, NavMenu } from "./NavbarElements.jsx";
import { Button } from "@mui/material";

const Navbar = () => {
    return (
        <>
            <Nav>
                <NavMenu>
                    <NavLink to="/">
                        Home
                    </NavLink>
                    <NavLink to="/Roster">
                        Roster
                    </NavLink>
                    <NavLink to="/Draft">
                        Draft
                    </NavLink>
                    <NavLink to="/Players">
                        Players
                    </NavLink>
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
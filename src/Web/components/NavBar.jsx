import React from "react";
import { useLocation } from "react-router-dom";
import { Nav, NavLink, NavMenu } from "./NavbarElements.jsx";
import { Button } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useLeague } from "../utils/LeagueContext";


const Navbar = () => {
    const {isMobile} = useLeague();
    const [league, setLeague] = React.useState(null);
    const [owner, setOwner] = React.useState(null);
    const [menuIsOpen, setMenuOpen] = React.useState(false);
    const location = useLocation();

    const toggleMenu = () => {
        setMenuOpen(!menuIsOpen);
    }
    const closeMenuOnMobile = () => {
        if (isMobile) {
            setMenuOpen(false);
        }
    }

    React.useEffect(() => {
            fetch('/api/session', {credentials: 'include'})
                .then(res => res.json())
                .then(data => {
                    if(data.logged){
                    setOwner(data['username']);
                    }
                    else{
                    setOwner(null);
                    }
                });
            fetch('/api/league', {credentials: 'include'})
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
                <NavMenu  className={`${isMobile ? 'flex justify-between items-center w-full p-3' : undefined}`}>
                    Phantom Fantasy
                    <ul className={`
                                        flex items-center gap-8 
                                        ${menuIsOpen ? 'bg-neutral-700 flex-col fixed top-[--navbar-height] right-0 bottom-0 w-1/2 p-8 transform transition-transform duration-300 ease-in-out translate-x-0 z-50'
                                            : !menuIsOpen &&
                                                isMobile ?  'bg-neutral-700 flex-col fixed top-[--navbar-height] right-0 bottom-0 w-1/2 p-8 transform transition-transform duration-300 ease-in-out translate-x-full z-50'
                                            : undefined
                                        }
                                        
                                        
                                    
                                    `}
                                    onClick={closeMenuOnMobile}>
                        <li className="hover:underline">
                            <NavLink to="/">
                                Home
                            </NavLink>
                        </li>
                        {league && owner ? 
                            <>  
                               <li className="hover:underline"> 
                                    <NavLink to="/Roster">
                                        Roster
                                    </NavLink>
                                </li>
                                <li className="hover:underline">
                                    <NavLink to="/Matchup">
                                        Matchup
                                    </NavLink>
                                </li>
                                <li className="hover:underline">
                                    <NavLink to="/Draft">
                                        Draft
                                    </NavLink>
                                </li>
                                <li className="hover:underline">
                                    <NavLink to="/Players">
                                        Players
                                    </NavLink>
                                </li>
                                <li className="hover:underline">
                                    <NavLink to="/League">
                                        League
                                    </NavLink>
                                </li>
                                <li className="hover:underline">
                                    <Button onClick={logout}>Logout</Button>
                                </li>
                            </>
                            : <></>
                        }
                        
                    </ul>
                    
                        <button className='block md:hidden'
                            onClick={toggleMenu}
                        >
                            {menuIsOpen ? (
                                <CloseIcon className='size-6 text-secondary' />
                            ) : (
                                <MenuIcon className='size-6 text-secondary' />
                            )}
                        </button>

                </NavMenu>
            </Nav>
        </>
    );
};

async function logout(){
    try{
        const response = await fetch('/api/logout', {
            credentials: 'include',
            method: 'POST'
        })
        const data = await response.json();
        if(response.ok){
            //alert(data.message);
            location.replace("/");
        }
   
    }
    catch(err){
        console.log(err);
    }
}

export default Navbar;
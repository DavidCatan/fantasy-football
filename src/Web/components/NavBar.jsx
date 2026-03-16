import React from "react";
import { Nav, NavLink, NavMenu } from "./NavbarElements.jsx";

const Navbar = () => {
    return (
        <>
            <Nav>
                <NavMenu>
                    <NavLink to="/">
                        Home
                    </NavLink>
                    <NavLink to="/Draft">
                        Draft
                    </NavLink>
                    <NavLink to="/Players">
                        Players
                    </NavLink>
                </NavMenu>
            </Nav>
        </>
    );
};

export default Navbar;
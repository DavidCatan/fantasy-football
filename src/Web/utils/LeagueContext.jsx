import React from 'react';
import { Alert, Snackbar } from "@mui/material";

const LeagueContext = React.createContext();

export function LeagueProvider({ children }){
    const [state, setState] = React.useState({
        open: false,
        message: '',
        severity: ''
    });
    
    const { vertical, horizontal, open, message, severity } = state;

    const handleClose = () => {
        setState({ ...state, open: false });
    };

    const showAlert = (severity, message) => {
        setState({ open: true, severity: severity, message: message});
    }

    const value = {
        showAlert
    }

    return(
        <LeagueContext.Provider value={value}>
            {children}
            <Snackbar
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                open={open}
                autoHideDuration={5000}
                onClose={handleClose}
                key={vertical + horizontal}
            >
                <Alert severity={state.severity} variant="filled" sx={{ width: '100%' }} >{state.message}</Alert>
            </Snackbar>  
        </LeagueContext.Provider>

    ) 

}

export const useLeague = () => React.useContext(LeagueContext);

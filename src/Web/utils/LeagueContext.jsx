import React from 'react';
import { Alert, Snackbar } from "@mui/material";
import { determineSlot } from './draftUtils';
import { getTeamRoster, getTeam } from './leagueUtils';

const LeagueContext = React.createContext();

export function LeagueProvider({ children }){
    const [league, setLeague] = React.useState(null);
    const [owner, setOwner] = React.useState(null);
    const [leagueOwner, setLeagueOwner] = React.useState(null);
    const [team, setTeam] = React.useState(null);
    const [userTeam, setUserTeam] = React.useState(null);
    const [roster, setRoster] = React.useState([]);
    const [draftStatus, setDraftStatus] = React.useState(null);
    const [isLegal, setIsLegal] = React.useState(false);

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

    React.useEffect(() => {
        try{
            fetch('http://localhost:3001/api/session', {credentials: 'include'})
                .then(res => res.json())
                .then(data => {
                    if(data.logged){
                        setOwner(data['username']);
                        setIsLegal(data["legalRoster"]);
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
                        setLeagueOwner(data["leagueOwner"]);
                        setTeam(data["activeTeam"]);
                    }
                    else{
                        setLeague(null);
                        setLeagueOwner(null);
                        setTeam(null);
                    }
            });
        }
        catch(err){
            setOwner(null);
            setLeague(null);
        }
        
    }, []);

    React.useEffect(() =>{
        if(!owner || !league || !team){
            return;
        }
        const loadRosterData = async () => {
            try{

                let r = await getTeamRoster(league, team);
                let t = await getTeam(league, owner);
                if(r){
                    setRoster(r);
                }
                if(t){
                    setUserTeam(t["data"]);
                }
            } catch(err){
                console.log(err);
                showAlert('error', 'Error getting roster data. Try refreshing');
            }
        }
        try{
            fetch('http://localhost:3001/api/leagues/draft-status', {credentials: 'include'})
            .then(res => res.json())
            .then(data => {
                if(data){
                    setDraftStatus(data["data"]["draft_status"]);
                }
                else{
                    setDraftStatus(null);
                }
            });
            loadRosterData();
        }
        catch(err){
            console.log(err);
            showAlert('error', 'Error loading league draft status. Try refreshing');
        }
         
    }, [owner, league, team]);

    const { lineup, posCount } = React.useMemo(() =>{
        let l = new Map();
        let p = {"qb": 0, "rb" : 0, "wr": 0, "flex": 0, "te": 0, "k" : 0, "bn" : 0, "total": 0};

        roster.forEach((player) => {
            determineSlot(player.player_pos, p);
            l.set(player["player_slot"], player["player_name"]);
        });
        
        return {lineup: l, posCount : p};

    }, [roster]);

    const value = {
        showAlert, league, owner, setLeague, setOwner, leagueOwner, setLeagueOwner, team, setTeam,
        roster, setRoster, posCount, draftStatus, setDraftStatus, lineup, isLegal, setIsLegal, userTeam, setUserTeam
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

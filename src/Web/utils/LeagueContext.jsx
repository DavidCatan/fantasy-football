import React from 'react';
import { Alert, Snackbar } from "@mui/material";
import { determineSlot } from './draftUtils';
import { getTeamRoster, getTeam, getProjections } from './leagueUtils';
import fart from '../assets/audio/fart.mp3';
import { useWindowSize } from "@reactuses/core";

const profileModules = import.meta.glob('../assets/images/profiles/*.png', { eager: true });
const profilePictures = Object.values(profileModules).map(m => m.default);
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
    const [weekNum, setWeekNum] = React.useState(1);
    const [hasPoop, setHasPoop] = React.useState(false);
    const [projections, setProjections] = React.useState({});
    const { width } = useWindowSize();
    const isMobile = width < 768;

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
            fetch('/api/session', {credentials: 'include'})
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
            fetch('/api/league', {credentials: 'include'})
                .then(res => res.json())
                .then(data => {
                    if(data.activeLeague){
                        setLeague(data["activeLeague"]);
                        setLeagueOwner(data["leagueOwner"]);
                        setTeam(data["activeTeam"]);
                        setWeekNum(data["weekNum"]);
                        setHasPoop(data["hasPoop"]);
                    }
                    else{
                        setLeague(null);
                        setLeagueOwner(null);
                        setTeam(null);
                        setWeekNum(null);
                        setHasPoop(null);
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
                let proj = await getProjections();
                if(r){
                    setRoster(r);
                }
                if(t){
                    setUserTeam(t["data"]);
                }
                setProjections(proj);
            } catch(err){
                console.log(err);
                showAlert('error', 'Error getting roster data. Try refreshing');
            }
        }
        try{
            fetch('/api/leagues/draft-status', {credentials: 'include'})
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

    // make fart noises if user has poop medal
    React.useEffect(() => {
        if(hasPoop){
             // Preload audio instance
            const audio = new Audio(fart);
            audio.volume = 1;

            const handleGlobalClick = (event) => {
                const target = event.target.closest('button, a, .sound-click');
                if (target) {
                    audio.currentTime = 0; 
                    audio.play().catch(() => {}); 
                }
            };

            window.addEventListener('click', handleGlobalClick);

            return () => {
                window.removeEventListener('click', handleGlobalClick);
            };
        }
       
    }, [hasPoop]);

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
        roster, setRoster, posCount, draftStatus, setDraftStatus, lineup, isLegal, setIsLegal, userTeam, setUserTeam,
        weekNum, setWeekNum, hasPoop, setHasPoop, projections, isMobile, profilePictures
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

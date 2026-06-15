import e from "cors";
import React from "react";
import {getTeam, getTeamRoster, getTeams, getStandings} from '../utils/leagueUtils';

const League = () => {
    const [team, setTeam] = React.useState(null);
    const [league, setLeague] = React.useState(null);
    const [owner, setOwner] = React.useState();
    const [loading, setLoading] = React.useState(true);

    const [teams, setTeams] = React.useState([]);
    const [standings, setStandings] = React.useState();
    
          // check session and league
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
        }, [])

        React.useEffect(() => {
            if(!owner || !league){
                return;
            }
            const loadLeagueData = async () => {
                try{
                    let t = await getTeam(league, owner); 
                    let allTeams = await getTeams(league);    
                    let s = await getStandings(league);                                  
    
                    setTeam(t["data"]);
                    setTeams(allTeams["data"]);
                    setStandings(s);
                    setLoading(false);
                } catch(err){
                    console.log(err);
                    alert('error getting team data');
                }
            }
            
            loadLeagueData();
    
        },[owner, league]);
    
        if(loading){
            return <div className="text-3xl font-bold mb-4 text-slate-800">Loading...</div>;
        }
    
        return(
            <>
                <div className="max-w-4xl mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-xl">
                    <h2 className="text-3xl font-bold mb-4 border-b border-gray-700 pb-2">League</h2>
                    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl mt-5">
                        <h1 className="text-2xl font-bold mb-4 text-slate-800 text-center">Standings</h1>
                        <Standings teams={teams} standings={standings} />
                    </div>
                </div>
            </>
        );
}

function Standings({teams, standings}){
    return(
        <>
            <div className="max-h-[400px] overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Rank</th>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Team</th>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Record</th>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">PF</th>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">PA</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {standings.map((team, index) => (
                            <tr key={index} className="hover:bg-blue-50 transition-colors even:bg-slate-50/50">
                                <td className="p-3 text-slate-500 font-medium">{index + 1}</td>
                                <td className="p-3 font-bold text-slate-800">{team["owner"]}</td>
                                <td className="p-3 font-bold text-slate-800">{team["wins"]}-{team["losses"]}</td>
                                <td className="p-3 font-bold text-slate-800">{team["points_for"]}</td>
                                <td className="p-3 font-bold text-slate-800">{team["points_against"]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default League;
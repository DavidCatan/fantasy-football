import React from "react";
import {getTeams, getStandings} from '../utils/leagueUtils';
import { useLeague } from "../utils/LeagueContext";
import { LoadingScreen } from "../utils/playerUtils";

const League = () => {
    const { league, owner } = useLeague();
    const [loading, setLoading] = React.useState(true);

    const [teams, setTeams] = React.useState([]);
    const [standings, setStandings] = React.useState();
    
    React.useEffect(() => {
        if(!owner || !league){
            return;
        }
        const loadLeagueData = async () => {
            try{
                let allTeams = await getTeams(league);    
                let s = await getStandings(league);                                  

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
        return <LoadingScreen></LoadingScreen>
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
    function standingsOrder(team1, team2) {
        return team1["wins"] < team2["wins"] ? 1 : team1["wins"] > team2["wins"] ? -1 : team1["points_for"] < team2["points_for"] ? 1 : -1;
    }
    return(
        <>
            <div className="max-h-[400px] overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-center border-collapse table-fixed">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Rank</th>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600 w-1/2">Team</th>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">Record</th>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">PF</th>
                            <th className="p-3 border-b border-slate-200 font-bold text-slate-600">PA</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {standings.sort(standingsOrder).map((team, index) => (
                            <tr key={index} className="hover:bg-blue-50 transition-colors even:bg-slate-50/50">
                                <td className="p-3 text-slate-500 font-medium">{index+1}</td>
                                <td className="p-3 font-bold text-slate-800 truncate">{team["name"] ? team["name"] : team["owner"]}</td>
                                <td className="p-3 font-bold text-slate-800">{team["wins"]}-{team["losses"]}</td>
                                <td className="p-3 font-bold text-slate-800">{Math.round((team["points_for"] + Number.EPSILON) * 100) / 100}</td>
                                <td className="p-3 font-bold text-slate-800">{Math.round((team["points_against"] + Number.EPSILON) * 100) / 100}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default League;
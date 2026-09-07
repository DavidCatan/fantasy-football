import { Button } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";

const Admin = () => {

    const [username, setUsername] = React.useState();
    const [password, setPassword] = React.useState();
    const [user, setUser] = React.useState();
    const [loading, setLoading] = React.useState(true);

    
    const handleLogin = async (e) => {
        e.preventDefault(); 

        const response = await fetch('/api/admin/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (data.success) {
            alert(data.message);
            location.reload();

        } else {
            alert("Login failed: " + data.message);
        }
    };

    const handleWeek = async (weekNum) => {
       const response = await fetch('/api/admin/process-week', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekNum }),
        });

        const data = await response.json();
        if(response.ok){
          alert('success: ' + data.message);
        }
        else{
          alert('failure: ' + data.message);
        }
    }

    const handleProcessTrades = async () => {
       const response = await fetch('/api/admin/process-trades', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(),
        });

        const data = await response.json();
        if(response.ok){
          alert('success: ' + data.message);
        }
        else{
          alert('failure: ' + data.message);
        }
    }

    const handleProcessWaivers = async () => {
       const response = await fetch('/api/admin/process-waivers', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(),
        });

        const data = await response.json();
        if(response.ok){
          alert('success: ' + data.message);
        }
        else{
          alert('failure: ' + data.message);
        }
    }

    const handlePlayoffMatchups = async () => {
       const response = await fetch('/api/admin/set-playoffs', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({leagueId: '5itD1h', weekNum: 17}),
        });

        const data = await response.json();
        if(response.ok){
          alert('success: ' + data.message);
        }
        else{
          alert('failure: ' + data.message);
        }
    }

    const handleEndSeason = async () => {
       const response = await fetch('/api/admin/process-season-end', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({weekNum : 18}),
        });

        const data = await response.json();
        if(response.ok){
          alert('success: ' + data.message);
        }
        else{
          alert('failure: ' + data.message);
        }
    }

    // check admin sesison auth
    React.useEffect(() => {
        fetch('/api/admin/session', {credentials: 'include'})
        .then(res => res.json())
        .then(data => {
            if(data.logged&&data.admin){
                setUser(data['username']);
            }
            else{
                setUser(null);
            }
        })
        .finally(() => setLoading(false));   
        
    }, [])

    
    if(loading){
      return (<div className="text-3xl font-bold mb-4 text-yellow-800">Loading...</div>)
    }

    if(user){
        return(
            <>
              <div className="max-w-4xl mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-xl">
                <h2 className="text-3xl font-bold mb-4 border-b border-gray-700 pb-2">Admin Dashboard</h2>
                  <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl mt-5">
                  <button className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 
                    transition-all font-medium" onClick={() => handleWeek(1)}>
                  Lock in Week
                  </button>
                  <button className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 
                    transition-all font-medium" onClick={handleProcessTrades}>
                  Process Trades
                  </button>
                  <button className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 
                    transition-all font-medium" onClick={handleProcessWaivers}>
                  Process Waivers
                  </button>
                  <button className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 
                    transition-all font-medium" onClick={handlePlayoffMatchups}>
                  Set Playoff Matchups
                  </button>
                  <button className="px-10 mb-4 mt-4 mx-auto flex px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 
                    transition-all font-medium" onClick={handleEndSeason}>
                  End Season
                  </button>
                </div>
              </div>
            </>
        );
    }

    return (
    <>
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img
            // add cool image here
            //alt="Your Company"
            //src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
            className="mx-auto h-10 w-auto"
          />
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white">Sign in as admin</h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm/6 font-medium text-gray-100">
                Username
              </label>
              <div className="mt-2">
                <input
                  id="username"
                  name="username"
                  type="text"
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-gray-100">
                  Password
                </label>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Sign in
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm/6 text-gray-400">
            Not an admin?{' '}
            <Link to="/" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Return to Home
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}

export default Admin;
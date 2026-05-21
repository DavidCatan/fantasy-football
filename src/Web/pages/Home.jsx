import React from "react";
import { Link } from "react-router-dom";

const Home = () => {

    const [username, setUsername] = React.useState();
    const [password, setPassword] = React.useState();
    const [user, setUser] = React.useState();
    const [loading, setLoading] = React.useState(true);
    const [newLeague, setNewLeague] = React.useState();
    const [leagueName, setLeagueName] = React.useState();


    const handleLogin = async (e) => {
        e.preventDefault(); 

        const response = await fetch('http://localhost:3001/api/login', {
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

    const createLeague = async (e) => {
      e.preventDefault();
      if(!leagueName || leagueName.length == 0 || leagueName.length > 100){
        return alert('League Name must be at least 1 character and less than 100 characters');
      }
      const response = await fetch('http://localhost:3001/api/leagues/create', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leagueName: leagueName, owner: user }),
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);

        } else {
            alert("Create league failed: " + data.message);
        }
    }

    const joinLeague = async (e) => {
      e.preventDefault();
      const response = await fetch('http://localhost:3001/api/leagues/join', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leagueId: newLeague, owner: user }),
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);

        } else {
            alert("Join failed: " + data.message);
        }
    }

    React.useEffect(() => {
      fetch('http://localhost:3001/api/session', {credentials: 'include'})
        .then(res => res.json())
        .then(data => {
          if(data.logged){
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
        <div className="grid grid-cols-2 gap-8">
          <div className="p-6 max-w-4xl bg-white rounded-xl mt-5 ml-7">
            <div className="text-3xl font-bold mb-4 text-slate-800 text-center">
              Create New League
            </div>
            <form onSubmit={createLeague} className="space-y-6">
               <div>
              <div className="mt-2">
                <input
                  name="league_name"
                  type="text"
                  placeholder="Enter League Name"
                  onChange={(e) => setLeagueName(e.target.value)}
                  required
                  className="appearance-none block w-full bg-gray-200 text-gray-700 border border-blue-500 rounded py-3 h-18 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                />
              </div>
            </div>
              <div>
                 <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-blue-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Create League
              </button>
              </div>
            </form>
          </div>

          <div className="p-6 max-w-4xl bg-white rounded-xl mt-5 mr-7">
            <div className="text-3xl font-bold mb-4 text-slate-800 text-center">
              Have a League ID? Join Now
            </div>
            <form onSubmit={joinLeague} className="space-y-6">
               <div>
              <div className="mt-2">
                <input
                  name="league_id"
                  type="text"
                  placeholder="Enter 6 Digit ID"
                  onChange={(e) => setNewLeague(e.target.value)}
                  required
                  className="appearance-none block w-full bg-gray-200 text-gray-700 border border-green-500 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                />
              </div>
            </div>
              <div>
                 <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-green-700 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Join League
              </button>
              </div>
            </form>
          </div>
        </div>
       
      )
    }
    else{
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
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white">Sign in to your account</h2>
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
                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-400 hover:text-indigo-300">
                    Forgot password?
                  </a>
                </div>
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
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  )
    }
};

export default Home;
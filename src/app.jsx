// src/App.jsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Web/pages/Home';
import Draft from './Web/pages/Draft';
import Navbar from './Web/components/NavBar';
import Players from './Web/pages/Players';
import Roster from './Web/pages/Roster';
import Register from './Web/pages/Register';
import Matchup from './Web/pages/Matchup';
import League from './Web/pages/League';
import Admin from './Web/pages/Admin'
import Modal from "react-modal";
import { LeagueProvider } from './Web/utils/LeagueContext';

Modal.setAppElement('#root');

function App() {
  return (
    <BrowserRouter>
    <LeagueProvider>
        <Navbar />
        
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/Roster" element={<Roster />} />
          <Route path="/Matchup" element={<Matchup />} />
          <Route path="/Draft" element={<Draft />} />
          <Route path="/Players" element={<Players />} />
          <Route path="/League" element={<League />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </LeagueProvider>
    </BrowserRouter>
  );
}

export default App;
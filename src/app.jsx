// src/App.jsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Web/pages/Home';
import Draft from './Web/pages/Draft';
import Navbar from './Web/components/NavBar';
import Players from './Web/pages/Players';
import Roster from './Web/pages/Roster';
import Register from './Web/pages/Register';
import Modal from "react-modal";

Modal.setAppElement('#root');

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route path="/Roster" element={<Roster />} />
        <Route path="/Draft" element={<Draft />} />
        <Route path="/Players" element={<Players />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
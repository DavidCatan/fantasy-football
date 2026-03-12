// src/App.jsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Web/pages/Home';
import Draft from './Web/pages/Draft';
import Navbar from './Web/components/NavBar';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route path="/Draft" element={<Draft />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-dom';
import Home from './Web/pages/Home';
import Draft from './Web/pages/Draft';

function App() {
  return (
    <BrowserRouter>
      <Navbar /> {/* This stays on the screen at all times! */}
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/draft" element={<Draft />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
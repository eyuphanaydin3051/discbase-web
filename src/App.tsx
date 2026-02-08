// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import TeamSelect from './pages/TeamSelect';
import Dashboard from './pages/Dashboard';
import TournamentList from './pages/TournamentList';
import TournamentDetail from './pages/TournamentDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/teams" element={<TeamSelect />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tournaments" element={<TournamentList />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
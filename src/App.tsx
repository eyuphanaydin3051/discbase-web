// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout'; // Layout'u import et
import Login from './pages/Login';
import TeamSelect from './pages/TeamSelect';
import Dashboard from './pages/Dashboard';
import TournamentList from './pages/TournamentList';
import TournamentDetail from './pages/TournamentDetail';
import Roster from './pages/Roster'; // Yeni sayfayı import et

function App() {
  return (
    <Router>
      <Routes>
        {/* Sidebar OLMAYAN sayfalar (Public / Giriş) */}
        <Route path="/" element={<Login />} />
        <Route path="/teams" element={<TeamSelect />} />

        {/* Sidebar OLAN sayfalar (Layout içinde) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/tournaments" element={<TournamentList />} />
          {/* Detay sayfasında da sidebar görünmesi kullanıcı deneyimi için iyidir */}
          <Route path="/tournament/:id" element={<TournamentDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
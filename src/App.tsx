// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout'; // Layout'u import et
import Login from './pages/Login';
import Setting from './pages/Setting';
import TeamSelect from './pages/TeamSelect';
import Dashboard from './pages/Dashboard';
import TournamentList from './pages/TournamentList';
import Trainings from './pages/Trainings';
import TournamentDetail from './pages/TournamentDetail';
import Roster from './pages/Roster'; // Yeni sayfayı import et
import PlayerDetail from './pages/PlayerDetail';
import MatchDetail from './pages/MatchDetail';
import MatchTracking from './pages/MatchTracking';
import Gameplay from './pages/Gameplay';
import { useEffect } from 'react';
function App() {
  // Tema Uygulama Mantığı
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'system';
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Sidebar OLMAYAN sayfalar (Public / Giriş) */}
        <Route path="/" element={<Login />} />
        <Route path="/teams" element={<TeamSelect />} />
        <Route path="/settings" element={<Setting />} />

        {/* Sidebar OLAN sayfalar (Layout içinde) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/tournaments" element={<TournamentList />} />
          <Route path="/trainings" element={<Trainings />} />
          <Route path="/tournament/:id" element={<TournamentDetail />} />
          <Route path="/player/:teamId/:playerId" element={<PlayerDetail />} />
          <Route path="/tournament/:tournamentId/match/:matchId" element={<MatchDetail />} />
          <Route path="/tournament/:tournamentId/match/:matchId/track" element={<MatchTracking />} />
          <Route path="/gameplay" element={<Gameplay />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
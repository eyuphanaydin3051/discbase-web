import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TeamDetails from './pages/TeamDetails';
import TournamentDetails from './pages/TournamentDetails'; // <--- Import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/team/:teamId" element={<TeamDetails />} />
        {/* YENİ ROTA */}
        <Route path="/team/:teamId/tournament/:tournamentId" element={<TournamentDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
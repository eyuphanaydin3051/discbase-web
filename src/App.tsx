import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import TeamSelect from './pages/TeamSelect'; // Yeni Dosya
import Dashboard from './pages/Dashboard';   // Güncellenmiş Dosya
import TournamentList from './pages/TournamentList';
import TournamentDetail from './pages/TournamentDetail';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. Giriş Ekranı */}
        <Route path="/" element={<Login />} />

        {/* 2. Takım Seçim Ekranı (Hub) */}
        <Route path="/teams" element={<TeamSelect />} />

        {/* 3. Seçilen Takımın Paneli */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Diğer Sayfalar */}
        <Route path="/tournaments" element={<TournamentList />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
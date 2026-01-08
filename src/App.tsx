// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TeamDetails from './pages/TeamDetails'; // <-- Bu satır eklenmeli

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        {/* Aşağıdaki satır eklenmeli */}
        <Route path="/team/:teamId" element={<TeamDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
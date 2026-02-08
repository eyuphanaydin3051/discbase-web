// src/pages/TournamentList.tsx
import { useNavigate } from 'react-router-dom';

const MOCK_TOURNAMENTS = [
  { id: '1', name: 'Summer League 2024', location: 'İstanbul', matchCount: 5, status: 'Aktif' },
  { id: '2', name: 'Winter Cup', location: 'Ankara', matchCount: 8, status: 'Tamamlandı' },
];

export default function TournamentList() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900 dark:text-white">
      <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold">Turnuvalarım</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          Yeni Turnuva
        </button>
      </div>
      <div className="grid gap-4 max-w-4xl mx-auto">
        {MOCK_TOURNAMENTS.map((tour) => (
          <div
            key={tour.id}
            onClick={() => navigate(`/tournaments/${tour.id}`)}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition border border-transparent hover:border-indigo-500"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{tour.name}</h3>
                <p className="text-gray-500 dark:text-gray-400">{tour.location}</p>
              </div>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Detaylar →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
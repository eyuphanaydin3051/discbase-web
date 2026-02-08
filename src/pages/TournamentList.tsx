// src/pages/TournamentList.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_TOURNAMENTS = [
  { id: '1', name: 'Summer League 2024', location: 'İstanbul', matchCount: 5, status: 'Aktif' },
  { id: '2', name: 'Winter Cup', location: 'Ankara', matchCount: 8, status: 'Tamamlandı' },
];

export default function TournamentList() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Turnuvalarım</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Yeni Turnuva</button>
      </div>
      <div className="grid gap-4">
        {MOCK_TOURNAMENTS.map((tour) => (
          <div key={tour.id} onClick={() => navigate(`/tournaments/${tour.id}`)} className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md">
            <h3 className="text-xl font-bold">{tour.name}</h3>
            <p className="text-gray-500">{tour.location}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
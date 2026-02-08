// src/pages/Roster.tsx
import React from 'react';

export default function Roster() {
  // Örnek veri - Gerçek veriyi veritabanından çekeceksiniz
  const players = [
    { id: 1, name: 'Ahmet Yılmaz', role: 'Handler', number: 10 },
    { id: 2, name: 'Mehmet Demir', role: 'Cutter', number: 7 },
    { id: 3, name: 'Ayşe Kaya', role: 'Handler', number: 23 },
    { id: 4, name: 'Fatma Çelik', role: 'Defense', number: 5 },
  ];

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Takım Kadrosu</h1>
          <p className="text-gray-500 mt-1">Aktif oyuncu listesi ve istatistikleri.</p>
        </div>
        <button className="bg-[#5B4DBC] text-white px-6 py-3 rounded-xl shadow-lg hover:bg-opacity-90 transition-all flex items-center gap-2">
          <span className="material-icons">person_add</span>
          <span>Oyuncu Ekle</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {players.map((player) => (
          <div key={player.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600">
              {player.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{player.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="bg-purple-50 text-[#5B4DBC] px-2 py-0.5 rounded text-xs font-semibold">{player.role}</span>
                <span>#{player.number}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
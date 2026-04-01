// src/pages/MatchTracking.tsx (Yeni Dosya)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlayers, getMatch } from '../services/repository';
import type { Player, PlayerStats, GameMode, Match } from '../types';

export default function MatchTracking() {
    const { tournamentId, matchId } = useParams();
    const navigate = useNavigate();
    
    const [gameMode, setGameMode] = useState<GameMode>('IDLE');
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [activePasserId, setActivePasserId] = useState<string | null>(null);
    const [match, setMatch] = useState<Match | null>(null);

    useEffect(() => {
        const teamId = localStorage.getItem('selectedTeamId');
        if (teamId) {
            getPlayers(teamId, setPlayers);
            if (tournamentId && matchId) getMatch(tournamentId, matchId).then(setMatch);
        }
    }, [tournamentId, matchId]);

    // Kadro Seçim Ekranı (Line Selection)
    if (gameMode === 'IDLE') {
        return (
            <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#121212] p-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6 text-[#5B4DBC]">Kadro Seçimi ({selectedPlayerIds.length}/7)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {players.map(player => (
                            <button 
                                key={player.id}
                                onClick={() => {
                                    if (selectedPlayerIds.includes(player.id)) {
                                        setSelectedPlayerIds(prev => prev.filter(id => id !== player.id));
                                    } else if (selectedPlayerIds.length < 7) {
                                        setSelectedPlayerIds(prev => [...prev, player.id]);
                                    }
                                }}
                                className={`p-4 rounded-2xl border-2 transition-all ${selectedPlayerIds.includes(player.id) ? 'border-[#5B4DBC] bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-800'}`}
                            >
                                <div className="font-bold">{player.name}</div>
                                <div className="text-sm text-gray-500">#{player.jerseyNumber}</div>
                            </button>
                        ))}
                    </div>
                    <button 
                        disabled={selectedPlayerIds.length !== 7}
                        onClick={() => setGameMode('MODE_SELECTION')}
                        className="w-full py-4 bg-[#5B4DBC] text-white rounded-2xl font-bold disabled:opacity-50"
                    >
                        Oyuna Başla
                    </button>
                </div>
            </div>
        );
    }

    // İstatistik Takip Ekranı (StatTrackingUI Benzeri)
    return (
        <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#121212]">
            {/* Üst Skor Paneli */}
            <div className="bg-white dark:bg-[#1E1E1E] p-6 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <div className="text-center flex-1">
                        <div className="text-sm text-gray-500 uppercase font-bold">BİZ</div>
                        <div className="text-4xl font-black text-[#5B4DBC]">{match?.scoreUs}</div>
                    </div>
                    <div className="px-8 text-2xl font-light text-gray-300">-</div>
                    <div className="text-center flex-1">
                        <div className="text-sm text-gray-500 uppercase font-bold">RAKİP</div>
                        <div className="text-4xl font-black">{match?.scoreThem}</div>
                    </div>
                </div>
            </div>

            {/* Oyuncu Aksiyon Listesi */}
            <div className="max-w-4xl mx-auto p-4 space-y-3">
                {players.filter(p => selectedPlayerIds.includes(p.id)).map(player => (
                    <div key={player.id} className={`bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border ${activePasserId === player.id ? 'border-[#5B4DBC]' : 'border-transparent'} flex items-center justify-between`}>
                        <div className="flex-1">
                            <div className="font-bold">{player.name}</div>
                            <div className="text-xs text-gray-400">#{player.jerseyNumber}</div>
                        </div>
                        
                        <div className="flex gap-2">
                            {/* Android'deki StatIconButton mantığı */}
                            <button className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><span className="material-icons-outlined">check</span></button>
                            <button className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><span className="material-icons-outlined">close</span></button>
                            <button className="w-12 h-12 rounded-xl bg-purple-100 text-[#5B4DBC] flex items-center justify-center"><span className="material-icons-outlined">stars</span></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Alt Kontrol Barı */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E1E1E] p-4 border-t dark:border-gray-800">
                <div className="max-w-4xl mx-auto flex gap-4">
                    <button className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold uppercase text-sm">Rakip Sayı</button>
                    <button className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold uppercase text-sm">Undo</button>
                </div>
            </div>
        </div>
    );
}
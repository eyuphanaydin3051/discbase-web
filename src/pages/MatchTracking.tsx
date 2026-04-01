// src/pages/MatchTracking.tsx (Tüm içeriği bununla değiştirin)

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlayers, getMatch, updateMatchData } from '../services/repository';
import type { Player, PlayerStats, Match, PointData } from '../types';

export default function MatchTracking() {
    const { tournamentId, matchId } = useParams();
    const navigate = useNavigate();
    const teamId = localStorage.getItem('selectedTeamId');

    const [match, setMatch] = useState<Match | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [gameMode, setGameMode] = useState<'IDLE' | 'TRACKING'>('IDLE');
    
    // Anlık sayı istatistikleri
    const [activePasserId, setActivePasserId] = useState<string | null>(null);
    const [currentPointStats, setCurrentPointStats] = useState<Record<string, PlayerStats>>({});

    useEffect(() => {
        if (teamId && tournamentId && matchId) {
            getPlayers(teamId, setPlayers);
            getMatch(tournamentId, matchId).then(setMatch);
        }
    }, [teamId, tournamentId, matchId]);

    const handleAction = (playerId: string, action: 'CATCH' | 'GOAL' | 'DROP' | 'THROWAWAY') => {
        const stats = { ...currentPointStats };
        if (!stats[playerId]) {
            stats[playerId] = { playerId, name: players.find(p => p.id === playerId)?.name || '', successfulPass: 0, assist: 0, throwaway: 0, catchStat: 0, drop: 0, goal: 0, pullAttempts: 0, successfulPulls: 0, block: 0, callahan: 0, secondsPlayed: 0, totalTempoSeconds: 0, pointsPlayed: 1, totalPullTimeSeconds: 0, passDistribution: {} };
        }

        if (action === 'CATCH') {
            stats[playerId].catchStat += 1;
            if (activePasserId && stats[activePasserId]) stats[activePasserId].successfulPass += 1;
            setActivePasserId(playerId);
        } else if (action === 'GOAL') {
            stats[playerId].goal = 1;
            if (activePasserId && stats[activePasserId]) stats[activePasserId].assist = 1;
            savePoint(stats, 'US');
        } else if (action === 'THROWAWAY') {
            stats[playerId].throwaway += 1;
            savePoint(stats, 'THEM');
        }
        setCurrentPointStats(stats);
    };

    const savePoint = async (pointStatsMap: Record<string, PlayerStats>, whoScored: 'US' | 'THEM') => {
        if (!match || !teamId || !tournamentId) return;

        const pointData: PointData = {
            stats: Object.values(pointStatsMap),
            whoScored,
            startMode: 'OFFENSE',
            captureMode: 'ADVANCED',
            pullDurationSeconds: 0,
            durationSeconds: 0,
            stoppages: [],
            proEvents: []
        };

        const updatedMatch = {
            ...match,
            scoreUs: whoScored === 'US' ? match.scoreUs + 1 : match.scoreUs,
            scoreThem: whoScored === 'THEM' ? match.scoreThem + 1 : match.scoreThem,
            pointsArchive: [...(match.pointsArchive || []), pointData]
        };

        await updateMatchData(teamId, tournamentId, updatedMatch);
        setMatch(updatedMatch);
        setCurrentPointStats({});
        setActivePasserId(null);
        alert(whoScored === 'US' ? "Sayı Aldık!" : "Sayı Yedik!");
    };

    if (gameMode === 'IDLE') {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <h2 className="text-2xl font-bold mb-4">Kadro Seç (7 Oyuncu)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {players.map(p => (
                        <button key={p.id} onClick={() => setSelectedPlayerIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                className={`p-3 rounded-xl border ${selectedPlayerIds.includes(p.id) ? 'bg-purple-600 text-white' : 'bg-white'}`}>
                            {p.name}
                        </button>
                    ))}
                </div>
                <button disabled={selectedPlayerIds.length !== 7} onClick={() => setGameMode('TRACKING')} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold">Takibi Başlat</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
            <div className="bg-white dark:bg-gray-800 p-4 shadow-md text-center">
                <h2 className="text-xl font-bold">{match?.opponentName} maçı</h2>
                <div className="text-3xl font-black">{match?.scoreUs} - {match?.scoreThem}</div>
            </div>

            <div className="p-4 space-y-3 max-w-2xl mx-auto">
                {players.filter(p => selectedPlayerIds.includes(p.id)).map(p => (
                    <div key={p.id} className={`p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border-2 ${activePasserId === p.id ? 'border-purple-500' : 'border-transparent'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold">{p.name}</span>
                            {activePasserId === null && <button onClick={() => setActivePasserId(p.id)} className="text-xs bg-gray-100 p-1 px-2 rounded">Pasör Seç</button>}
                        </div>
                        {activePasserId && (
                            <div className="flex gap-2">
                                {activePasserId !== p.id && <button onClick={() => handleAction(p.id, 'CATCH')} className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold">Catch</button>}
                                {activePasserId !== p.id && <button onClick={() => handleAction(p.id, 'GOAL')} className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg font-bold">Goal</button>}
                                {activePasserId === p.id && <button onClick={() => handleAction(p.id, 'THROWAWAY')} className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg font-bold">Turnover</button>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <div className="fixed bottom-0 w-full p-4 bg-white border-t flex gap-3">
                <button onClick={() => savePoint({}, 'THEM')} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Direkt Rakip Sayı</button>
                <button onClick={() => navigate(-1)} className="px-6 py-3 bg-gray-200 rounded-xl">Geri</button>
            </div>
        </div>
    );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatch, addMatchEvent, archivePoint, undoLastEvent, getPlayers } from '../services/repository';
import type { Match, Player, MatchEvent } from '../types';

export default function MatchTracking() {
    const { tournamentId, matchId } = useParams();
    const [match, setMatch] = useState<Match | null>(null);
    const [roster, setRoster] = useState<Player[]>([]);
    const [selectedLineup, setSelectedLineup] = useState<string[]>([]);
    const [isLineupLocked, setIsLineupLocked] = useState(false);
    const [startMode, setStartMode] = useState<'OFFENSE' | 'DEFENSE' | null>(null);

    // 1. Veri Çekme (App ile aynı model)
    useEffect(() => {
        if (matchId && tournamentId) {
            getMatch(tournamentId, matchId).then(setMatch);
            // Takım oyuncularını çek
            const teamId = localStorage.getItem('selectedTeamId');
            if (teamId) getPlayers(teamId, setRoster);
        }
    }, [matchId, tournamentId]);

    // 2. Kadro Seçimi (App'teki 7 player kuralı)
    const togglePlayer = (id: string) => {
        if (selectedLineup.includes(id)) {
            setSelectedLineup(prev => prev.filter(p => p !== id));
        } else if (selectedLineup.length < 7) {
            setSelectedLineup(prev => [...prev, id]);
        }
    };

    // 3. Aksiyon Kaydı (App - Advanced Mode logic)
    const handleAction = async (type: MatchEvent['eventType'], playerId?: string) => {
        if (!matchId || !tournamentId) return;
        
        const event: Partial<MatchEvent> = {
            id: Date.now().toString(),
            eventType: type,
            playerId: playerId,
            timestamp: Date.now()
        };

        await addMatchEvent(tournamentId, matchId, event as MatchEvent);
        
        // Eğer sayı olduysa arşive taşı (App: finishPoint())
        if (type === 'Goal' || type === 'OpponentScore' || type === 'Callahan') {
            const whoScored = (type === 'Goal' || type === 'Callahan') ? 'US' : 'THEM';
            await archivePoint(tournamentId, matchId, selectedLineup, startMode!, whoScored);
            setIsLineupLocked(false);
            setStartMode(null);
            setSelectedLineup([]);
        }
    };

    if (!isLineupLocked) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">Sayı Başlıyor: Kadro Seç</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {roster.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => togglePlayer(p.id)}
                            className={`p-4 rounded-xl border-2 transition-all ${selectedLineup.includes(p.id) ? 'border-violet-600 bg-violet-50' : 'border-gray-100'}`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
                {selectedLineup.length === 7 && (
                    <div className="flex gap-4">
                        <button onClick={() => { setStartMode('OFFENSE'); setIsLineupLocked(true); }} className="flex-1 bg-blue-600 text-white p-4 rounded-xl font-bold">HÜCUM BAŞLA</button>
                        <button onClick={() => { setStartMode('DEFENSE'); setIsLineupLocked(true); }} className="flex-1 bg-red-600 text-white p-4 rounded-xl font-bold">DEFANS BAŞLA</button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-900 text-white">
            {/* Canlı Skor & Timer Alanı */}
            <div className="p-4 bg-slate-800 flex justify-between items-center gap-4">
                <button onClick={() => navigate(-1)} className="bg-slate-700 p-2 rounded-lg flex items-center justify-center">
                    <span className="material-icons-outlined">arrow_back</span>
                </button>
                <span className="text-2xl font-black flex-1 text-center">
                    {match?.scoreUs ?? match?.score?.[0] ?? 0} - {match?.scoreThem ?? match?.score?.[1] ?? 0}
                </span>
                <button onClick={() => undoLastEvent(tournamentId!, matchId!)} className="bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold">Geri Al</button>
            </div>

            {/* Aksiyon Butonları (App: Pro Mode) */}
            <div className="flex-1 grid grid-cols-2 gap-4 p-4">
                {selectedLineup.map(pid => {
                    const player = roster.find(r => r.id === pid);
                    return (
                        <div key={pid} className="bg-slate-800 p-2 rounded-xl flex flex-col gap-2">
                            <span className="font-bold text-center border-b border-slate-700 pb-1">{player?.name}</span>
                            <div className="grid grid-cols-2 gap-1">
                                {startMode === 'OFFENSE' ? (
                                    <>
                                        <button onClick={() => handleAction('Completion', pid)} className="bg-blue-600 text-xs py-2 rounded">PAS</button>
                                        <button onClick={() => handleAction('Goal', pid)} className="bg-emerald-600 text-xs py-2 rounded">GOL</button>
                                        <button onClick={() => handleAction('Throwaway', pid)} className="bg-rose-600 text-xs py-2 rounded col-span-2">TURNOVER</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleAction('D-Up', pid)} className="bg-orange-500 text-xs py-2 rounded">BLOK</button>
                                        <button onClick={() => handleAction('Callahan', pid)} className="bg-purple-600 text-xs py-2 rounded">CALLAHAN</button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
                {startMode === 'DEFENSE' && (
                    <button onClick={() => handleAction('OpponentScore')} className="col-span-2 bg-slate-700 py-4 rounded-xl font-bold text-rose-400">RAKİP SAYI ATTI</button>
                )}
            </div>
        </div>
    );
}
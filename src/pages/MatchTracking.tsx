import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatch, archivePoint, getPlayers, addMatchEvent, undoLastEvent } from '../services/repository';
import type { Match, Player, PlayerStats, GameMode, MatchEvent } from '../types';

const getTeamName = (match: Match | null) => match?.ourTeamName || match?.teamNames?.[0] || 'BİZİM TAKIM';
const getOpponentName = (match: Match | null) => match?.opponentName || match?.teamNames?.[1] || 'RAKİP';

export default function MatchTracking() {
    const { tournamentId, matchId } = useParams();
    const navigate = useNavigate();
    
    // Temel Veriler
    const [match, setMatch] = useState<Match | null>(null);
    const [roster, setRoster] = useState<Player[]>([]);
    
    // --- UI ve Akış Kontrol State'leri ---
    const [trackingStep, setTrackingStep] = useState<'roster' | 'start_mode' | 'tracking'>('roster');
    const [startMode, setStartMode] = useState<'OFFENSE' | 'DEFENSE' | null>(null);
    const [selectedLineup, setSelectedLineup] = useState<string[]>([]);
    const [lastAction, setLastAction] = useState<string | null>(null);
    
    // --- Gelişmiş Mod State Yönetimi ---
    const [gameMode, setGameMode] = useState<GameMode>('MODE_SELECTION');
    const [currentPointStats, setCurrentPointStats] = useState<PlayerStats[]>([]);
    const [activePasserId, setActivePasserId] = useState<string | null>(null);
    const [historyStack, setHistoryStack] = useState<any[]>([]);
    
    // --- Zamanlayıcı (Timer) ---
    const [pointTimer, setPointTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Veri Çekme ve Timer Kurulumu
    useEffect(() => {
        if (matchId && tournamentId) {
            getMatch(tournamentId, matchId).then(setMatch);
            const teamId = localStorage.getItem('selectedTeamId');
            if (teamId) getPlayers(teamId, setRoster);
        }
    }, [matchId, tournamentId]);

    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => setPointTimer(p => p + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isTimerRunning]);

    // 2. Undo (Geri Al) Mekanizması
    const saveStateToHistory = () => {
        setHistoryStack(prev => [...prev, {
            gameMode,
            currentPointStats: JSON.parse(JSON.stringify(currentPointStats)),
            activePasserId,
            pointTimer
        }]);
    };

    const handleUndo = async () => {
        if (!matchId || !tournamentId) return;
        
        // Backend'den son event'i sil
        await undoLastEvent(tournamentId, matchId);

        // Frontend Gelişmiş Mod state'ini bir adım geriye sar
        if (historyStack.length > 0) {
            const prevState = historyStack[historyStack.length - 1];
            setGameMode(prevState.gameMode);
            setCurrentPointStats(prevState.currentPointStats);
            setActivePasserId(prevState.activePasserId);
            setPointTimer(prevState.pointTimer);
            setHistoryStack(prev => prev.slice(0, -1));
        }
    };

    // 3. Aksiyon Mantığı ve Hesaplamalar
    const togglePlayer = (id: string) => {
        if (selectedLineup.includes(id)) {
            setSelectedLineup(prev => prev.filter(p => p !== id));
        } else if (selectedLineup.length < 7) {
            setSelectedLineup(prev => [...prev, id]);
        }
    };

    const handleStartModeSelect = (mode: 'OFFENSE' | 'DEFENSE') => {
        setStartMode(mode);
        
        // Point başlangıç istatistiklerini oluştur
        const initialStats: PlayerStats[] = selectedLineup.map(id => {
            const player = roster.find(r => r.id === id);
            return {
                playerId: id,
                name: player?.name || 'Unknown',
                successfulPass: 0, assist: 0, throwaway: 0, catchStat: 0, drop: 0, goal: 0,
                pullAttempts: 0, successfulPulls: 0, block: 0, callahan: 0,
                secondsPlayed: 0, totalTempoSeconds: 0, pointsPlayed: 1, totalPullTimeSeconds: 0,
                passDistribution: {} 
            };
        });
        
        setCurrentPointStats(initialStats);
        setGameMode(mode === 'OFFENSE' ? 'OFFENSE' : 'DEFENSE_PULL');
        setIsTimerRunning(true);
        setPointTimer(0);
        setHistoryStack([]);
        setActivePasserId(null);
        setTrackingStep('tracking');
    };

    const updatePlayerStat = (playerId: string, updates: Partial<PlayerStats>) => {
        setCurrentPointStats(prev => prev.map(p => p.playerId === playerId ? { ...p, ...updates } : p));
    };

    // Firebase Canlı Akışa (Timeline) Event Atma
    const fireEvent = async (type: MatchEvent['eventType'], playerId?: string) => {
        if (!matchId || !tournamentId) return;
        setLastAction(`${playerId}_${type}`);
        
        const event = {
            id: Date.now().toString(),
            eventType: type,
            playerId: playerId,
            timestamp: Date.now(),
            matchId: matchId,
            teamId: localStorage.getItem('selectedTeamId') || match?.teamIds?.[0] || '',
            currentScore: [match?.scoreUs ?? match?.score?.[0] ?? 0, match?.scoreThem ?? match?.score?.[1] ?? 0],
            period: match?.period || 1
        } as MatchEvent;

        await addMatchEvent(tournamentId, matchId, event);
        setTimeout(() => setLastAction(null), 300);
    };

    // --- HÜCUM AKSİYONLARI ---
    const handleCatch = async (receiverId: string) => {
        if (!activePasserId) return;
        saveStateToHistory();
        
        setCurrentPointStats(prev => prev.map(p => {
            if (p.playerId === activePasserId) {
                const newDist = { ...p.passDistribution };
                newDist[receiverId] = (newDist[receiverId] || 0) + 1;
                return { ...p, successfulPass: p.successfulPass + 1, passDistribution: newDist };
            }
            if (p.playerId === receiverId) {
                return { ...p, catchStat: p.catchStat + 1 };
            }
            return p;
        }));
        setActivePasserId(receiverId);
        await fireEvent('Completion', receiverId);
    };

    const handleDrop = async (receiverId: string) => {
        if (!activePasserId) return;
        saveStateToHistory();
        
        setCurrentPointStats(prev => prev.map(p => {
            if (p.playerId === activePasserId) return { ...p, successfulPass: p.successfulPass + 1 };
            if (p.playerId === receiverId) return { ...p, drop: p.drop + 1 };
            return p;
        }));
        setGameMode('DEFENSE');
        setActivePasserId(null);
        await fireEvent('Drop', receiverId);
    };

    const handleThrowaway = async () => {
        if (!activePasserId) return;
        saveStateToHistory();
        updatePlayerStat(activePasserId, { throwaway: currentPointStats.find(p=>p.playerId===activePasserId)!.throwaway + 1 });
        setGameMode('DEFENSE');
        
        const passerCache = activePasserId;
        setActivePasserId(null);
        await fireEvent('Throwaway', passerCache);
    };

    const handleGoal = async (receiverId: string) => {
        if (!activePasserId) return;
        saveStateToHistory();
        
        const updatedStats = currentPointStats.map(p => {
            if (p.playerId === activePasserId) {
                const newDist = { ...p.passDistribution };
                newDist[receiverId] = (newDist[receiverId] || 0) + 1;
                return { ...p, assist: p.assist + 1, passDistribution: newDist };
            }
            if (p.playerId === receiverId) return { ...p, goal: p.goal + 1, catchStat: p.catchStat + 1 };
            return p;
        });
        setCurrentPointStats(updatedStats);

        // Gelişmiş modda Atan (Goal) ve Attıran (Assist) otomatik bellidir
        await fireEvent('Goal', receiverId);
        await fireEvent('Assist', activePasserId);
        await finishPoint(updatedStats, 'US');
    };

    // --- SAVUNMA AKSİYONLARI ---
    const handlePull = (playerId: string, isSuccessful: boolean) => {
        saveStateToHistory();
        updatePlayerStat(playerId, { 
            pullAttempts: currentPointStats.find(p=>p.playerId===playerId)!.pullAttempts + 1,
            successfulPulls: isSuccessful ? currentPointStats.find(p=>p.playerId===playerId)!.successfulPulls + 1 : currentPointStats.find(p=>p.playerId===playerId)!.successfulPulls
        });
        setGameMode('DEFENSE');
    };

    const handleBlock = async (playerId: string) => {
        saveStateToHistory();
        updatePlayerStat(playerId, { block: currentPointStats.find(p=>p.playerId===playerId)!.block + 1 });
        setGameMode('OFFENSE');
        await fireEvent('D-Up', playerId);
    };

    const handleCallahan = async (playerId: string) => {
        saveStateToHistory();
        const updatedStats = currentPointStats.map(p => {
            if (p.playerId === playerId) return { ...p, block: p.block + 1, goal: p.goal + 1, callahan: p.callahan + 1 };
            return p;
        });
        setCurrentPointStats(updatedStats);
        
        await fireEvent('Callahan', playerId);
        await finishPoint(updatedStats, 'US');
    };

    const handleOpponentScore = async () => {
        saveStateToHistory();
        await fireEvent('OpponentScore');
        await finishPoint(currentPointStats, 'THEM');
    };

    // --- SAYI BİTİRME (POINT END) ---
    const finishPoint = async (finalStats: PlayerStats[], whoScored: 'US' | 'THEM') => {
        if (!matchId || !tournamentId) return;
        setIsTimerRunning(false);
        
        const statsToSave = finalStats.map(stat => ({
            ...stat,
            secondsPlayed: pointTimer
        }));

        await archivePoint(tournamentId, matchId, selectedLineup, startMode!, whoScored);
        
        // Puan bitiminde sayfayı sıfırla ve maç bilgisini güncelle
        setTrackingStep('roster');
        setStartMode(null);
        setSelectedLineup([]);
        setCurrentPointStats([]);
        setActivePasserId(null);
        setPointTimer(0);
        getMatch(tournamentId, matchId).then(setMatch);
    };

    // --- ORTAK ÜST BAR ---
    const TopBar = () => (
        <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-lg flex justify-between items-center text-white">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(`/tournament/${tournamentId}/match/${matchId}`)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all">
                    <span className="material-icons-outlined">arrow_back</span>
                </button>
                <span className="text-xl font-black uppercase text-slate-100">
                    {getTeamName(match)} <span className="text-violet-500 px-2">{match?.scoreUs ?? match?.score?.[0] ?? 0} - {match?.scoreThem ?? match?.score?.[1] ?? 0}</span> {getOpponentName(match)}
                </span>
                {trackingStep === 'tracking' && (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${startMode === 'OFFENSE' ? 'bg-blue-900 text-blue-200' : 'bg-red-900 text-red-200'}`}>
                        {startMode === 'OFFENSE' ? 'HÜCUM' : 'DEFANS'}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-3">
                {trackingStep === 'tracking' && (
                    <span className="font-mono text-2xl font-bold bg-slate-800 px-4 py-1.5 rounded-lg tabular-nums">
                        {Math.floor(pointTimer / 60).toString().padStart(2, '0')}:{ (pointTimer % 60).toString().padStart(2, '0')}
                    </span>
                )}
                <span className="px-3 py-1 bg-violet-900/40 text-violet-400 rounded-full font-bold text-xs uppercase tracking-wider">Gelişmiş Mod</span>
            </div>
        </div>
    );

    // ==========================================
    // 1. AŞAMA: KADRO SEÇİMİ
    // ==========================================
    if (trackingStep === 'roster') {
        const sortedRoster = [...roster].sort((a, b) => (Number(a.jerseyNumber) || 0) - (Number(b.jerseyNumber) || 0));
        
        return (
            <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
                <TopBar />
                <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-5">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                <span className="material-icons-outlined text-violet-600">groups</span> Sayı İçin 7 Kişi Seç
                            </h2>
                            <div className="flex items-center gap-4">
                                <span className={`px-5 py-2.5 rounded-xl font-black text-sm ${selectedLineup.length === 7 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                    Seçilen: {selectedLineup.length} / 7
                                </span>
                                <button 
                                    onClick={() => setTrackingStep('start_mode')}
                                    disabled={selectedLineup.length !== 7}
                                    className="px-8 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200 dark:shadow-none"
                                >
                                    İleri
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {sortedRoster.map(p => (
                                <button 
                                    key={p.id} onClick={() => togglePlayer(p.id)}
                                    className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center gap-3 relative hover:border-violet-300 dark:hover:border-violet-700 group ${selectedLineup.includes(p.id) ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                                >
                                    <div className={`h-12 w-12 rounded-full border-2 transition-all flex items-center justify-center font-bold text-lg ${selectedLineup.includes(p.id) ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-700 dark:bg-violet-900/50 dark:text-violet-300' : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {p.jerseyNumber || '??'}
                                    </div>
                                    <span className={`text-xs font-bold text-center leading-tight ${selectedLineup.includes(p.id) ? 'text-violet-900 dark:text-violet-100' : 'text-slate-700 dark:text-slate-300'}`}>{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. AŞAMA: BAŞLANGIÇ MODU (Hücum/Defans)
    // ==========================================
    if (trackingStep === 'start_mode') {
        return (
            <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
                <TopBar />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-center max-w-xl w-full">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-8 uppercase tracking-wider">Oyun Nasıl Başlıyor?</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <button onClick={() => handleStartModeSelect('OFFENSE')} className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg">
                                <span className="material-icons-outlined text-5xl">sports_handball</span>
                                <span className="text-xl font-bold uppercase">HÜCUM</span>
                            </button>
                            <button onClick={() => handleStartModeSelect('DEFENSE')} className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg">
                                <span className="material-icons-outlined text-5xl">shield</span>
                                <span className="text-xl font-bold uppercase">DEFANS</span>
                            </button>
                        </div>
                        <button onClick={() => setTrackingStep('roster')} className="mt-8 text-sm font-bold text-slate-500 hover:text-slate-700">← Geri Dön</button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 3. AŞAMA: GELİŞMİŞ TAKİP EKRANI (MatchEntryAdvanced)
    // ==========================================
    return (
        <div className="h-screen flex flex-col bg-slate-950 text-white font-sans overflow-hidden">
            <TopBar />
            
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
                {/* Üst Aksiyonlar: Undo ve Rakip Sayı */}
                <div className="flex justify-between items-center mb-6">
                    <button onClick={handleUndo} disabled={historyStack.length === 0} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all border border-slate-700 disabled:opacity-50">
                        <span className="material-icons-outlined">undo</span> Son İşlemi Geri Al
                    </button>
                    {gameMode.includes('DEFENSE') && (
                        <button onClick={handleOpponentScore} className="px-8 py-3 bg-rose-900/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 rounded-xl font-black transition-all shadow-lg">
                            RAKİP SAYI ATTI
                        </button>
                    )}
                </div>

                {/* Sahadaki 7 Oyuncu Grid Sistemi */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {selectedLineup.map(pid => {
                        const player = roster.find(r => r.id === pid);
                        const isDiskHolder = activePasserId === pid;

                        return (
                            <div key={pid} className={`flex flex-col bg-slate-900 rounded-2xl border transition-all ${isDiskHolder ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.02]' : 'border-slate-800'}`}>
                                <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-800/30 rounded-t-2xl">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-lg shadow-inner ${isDiskHolder ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-600'}`}>
                                        {player?.jerseyNumber || '??'}
                                    </div>
                                    <p className="font-bold text-slate-100 text-lg flex-1">{player?.name}</p>
                                    {isDiskHolder && <span className="bg-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase">Disk Onda</span>}
                                </div>
                                
                                {/* State Machine (GameMode) Bazlı Dinamik Butonlar */}
                                <div className="p-3 grid grid-cols-2 gap-2">
                                    {gameMode === 'DEFENSE_PULL' ? (
                                        <button onClick={() => handlePull(pid, true)} className="col-span-2 py-3 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-white border border-yellow-600/50 rounded-xl font-bold transition-all">
                                            Pull Atışı (Saha İçi)
                                        </button>
                                    ) : gameMode === 'OFFENSE' ? (
                                        isDiskHolder ? (
                                            // 1. Durum: Diski tutan kişi sadece hatalı pas atabilir
                                            <button onClick={handleThrowaway} className="col-span-2 py-3 bg-rose-900/40 hover:bg-rose-600 border border-rose-800/50 text-rose-400 hover:text-white rounded-xl text-sm font-black uppercase transition-colors">
                                                Hatalı Pas (Throwaway)
                                            </button>
                                        ) : activePasserId ? (
                                            // 2. Durum: Disk başkasında, bu oyuncu diski yakalayabilir
                                            <>
                                                <button onClick={() => handleCatch(pid)} className="col-span-2 py-3 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-xl text-sm font-black uppercase transition-colors">
                                                    Pas Aldı (Yakaladı)
                                                </button>
                                                <button onClick={() => handleDrop(pid)} className="py-2.5 bg-slate-800 hover:bg-rose-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-colors">
                                                    Düşürdü (Drop)
                                                </button>
                                                <button onClick={() => handleGoal(pid)} className="py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-800/50 text-emerald-400 hover:text-white rounded-xl text-xs font-black uppercase transition-colors shadow">
                                                    GOL!
                                                </button>
                                            </>
                                        ) : (
                                            // 3. Durum: Disk kimsede değil (Turnover sonrası yeni hücum başlangıcı)
                                            <button onClick={() => { saveStateToHistory(); setActivePasserId(pid); }} className="col-span-2 py-3 bg-blue-900/40 hover:bg-blue-600 border border-blue-800/50 text-blue-300 hover:text-white rounded-xl text-sm font-black uppercase transition-colors">
                                                Diski Aldı (Başla)
                                            </button>
                                        )
                                    ) : ( // DEFENSE MODU
                                        <>
                                            <button onClick={() => handleBlock(pid)} className="col-span-2 py-4 bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white rounded-xl text-sm font-black uppercase transition-colors">
                                                BLOK (D-UP)
                                            </button>
                                            <button onClick={() => handleCallahan(pid)} className="col-span-2 py-3 mt-1 bg-purple-900/40 hover:bg-purple-600 border border-purple-800/50 text-purple-400 hover:text-white rounded-xl text-sm font-black uppercase transition-colors">
                                                CALLAHAN GOLÜ
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
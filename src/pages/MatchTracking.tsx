import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getMatch, archivePoint, getPlayers, addMatchEvent,
    undoLastEvent, getTournaments, updateMatchData
} from '../services/repository';
import type { Match, Player, PlayerStats, GameMode, MatchEvent, Tournament } from '../types';
import YouTube from 'react-youtube';

const getTeamName = (match: Match | null) => match?.ourTeamName || match?.teamNames?.[0] || 'BİZİM TAKIM';
const getOpponentName = (match: Match | null) => match?.opponentName || match?.teamNames?.[1] || 'RAKİP';

export default function MatchTracking() {
    const { tournamentId, matchId } = useParams();
    const navigate = useNavigate();

    // --- Temel Veriler ---
    const [match, setMatch] = useState<Match | null>(null);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [roster, setRoster] = useState<Player[]>([]);

    // --- UI ve Akış Kontrol State'leri ---
    const [trackingStep, setTrackingStep] = useState<'roster' | 'start_mode' | 'tracking'>('roster');
    const [startMode, setStartMode] = useState<'OFFENSE' | 'DEFENSE' | null>(null);
    const [selectedLineup, setSelectedLineup] = useState<string[]>([]);
    const [lastAction, setLastAction] = useState<string | null>(null);

    // Yeni Gruplandırma State'i (Gizleme yerine kategorize etme)
    const [groupingMode, setGroupingMode] = useState<'NONE' | 'GENDER' | 'POSITION'>('NONE');

    // --- Gelişmiş Mod State Yönetimi ---
    const [gameMode, setGameMode] = useState<GameMode>('MODE_SELECTION');
    const [currentPointStats, setCurrentPointStats] = useState<PlayerStats[]>([]);
    const [activePasserId, setActivePasserId] = useState<string | null>(null);
    const [historyStack, setHistoryStack] = useState<any[]>([]);

    // --- Zamanlayıcı (Timer) ---
    const [pointTimer, setPointTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<number | null>(null);

    // --- VİDEO SCOUTER STATE ---
    const [ytPlayer, setYtPlayer] = useState<any>(null);
    const [liveEvents, setLiveEvents] = useState<MatchEvent[]>([]); // YENİ: Canlı olay akışı state'i

    // 1. Veri Çekme ve Timer Kurulumu
    useEffect(() => {
        const teamId = localStorage.getItem('selectedTeamId');
        if (matchId && tournamentId && teamId) {
            getMatch(tournamentId, matchId).then(m => {
                setMatch(m);
                // Eğer maçın geçmiş eventleri varsa onları çekip yeniden eskiye sıralayalım
                if (m && m.events) {
                    setLiveEvents(m.events.sort((a, b) => b.timestamp - a.timestamp));
                }
            });
            const unsubPlayers = getPlayers(teamId, setRoster);
            const unsubTournaments = getTournaments(teamId, (tours) => {
                const currentTour = tours.find(t => t.id === tournamentId);
                setTournament(currentTour || null);
            });

            return () => {
                unsubPlayers();
                unsubTournaments();
            };
        }
    }, [matchId, tournamentId]);

    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = window.setInterval(() => setPointTimer(p => p + 1), 1000);
        } else if (timerRef.current) {
            window.clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
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
        await undoLastEvent(tournamentId, matchId);
        
        // Geri alındığında listeden de son eklenen aksiyonu kaldırıyoruz
        setLiveEvents(prev => prev.slice(1));

        if (historyStack.length > 0) {
            const prevState = historyStack[historyStack.length - 1];
            setGameMode(prevState.gameMode);
            setCurrentPointStats(prevState.currentPointStats);
            setActivePasserId(prevState.activePasserId);
            setPointTimer(prevState.pointTimer);
            setHistoryStack(prev => prev.slice(0, -1));
        }
    };

    // 3. Kadro Seçimi ve Filtreler
    const togglePlayer = (id: string) => {
        if (selectedLineup.includes(id)) {
            setSelectedLineup(prev => prev.filter(p => p !== id));
        } else if (selectedLineup.length < 7) {
            setSelectedLineup(prev => [...prev, id]);
        }
    };

    // TS HATASI DÜZELTİLDİ: lineup yerine stats.map kullanıldı
    const loadLastLine = () => {
        if (match && match.pointsArchive && match.pointsArchive.length > 0) {
            const lastPoint = match.pointsArchive[match.pointsArchive.length - 1];
            const lastLineup = lastPoint.stats?.map(s => s.playerId) || [];

            if (lastLineup.length === 7) {
                setSelectedLineup(lastLineup);
            } else {
                alert("Son sayının verisi tam 7 kişi içermiyor veya eksik kaydedilmiş.");
            }
        } else {
            alert("Bu maçta henüz oynanmış bir sayı (point) bulunmuyor.");
        }
    };

    // 4. Mod Seçimi ve Sayı Başlatma
    const handleStartModeSelect = (mode: 'OFFENSE' | 'DEFENSE') => {
        setStartMode(mode);
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

    const fireEvent = async (type: MatchEvent['eventType'], playerId?: string) => {
        if (!matchId || !tournamentId) return;
        setLastAction(`${playerId}_${type}`);

        // O ANKİ VİDEO SANİYESİNİ AL (Video varsa ve oynatılıyorsa)
        let currentVideoTime: number | undefined = undefined;
        if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
            const time = ytPlayer.getCurrentTime();
            if (time > 0) {
                currentVideoTime = Math.floor(time);
            }
        }

        const event = {
            id: Date.now().toString(),
            eventType: type,
            playerId: playerId || null, 
            timestamp: Date.now(),
            matchId: matchId,
            teamId: localStorage.getItem('selectedTeamId') || match?.teamIds?.[0] || '',
            currentScore: [match?.scoreUs ?? match?.score?.[0] ?? 0, match?.scoreThem ?? match?.score?.[1] ?? 0],
            period: match?.period || 1,
            videoTimestampSeconds: currentVideoTime
        } as MatchEvent;
        
        await addMatchEvent(tournamentId, matchId, event);
        setTimeout(() => setLastAction(null), 300);
        
        // Yeni eventi arayüzdeki olay geçmişinin en üstüne ekliyoruz
        setLiveEvents(prev => [event, ...prev]);
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
            if (p.playerId === receiverId) return { ...p, catchStat: p.catchStat + 1 };
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
        updatePlayerStat(activePasserId, { throwaway: currentPointStats.find(p => p.playerId === activePasserId)!.throwaway + 1 });
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

        await fireEvent('Goal', receiverId);
        await fireEvent('Assist', activePasserId);
        await finishPoint('US');
    };

    // --- SAVUNMA AKSİYONLARI ---
    const handlePull = (playerId: string, isSuccessful: boolean) => {
        saveStateToHistory();
        updatePlayerStat(playerId, {
            pullAttempts: currentPointStats.find(p => p.playerId === playerId)!.pullAttempts + 1,
            successfulPulls: isSuccessful ? currentPointStats.find(p => p.playerId === playerId)!.successfulPulls + 1 : currentPointStats.find(p => p.playerId === playerId)!.successfulPulls
        });
        setGameMode('DEFENSE');
    };

    const handleBlock = async (playerId: string) => {
        saveStateToHistory();
        updatePlayerStat(playerId, { block: currentPointStats.find(p => p.playerId === playerId)!.block + 1 });
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
        await finishPoint('US');
    };

    const handleOpponentTurnover = async () => {
        saveStateToHistory();
        setGameMode('OFFENSE');
        await fireEvent('OpponentTurnover');
    };

    const handleOpponentScore = async () => {
        saveStateToHistory();
        await fireEvent('OpponentScore');
        await finishPoint('THEM');
    };

    // --- SAYI BİTİRME (POINT END) ---
    const finishPoint = async (whoScored: 'US' | 'THEM') => {
        if (!matchId || !tournamentId) return;
        setIsTimerRunning(false);

        setMatch(prev => prev ? {
            ...prev,
            scoreUs: (prev.scoreUs || 0) + (whoScored === 'US' ? 1 : 0),
            scoreThem: (prev.scoreThem || 0) + (whoScored === 'THEM' ? 1 : 0),
            score: [
                (prev.score?.[0] || 0) + (whoScored === 'US' ? 1 : 0),
                (prev.score?.[1] || 0) + (whoScored === 'THEM' ? 1 : 0)
            ]
        } : prev);

        await archivePoint(tournamentId, matchId, selectedLineup, startMode!, whoScored);

        setTrackingStep('roster');
        setStartMode(null);
        setSelectedLineup([]);
        setCurrentPointStats([]);
        setActivePasserId(null);
        setPointTimer(0);
        getMatch(tournamentId, matchId).then(setMatch);
    };

    const handleFinishMatch = async () => {
        if (!matchId || !tournamentId) return;
        const teamId = localStorage.getItem('selectedTeamId');
        if (window.confirm("Maçı bitirmek ve istatistikleri sonlandırmak istediğinize emin misiniz?")) {
            // HATA DÜZELTMESİ: Tüm maç datasını (lokalde eksik kalmış olabilecek state'i) göndermek yerine,
            // sadece maçın durumunu güncelleyip veritabanındaki kayıtlı sayıların ezilmesini önlüyoruz.
            await updateMatchData(teamId!, tournamentId, { id: matchId, finished: true });
            navigate(`/tournament/${tournamentId}/match/${matchId}`);
        }
    };

    // --- ORTAK ÜST BAR ---
    const TopBar = () => (
        <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-lg flex justify-between items-center text-white">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all" title="Geri Dön">
                    <span className="material-icons-outlined">arrow_back</span>
                </button>
                <span className="text-xl font-black uppercase text-slate-100 flex items-center gap-3">
                    {getTeamName(match)}
                    <span className="text-violet-500 bg-violet-900/30 px-3 py-1 rounded-lg">
                        {match?.scoreUs ?? match?.score?.[0] ?? 0} - {match?.scoreThem ?? match?.score?.[1] ?? 0}
                    </span>
                    {getOpponentName(match)}
                </span>
                {trackingStep === 'tracking' && (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${startMode === 'OFFENSE' ? 'bg-blue-900 text-blue-200' : 'bg-red-900 text-red-200'}`}>
                        {startMode === 'OFFENSE' ? 'HÜCUM' : 'DEFANS'}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-4">
                {trackingStep === 'tracking' && (
                    <span className="font-mono text-2xl font-bold bg-slate-800 px-4 py-1.5 rounded-lg tabular-nums">
                        {Math.floor(pointTimer / 60).toString().padStart(2, '0')}:{(pointTimer % 60).toString().padStart(2, '0')}
                    </span>
                )}
                <button onClick={handleFinishMatch} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors">
                    <span className="material-icons-outlined text-[18px]">stop_circle</span> Maçı Bitir
                </button>
            </div>
        </div>
    );

    // YouTube videosunu istenilen saniyeye sardırma fonksiyonu
    const seekToTime = (seconds?: number) => {
        if (ytPlayer && seconds !== undefined) {
            ytPlayer.seekTo(seconds, true);
            ytPlayer.playVideo();
        }
    };

    // ==========================================
    // 1. AŞAMA: KADRO SEÇİMİ VE GRUPLANDIRMA EKRANI
    // ==========================================
    if (trackingStep === 'roster') {
        const activeRoster = roster.filter(p => tournament?.rosterPlayerIds?.includes(p.id));
        const sortedRoster = activeRoster.sort((a, b) => (Number(a.jerseyNumber) || 0) - (Number(b.jerseyNumber) || 0));

        // Yardımcı Render Fonksiyonu: Ekrana oyuncu butonlarını basar
        const renderPlayerGrid = (players: Player[]) => (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {players.map(p => (
                    <button
                        key={p.id} onClick={() => togglePlayer(p.id)}
                        className={`p-4 rounded-2xl border-4 transition-all flex flex-col items-center gap-3 relative hover:border-violet-300 dark:hover:border-violet-700 group ${selectedLineup.includes(p.id) ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                    >
                        <div className={`h-12 w-12 rounded-full border-2 transition-all flex items-center justify-center font-bold text-lg ${selectedLineup.includes(p.id) ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-700 dark:bg-violet-900/50 dark:text-violet-300' : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {p.jerseyNumber || '??'}
                        </div>
                        <span className={`text-xs font-bold text-center leading-tight ${selectedLineup.includes(p.id) ? 'text-violet-900 dark:text-violet-100' : 'text-slate-700 dark:text-slate-300'}`}>{p.name}</span>
                        <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{p.position}</span>
                    </button>
                ))}
                {players.length === 0 && <div className="text-sm text-slate-500 py-4 col-span-full">Bu grupta oyuncu yok.</div>}
            </div>
        );

        return (
            <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
                <TopBar />
                <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
                    <div className="max-w-6xl mx-auto">

                        <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
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

                        {/* YENİ GRUPLANDIRMA VE HIZLI SEÇİM */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Gruplandır:</span>
                                <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <button onClick={() => setGroupingMode('NONE')} className={`px-4 py-2 text-sm font-bold ${groupingMode === 'NONE' ? 'bg-violet-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>Hiçbiri</button>
                                    <button onClick={() => setGroupingMode('GENDER')} className={`px-4 py-2 text-sm font-bold ${groupingMode === 'GENDER' ? 'bg-violet-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>Cinsiyet</button>
                                    <button onClick={() => setGroupingMode('POSITION')} className={`px-4 py-2 text-sm font-bold ${groupingMode === 'POSITION' ? 'bg-violet-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>Pozisyon</button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setSelectedLineup([])} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-all">
                                    Temizle
                                </button>
                                <button onClick={loadLastLine} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                                    <span className="material-icons-outlined text-[16px]">history</span> Son Yediliyi Seç
                                </button>
                            </div>
                        </div>

                        {/* DİNAMİK GRUPLANDIRMA RENDER ALANI */}
                        {groupingMode === 'NONE' && (
                            renderPlayerGrid(sortedRoster)
                        )}

                        {groupingMode === 'GENDER' && (
                            <div className="flex flex-col gap-6">
                                <div>
                                    <h3 className="text-xl font-bold mb-4 text-violet-600 dark:text-violet-400 flex items-center gap-2"><span className="material-icons-outlined">man</span> Erkek (Male)</h3>
                                    {renderPlayerGrid(sortedRoster.filter(p => p.gender?.toLowerCase().includes('erkek') || p.gender?.toLowerCase().includes('male')))}
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                                    <h3 className="text-xl font-bold mb-4 text-violet-600 dark:text-violet-400 flex items-center gap-2"><span className="material-icons-outlined">woman</span> Kadın (Female)</h3>
                                    {renderPlayerGrid(sortedRoster.filter(p => p.gender?.toLowerCase().includes('kadın') || p.gender?.toLowerCase().includes('female')))}
                                </div>
                            </div>
                        )}

                        {groupingMode === 'POSITION' && (
                            <div className="flex flex-col gap-6">
                                <div>
                                    <h3 className="text-xl font-bold mb-4 text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><span className="material-icons-outlined">sports_handball</span> Handlers</h3>
                                    {renderPlayerGrid(sortedRoster.filter(p => p.position?.toLowerCase().includes('handler')))}
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                                    <h3 className="text-xl font-bold mb-4 text-rose-600 dark:text-rose-400 flex items-center gap-2"><span className="material-icons-outlined">directions_run</span> Cutters</h3>
                                    {renderPlayerGrid(sortedRoster.filter(p => p.position?.toLowerCase().includes('cutter')))}
                                </div>
                            </div>
                        )}

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
                        <button onClick={() => setTrackingStep('roster')} className="mt-8 text-sm font-bold text-slate-500 hover:text-slate-700">← Kadroya Geri Dön</button>
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

            <div className={`flex-1 flex flex-col ${match?.youtubeVideoId ? 'lg:flex-row' : ''} p-4 md:p-6 overflow-hidden gap-6`}>

                {/* SOL TARAF: VİDEO OYNATICI VE OLAY GEÇMİŞİ */}
                {match?.youtubeVideoId && (
                    <div className="w-full lg:w-1/2 flex flex-col gap-4 h-full">
                        {/* VİDEO OYNATICI ALANI */}
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex-shrink-0">
                            <div className="p-3 bg-slate-800 flex justify-between items-center border-b border-slate-700">
                                <h3 className="font-bold text-red-400 flex items-center gap-2">
                                    <span className="material-icons-outlined">smart_display</span> Scout Modu
                                </h3>
                                <span className="text-xs text-slate-400">Tıklanan aksiyonlar anlık saniyeyle kaydedilir.</span>
                            </div>
                            <div className="bg-black w-full h-[300px] xl:h-[400px]">
                                <YouTube
                                    videoId={match.youtubeVideoId}
                                    opts={{ width: '100%', height: '100%', playerVars: { controls: 1, rel: 0 } }}
                                    onReady={(e) => setYtPlayer(e.target)}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>

                        {/* OLAY GEÇMİŞİ (EVENT HISTORY) ALANI */}
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex-1 flex flex-col min-h-[200px]">
                            <div className="p-3 bg-slate-800 border-b border-slate-700 sticky top-0 shadow-md">
                                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                                    <span className="material-icons-outlined text-base">history</span> Olay Geçmişi (Tıklayarak Gidin)
                                </h3>
                            </div>
                            <div className="p-2 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                                {liveEvents.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-4">Henüz bir aksiyon kaydedilmedi.</p>
                                )}
                                {liveEvents.map((evt, idx) => {
                                    const p = evt.playerId ? roster.find(r => r.id === evt.playerId) : null;
                                    const formatTime = (sec?: number) => sec !== undefined ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}` : '--:--';
                                    return (
                                        <div 
                                            key={evt.id || idx} 
                                            onClick={() => evt.videoTimestampSeconds !== undefined && seekToTime(evt.videoTimestampSeconds)}
                                            className={`flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-slate-700 transition-colors ${evt.videoTimestampSeconds !== undefined ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
                                            title="Videoda bu ana gitmek için tıklayın"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded">
                                                    {formatTime(evt.videoTimestampSeconds)}
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-200">
                                                        {evt.eventType} {evt.currentScore && `(${evt.currentScore[0]} - ${evt.currentScore[1]})`}
                                                    </span>
                                                    {p && <span className="text-xs text-slate-400">{p.name} <span className="text-slate-500">(#{p.jerseyNumber})</span></span>}
                                                </div>
                                            </div>
                                            {evt.videoTimestampSeconds !== undefined && (
                                                <span className="material-icons-outlined text-slate-500 hover:text-white">play_circle</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* SAĞ TARAF: OYUNCU İSTATİSTİK GRİDİ */}
                <div className={`w-full ${match?.youtubeVideoId ? 'lg:w-1/2 overflow-y-auto custom-scrollbar pr-2' : 'flex-1 overflow-y-auto'} flex flex-col`}>

                    <div className="flex justify-between items-center mb-6 bg-slate-900 p-3 rounded-2xl border border-slate-800 sticky top-0 z-10 shadow-lg">
                        <button onClick={handleUndo} disabled={historyStack.length === 0} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50">
                            <span className="material-icons-outlined">undo</span> Geri Al
                        </button>

                        {gameMode.includes('DEFENSE') && (
                            <div className="flex gap-3">
                                <button onClick={handleOpponentTurnover} className="px-6 py-3 bg-orange-900/40 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-800/50 rounded-xl font-black transition-all shadow-lg flex items-center gap-2">
                                    <span className="material-icons-outlined">swap_horiz</span> RAKİP TOP KAYBI (BİZE GEÇTİ)
                                </button>
                                <button onClick={handleOpponentScore} className="px-6 py-3 bg-rose-900/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 rounded-xl font-black transition-all shadow-lg flex items-center gap-2">
                                    <span className="material-icons-outlined">close</span> RAKİP SAYI ATTI
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${match?.youtubeVideoId ? 'xl:grid-cols-2' : 'lg:grid-cols-4'} gap-4 pb-12`}>
                        {selectedLineup.map(pid => {
                            const player = roster.find(r => r.id === pid);
                            const isDiskHolder = activePasserId === pid;
                            const isJustActed = lastAction?.startsWith(pid);

                            return (
                                <div key={pid} className={`flex flex-col bg-slate-900 rounded-2xl border transition-all ${isDiskHolder ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.02]' : isJustActed ? 'border-violet-500' : 'border-slate-800'}`}>
                                    <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-800/30 rounded-t-2xl">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-lg shadow-inner ${isDiskHolder ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-600'}`}>
                                            {player?.jerseyNumber || '??'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-100 text-lg leading-tight">{player?.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{player?.position || 'Oyuncu'}</p>
                                        </div>
                                        {isDiskHolder && <span className="bg-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1"><span className="material-icons-outlined text-[12px]">adjust</span> Disk Onda</span>}
                                    </div>

                                    <div className="p-3 grid grid-cols-2 gap-2">
                                        {gameMode === 'DEFENSE_PULL' ? (
                                            <button onClick={() => handlePull(pid, true)} className="col-span-2 py-4 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-white border border-yellow-600/50 rounded-xl font-bold transition-all uppercase tracking-wider">
                                                Pull Atışı (Saha İçi)
                                            </button>
                                        ) : gameMode === 'OFFENSE' ? (
                                            isDiskHolder ? (
                                                <button onClick={handleThrowaway} className="col-span-2 py-4 bg-rose-900/40 hover:bg-rose-600 border border-rose-800/50 text-rose-400 hover:text-white rounded-xl text-sm font-black uppercase transition-colors tracking-wider">
                                                    Hatalı Pas (Throwaway)
                                                </button>
                                            ) : activePasserId ? (
                                                <>
                                                    <button onClick={() => handleCatch(pid)} className="col-span-2 py-3 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-xl text-sm font-black uppercase transition-colors tracking-wider">
                                                        Pas Aldı (Yakaladı)
                                                    </button>
                                                    <button onClick={() => handleDrop(pid)} className="py-3 bg-slate-800 hover:bg-rose-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-colors">
                                                        Düşürdü (Drop)
                                                    </button>
                                                    <button onClick={() => handleGoal(pid)} className="py-3 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-800/50 text-emerald-400 hover:text-white rounded-xl text-xs font-black uppercase transition-colors shadow">
                                                        GOL!
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => { saveStateToHistory(); setActivePasserId(pid); }} className="col-span-2 py-4 bg-blue-900/40 hover:bg-blue-600 border border-blue-800/50 text-blue-300 hover:text-white rounded-xl text-sm font-black uppercase transition-colors tracking-wider flex items-center justify-center gap-2">
                                                    <span className="material-icons-outlined text-[18px]">sports_handball</span> Diski Aldı (Başla)
                                                </button>
                                            )
                                        ) : (
                                            <>
                                                <button onClick={() => handleBlock(pid)} className="col-span-2 py-4 bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white rounded-xl text-sm font-black uppercase transition-colors tracking-wider flex items-center justify-center gap-2">
                                                    <span className="material-icons-outlined text-[18px]">pan_tool</span> BLOK (D-UP)
                                                </button>
                                                <button onClick={() => handleCallahan(pid)} className="col-span-2 py-3 mt-1 bg-purple-900/40 hover:bg-purple-600 border border-purple-800/50 text-purple-400 hover:text-white rounded-xl text-sm font-black uppercase transition-colors tracking-wider">
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
            </div>
            );
}
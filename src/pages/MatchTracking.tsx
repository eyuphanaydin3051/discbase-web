import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getMatch, archivePoint, getPlayers, addMatchEvent,
    undoLastEvent, getTournaments, updateMatchData
} from '../services/repository';
import type { Match, Player, PlayerStats, GameMode, MatchEvent, Tournament } from '../types';
import YouTube from 'react-youtube';
import { t } from 'i18next';
import { useTranslation } from 'react-i18next';
export default function MatchTracking() {
    const { t } = useTranslation();
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
    const [injuryReplacement, setInjuryReplacement] = useState<{ originalPlayerId: string } | null>(null);

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
    const [isPullTimerStopped, setIsPullTimerStopped] = useState<boolean>(false);
    

   


    

    // 1. Veri Çekme ve Timer Kurulumu
    useEffect(() => {
        const teamId = localStorage.getItem('selectedTeamId');
        if (matchId && tournamentId && teamId) {
            getMatch(tournamentId, matchId).then(m => {
                setMatch(m);
                // Firebase'den veri gelirse, olayları en yeni en üstte olacak şekilde sırala
                
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
            pointTimer,
            // Pull aşaması için gerekli stateler de geçmişe ekleniyor
            isPullPhase,
            pullingPlayerId,
            pullStartTime,
            pullElapsedTime,
            isPullTimerStopped
        }]);
    };

    const handleUndo = async () => {
        if (!matchId || !tournamentId) return;
        
        // Hem olay geçmişini Firebase'den siliyoruz hem de sonucu bekliyoruz
        await undoLastEvent(tournamentId, matchId);
    
        if (historyStack.length > 0) {
            const prevState = historyStack[historyStack.length - 1];
            setGameMode(prevState.gameMode);
            setCurrentPointStats(prevState.currentPointStats);
            setActivePasserId(prevState.activePasserId);
            setPointTimer(prevState.pointTimer);
        
            // Pull statelerini geri yüklüyoruz
            setIsPullPhase(prevState.isPullPhase ?? false);
            setPullingPlayerId(prevState.pullingPlayerId ?? null);
            setPullStartTime(prevState.pullStartTime ?? null);
            setPullElapsedTime(prevState.pullElapsedTime ?? 0);
            setIsPullTimerStopped(prevState.isPullTimerStopped ?? false);

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

    // --- YENİ PULL VE DEFANS MİMARİSİ ---
    const [isPullPhase, setIsPullPhase] = useState<boolean>(false); // Defans başlangıcındaki Pull aşamasını yönetir
    const [pullStartTime, setPullStartTime] = useState<number | null>(null);
    const [pullElapsedTime, setPullElapsedTime] = useState<number>(0);
    const [pullingPlayerId, setPullingPlayerId] = useState<string | null>(null);

    useEffect(() => {
        let interval: any;
        if (pullStartTime !== null) {
            interval = setInterval(() => {
                setPullElapsedTime((Date.now() - pullStartTime) / 1000);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [pullStartTime]);

    // 1. Seçilen Başlangıç Moduna Göre Hazırlık
    const handleStartModeSelect = (mode: 'OFFENSE' | 'DEFENSE') => {
        setGameMode(mode);
        setStartMode(mode);
        setPointTimer(0);
        setHistoryStack([]);
        setActivePasserId(null);
        setLastAction(null);
        setCurrentPointStats([]);
        setTrackingStep('tracking'); // DÜZELTME: Ekrana geçişi ve butonun tepki vermesini sağlar
        
        // Eğer Defans başlıyorsa sistem otomatik olarak Pull atma zorunluluğuna girer
        if (mode === 'DEFENSE') {
            setIsPullPhase(true);
            setPullingPlayerId(null);
            setPullStartTime(null);
            setPullElapsedTime(0);
            setIsPullTimerStopped(false);
        } else {
            setIsPullPhase(false);
        }
    };

    // 2. Oyuncu seçildikten sonra tıklanan "Pull Süresini Başlat" Butonu
    const handleStartPullTimer = () => {
        if (!pullingPlayerId) return;
        setPullStartTime(Date.now());
        setPullElapsedTime(0);
        fireEvent('Pull Atıldı', pullingPlayerId);
    };
    const handleStopPullTimer = () => {
        setIsPullTimerStopped(true);
        setPullStartTime(null); // Timer durur ama ekrandaki pullElapsedTime sabit kalır
    };
    // 3. Havada süzülen diskin İçerde/Dışarda seçimi ve normal defansa geçiş
    const handleEndPull = (isSuccess: boolean) => {
        const time = pullElapsedTime; // Artık durdurulmuş süreyi kullanıyoruz
        const timeInt = Math.round(time);
    
        // Çoklu dil kullanımı (t) eklendi
        fireEvent(`Pull ${t('ended')} - ${isSuccess ? t('inbounds') : t('out_of_bounds')} (${time.toFixed(1)} sn)`, pullingPlayerId || undefined);
    
        if (pullingPlayerId) {
            updatePlayerStat(pullingPlayerId, 'totalPulls', 1);
            updatePlayerStat(pullingPlayerId, 'totalPullTimeSeconds', timeInt);
        }
    
        setPullStartTime(null);
        setPullElapsedTime(0);
        setPullingPlayerId(null);
        setIsPullPhase(false); 
        setIsPullTimerStopped(false); // Reset
    };

    const updatePlayerStat = (playerId: string, statKey: keyof PlayerStats, value: number = 1) => {
        setCurrentPointStats(prev => {
            const existing = prev.find(p => p.playerId === playerId);
            if (existing) {
                return prev.map(p => 
                    p.playerId === playerId 
                        ? { ...p, [statKey]: ((p[statKey] as number) || 0) + value } 
                        : p
                );
            } else {
                return [...prev, { playerId, [statKey]: value } as unknown as PlayerStats];
            }
        });
    };

    const fireEvent = async (type: MatchEvent['eventType'], playerId?: string, secondaryPlayerId?: string) => {
        if (!matchId || !tournamentId) return;
        setLastAction(`${playerId}_${type}`);

        // VİDEO SANİYESİNİ YAKALA
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
            secondaryPlayerId: secondaryPlayerId || null,
            timestamp: Date.now(),
            matchId: matchId,
            teamId: localStorage.getItem('selectedTeamId') || match?.teamIds?.[0] || '',
            currentScore: [match?.scoreUs ?? match?.score?.[0] ?? 0, match?.scoreThem ?? match?.score?.[1] ?? 0],
            period: match?.period || 1,
            videoTimestampSeconds: currentVideoTime
        } as MatchEvent;
        
        // Sonra Firebase'e gönder (Arka planda çalışır, UI'ı dondurmaz)
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
            if (p.playerId === receiverId) return { ...p, catchStat: p.catchStat + 1 };
            return p;
        }));
        const passerId = activePasserId; // Pası atan kişiyi hafızaya al
        setActivePasserId(receiverId);
        // YENİ: Completion olayında pası atan primary (playerId), tutan secondary (secondaryPlayerId) olur
        await fireEvent('Completion', passerId, receiverId);
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
        
        // Yeni fonksiyona sadece 'throwaway' yazmamız yeterli, +1'i kendi ekler
        updatePlayerStat(activePasserId, 'throwaway'); 
        
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

        const passerId = activePasserId;
        // Assist önce, Goal sonra yazılır ki MatchDetail'de sıralı yakalanıp birleşebilsin
        await fireEvent('Assist', passerId);
        await fireEvent('Goal', receiverId, passerId);
        await finishPoint('US');
    };

    

   const handleBlock = async (playerId: string) => {
        saveStateToHistory();
        
        // Yeni fonksiyona sadece 'block' yazmamız yeterli, +1'i kendi ekler
        updatePlayerStat(playerId, 'block'); 
        
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
        await fireEvent('OpponentGoal'); // RAKİP SAYISI AKORDİYONU İÇİN BURASI DEĞİŞTİ
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
    

    // --- YARDIMCI RENDER FONKSİYONU: KADRO KARTLARI ---
    const renderPlayerGrid = (players: Player[]) => (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
            {players.map(p => (
                <button
                    key={p.id} onClick={() => injuryReplacement ? handleInjurySubstitute(p.id) : togglePlayer(p.id)}
                    className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 relative hover:border-violet-300 group ${selectedLineup.includes(p.id) ? 'border-violet-600 bg-violet-50' : 'border-slate-100 bg-white'} ${injuryReplacement && selectedLineup.includes(p.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={injuryReplacement && selectedLineup.includes(p.id)}
                >
                    {/* Sayı Sayacı Rozeti */}
                    <div className="absolute -top-1 -right-1 bg-slate-800 text-white text-[8px] px-1 rounded-full font-bold shadow-sm">
                        {getPlayerMatchPoints(p.id)}
                    </div>
                    
                    <div className={`h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center font-bold text-sm ${selectedLineup.includes(p.id) ? 'border-violet-300 bg-violet-100 text-violet-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                        {p.jerseyNumber || '??'}
                    </div>
                    <span className={`text-[10px] font-bold text-center leading-tight truncate w-full ${selectedLineup.includes(p.id) ? 'text-violet-900' : 'text-slate-700'}`}>{p.name}</span>
                </button>
            ))}
            {players.length === 0 && <div className="text-sm text-slate-500 py-4 col-span-full">Bu grupta oyuncu yok.</div>}
        </div>
    );

    // ==========================================
    // BİRLEŞTİRİLMİŞ TEK EKRAN (VİDEO HER ZAMAN GÖRÜNÜR)
    // ==========================================
    const activeRoster = roster.filter(p => tournament?.rosterPlayerIds?.includes(p.id));
    
    // YENİ: Uygulamadaki gibi forma numarası olmayanları en sona (999) atan sıralama mantığı
    const getJerseyNumber = (p: Player | undefined) => {
        if (!p || p.jerseyNumber === undefined || p.jerseyNumber === null) return 999;
        const num = Number(p.jerseyNumber);
        return isNaN(num) ? 999 : num;
    };

    // Uygulamadaki sıralama mantığı için pas sayısı hesaplama ve pozisyon ağırlığı
    const getPlayerTotalPasses = (playerId: string) => {
        let passes = 0;
        // Önceki sayılardaki (arşiv) pasları topla
        if (match?.pointsArchive) {
            match.pointsArchive.forEach(point => {
                const stat = point.stats?.find(s => s.playerId === playerId);
                if (stat) {
                    passes += (stat.successfulPass || 0) + (stat.assist || 0);
                }
            });
        }
        // Mevcut (canlı) sayıdaki pasları ekle
        const currentStat = currentPointStats.find(s => s.playerId === playerId);
        if (currentStat) {
            passes += (currentStat.successfulPass || 0) + (currentStat.assist || 0);
        }
        return passes;
    };

    const getPositionWeight = (position?: string) => {
        if (!position) return 3;
        const pos = position.toLowerCase();
        if (pos.includes('handler')) return 1;
        if (pos.includes('cutter')) return 2;
        return 3;
    };

    const getPlayerMatchPoints = (playerId: string) => {
        if (!match?.pointsArchive) return 0;
        return match.pointsArchive.filter(p => p.playerIds?.includes(playerId)).length;
    };

    const handleInjurySubstitute = async (newPlayerId: string) => {
        if (!injuryReplacement) return;
        const outId = injuryReplacement.originalPlayerId;

        // Kadroyu güncelle
        setSelectedLineup(prev => prev.map(id => id === outId ? newPlayerId : id));

        // Eğer diski tutan kişi sakatlandıysa, diski yeni girene ver (App Logic)
        if (activePasserId === outId) {
            setActivePasserId(newPlayerId);
        }

        // Event kaydı
        await fireEvent('Injury Substitute', outId, newPlayerId);
        
        setInjuryReplacement(null);
    };
    
    const sortedRoster = [...activeRoster].sort((a, b) => getJerseyNumber(a) - getJerseyNumber(b));

    return (
        <div className="h-screen w-full flex flex-col bg-slate-100 text-slate-900 font-sans overflow-hidden p-2 gap-2">
            
            {/* ÜST BÖLÜM: SOLDA VİDEO | SAĞDA DAR KONTROL PANELİ */}
            <div className="relative w-full shrink-0">
                <div className="flex flex-col lg:flex-row gap-2">
                    
                    {/* SOL: VİDEO OYNATICI (KATI 16:9 ORANI) */}
                    <div className="w-full lg:w-[75%] bg-black rounded-xl overflow-hidden shadow-md aspect-video flex items-center justify-center relative shrink-0">
                        {match?.youtubeVideoId ? (
                            <YouTube
                                videoId={match.youtubeVideoId}
                                opts={{ width: '100%', height: '100%', playerVars: { controls: 1, rel: 0 } }}
                                onReady={(e) => setYtPlayer(e.target)}
                                className="w-full h-full absolute inset-0"
                            />
                        ) : (
                            <span className="text-slate-500 text-sm flex flex-col items-center gap-2">
                                <span className="material-icons-outlined text-4xl">videocam_off</span>
                                Bu maça video eklenmemiş.
                            </span>
                        )}
                    </div>

                    {/* SAĞ: DAR KONTROL PANELİ (DESKTOP'TA VİDEO İLE AYNI BOYDA VE SCROLLABLE) */}
                    <div className="w-full lg:w-[calc(25%-0.5rem)] flex flex-col gap-2 shrink-0 lg:absolute lg:top-0 lg:right-0 lg:h-full lg:max-h-full overflow-y-auto custom-scrollbar pb-2">
                        {/* ... İçeriklerin başlangıcı, Skor başlığı vb. önceki adımlardaki gibi kalacak ... */}
                    
                    {/* SAĞ PANEL HEADER: Skor ve Maçı Bitir */}
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            <span className="material-icons-outlined text-lg">arrow_back</span>
                        </button>
                        <div className="flex items-center gap-2 font-mono text-lg font-black bg-slate-50 px-3 py-0.5 rounded border border-slate-100">
                            <span className="text-violet-600">{match?.scoreUs ?? match?.score?.[0] ?? 0}</span>
                            <span className="text-slate-300">-</span>
                            <span className="text-rose-600">{match?.scoreThem ?? match?.score?.[1] ?? 0}</span>
                        </div>
    
                        {/* Bitirme butonu */}
                        <div className="flex gap-1">
                            <button onClick={handleFinishMatch} className="p-1 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors" title={t('btn_finish_match')}>
                                <span className="material-icons-outlined text-lg">stop_circle</span>
                            </button>
                        </div>
                    </div>

                    {/* SAĞ PANEL İÇERİK: AŞAMAYA GÖRE DEĞİŞİR */}
                    <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0 flex-1">
                        
                        {/* AŞAMA 1: KADRO SEÇİM KONTROLLERİ & OYUNCU LİSTESİ */}
                        {trackingStep === 'roster' && (
                            <div className="flex flex-col gap-3 h-full overflow-hidden">
                                <div className="text-center font-bold text-xs text-slate-700 uppercase tracking-wide border-b pb-2 shrink-0">
                                    7 Kişi Seç ({selectedLineup.length}/7)
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500">Filtre:</span>
                                    <div className="flex border border-slate-200 rounded-md overflow-hidden">
                                        <button onClick={() => setGroupingMode('NONE')} className={`flex-1 py-1 text-[10px] font-bold ${groupingMode === 'NONE' ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-500'}`}>Tümü</button>
                                        <button onClick={() => setGroupingMode('GENDER')} className={`flex-1 py-1 text-[10px] font-bold ${groupingMode === 'GENDER' ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-500'}`}>Cinsiyet</button>
                                        <button onClick={() => setGroupingMode('POSITION')} className={`flex-1 py-1 text-[10px] font-bold ${groupingMode === 'POSITION' ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-500'}`}>Mevki</button>
                                    </div>
                                </div>
                                
                                {/* OYUNCULAR ARTIK BURADA (SAĞ PANELDE) YER ALIYOR */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 rounded-lg p-2 border border-slate-100">
                                    {groupingMode === 'NONE' && renderPlayerGrid(sortedRoster)}
                                    {groupingMode === 'GENDER' && (
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <h3 className="text-xs font-bold mb-2 text-violet-600 uppercase">Erkek</h3>
                                                {renderPlayerGrid(sortedRoster.filter(p => p.gender?.toLowerCase().includes('erkek') || p.gender?.toLowerCase().includes('male')))}
                                            </div>
                                            <div className="border-t border-slate-200 pt-2">
                                                <h3 className="text-xs font-bold mb-2 text-violet-600 uppercase">Kadın</h3>
                                                {renderPlayerGrid(sortedRoster.filter(p => p.gender?.toLowerCase().includes('kadın') || p.gender?.toLowerCase().includes('female')))}
                                            </div>
                                        </div>
                                    )}
                                    {groupingMode === 'POSITION' && (
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <h3 className="text-xs font-bold mb-2 text-emerald-600 uppercase">Handlers</h3>
                                                {renderPlayerGrid(sortedRoster.filter(p => p.position?.toLowerCase().includes('handler')))}
                                            </div>
                                            <div className="border-t border-slate-200 pt-2">
                                                <h3 className="text-xs font-bold mb-2 text-rose-600 uppercase">Cutters</h3>
                                                {renderPlayerGrid(sortedRoster.filter(p => p.position?.toLowerCase().includes('cutter')))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-auto shrink-0 pt-2">
                                    <button onClick={loadLastLine} className="flex-1 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                                        <span className="material-icons-outlined text-[14px]">history</span> Son Line
                                    </button>
                                    <button onClick={() => setTrackingStep('start_mode')} disabled={selectedLineup.length !== 7} className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg text-[10px] font-bold transition-colors">
                                        İLERİ
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* AŞAMA 2: HÜCUM/DEFANS SEÇİMİ */}
                        {trackingStep === 'start_mode' && (
                            <div className="flex flex-col gap-3">
                                <div className="text-center font-bold text-xs text-slate-700 uppercase tracking-wide border-b pb-2">
                                    Oyun Nasıl Başlıyor?
                                </div>
                                <button onClick={() => handleStartModeSelect('OFFENSE')} className="flex flex-col items-center gap-2 py-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md">
                                    <span className="material-icons-outlined text-2xl">sports_handball</span>
                                    <span className="text-[11px] font-bold uppercase tracking-widest">HÜCUM</span>
                                </button>
                                <button onClick={() => handleStartModeSelect('DEFENSE')} className="flex flex-col items-center gap-2 py-4 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-md">
                                    <span className="material-icons-outlined text-2xl">shield</span>
                                    <span className="text-[11px] font-bold uppercase tracking-widest">DEFANS (PULL)</span>
                                </button>
                                <button onClick={() => setTrackingStep('roster')} className="mt-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 text-center">
                                    ← Kadroya Dön
                                </button>
                            </div>
                        )}

                        {/* AŞAMA 3: MAÇ TAKİBİ VE PULL */}
                        {trackingStep === 'tracking' && (
                            <div className="flex flex-col gap-2">
                                {isPullPhase ? (
                                    <div className="flex flex-col gap-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                        {!pullingPlayerId ? (
                                            <div className="text-center font-black text-[10px] text-indigo-800 py-3 uppercase">
                                                {t('select_puller')}
                                            </div>
                                        ) : pullStartTime === null && pullElapsedTime === 0 ? (
                                            <button onClick={handleStartPullTimer} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[11px] shadow-md uppercase tracking-wider animate-pulse">
                                                {t('start_pull_timer')}
                                            </button>
                                        ) : !isPullTimerStopped ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="text-center font-black text-[9px] text-indigo-800 uppercase tracking-widest">{t('pull_in_air')}</div>
                                                <div className="text-3xl font-mono font-black text-indigo-600 text-center leading-none my-1">
                                                    {pullElapsedTime.toFixed(1)}s
                                                </div>
                                                <button onClick={handleStopPullTimer} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] shadow-sm uppercase">
                                                    {t('stop_timer')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="text-center font-black text-[9px] text-indigo-800 uppercase tracking-widest">{t('pull_time')}: {pullElapsedTime.toFixed(1)}s</div>
                                                <div className="flex gap-1.5 mt-1 w-full">
                                                    <button onClick={() => handleEndPull(true)} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-[10px] shadow-sm uppercase">{t('inbounds')}</button>
                                                    <button onClick={() => handleEndPull(false)} className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-[10px] shadow-sm uppercase">{t('out_of_bounds')}</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={handleUndo} disabled={historyStack.length === 0} className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-md flex items-center justify-center gap-1 transition-all disabled:opacity-50 text-[10px] uppercase">
                                            <span className="material-icons-outlined text-[12px]">undo</span> Geri Al
                                        </button>
                                        
                                        {gameMode === 'DEFENSE' && (
                                            <div className="flex flex-col gap-1.5 mt-2">
                                                <button onClick={handleOpponentTurnover} className="w-full py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-black transition-all text-[10px] flex items-center justify-center gap-1 uppercase">
                                                    <span className="material-icons-outlined text-[14px]">swap_horiz</span> TOP BİZE GEÇTİ
                                                </button>
                                                <button onClick={handleOpponentScore} className="w-full py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg font-black transition-all text-[10px] flex items-center justify-center gap-1 uppercase">
                                                    <span className="material-icons-outlined text-[14px]">close</span> RAKİP SAYI ATTI
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </div>

            {/* ALT BÖLÜM: DİNAMİK İÇERİK (KADRO VEYA DAHA KÜÇÜK OYUNCU KARTLARI) */}
            <div className="flex-1 overflow-y-auto bg-white p-2 rounded-xl border border-slate-200 shadow-sm custom-scrollbar relative">
                
                

                {trackingStep === 'start_mode' && (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Başlangıç Modunu Seçin
                    </div>
                )}

                {trackingStep === 'tracking' && (
                    // KAYDIRMA (SCROLL) OLMADAN EKRANA TAM OTURAN OYUNCU KARTLARI
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5 md:gap-2 h-full">
                        {[...selectedLineup]
                            .sort((idA, idB) => {
                                const playerA = roster.find(r => r.id === idA);
                                const playerB = roster.find(r => r.id === idB);
                                
                                const weightA = getPositionWeight(playerA?.position);
                                const weightB = getPositionWeight(playerB?.position);
                                
                                // 1. Öncelikle pozisyona göre sırala (Handler -> Cutter -> Diğerleri)
                                if (weightA !== weightB) {
                                    return weightA - weightB;
                                }
                                
                                // 2. Aynı pozisyondalarsa toplam pas (başarılı pas + asist) sayısına göre (azalan) sırala
                                const passesA = getPlayerTotalPasses(idA);
                                const passesB = getPlayerTotalPasses(idB);
                                if (passesA !== passesB) {
                                    return passesB - passesA; // Çok pas atan daha başa (sola/üste)
                                }
                                
                                // 3. Pas sayıları da eşitse forma numarasına göre sırala
                                return getJerseyNumber(playerA) - getJerseyNumber(playerB);
                            })
                            .map(pid => {
                            const player = roster.find(r => r.id === pid);
                            const isDiskHolder = activePasserId === pid;
                            const isJustActed = lastAction?.startsWith(pid);

                            return (
                                <div key={pid} className={`flex flex-col h-full bg-white rounded-lg border-2 transition-all ${isDiskHolder ? 'border-blue-500 bg-blue-50/20 shadow-lg scale-[1.02]' : isJustActed ? 'border-violet-400 shadow-md' : 'border-slate-200 shadow-sm'}`}>
                                    
                                    {/* Kart Üst (Oyuncu Bilgisi) */}
                                    <div className="p-2 border-b-2 border-slate-100 flex items-center gap-1.5 bg-slate-50 rounded-t-lg shrink-0">
                                        <div className={`h-5 w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center font-black text-[10px] md:text-xs shadow-inner shrink-0 ${isDiskHolder ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 border border-slate-300'}`}>
                                            {player?.jerseyNumber || '?'}
                                        </div>
                                        <div className="flex-1 overflow-hidden leading-none">
                                            <p className="font-bold text-slate-800 text-[10px] md:text-xs truncate">{player?.name}</p>
                                        </div>
                                    </div>

                                    {/* Kart Alt (Aksiyon Butonları) - YÜKSEKLİĞİ TAM DOLDURUR */}
                                    <div className="p-1.5 flex flex-col gap-1.5 flex-1 h-full">
                                        {/* Injury/Sakatlık Seçeneği */}
                                        <button 
                                            onClick={() => {
                                                setInjuryReplacement({ originalPlayerId: pid });
                                                setTrackingStep('roster');
                                            }}
                                            className="w-full py-1 text-[8px] font-bold text-rose-400 hover:text-rose-600 uppercase transition-colors flex items-center justify-center gap-1 border border-rose-100 rounded"
                                        >
                                            <span className="material-icons-outlined text-[10px]">medical_services</span>
                                            {t('Injury')}
                                        </button>
                                        {isPullPhase ? (
                                            !pullingPlayerId ? (
                                                <button onClick={() => setPullingPlayerId(pid)} className="w-full flex-1 h-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 rounded text-[10px] md:text-xs font-black transition-all uppercase">
                                                    SEÇ
                                                </button>
                                            ) : pullingPlayerId === pid ? (
                                                <span className="w-full flex-1 h-full flex items-center justify-center text-[10px] md:text-xs font-black text-indigo-600 bg-indigo-50 rounded border border-indigo-200 uppercase">
                                                    PULL ATAN
                                                </span>
                                            ) : (
                                                <span className="w-full flex-1 h-full flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-300 uppercase">
                                                    BEKLİYOR
                                                </span>
                                            )
                                        ) : gameMode === 'OFFENSE' ? (
                                            isDiskHolder ? (
                                                <button onClick={handleThrowaway} className="w-full flex-1 h-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded text-[10px] md:text-xs font-black uppercase">
                                                    Hatalı Pas
                                                </button>
                                            ) : activePasserId ? (
                                                <div className="flex flex-col gap-1.5 flex-1 h-full">
                                                    <button onClick={() => handleCatch(pid)} className="w-full flex-1 h-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] md:text-xs font-black uppercase">
                                                        Pas Aldı
                                                    </button>
                                                    <div className="flex gap-1.5 flex-1 h-full">
                                                        <button onClick={() => handleDrop(pid)} className="flex-1 h-full bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded text-[9px] md:text-[10px] font-bold uppercase border border-slate-200 hover:border-rose-300 transition-colors">
                                                            Drop
                                                        </button>
                                                        <button onClick={() => handleGoal(pid)} className="flex-1 h-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[9px] md:text-[10px] font-black uppercase border border-emerald-200 transition-colors">
                                                            GOL!
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={async () => { 
                                                    saveStateToHistory(); 
                                                    setActivePasserId(pid);
                                                    
                                                    // YENİ VE DÜZELTİLMİŞ: İlk aksiyonu (Pickup) tarihçeye ekliyoruz
                                                    const teamId = localStorage.getItem('selectedTeamId');
                                                    if (matchId && tournamentId && teamId) {
                                                        const pickupEvent: MatchEvent = {
                                                            id: Date.now().toString(),
                                                            matchId,
                                                            teamId: teamId,
                                                            playerId: pid,
                                                            eventType: 'Pickup',
                                                            timestamp: Date.now(),
                                                            currentScore: match?.score || [0, 0],
                                                            period: match?.period || 1,
                                                            videoTimestampSeconds: ytPlayer && typeof ytPlayer.getCurrentTime === 'function' ? Math.floor(ytPlayer.getCurrentTime()) : undefined
                                                        };
                                                        // addMatchEvent 3 parametre alıyor: tournamentId, matchId, event
                                                        await addMatchEvent(tournamentId, matchId, pickupEvent);
                                                    }
                                                }} className="w-full flex-1 h-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded text-[10px] md:text-xs font-black uppercase flex items-center justify-center">
                                                    Diski Aldı
                                                </button>
                                            )
                                        ) : (
                                            <div className="flex flex-col gap-1.5 flex-1 h-full">
                                                <button onClick={() => handleBlock(pid)} className="w-full flex-1 h-full bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-700 border border-slate-200 hover:border-orange-300 rounded text-[10px] md:text-xs font-black uppercase transition-colors">
                                                    BLOK
                                                </button>
                                                <button onClick={() => handleCallahan(pid)} className="w-full flex-1 h-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded text-[9px] md:text-[10px] font-black uppercase transition-colors">
                                                    CALLAHAN
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
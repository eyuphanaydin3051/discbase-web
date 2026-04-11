import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlayers, updateMatchData, getTournaments, deleteLastPoint } from '../services/repository';
import type { Match, MatchEvent, Player, Tournament } from '../types';
import YouTube from 'react-youtube';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
// Takım adını güvenli şekilde çeken yardımcı fonksiyon
// src/pages/MatchDetail.tsx - getTeamName güncellemesi
const getTeamName = (match: Match | null, tournament: any | null) =>
    match?.ourTeamName || tournament?.ourTeamName || match?.teamNames?.[0] || 'BİZİM TAKIM';

export default function MatchDetail() {
    const { tournamentId, matchId } = useParams<{ tournamentId: string, matchId: string }>();
    const navigate = useNavigate();
    const activeTeamId = localStorage.getItem('selectedTeamId');

    const [match, setMatch] = useState<Match | null>(null);
    const [tournament, setTournament] = useState<any>(null);
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [rosterPlayers, setRosterPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    // VİDEO SCOUTER STATE'LERİ
    // VİDEO SCOUTER STATE'LERİ
    const [videoUrl, setVideoUrl] = useState('');
    const [ytPlayer, setYtPlayer] = useState<any>(null);
    const [expandedPointIndex, setExpandedPointIndex] = useState<number | null>(null); // Accordion için yeni state
 
    // Tablo Sıralama State'i
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
        key: 'pointsPlayed',
        direction: 'desc'
    });

    // 1. Oyuncuları çek
    useEffect(() => {
        if (!activeTeamId) return;
        const unsubscribePlayers = getPlayers(activeTeamId, (fetchedPlayers) => {
            setRosterPlayers(fetchedPlayers);
        });
        return () => unsubscribePlayers();
    }, [activeTeamId]);

    // 2. Maç ve Olayları çek
    // 2. Maç ve Olayları çek (Gerçek Zamanlı)
    useEffect(() => {
        if (!matchId || !tournamentId || !activeTeamId) {
            navigate('/teams');
            return;
        }

        const matchDocRef = doc(db, 'teams', activeTeamId, 'tournaments', tournamentId, 'matches', matchId);

        const unsubscribe = onSnapshot(matchDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const fetchedMatch = { id: docSnap.id, ...docSnap.data() } as Match;
                setMatch(fetchedMatch);

                if (fetchedMatch.events && Array.isArray(fetchedMatch.events)) {
                    setEvents(fetchedMatch.events);
                } else {
                    setEvents([]);
                }
                setLoading(false);
            } else {
                navigate('/teams');
            }
        });

        const safetyTimer = setTimeout(() => setLoading(false), 2000);

        return () => {
            clearTimeout(safetyTimer);
            unsubscribe();
        };
    }, [tournamentId, matchId, activeTeamId, navigate]);
    // 5. Turnuva verisini çek (Takım adı için)
    useEffect(() => {
        if (!activeTeamId || !tournamentId) return;

        const unsubscribeTour = getTournaments(activeTeamId, (tours: Tournament[]) => {
            const currentTour = tours.find((t: Tournament) => t.id === tournamentId);
            if (currentTour) {
                setTournament(currentTour);
            }
        });

        return () => unsubscribeTour();
    }, [activeTeamId, tournamentId]);
    // 3. Olayları Zenginleştir
    const enrichedEvents = useMemo(() => {
        return events.map(event => {
            const p = rosterPlayers.find(rp => rp.id === event.playerId);
            const sp = rosterPlayers.find(rp => rp.id === event.secondaryPlayerId);
            const player = p ? { ...p, jerseyNumber: p.jerseyNumber ?? undefined } : undefined;
            const secondaryPlayer = sp ? { ...sp, jerseyNumber: sp.jerseyNumber ?? undefined } : undefined;
            return { ...event, player, secondaryPlayer } as MatchEvent;
        });
    }, [events, rosterPlayers]);

    // --- YENİ: Olayları Sayılara (Point) Göre Gruplama ---
    // (enrichedEvents yukarıda tanımlandıktan sonra çalıştığı için hata vermeyecek)
    // --- Olayları Sayılara (Point) Göre Gruplama (Asist/Gol Birleştirme Mantığı Dahil) ---
    const groupedEventsByPoint = useMemo(() => {
        if (!enrichedEvents || enrichedEvents.length === 0) return [];
        const sorted = [...enrichedEvents].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const points: MatchEvent[][] = [];
        let currentPointEvents: MatchEvent[] = [];

        sorted.forEach((evt) => {
            // Eğer bu bir 'Goal' ise ve hemen öncesinde aynı sayı içinde bir 'Assist' varsa, 
            // asisti bu golün içine gömüp ayrı bir satır olarak göstermeyeceğiz.
            if (evt.eventType === 'Goal') {
                const lastEvt = currentPointEvents[currentPointEvents.length - 1];
                if (lastEvt && lastEvt.eventType === 'Assist') {
                    // Gol olayını zenginleştir: asisti yapanı secondaryPlayer olarak ata
                    evt.secondaryPlayer = lastEvt.player;
                    // Asist olayını listeden çıkar (çünkü golle birleşti)
                    currentPointEvents.pop();
                }
            }
            
            currentPointEvents.push(evt);

            if (evt.eventType === 'Goal' || evt.eventType === 'Callahan' || evt.eventType === 'OpponentGoal') {
                points.push([...currentPointEvents]);
                currentPointEvents = [];
            }
        });

        if (currentPointEvents.length > 0) points.push(currentPointEvents);
        return points;
    }, [enrichedEvents]);

    // Olayları okunaklı Türkçe metne çevirme fonksiyonu
    const getEventDescriptionText = (evt: MatchEvent) => {
        const playerName = evt.player?.name || 'Bilinmeyen oyuncu';
        const receiverName = evt.secondaryPlayer?.name || 'bir oyuncu';
        const type = evt.eventType;

        switch (type) {
            case 'Pickup': 
                return <><span className="font-bold text-blue-600">{playerName}</span> diski yerden alarak oyuna soktu.</>;
            case 'OpponentGoal': 
                return <><span className="font-bold text-rose-600">RAKİP SAYI ALDI.</span></>;
            case 'Completion': 
                return <><span className="font-bold">{playerName}</span> oyuncusundan <span className="font-bold">{receiverName}</span> oyuncusuna başarılı pas.</>;
            case 'Drop': 
                return <><span className="font-bold">{playerName}</span> atılan diski tutamadı (Drop).</>;
            case 'Throwaway': 
                return <><span className="font-bold">{playerName}</span> hatalı pas attı (Disk dışarıda veya yerde).</>;
            case 'Goal': 
                if (evt.secondaryPlayer) {
                    return <><span className="font-bold text-violet-600">{evt.secondaryPlayer.name}</span> asistinde <span className="font-bold text-emerald-600">{playerName}</span> GOL attı!</>;
                }
                return <><span className="font-bold text-emerald-600">{playerName} GOL ATTI!</span></>;
            case 'Assist': 
                return <><span className="font-bold">{playerName}</span> muhteşem bir asist yaptı.</>;
            case 'D-Up': 
                return <><span className="font-bold text-orange-600">{playerName} blok (D-Up) yaptı, disk takımımıza geçti.</span></>;
            case 'Callahan': 
                return <><span className="font-bold text-purple-600">{playerName} CALLAHAN YAPTI!</span></>;
            default: 
                if (type.includes('Pull')) {
                    let pullStatus = "pull attı.";
                    if (type.includes('OB')) pullStatus = "başarısız (Saha dışı - OB) pull attı.";
                    if (type.includes('IB')) pullStatus = "başarılı (Saha içi - IB) pull attı.";
                    return <><span className="font-bold">{playerName}</span> {pullStatus}</>;
                }
                return <><span className="font-bold">{playerName}</span> {type} aksiyonu yaptı.</>;
        }
    };

    // 4. İstatistik Hesaplama (Oyuncular için - Kapsamlı Mod)
    const computePlayerStats = () => {
        const statsMap: { [key: string]: any } = {};

        rosterPlayers.forEach(player => {
            statsMap[player.id] = {
                id: player.id,
                name: player.name,
                jerseyNumber: player.jerseyNumber ?? undefined,
                photoUrl: player.photoUrl ?? undefined,
                goals: 0, assists: 0, blocks: 0, callahans: 0,
                passes: 0, drops: 0, throwaways: 0, turns: 0, pointsPlayed: 0, totalTimePlayedSeconds: 0
            };
        });

        // A. Önce Arşivdeki İstatistikleri Topla
        const pointDurations: number[] = [];
        if (match?.events) {
            const sortedEvents = [...match.events].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            let currentPointStart: number | null = null;
            sortedEvents.forEach(evt => {
                // Senaryo 1 ve 2: Sayı başlangıcı (Offense -> Pickup, Defense -> Pull)
                if ((evt.eventType.includes('Pull') || evt.eventType === 'Pickup') && currentPointStart === null) {
                    currentPointStart = evt.videoTimestampSeconds ?? null;
                }
                // Sayı sonu: Bizim gol, rakip gol veya callahan
                if (evt.eventType === 'Goal' || evt.eventType === 'Callahan' || evt.eventType === 'OpponentGoal') {
                    if (currentPointStart !== null && evt.videoTimestampSeconds !== undefined) {
                        pointDurations.push(Math.max(0, evt.videoTimestampSeconds - currentPointStart));
                    } else {
                        pointDurations.push(0);
                    }
                    currentPointStart = null; // Sonraki sayı için sıfırla
                }
            });
        }

        if (match?.pointsArchive) {
            match.pointsArchive.forEach((point, pIndex) => {
                const pointDuration = pointDurations[pIndex] || 0;
                point.stats?.forEach(stat => {
                    const ps = statsMap[stat.playerId];
                    if (ps) {
                        ps.goals += stat.goal || 0;
                        ps.assists += stat.assist || 0;
                        ps.blocks += stat.block || 0;
                        ps.callahans += stat.callahan || 0;
                        // ASİSTİ BAŞARILI PAS OLARAK SAY
                        ps.passes += (stat.successfulPass || 0) + (stat.assist || 0);
                        ps.drops += stat.drop || 0;
                        ps.throwaways += stat.throwaway || 0;
                        ps.turns += (stat.drop || 0) + (stat.throwaway || 0);
                        ps.pointsPlayed += stat.pointsPlayed || 0;
                        // Oyuncu o sayıda oynadıysa sayı süresini ekle
                        ps.totalTimePlayedSeconds += pointDuration;
                    }
                });
            });
        }

        

        // Hesaplamaları yap
        return Object.values(statsMap).map((stats: any) => {
            const totalPassAttempts = stats.passes + stats.throwaways;
            const passPercentage = totalPassAttempts > 0
                ? parseFloat(((stats.passes / totalPassAttempts) * 100).toFixed(1)) : 0;

            const catches = totalPassAttempts + stats.goals;
            const totalCatchOpportunities = catches + stats.drops;
            const catchPercentage = totalCatchOpportunities > 0
                ? parseFloat(((catches / totalCatchOpportunities) * 100).toFixed(1)) : 0;

            // Verimlilik formülü (App Utils.kt ile birebir)
            const efficiencyScore =
                ((stats.goals - stats.callahans) * 1.0) +
                (stats.assists * 1.0) +
                ((stats.blocks - stats.callahans) * 1.5) +
                (stats.callahans * 3.5) -
                (stats.turns * 1.0) +
                (stats.passes * 0.05);

            return {
                ...stats,
                totalPasses: stats.passes + stats.throwaways, // Yeni eklenen alan: Toplam Atılan Pas
                passPercentage,
                catchPercentage,
                efficiency: efficiencyScore.toFixed(2)
            };
        });
    };


    // --- Takım Dinamik İstatistikleri (Mobil App ile Birebir Mantık) ---
    const computeTeamStats = () => {
        let totalPointsPlayed = 0;
        let totalGoals = 0, totalAssists = 0, totalSuccessfulPass = 0;
        let totalThrowaways = 0, totalDrops = 0, totalBlocks = 0;
        let totalOffensePoints = 0, offensiveHolds = 0, cleanHolds = 0;
        let totalDefensePoints = 0, breakPointsScored = 0;
        let totalBlockPoints = 0, blocksConvertedToGoals = 0;

        // A. Arşivdeki (Bitmiş) Sayıları İşle
        if (match?.pointsArchive && match.pointsArchive.length > 0) {
            totalPointsPlayed = match.pointsArchive.length;

            match.pointsArchive.forEach(point => {
                const isOurPoint = point.whoScored === 'US' || point.whoScored === 'OURS'; // Geriye dönük uyumluluk
                let pointTurnovers = 0;
                let pointBlocks = 0;

                if (point.startMode === 'OFFENSE') {
                    totalOffensePoints++;
                    if (isOurPoint) offensiveHolds++;
                } else if (point.startMode === 'DEFENSE') {
                    totalDefensePoints++;
                    if (isOurPoint) breakPointsScored++;
                }

                point.stats?.forEach(stat => {
                    totalGoals += stat.goal || 0;
                    totalAssists += stat.assist || 0;
                    totalSuccessfulPass += stat.successfulPass || 0;
                    totalThrowaways += stat.throwaway || 0;
                    totalDrops += stat.drop || 0;
                    totalBlocks += stat.block || 0;

                    pointTurnovers += (stat.throwaway || 0) + (stat.drop || 0);
                    pointBlocks += stat.block || 0;
                });

                if (point.startMode === 'OFFENSE' && isOurPoint && pointTurnovers === 0) {
                    cleanHolds++;
                }

                if (pointBlocks > 0) {
                    totalBlockPoints++;
                    if (isOurPoint) blocksConvertedToGoals++;
                }
            });
        }

        

        const totalPassesCompleted = totalSuccessfulPass + totalAssists;
        const totalPassesAttempted = totalPassesCompleted + totalThrowaways + totalDrops;
        const totalPossessions = totalGoals + totalThrowaways + totalDrops;

        const holdPercent = totalOffensePoints > 0 ? Math.round((offensiveHolds / totalOffensePoints) * 100) : 0;
        const cleanHoldPercent = totalOffensePoints > 0 ? Math.round((cleanHolds / totalOffensePoints) * 100) : 0;
        const breakPercent = totalDefensePoints > 0 ? Math.round((breakPointsScored / totalDefensePoints) * 100) : 0;
        const passSuccess = totalPassesAttempted > 0 ? Math.round((totalPassesCompleted / totalPassesAttempted) * 100) : 0;
        const conversionRate = totalPossessions > 0 ? Math.round((totalGoals / totalPossessions) * 100) : 0;
        const blockConversionRate = totalBlockPoints > 0 ? Math.round((blocksConvertedToGoals / totalBlockPoints) * 100) : 0;

        return {
            totalPointsPlayed, totalGoals, totalAssists, totalBlocks,
            totalTurnovers: totalThrowaways + totalDrops,
            totalPassesCompleted, totalPassesAttempted, totalPossessions,
            offensiveHolds, totalOffensePoints, cleanHolds, breakPointsScored, totalDefensePoints,
            totalBlockPoints, blocksConvertedToGoals,
            holdPercent, cleanHoldPercent, breakPercent, passSuccess, conversionRate, blockConversionRate
        };
    };

    const teamStats = computeTeamStats();
    const computedStats = computePlayerStats();

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') { direction = 'asc'; }
        setSortConfig({ key, direction });
    };

    const sortedComputedStats = [...computedStats].sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === 'efficiency') {
            aValue = parseFloat(aValue as string);
            bValue = parseFloat(bValue as string);
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const urlMatch = url.match(regExp);
        return (urlMatch && urlMatch[2].length === 11) ? urlMatch[2] : null;
    };

    const handleDeleteLastPoint = async () => {
        if (!tournamentId || !matchId) return;
        if (window.confirm("Son sayıyı (point) silmek istediğinize emin misiniz? (Bu işlem geri alınamaz ve bu sayıdaki istatistikleriniz silinir!)")) {
            await deleteLastPoint(tournamentId, matchId);
            // Firebase onSnapshot aktif olduğu için veriler otomatik olarak senkronize olacak, sayfayı manuel yenilemeye gerek yok.
        }
    };

    const handleSaveVideo = async () => {
        const videoId = extractYoutubeId(videoUrl);
        if (videoId && tournamentId && matchId && activeTeamId) {
            await updateMatchData(activeTeamId, tournamentId, { id: matchId, youtubeVideoId: videoId });
            setMatch(prev => prev ? { ...prev, youtubeVideoId: videoId } : prev);
        } else {
            alert("Geçerli bir YouTube URL'si giriniz.");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (!match) return <div className="p-8 text-center text-slate-500">Maç bulunamadı.</div>;

    return (
        <div className="p-6 md:p-8 pb-24 lg:pb-8 w-full font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 min-h-screen">

            {/* Üst Geri Dönüş ve Aksiyonlar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/tournament/${tournamentId}`)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                    >
                        <span className="material-icons-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {getTeamName(match, tournament)} <span className="text-violet-500 px-2">vs</span> {match.opponentName}
                        </h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                            <span className="material-icons-outlined text-[18px]">event</span>
                            {match.date ? new Date(match.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Tarih Belirsiz'}
                        </p>
                    </div>
                </div>

                {/* SAĞ TARAF: AKSİYON BUTONLARI (SİL VE BAŞLAT) */}
                <div className="flex flex-col md:flex-row items-center gap-3">
                    {/* SON SAYIYI SİL BUTONU (Eğer kaydedilmiş en az bir sayı varsa gösterilir) */}
                    {match.pointsArchive && match.pointsArchive.length > 0 && (
                        <button
                            onClick={handleDeleteLastPoint}
                            className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 dark:text-orange-400 rounded-xl font-bold transition-all border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
                            title="Son Sayıyı Sil"
                        >
                            <span className="material-icons-outlined">undo</span>
                            <span className="hidden md:inline">Son Sayıyı Sil</span>
                        </button>
                    )}

                    {/* MAÇI SİL BUTONU */}
                    <button
                        onClick={async () => {
                            if (!tournamentId || !matchId) return; // TS HATASINI ÇÖZEN KONTROL
                            if (window.confirm("Bu maçı ve içindeki tüm istatistikleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
                                const { deleteMatch } = await import('../services/repository');
                                const success = await deleteMatch(tournamentId, matchId);
                                if (success) {
                                    navigate(`/tournament/${tournamentId}`);
                                } else {
                                    alert("Maç silinirken bir hata oluştu.");
                                }
                            }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-xl font-bold transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
                        title="Maçı Sil"
                    >
                        <span className="material-icons-outlined">delete</span>
                        <span className="hidden md:inline">Maçı Sil</span>
                    </button>

                    <button
                        onClick={() => navigate(`/tournament/${tournamentId}/match/${matchId}/track`)}
                        className="flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-lg shadow-violet-200 dark:shadow-none transition-all"
                    >
                        <span className="material-icons-outlined">play_circle</span>
                        {match.scoreUs === 0 && match.scoreThem === 0 && (!match.pointsArchive || match.pointsArchive.length === 0)
                            ? "İstatistik Takibini Başlat"
                            : "Takibe Devam Et"}
                    </button>
                </div>
            </div>


            {/* VİDEO SCOUTER BÖLÜMÜ */}
            <div className="mb-8">
                {!match.youtubeVideoId ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
                        <span className="material-icons-outlined text-red-600 text-4xl">smart_display</span>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold">Maç Videosu Ekle (Scout Modu)</h3>
                            <p className="text-sm text-slate-500">Video destekli istatistik tutmak ve analiz yapmak için maçın YouTube linkini yapıştırın.</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                            <input
                                type="text"
                                placeholder="https://youtube.com/watch?v=..."
                                className="flex-1 md:w-64 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-violet-500"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                            />
                            <button onClick={handleSaveVideo} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
                                Kaydet
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-6">
                        {/* Sol Taraf: Video */}
                        <div className="w-full lg:w-2/3 h-[300px] md:h-[400px] lg:h-[500px] bg-black rounded-xl overflow-hidden">
                            <YouTube
                                videoId={match.youtubeVideoId}
                                opts={{ width: '100%', height: '100%', playerVars: { controls: 1, rel: 0 } }}
                                onReady={(e) => setYtPlayer(e.target)}
                                className="w-full h-full"
                            />
                        </div>

                        {/* Sağ Taraf: Olay Geçmişi (Sayı Gruplamalı ve Akordiyon) */}
                        <div className="w-full lg:w-1/3 flex flex-col h-[300px] md:h-[400px] lg:h-[500px]">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl flex justify-between items-center">
                                <h3 className="font-bold flex items-center gap-2">
                                    <span className="material-icons-outlined text-red-600">history</span>
                                    Olay Geçmişi
                                </h3>
                                <span className="text-[10px] text-slate-400">Detay için sayıya tıklayın</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl border border-t-0 border-slate-100 dark:border-slate-800">
                                {groupedEventsByPoint.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 text-sm">Bu maçta henüz olay kaydedilmedi.</div>
                                ) : (
                                    groupedEventsByPoint.slice().reverse().map((eventsGroup, reverseIdx) => {
                                        const actualPointNumber = groupedEventsByPoint.length - reverseIdx;
                                        const isExpanded = expandedPointIndex === actualPointNumber;
                                        
                                        // Grubun son olayından o anki skoru bulalım
                                        const lastEvent = eventsGroup[eventsGroup.length - 1];
                                        const currentScore = lastEvent?.currentScore ? `${lastEvent.currentScore[0]} - ${lastEvent.currentScore[1]}` : '? - ?';

                                        return (
                                            <div key={actualPointNumber} className="flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm transition-all">
                                                {/* Akordiyon Başlığı */}
                                                <button 
                                                    onClick={() => setExpandedPointIndex(isExpanded ? null : actualPointNumber)}
                                                    className={`flex items-center justify-between p-3 w-full text-left transition-colors ${isExpanded ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-black">
                                                            {actualPointNumber}
                                                        </span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                            {actualPointNumber}. Sayı
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                            Skor: {currentScore}
                                                        </span>
                                                        <span className={`material-icons-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                            expand_more
                                                        </span>
                                                    </div>
                                                </button>
                                                
                                                {/* Akordiyon İçeriği (Olaylar) */}
                                                {isExpanded && (
                                                    <div className="flex flex-col gap-1.5 p-2 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700">
                                                        {eventsGroup.map((evt) => {
                                                            const isPull = evt.eventType.includes('Pull');
                                                            const isGoal = evt.eventType === 'Goal';
                                                            const isTurnover = evt.eventType === 'Drop' || evt.eventType === 'Throwaway';

                                                            return (
                                                                <div key={evt.id} 
                                                                    className={`flex items-center justify-between p-2.5 rounded-md border shadow-sm transition-all ${evt.videoTimestampSeconds !== undefined ? 'cursor-pointer hover:border-violet-400' : ''} ${isGoal ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30' : isTurnover ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30' : isPull ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/30' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                                                                    onClick={() => {
                                                                        if (evt.videoTimestampSeconds !== undefined && ytPlayer) {
                                                                            ytPlayer.seekTo(Math.max(0, evt.videoTimestampSeconds - 1.5), true);
                                                                            ytPlayer.playVideo();
                                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-2.5">
                                                                        {evt.videoTimestampSeconds !== undefined && (
                                                                            <span className={`text-[10px] font-mono px-1.5 py-1 rounded border ${isGoal ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : isTurnover ? 'bg-rose-100 text-rose-700 border-rose-200' : isPull ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>
                                                                                {Math.floor(evt.videoTimestampSeconds / 60).toString().padStart(2,'0')}:{(evt.videoTimestampSeconds % 60).toString().padStart(2,'0')}
                                                                            </span>
                                                                        )}
                                                                        <div className="text-xs text-slate-700 dark:text-slate-200">
                                                                            {getEventDescriptionText(evt)}
                                                                        </div>
                                                                    </div>
                                                                    {evt.videoTimestampSeconds !== undefined && (
                                                                        <span className="material-icons-outlined text-[16px] text-slate-400 hover:text-violet-600 transition-colors shrink-0">play_arrow</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-12 gap-6">

                {/* Sol Üst: Takım Performansı (Detaylı App Modeli) */}
                <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-icons-outlined text-violet-600">monitoring</span>
                            Detaylı Takım İstatistikleri
                        </h3>
                        <span className="text-xs font-bold text-violet-600 px-3 py-1 bg-violet-50 dark:bg-violet-900/30 rounded-full uppercase tracking-wider">Kapsamlı Veri</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6">
                        {/* Hücum & Defans Hatları */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-semibold">
                                    <span className="text-slate-600 dark:text-slate-400">O-Line (Hold %)</span>
                                    <span className="text-violet-600 flex items-center gap-2"><span className="text-xs text-slate-400">{teamStats.offensiveHolds} / {teamStats.totalOffensePoints}</span>{teamStats.holdPercent}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${teamStats.holdPercent}%` }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-semibold">
                                    <span className="text-slate-600 dark:text-slate-400">Temiz Hold %</span>
                                    <span className="text-emerald-600 flex items-center gap-2"><span className="text-xs text-slate-400">{teamStats.cleanHolds} / {teamStats.totalOffensePoints}</span>{teamStats.cleanHoldPercent}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${teamStats.cleanHoldPercent}%` }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-semibold">
                                    <span className="text-slate-600 dark:text-slate-400">D-Line (Break %)</span>
                                    <span className="text-orange-500 flex items-center gap-2"><span className="text-xs text-slate-400">{teamStats.breakPointsScored} / {teamStats.totalDefensePoints}</span>{teamStats.breakPercent}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${teamStats.breakPercent}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Top Hakimiyeti & Verimlilik */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-semibold">
                                    <span className="text-slate-600 dark:text-slate-400">Pas Başarısı</span>
                                    <span className="text-blue-500 flex items-center gap-2"><span className="text-xs text-slate-400">{teamStats.totalPassesCompleted} / {teamStats.totalPassesAttempted}</span>{teamStats.passSuccess}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${teamStats.passSuccess}%` }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-semibold">
                                    <span className="text-slate-600 dark:text-slate-400">Ofans Gole Dönüşme Oranı</span>
                                    <span className="text-indigo-500 flex items-center gap-2"><span className="text-xs text-slate-400">{teamStats.totalGoals} / {teamStats.totalPossessions}</span>{teamStats.conversionRate}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${teamStats.conversionRate}%` }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-semibold">
                                    <span className="text-slate-600 dark:text-slate-400">Blok Sonrası Gol %</span>
                                    <span className="text-rose-500 flex items-center gap-2"><span className="text-xs text-slate-400">{teamStats.blocksConvertedToGoals} / {teamStats.totalBlockPoints}</span>{teamStats.blockConversionRate}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${teamStats.blockConversionRate}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Üst: Maç İşlem Özeti Sayıları */}
                <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <span className="material-icons-outlined text-emerald-600">bolt</span>
                        Genel Aksiyonlar
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Toplam Gol</span>
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{teamStats.totalGoals}</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Toplam Asist</span>
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{teamStats.totalAssists}</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-center border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-all">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Blok (D-Up)</span>
                            <span className="text-3xl font-black text-emerald-600">{teamStats.totalBlocks}</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-center border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50 transition-all">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Turnover</span>
                            <span className="text-3xl font-black text-rose-500">{teamStats.totalTurnovers}</span>
                        </div>
                        <div className="col-span-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl">
                            <div className="flex items-center justify-between px-2">
                                <div>
                                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Oynanan Sayı / Pozisyon</p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-500">Kayıtlı toplam aksiyon özeti</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-emerald-800 dark:text-emerald-400">{teamStats.totalPointsPlayed} <span className="text-sm font-medium">/</span> {teamStats.totalPossessions}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alt Sol: Sayı Özeti */}
                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-icons-outlined text-violet-600">list_alt</span>
                            Sayı Özeti
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {match?.pointsArchive && match.pointsArchive.length > 0 ? [...match.pointsArchive].reverse().map((point, index) => {
                            // Android uygulaması sayıyı alan takımı "US" olarak atar
                            const isOurPoint = point.whoScored === 'US';
                            const pointNumber = match.pointsArchive!.length - index;

                            return (
                                <div key={`point-${index}`} className="group p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/30 dark:hover:bg-slate-800 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-black text-slate-400 dark:text-slate-500">SAYI #{pointNumber}</span>
                                        <div className="flex gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${point.startMode === 'OFFENSE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                {point.startMode || 'UNKNOWN'}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${isOurPoint ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                }`}>
                                                {isOurPoint ? 'OUR POINT' : 'THEIR POINT'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                {/* Sayıda süre alan veya istatistik yapan oyuncuların avatarlarını göster */}
                                                {point.stats?.filter(s => s.pointsPlayed > 0 || s.goal > 0 || s.assist > 0 || s.secondsPlayed > 0).slice(0, 7).map(stat => {
                                                    const playerInfo = rosterPlayers.find(rp => rp.id === stat.playerId);
                                                    return (
                                                        <div key={stat.playerId} title={playerInfo?.name || stat.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-[10px] z-10 overflow-hidden">
                                                            {playerInfo?.photoUrl ? <img src={playerInfo.photoUrl} alt="" className="w-full h-full object-cover" /> : getInitials(playerInfo?.name || stat.name)}
                                                        </div>
                                                    );
                                                })}
                                                {(point.stats?.filter(s => s.pointsPlayed > 0 || s.goal > 0 || s.assist > 0 || s.secondsPlayed > 0).length || 0) > 7 && (
                                                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 font-bold text-[10px] z-10">
                                                        +{(point.stats?.filter(s => s.pointsPlayed > 0 || s.goal > 0 || s.assist > 0 || s.secondsPlayed > 0).length || 0) - 7}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-12 text-slate-400 font-medium">Bu maç için henüz sayı (point) kaydedilmedi.</div>
                        )}
                    </div>
                </div>

                {/* Alt Sağ: Kapsamlı Oyuncu İstatistikleri */}
                <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <span className="material-icons-outlined text-violet-600">groups</span>
                            Genel Oyuncu İstatistikleri
                        </h3>
                    </div>
                    <div className="overflow-x-auto flex-1 custom-scrollbar relative">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                                <tr>
                                    <th onClick={() => requestSort('name')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-1">Oyuncu {sortConfig.key === 'name' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('pointsPlayed')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Sayı {sortConfig.key === 'pointsPlayed' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('totalTimePlayedSeconds')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Süre {sortConfig.key === 'totalTimePlayedSeconds' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('totalPasses')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Atılan {sortConfig.key === 'totalPasses' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('passes')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Başarılı {sortConfig.key === 'passes' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('passPercentage')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Pas % {sortConfig.key === 'passPercentage' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('catchPercentage')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Catch % {sortConfig.key === 'catchPercentage' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('turns')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Turn {sortConfig.key === 'turns' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('goals')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Gol {sortConfig.key === 'goals' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('assists')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Asist {sortConfig.key === 'assists' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('blocks')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="flex items-center justify-center gap-1">Blok {sortConfig.key === 'blocks' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                    <th onClick={() => requestSort('efficiency')} className="cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors px-6 py-3 text-center text-xs font-bold text-violet-600 uppercase tracking-wider bg-violet-50 dark:bg-violet-900/10">
                                        <div className="flex items-center justify-center gap-1">Verim {sortConfig.key === 'efficiency' && <span className="material-icons-outlined text-[14px]">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1E1E1E] divide-y divide-slate-100 dark:divide-slate-800">
                                {sortedComputedStats.filter((ps: any) => ps.pointsPlayed + ps.goals + ps.assists + ps.blocks + ps.turns + ps.passes > 0).map((ps: any) => (
                                    <tr key={ps.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-transparent group-hover:ring-violet-200 dark:group-hover:ring-violet-800 transition-all overflow-hidden flex items-center justify-center text-slate-500 font-bold text-sm">
                                                    {ps.photoUrl ? (
                                                        <img src={ps.photoUrl} alt={ps.name} className="w-full h-full object-cover" />
                                                    ) : (ps.jerseyNumber !== undefined && ps.jerseyNumber !== null && ps.jerseyNumber !== '') ? (
                                                        <span>{ps.jerseyNumber}</span>
                                                    ) : (
                                                        <span>{getInitials(ps.name)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white leading-tight">{ps.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">#{ps.jerseyNumber || '?'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-slate-500 dark:text-slate-400">{ps.pointsPlayed}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-slate-500 dark:text-slate-400">{Math.floor((ps.totalTimePlayedSeconds || 0) / 60)}:{(Math.floor((ps.totalTimePlayedSeconds || 0) % 60)).toString().padStart(2, '0')}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-slate-900 dark:text-slate-200">{ps.totalPasses}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">{ps.passes}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-blue-500 dark:text-blue-400">%{ps.passPercentage}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-orange-500 dark:text-orange-400">%{ps.catchPercentage}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-rose-500">{ps.turns}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-emerald-500">{ps.goals}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-violet-500">{ps.assists}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-slate-900 dark:text-slate-200">{ps.blocks}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black text-violet-600 bg-violet-50/50 dark:bg-violet-900/5">{ps.efficiency}</td>
                                    </tr>
                                ))}
                                {sortedComputedStats.filter((ps: any) => ps.pointsPlayed + ps.goals + ps.assists + ps.blocks + ps.turns + ps.passes > 0).length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                            Henüz istatistik verisi bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
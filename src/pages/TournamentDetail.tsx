// src/pages/TournamentDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth'; // Auth Listener eklendi
import { getUserTeams, getTournamentMatches, getPlayers, getTournaments } from '../services/repository';
import type { Match, Player, TeamProfile, Tournament } from '../types';

export default function TournamentDetail() {
    const { id: tournamentId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);
    
    // Veriler
    const [teams, setTeams] = useState<TeamProfile[]>([]);
    const [currentTeam, setCurrentTeam] = useState<TeamProfile | null>(null);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    
    // Yüklenme Durumları
    const [loadingAuth, setLoadingAuth] = useState(true); // Auth kontrolü
    const [loadingData, setLoadingData] = useState(true); // Veri çekme
    
    const [activeTab, setActiveTab] = useState<'matches' | 'stats' | 'roster'>('stats');

    // 1. ADIM: Kullanıcı Oturumunu Dinle (Sayfa yenilenince user null gelmesini önler)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoadingAuth(false); // Auth kontrolü bitti
            if (!currentUser) {
                navigate('/'); // Giriş yapmamışsa at
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // 2. ADIM: Kullanıcı varsa Takımları ve Verileri Çek
    // 2. ADIM: Seçili Takıma Göre Verileri Çek (DÜZELTİLDİ)
    useEffect(() => {
        if (loadingAuth || !user || !tournamentId) return;

        // LocalStorage'dan uygulamada aktif olan takımın ID'sini alıyoruz
        const activeTeamId = localStorage.getItem('selectedTeamId');
        
        if (!activeTeamId) {
            navigate('/teams');
            return;
        }

        // A. Takım bilgilerini çek (Verimlilik kriteri -efficiencyCriteria- hesaplaması için gerekli)
        const unsubscribeTeams = getUserTeams(user.uid, (fetchedTeams) => {
            setTeams(fetchedTeams);
            const team = fetchedTeams.find(t => t.teamId === activeTeamId);
            if (team) {
                setCurrentTeam(team);
            }
        });

        // B. Turnuva ana bilgisini dinle
        const unsubTournaments = getTournaments(activeTeamId, (tours) => {
            const activeTour = tours.find(t => t.id === tournamentId);
            setTournament(activeTour || null);
        });

        // C. MAÇLARI DİNLE (İstatistiklerin 0 gelme sorunu buradaki takım eşleşmezliğiydi)
        const unsubMatches = getTournamentMatches(activeTeamId, tournamentId, (data) => {
            setMatches(data as Match[]);
        });

        // D. Oyuncuları dinle (İstatistiklerle isimleri eşleştirmek için)
        const unsubPlayers = getPlayers(activeTeamId, (data) => {
            setPlayers(data);
            setLoadingData(false); 
        });

        const safetyTimer = setTimeout(() => setLoadingData(false), 2000);

        // Temizlik (Unsubscribe) işlemleri - Sızıntı olmaması için dışarı alındı
        return () => {
            unsubscribeTeams();
            unsubTournaments();
            unsubMatches();
            unsubPlayers();
            clearTimeout(safetyTimer);
        };
    }, [user, tournamentId, loadingAuth, navigate]);

    // --- İSTATİSTİK HESAPLAMALARI (Uygulama Mantığına Göre Güncellendi) ---
    const wins = matches.filter(m => (m.scoreUs || 0) > (m.scoreThem || 0)).length;
    const losses = matches.filter(m => (m.scoreUs || 0) < (m.scoreThem || 0)).length;
    const pointsScored = matches.reduce((acc, m) => acc + (m.scoreUs || 0), 0);
    const pointsConceded = matches.reduce((acc, m) => acc + (m.scoreThem || 0), 0);
    const pointDiff = pointsScored - pointsConceded;

    // Turnuva genelindeki verimlilik istatistikleri
    let tGoals = 0, tTurns = 0, tDrops = 0;
    let oPoints = 0, oHolds = 0;
    let dPoints = 0, dBreaks = 0;

    // Oyuncu bazlı istatistikleri maçların içinden canlı hesaplıyoruz
    const playerStatsMap: Record<string, { 
        goals: number, 
        assists: number, 
        blocks: number, 
        passes: number, 
        turns: number, 
        throwaways: number,
        drops: number,
        callahans: number,
        pointsPlayed: number, 
        matchIds: Set<string> 
    }> = {};

    matches.forEach(match => {
        match.pointsArchive?.forEach(point => {
            let pointHasOurGoal = false;

            point.stats?.forEach(stat => {
                // Takım geneli için
                tGoals += stat.goal || 0;
                tTurns += stat.throwaway || 0;
                tDrops += stat.drop || 0;

                if (stat.goal && stat.goal > 0) pointHasOurGoal = true;

                // Oyuncu geneli için
                if (!playerStatsMap[stat.playerId]) {
                    playerStatsMap[stat.playerId] = { 
                        goals: 0, assists: 0, blocks: 0, 
                        passes: 0, turns: 0, throwaways: 0, drops: 0, callahans: 0, pointsPlayed: 0, 
                        matchIds: new Set() 
                    };
                }
                playerStatsMap[stat.playerId].goals += stat.goal || 0;
                playerStatsMap[stat.playerId].assists += stat.assist || 0;
                playerStatsMap[stat.playerId].blocks += stat.block || 0;
                playerStatsMap[stat.playerId].passes += stat.successfulPass || 0;
                playerStatsMap[stat.playerId].throwaways += stat.throwaway || 0;
                playerStatsMap[stat.playerId].drops += stat.drop || 0;
                playerStatsMap[stat.playerId].callahans += stat.callahan || 0;
                playerStatsMap[stat.playerId].turns += (stat.throwaway || 0) + (stat.drop || 0);
                playerStatsMap[stat.playerId].pointsPlayed += 1; 
                
                // Oyuncunun maça çıktığını belirlemek için maçı Set'e ekliyoruz
                playerStatsMap[stat.playerId].matchIds.add(match.id);
            });

            // Hold / Break hesabı
            if (point.startMode === 'OFFENSE') {
                oPoints++;
                if (pointHasOurGoal) oHolds++;
            } else if (point.startMode === 'DEFENSE') {
                dPoints++;
                if (pointHasOurGoal) dBreaks++;
            }
        });
    });

    const totalPossessions = tGoals + tTurns + tDrops;
    const conversionRate = totalPossessions > 0 ? ((tGoals / totalPossessions) * 100).toFixed(1) : "0.0";
    const holdRate = oPoints > 0 ? ((oHolds / oPoints) * 100).toFixed(1) : "0.0";
    const breakRate = dPoints > 0 ? ((dBreaks / dPoints) * 100).toFixed(1) : "0.0";

    // --- ÖZEL VERİMLİLİK (EFFICIENCY) HESAPLAMA ---
    const calculateEfficiency = (playerId: string) => {
        const stats = playerStatsMap[playerId];
        if (!stats) return "0.00"; 
        
        const criteria = currentTeam?.efficiencyCriteria;
        if (criteria && criteria.length > 0) {
            let score = 0;
            criteria.forEach(c => {
                let val = 0;
                switch (c.statType) {
                    case 'GOAL': val = stats.goals - stats.callahans; break;
                    case 'ASSIST': val = stats.assists; break;
                    case 'BLOCK': val = stats.blocks - stats.callahans; break;
                    case 'THROWAWAY': val = stats.throwaways; break;
                    case 'DROP': val = stats.drops; break;
                    case 'CALLAHAN': val = stats.callahans; break;
                    case 'PASS_COUNT': val = stats.passes; break;
                    case 'POINTS_PLAYED': val = stats.pointsPlayed; break;
                }
                score += val * c.points;
            });
            return score.toFixed(2);
        } else {
            // Default Formül (Android Utils.kt ile birebir aynı)
            const score = 
                ((stats.goals - stats.callahans) * 1.0) +
                (stats.assists * 1.0) +
                ((stats.blocks - stats.callahans) * 1.5) +
                (stats.callahans * 3.5) -
                ((stats.throwaways + stats.drops) * 1.0) +
                (stats.passes * 0.05);
                
            return score.toFixed(2); 
        }
    };

    // Tablo ve Top 3 listesi için sadece bu turnuvada (maçlarda) oynamış oyuncuları filtreleyip eşleştiriyoruz
    const computedPlayers = players
        .filter(p => playerStatsMap[p.id]) 
        .map(p => ({
            ...p,
            goals: playerStatsMap[p.id]?.goals || 0,
            assists: playerStatsMap[p.id]?.assists || 0,
            blocks: playerStatsMap[p.id]?.blocks || 0,
            passes: playerStatsMap[p.id]?.passes || 0,
            turns: playerStatsMap[p.id]?.turns || 0,
            pointsPlayed: playerStatsMap[p.id]?.pointsPlayed || 0,
            matchesPlayed: playerStatsMap[p.id]?.matchIds.size || 0,
            efficiency: calculateEfficiency(p.id)
        }));

    // Top 3 Sayı (Goals) Liderleri
    const sortedByGoals = [...computedPlayers].sort((a, b) => b.goals - a.goals);
    const topScorers = sortedByGoals.filter(p => p.goals > 0).slice(0, 3);

    // Top 3 Asist Liderleri
    const sortedByAssists = [...computedPlayers].sort((a, b) => b.assists - a.assists);
    const topAssisters = sortedByAssists.filter(p => p.assists > 0).slice(0, 3);

    // YÜKLENİYOR EKRANI
    if (loadingAuth || loadingData) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F9FB] dark:bg-[#121212]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#121212] font-sans text-[#333333] dark:text-[#E0E0E0]">
            
            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                                <span className="material-icons-outlined">arrow_back</span>
                            </button>
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-[#5B4DBC] tracking-tight">DiscBase</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <span className="material-icons-outlined">notifications</span>
                            </button>
                            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <span className="material-icons-outlined">account_circle</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* TURNUVA BAŞLIĞI & DURUM */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="h-16 w-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-[#5B4DBC]">
                            <span className="material-icons-outlined text-3xl">trophy</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Turnuva Detayı</h1>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-1 text-sm">
                                <span className="material-icons-outlined text-base">calendar_today</span>
                                <span>2025 Sezonu</span>
                                <span className="w-1 h-1 bg-gray-400 rounded-full mx-1"></span>
                                <span>{tournamentId}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-[#FF6B6B] rounded-xl font-medium text-sm flex items-center gap-1">
                            {losses} Mağlubiyet
                        </span>
                        <span className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-[#00C896] rounded-xl font-medium text-sm flex items-center gap-1">
                            {wins} Galibiyet
                        </span>
                    </div>
                </div>

                {/* SEKMELER */}
                <div className="border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto">
                    <nav className="-mb-px flex space-x-8">
                        {['stats', 'matches', 'roster'].map((tab) => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors capitalize ${activeTab === tab ? 'border-[#5B4DBC] text-[#5B4DBC]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab === 'stats' ? 'İstatistikler' : tab === 'matches' ? 'Maçlar' : 'Kadro'}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* İÇERİK - İSTATİSTİKLER TABI */}
                {activeTab === 'stats' && (
                    <>
                        {/* ÖZET KARTLAR */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* Galibiyet */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                                    <span className="material-icons-outlined text-[#00C896] text-2xl">emoji_events</span>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Galibiyet</h3>
                                <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{wins}</p>
                                <div className="mt-2 text-xs font-medium text-[#00C896] bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                    {matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0}% Oran
                                </div>
                            </div>
                            
                            {/* Mağlubiyet */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-3">
                                    <span className="material-icons-outlined text-[#FF6B6B] text-2xl">thumb_down</span>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Mağlubiyet</h3>
                                <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{losses}</p>
                                <div className="mt-2 text-xs font-medium text-[#FF6B6B] bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                                    {matches.length > 0 ? Math.round((losses / matches.length) * 100) : 0}% Oran
                                </div>
                            </div>

                            {/* Sayı Farkı */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                                    <span className="material-icons-outlined text-blue-500 text-2xl">compare_arrows</span>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Sayı Farkı</h3>
                                <p className={`text-4xl font-bold mt-2 ${pointDiff >= 0 ? 'text-[#00C896]' : 'text-[#FF6B6B]'}`}>
                                    {pointDiff > 0 ? `+${pointDiff}` : pointDiff}
                                </p>
                                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                    Atılan: {pointsScored} / Yenen: {pointsConceded}
                                </div>
                            </div>

                            {/* Spirit Yerine: Sayı Dönüşümü (Conversion Rate) */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3">
                                    <span className="material-icons-outlined text-[#5B4DBC] text-2xl">insights</span>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Sayı Dönüşümü</h3>
                                <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">%{conversionRate}</p>
                                <div className="mt-2 text-xs font-medium text-[#5B4DBC] bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
                                    {tGoals} / {totalPossessions} Pozisyon
                                </div>
                            </div>
                        </div>

                        {/* VERİMLİLİK BARLARI */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide mb-4">Hold % (Hücum)</h3>
                                <div className="flex items-end justify-between mb-2">
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">%{holdRate}</span>
                                    <span className="text-sm text-gray-400 dark:text-gray-500">{oHolds} / {oPoints}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                                    <div className="bg-[#00C4B4] h-3 rounded-full" style={{ width: `${holdRate}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide mb-4">Break % (Defans)</h3>
                                <div className="flex items-end justify-between mb-2">
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">%{breakRate}</span>
                                    <span className="text-sm text-gray-400 dark:text-gray-500">{dBreaks} / {dPoints}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${breakRate}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* LİDERLER KARTLARI (Top 3) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sayı Liderleri */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-semibold text-[#5B4DBC] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="material-icons-outlined">sports_handball</span>
                                    En Çok Sayı Alanlar
                                </h3>
                                <div className="space-y-3">
                                    {topScorers.length > 0 ? topScorers.map((player, index) => (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#5B4DBC] text-white flex items-center justify-center font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{player.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">#{player.jerseyNumber || '?'}</p>
                                                </div>
                                            </div>
                                            <div className="text-xl font-black text-[#5B4DBC]">{player.goals}</div>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 py-2">Veri yok</p>}
                                </div>
                            </div>

                            {/* Asist Liderleri */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-semibold text-[#00C896] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="material-icons-outlined">handshake</span>
                                    En Çok Asist Yapanlar
                                </h3>
                                <div className="space-y-3">
                                    {topAssisters.length > 0 ? topAssisters.map((player, index) => (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#00C896] text-white flex items-center justify-center font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{player.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">#{player.jerseyNumber || '?'}</p>
                                                </div>
                                            </div>
                                            <div className="text-xl font-black text-[#00C896]">{player.assists}</div>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 py-2">Veri yok</p>}
                                </div>
                            </div>
                        </div>

                        {/* GENEL OYUNCU İSTATİSTİKLERİ TABLOSU */}
                        <div className="mt-8 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Genel Oyuncu İstatistikleri</h3>
                                <button className="text-sm text-[#5B4DBC] font-medium hover:text-[#5B4DBC]/80 transition-colors">Tümünü Gör</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Oyuncu</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Maç</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Girdiği Sayı</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pas</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Turn</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gol</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asist</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Blok</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-[#5B4DBC] uppercase tracking-wider bg-purple-50 dark:bg-purple-900/10">Verimlilik</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1E1E1E] divide-y divide-gray-200 dark:divide-gray-800">
                                        {computedPlayers.map((player: any) => (
                                            <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[#5B4DBC] font-bold text-xs">
                                                            {player.name ? player.name.substring(0, 2).toUpperCase() : '??'}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{player.name}</div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">#{player.jerseyNumber || '?'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">{player.matchesPlayed || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">{player.pointsPlayed || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-200">{player.passes || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-[#FF6B6B]">{player.turns || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-[#00C896]">{player.goals || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-[#5B4DBC]">{player.assists || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-200">{player.blocks || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black text-[#5B4DBC] bg-purple-50/50 dark:bg-purple-900/5">{player.efficiency}</td>
                                            </tr>
                                        ))}
                                        {computedPlayers.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    Henüz istatistik verisi bulunamadı.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* İÇERİK - MAÇLAR TABI */}
                {activeTab === 'matches' && (
                    <div className="space-y-4">
                        {matches.map((match) => {
                            const isWin = (match.scoreUs || 0) > (match.scoreThem || 0);
                            return (
                                <div key={match.id} className={`bg-white dark:bg-[#1E1E1E] rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-l-4 ${isWin ? 'border-[#00C896]' : 'border-[#FF6B6B]'} hover:shadow-lg transition-all duration-200 group cursor-pointer relative overflow-hidden`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">vs {match.opponentName}</h3>
                                            <span className={`text-xs font-bold uppercase tracking-wide mt-1 flex items-center gap-1 ${isWin ? 'text-[#00C896]' : 'text-[#FF6B6B]'}`}>
                                                {isWin ? <><span className="material-icons-outlined text-[10px]">emoji_events</span> KAZANDIK</> : 'KAYBETTİK'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className={`block text-2xl font-black ${isWin ? 'text-[#00C896]' : 'text-[#FF6B6B]'}`}>
                                                    {match.scoreUs} - {match.scoreThem}
                                                </span>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-[#5B4DBC] group-hover:text-white transition-colors">
                                                <span className="material-icons-outlined text-sm">arrow_forward_ios</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {matches.length === 0 && (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                <span className="material-icons-outlined text-4xl mb-2 opacity-50">sports_score</span>
                                <p>Bu turnuvada henüz maç oynanmadı.</p>
                            </div>
                        )}
                    </div>
                )}
                {/* İÇERİK - KADRO TABI */}
                {activeTab === 'roster' && (
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="material-icons-outlined text-[#5B4DBC]">groups</span>
                                Turnuva Kadrosu
                            </h3>
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-[#5B4DBC] rounded-lg text-sm font-medium">
                                {tournament?.rosterPlayerIds?.length || 0} Oyuncu
                            </span>
                        </div>

                        {tournament?.rosterPlayerIds && tournament.rosterPlayerIds.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {players
                                    .filter(p => tournament.rosterPlayerIds.includes(p.id))
                                    .map(player => (
                                        <div key={player.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-800/30">
                                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[#5B4DBC] font-bold text-lg">
                                                {player.name ? player.name.substring(0, 2).toUpperCase() : '??'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white">{player.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    #{player.jerseyNumber || '?'} • {player.position || 'Oyuncu'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                <span className="material-icons-outlined text-5xl mb-3 opacity-30">group_off</span>
                                <p className="font-medium text-lg text-gray-600 dark:text-gray-300">Kadro Boş</p>
                                <p className="mt-1">Bu turnuva için henüz takım kadrosu (roster) oluşturulmamış.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* FAB - Yeni Maç */}
            <div className="fixed bottom-8 right-8 z-40">
                <button className="bg-[#5B4DBC] hover:bg-opacity-90 text-white rounded-2xl p-4 shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105 active:scale-95">
                    <span className="material-icons-outlined">add</span>
                    <span className="font-medium pr-1">Yeni Maç</span>
                </button>
            </div>
        </div>
    );
}
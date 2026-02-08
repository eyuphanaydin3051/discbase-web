// src/pages/TournamentDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth'; // Auth Listener eklendi
import { getUserTeams, getTournamentMatches, getTournamentPlayers } from '../services/repository';
import type { Match, TournamentPlayer, TeamProfile } from '../types';

export default function TournamentDetail() {
    const { id: tournamentId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);
    
    // Veriler
    const [teams, setTeams] = useState<TeamProfile[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<TournamentPlayer[]>([]);
    
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
    useEffect(() => {
        if (loadingAuth || !user || !tournamentId) return;

        // Takımları bul
        const unsubscribeTeams = getUserTeams(user.uid, (fetchedTeams) => {
            setTeams(fetchedTeams);
            
            if (fetchedTeams.length > 0) {
                // Varsayılan olarak ilk takımın ID'sini kullanıyoruz.
                // Not: İleride birden fazla takım varsa, doğru takımı bulmak için ek mantık gerekebilir.
                const currentTeamId = fetchedTeams[0].teamId;

                // A. Maçları Dinle
                const unsubMatches = getTournamentMatches(currentTeamId, tournamentId, (data) => {
                    setMatches(data as Match[]);
                });

                // B. Oyuncuları Dinle
                const unsubPlayers = getTournamentPlayers(currentTeamId, tournamentId, (data) => {
                    setPlayers(data);
                    // Oyuncu verisi geldiğinde loading'i kapatıyoruz
                    // (Maç verisi boş da olabilir, o yüzden oyuncu verisini baz aldık)
                    setLoadingData(false); 
                });

                // Emniyet sübapı: Eğer veri tabanı boşsa ve listener tetiklenmezse,
                // 2 saniye sonra loading'i zorla kapat ki sonsuz döngü olmasın.
                const safetyTimer = setTimeout(() => setLoadingData(false), 2000);

                return () => {
                    unsubMatches();
                    unsubPlayers();
                    clearTimeout(safetyTimer);
                };
            } else {
                setLoadingData(false); // Takım yoksa yüklemeyi bitir
            }
        });

        return () => unsubscribeTeams();
    }, [user, tournamentId, loadingAuth]);

    // --- İSTATİSTİK HESAPLAMALARI ---
    const wins = matches.filter(m => (m.scoreUs || 0) > (m.scoreThem || 0)).length;
    const losses = matches.filter(m => (m.scoreUs || 0) < (m.scoreThem || 0)).length;
    const pointsScored = matches.reduce((acc, m) => acc + (m.scoreUs || 0), 0);
    const pointsConceded = matches.reduce((acc, m) => acc + (m.scoreThem || 0), 0);
    const pointDiff = pointsScored - pointsConceded;

    // Liderleri Bul
    const sortedByGoals = [...players].sort((a, b) => (b.goals || 0) - (a.goals || 0));
    const topScorer = sortedByGoals.length > 0 ? sortedByGoals[0] : null;

    const sortedByAssists = [...players].sort((a, b) => (b.assists || 0) - (a.assists || 0));
    const topAssister = sortedByAssists.length > 0 ? sortedByAssists[0] : null;

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
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center hover:shadow-lg transition-shadow">
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
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center hover:shadow-lg transition-shadow">
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
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center hover:shadow-lg transition-shadow">
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

                            {/* Spirit */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center hover:shadow-lg transition-shadow">
                                <div className="h-12 w-12 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center mb-3">
                                    <span className="material-icons-outlined text-yellow-600 text-2xl">stars</span>
                                </div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Spirit Puanı</h3>
                                <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">11.4</p>
                                <div className="mt-2 text-xs font-medium text-yellow-700 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                                    Ortalama Üstü
                                </div>
                            </div>
                        </div>

                        {/* LİDERLER KARTLARI */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sayı Lideri */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-icons-outlined text-8xl text-[#5B4DBC]">sports_handball</span>
                                </div>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#5B4DBC] uppercase tracking-wider mb-1">Sayı Lideri</h3>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{topScorer ? topScorer.name : 'Yok'}</h2>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                            #{topScorer?.jerseyNumber || '?'}
                                        </p>
                                    </div>
                                    <div className="bg-[#5B4DBC] text-white h-14 w-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-[#5B4DBC]/30">
                                        <span className="text-xl font-bold">{topScorer?.goals || 0}</span>
                                        <span className="text-[10px] uppercase font-medium">Sayı</span>
                                    </div>
                                </div>
                            </div>

                            {/* Asist Lideri */}
                            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-icons-outlined text-8xl text-[#00C896]">handshake</span>
                                </div>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#00C896] uppercase tracking-wider mb-1">Asist Lideri</h3>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{topAssister ? topAssister.name : 'Yok'}</h2>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                            #{topAssister?.jerseyNumber || '?'}
                                        </p>
                                    </div>
                                    <div className="bg-[#00C896] text-white h-14 w-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-[#00C896]/30">
                                        <span className="text-xl font-bold">{topAssister?.assists || 0}</span>
                                        <span className="text-[10px] uppercase font-medium">Asist</span>
                                    </div>
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
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sayı</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asist</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Blok</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Toplam</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1E1E1E] divide-y divide-gray-200 dark:divide-gray-800">
                                        {players.map((player) => (
                                            <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-[#5B4DBC] font-bold text-xs">
                                                            {player.name ? player.name.substring(0, 2).toUpperCase() : '??'}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{player.name}</div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">#{player.jerseyNumber || '?'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">{player.matchesPlayed || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-200">{player.goals || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-200">{player.assists || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-200">{player.blocks || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-[#5B4DBC]">
                                                    {(player.goals || 0) + (player.assists || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                        {players.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
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
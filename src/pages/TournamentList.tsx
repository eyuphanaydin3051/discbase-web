// src/pages/TournamentList.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { getUserTeams, getTournaments } from '../services/repository';
import type { Tournament } from '../types';

export default function TournamentList() {
    const navigate = useNavigate();
    const [user] = useState(auth.currentUser);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    // Kullanıcının takımının turnuvalarını çek
    useEffect(() => {
        if (!user) return;

        const unsubscribeTeams = getUserTeams(user.uid, (teams) => {
            if (teams.length > 0) {
                // Varsayılan olarak ilk takımın turnuvalarını çekiyoruz
                // İleride buraya takım seçici eklenebilir
                const firstTeamId = teams[0].teamId;
                
                const unsubscribeTournaments = getTournaments(firstTeamId, (data) => {
                    setTournaments(data);
                    setLoading(false);
                });
                return () => unsubscribeTournaments();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeTeams();
    }, [user]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F9FB] dark:bg-[#121212]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#121212] font-sans flex text-[#1F2937] dark:text-[#F3F4F6]">

            {/* SIDEBAR (Yan Menü - Dashboard ile Aynı) */}
            <aside className="w-64 bg-[#FFFFFF] dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 flex-shrink-0 hidden lg:flex flex-col fixed h-full z-20">
                <div className="h-20 flex items-center px-8 border-b border-gray-200 dark:border-gray-800 gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5B4DBC] to-[#2F58CD] flex items-center justify-center text-white shadow-md">
                        <span className="material-icons text-xl">sports_handball</span>
                    </div>
                    <h1 className="text-xl font-bold text-[#5B4DBC] dark:text-white tracking-tight">DiscBase</h1>
                </div>
                
                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    <div className="mb-6">
                        <p className="px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-2">Menü</p>
                        
                        {/* Dashboard Butonu (Pasif) */}
                        <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 text-[#6B7280] dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[#1F2937] dark:hover:text-[#F3F4F6] rounded-xl font-medium transition-colors">
                            <span className="material-icons-round text-xl">dashboard</span>
                            Dashboard
                        </button>
                        
                        {/* Turnuvalar Butonu (Aktif) */}
                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#5B4DBC]/10 text-[#5B4DBC] dark:text-white rounded-xl font-medium transition-colors">
                            <span className="material-icons-round text-xl">emoji_events</span>
                            Turnuvalar
                        </button>
                        
                        {/* Kadro Butonu (Pasif) */}
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-[#6B7280] dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[#1F2937] dark:hover:text-[#F3F4F6] rounded-xl font-medium transition-colors">
                            <span className="material-icons-round text-xl">people</span>
                            Kadro
                        </button>
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <button onClick={() => navigate('/teams')} className="w-full flex items-center justify-center gap-2 text-sm text-[#6B7280] hover:text-[#5B4DBC] dark:hover:text-white font-medium py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm">
                        <span className="material-icons-round text-sm">swap_horiz</span>
                        Takım Değiştir
                    </button>
                </div>
            </aside>

            {/* ANA İÇERİK */}
            <main className="flex-1 p-4 lg:p-8 lg:ml-64 overflow-y-auto w-full">
                
                {/* Mobil Header (Sidebar gizliyken görünür) */}
                <header className="flex justify-between items-center mb-8 lg:hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#5B4DBC] flex items-center justify-center text-white">
                            <span className="material-icons text-sm">sports_handball</span>
                        </div>
                        <h1 className="text-lg font-bold text-[#5B4DBC] dark:text-white">DiscBase</h1>
                    </div>
                    <button className="p-2 text-gray-500">
                        <span className="material-icons">menu</span>
                    </button>
                </header>

                {/* Başlık Alanı */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white">Turnuvalar</h1>
                        <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">Takımının katıldığı tüm turnuvaları buradan yönetin.</p>
                    </div>
                    <button className="hidden md:inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-[#5B4DBC] hover:bg-opacity-90 transition-all transform hover:-translate-y-0.5">
                        <span className="material-icons-round mr-2">add</span>
                        Yeni Turnuva
                    </button>
                </div>

                {/* Turnuva Listesi (Filtresiz) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pb-24 md:pb-8">
                    
                    {/* Eğer veri yoksa boş durumu göster */}
                    {tournaments.length === 0 && (
                        <div className="col-span-full py-16 text-center text-[#6B7280] bg-white dark:bg-[#1E1E1E] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <span className="material-icons-round text-6xl text-gray-300 mb-4">emoji_events</span>
                            <p>Henüz kayıtlı bir turnuva yok.</p>
                            <button className="mt-4 text-[#5B4DBC] font-medium hover:underline">
                                İlk turnuvanı oluştur
                            </button>
                        </div>
                    )}

                    {tournaments.map((tour) => (
                        <div 
                            key={tour.id}
                            onClick={() => navigate(`/tournaments/${tour.id}`)}
                            className="group block bg-[#FFFFFF] dark:bg-[#1E1E1E] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 border border-transparent dark:border-gray-700 hover:border-[#5B4DBC]/30 overflow-hidden relative cursor-pointer"
                        >
                            <div className="p-6 flex items-center">
                                <div className="flex-shrink-0 h-16 w-16 bg-[#E0D7F9] dark:bg-gray-800 rounded-xl flex items-center justify-center mr-5 transition-colors group-hover:bg-[#5B4DBC] group-hover:bg-opacity-10">
                                    <span className="material-icons-round text-[#5B4DBC] text-3xl">emoji_events</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h2 className="text-lg font-bold text-[#1F2937] dark:text-white truncate pr-2">{tour.tournamentName}</h2>
                                        {/* Durum etiketi (Varsayılan olarak Aktif gösteriyoruz) */}
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#00C4B4]/10 text-[#00C4B4]">
                                            Aktif
                                        </span>
                                    </div>
                                    <div className="flex items-center text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                                        <span className="material-icons-round text-base mr-1 text-gray-400">calendar_today</span>
                                        <span>{tour.date || 'Tarih Yok'}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                                        <span className="material-icons-round text-base mr-1 text-gray-400">groups</span>
                                        {tour.matches ? tour.matches.length : 0} Maç
                                    </div>
                                </div>
                                <div className="ml-4 flex-shrink-0 self-center">
                                    <span className="material-icons-round text-gray-400 group-hover:text-[#5B4DBC] transition-colors">chevron_right</span>
                                </div>
                            </div>
                            {/* Alt Çizgi Efekti */}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800">
                                <div className="bg-[#00C4B4] h-1 w-1/3"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* MOBİL FAB (Floating Action Button) */}
            <div className="fixed bottom-20 right-4 md:hidden z-30">
                <button className="flex items-center justify-center w-14 h-14 rounded-full bg-[#5B4DBC] text-white shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5B4DBC] transition-transform transform hover:scale-105">
                    <span className="material-icons-round text-2xl">add</span>
                </button>
            </div>
        </div>
    );
}
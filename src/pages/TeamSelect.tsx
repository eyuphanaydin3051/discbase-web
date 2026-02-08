import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserTeams } from '../services/repository';
import type { TeamProfile } from '../types';

export default function TeamSelect() {
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);
    const [teams, setTeams] = useState<TeamProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // Oturum ve Veri Çekme İşlemleri
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const unsubscribeTeams = getUserTeams(currentUser.uid, (fetchedTeams) => {
                    setTeams(fetchedTeams);
                    setLoading(false);
                });
                return () => unsubscribeTeams();
            } else {
                setLoading(false);
                navigate('/');
            }
        });
        return () => unsubscribeAuth();
    }, [navigate]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9] dark:bg-[#121212]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F9F9F9] dark:bg-[#121212] text-[#111827] dark:text-[#F3F4F6] font-sans antialiased selection:bg-[#6366F1] selection:text-white transition-colors duration-300">
            
            {/* Üst Bilgi Çubuğu (Header) */}
            <header className="w-full bg-white dark:bg-[#1E1E1E] shadow-sm sticky top-0 z-50 transition-colors duration-300 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] font-medium">Hoş Geldin,</span>
                        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#F3F4F6] tracking-tight">
                            {user?.displayName || 'Kullanıcı'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-full text-[#6B7280] dark:text-[#9CA3AF] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="material-icons-outlined text-2xl">settings</span>
                        </button>
                        <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#6366F1] transition-colors font-medium text-sm"
                        >
                            <span>Çıkış Yap</span>
                            <span className="material-icons-outlined text-lg">logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* SOL TARAF: Takımlar Listesi */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="material-icons-outlined text-[#6366F1]">groups</span>
                                Takımlarım
                            </h2>
                            <div className="flex gap-3">
                                <button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-[#6366F1]/30 transition-all hover:scale-105 active:scale-95">
                                    <span className="material-icons-outlined text-lg">add</span>
                                    Yeni Takım
                                </button>
                                <button className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-700 text-[#6366F1] hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95">
                                    <span className="material-icons-outlined text-lg">person_add</span>
                                    Katıl
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {teams.map((team, index) => (
                                <div key={team.teamId} className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow duration-300 border border-transparent dark:border-gray-800 relative group cursor-pointer" onClick={() => navigate('/dashboard')}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 dark:border-gray-700 p-1 flex-shrink-0 overflow-hidden shadow-sm">
                                                <img 
                                                    alt={`${team.teamName} logo`} 
                                                    className="w-full h-full object-cover rounded-full" 
                                                    src={`https://ui-avatars.com/api/?name=${team.teamName}&background=random&color=fff`}
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold mb-1">{team.teamName}</h3>
                                                <div className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                                                    <span className="font-medium">Rol: </span>
                                                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs text-[#111827] dark:text-[#F3F4F6]">
                                                        {(user && team.members && team.members[user.uid]) ? team.members[user.uid] : 'Üye'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-2 flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    Aktif Sezon
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); /* Ayrılma fonksiyonu */ }}>
                                                <span className="material-icons-outlined">delete_outline</span>
                                            </button>
                                            <span className="material-icons-outlined text-[#6B7280]">chevron_right</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {teams.length === 0 && (
                                <div className="text-center py-10 bg-white dark:bg-[#1E1E1E] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <span className="material-icons-outlined text-4xl text-gray-300 mb-2">groups</span>
                                    <p className="text-gray-500 font-medium">Henüz bir takımınız yok.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SAĞ TARAF: Oyuncu Kariyeri */}
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="material-icons-outlined text-[#2DD4BF]">person</span>
                                Oyuncu Kariyeri
                            </h2>
                            <button className="text-sm text-[#6366F1] hover:underline font-medium">Tam Profil</button>
                        </div>
                        
                        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-transparent dark:border-gray-800 overflow-hidden flex flex-col h-full">
                            {/* Renkli Gradient Kart */}
                            <div className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] p-6 text-white relative">
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <span className="material-icons-outlined text-8xl">sports_handball</span>
                                </div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10 text-2xl font-bold backdrop-blur-sm">
                                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{user?.displayName || 'Kullanıcı'}</h3>
                                        <p className="text-white/80 text-sm font-light">{user?.email || ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filtreler */}
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 space-y-3">
                                <div className="bg-[#F9F9F9] dark:bg-[#121212] rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <div>
                                        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-0.5">Takım Filtresi</p>
                                        <p className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">Tüm Takımlar (Kariyer)</p>
                                    </div>
                                    <span className="material-icons-outlined text-[#6B7280]">arrow_drop_down</span>
                                </div>
                            </div>

                            {/* Sekmeler */}
                            <div className="flex border-b border-gray-100 dark:border-gray-700">
                                <button className="flex-1 py-3 text-sm font-semibold text-[#6366F1] border-b-2 border-[#6366F1] bg-[#6366F1]/5">
                                    İstatistikler
                                </button>
                                <button className="flex-1 py-3 text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-50 transition-colors">
                                    Bağlantılar
                                </button>
                            </div>

                            {/* Veri Özeti */}
                            <div className="p-6 flex-grow flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="material-icons-outlined text-[#6366F1] text-xl">schedule</span>
                                    <h4 className="font-bold text-lg">Oyun Süresi (Sayı)</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-center relative">
                                    <div className="flex flex-col items-center">
                                        <span className="text-4xl font-black tracking-tight">50</span>
                                        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] font-medium mt-1">Toplam</span>
                                    </div>
                                    
                                    <div className="flex flex-col items-center border-l border-r border-gray-100 dark:border-gray-700 px-2">
                                        <span className="text-3xl font-bold text-[#2DD4BF]">28</span>
                                        <span className="text-sm text-[#2DD4BF] font-medium mt-1">Ofans</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-bold text-[#EF4444]">22</span>
                                        <span className="text-sm text-[#EF4444] font-medium mt-1">Defans</span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-icons-outlined text-[#2DD4BF] text-xl">pan_tool</span>
                                        <h4 className="font-bold">Yakalama (Receiving)</h4>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">Tutuş Yüzdesi</span>
                                        <span className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">100,0%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
                                        <div className="bg-[#2DD4BF] h-2 rounded-full" style={{ width: '100%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            {/* Giriş Başarılı Animasyonu */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 text-[#111827] dark:text-[#F3F4F6] px-6 py-3 rounded-full shadow-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3 animate-bounce shadow-indigo-100 dark:shadow-none">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="material-icons-outlined text-white text-xs">check</span>
                </div>
                <span className="font-medium text-sm">Giriş başarılı!</span>
            </div>
        </div>
    );
}
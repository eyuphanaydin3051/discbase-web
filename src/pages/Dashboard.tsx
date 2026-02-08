// src/pages/Dashboard.tsx
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#121212] font-sans flex text-[#1F2937] dark:text-[#F3F4F6]">

            {/* SIDEBAR (Yan Menü) */}
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
                        
                        <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#5B4DBC]/10 text-[#5B4DBC] dark:text-white rounded-xl font-medium transition-colors">
                            <span className="material-icons-round text-xl">dashboard</span>
                            Dashboard
                        </button>
                        
                        <button onClick={() => navigate('/tournaments')} className="w-full flex items-center gap-3 px-4 py-3 text-[#6B7280] dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-[#1F2937] dark:hover:text-[#F3F4F6] rounded-xl font-medium transition-colors">
                            <span className="material-icons-round text-xl">emoji_events</span>
                            Turnuvalar
                        </button>
                        
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
                
                {/* 1. SEZON RAPORU KARTI */}
                <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#3A1078] to-[#2F58CD] shadow-lg text-white">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-40 h-40 bg-purple-400 opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Sezon 2024</span>
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C4B4] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C4B4]"></span>
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold mb-2">Sezon Raporu</h1>
                            <p className="text-purple-100 text-lg opacity-90">XIII. ODTU UFT Turnuvası devam ediyor.</p>
                            
                            <div className="mt-6 flex flex-wrap gap-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                                    <span className="text-xs uppercase tracking-wider text-purple-200 block mb-1">Galibiyet</span>
                                    <div className="text-2xl font-bold">12</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                                    <span className="text-xs uppercase tracking-wider text-purple-200 block mb-1">Mağlubiyet</span>
                                    <div className="text-2xl font-bold">4</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                                    <span className="text-xs uppercase tracking-wider text-purple-200 block mb-1">Kazanma %</span>
                                    <div className="text-2xl font-bold">75%</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-full md:w-auto">
                            <button className="w-full md:w-auto bg-white text-[#5B4DBC] hover:bg-purple-50 font-semibold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <span className="material-icons text-sm">bar_chart</span>
                                Detaylı İstatistikler
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* SOL KOLON (2/3 Genişlik) */}
                    <div className="xl:col-span-2 space-y-8">
                        
                        {/* 2. SON MAÇLAR */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#F3F4F6] flex items-center gap-2">
                                    <span className="material-icons text-[#5B4DBC]">history</span>
                                    Son Maçlar
                                </h2>
                                <a className="text-sm font-medium text-[#5B4DBC] hover:text-[#5B4DBC]/80 flex items-center gap-1 cursor-pointer">
                                    Tümünü Gör
                                    <span className="material-icons text-sm">chevron_right</span>
                                </a>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border-l-4 border-[#00C4B4] hover:shadow-lg transition-all duration-200 group cursor-pointer relative overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-lg text-[#1F2937] dark:text-[#F3F4F6]">vs FT</h3>
                                            <span className="text-xs font-bold text-[#00C4B4] uppercase tracking-wide mt-1 flex items-center gap-1">
                                                <span className="material-icons text-[10px]">emoji_events</span> KAZANDIK
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="block text-2xl font-black text-[#00C4B4]">7 - 6</span>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-[#F9F9FB] dark:bg-[#121212] flex items-center justify-center group-hover:bg-[#5B4DBC] group-hover:text-white transition-colors">
                                                <span className="material-icons text-sm">arrow_forward_ios</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* SAĞ KOLON (1/3 Genişlik) */}
                    <div className="xl:col-span-1 space-y-8">
                        
                        {/* 4. DETAYLI ANALİZ */}
                        <section className="bg-[#FFFFFF] dark:bg-[#1E1E1E] rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] h-fit">
                            <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#F3F4F6] mb-6 flex items-center gap-2">
                                <span className="material-icons text-[#5B4DBC]">analytics</span>
                                Detaylı Analiz
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#EBEAF8] dark:bg-[#2D2B42] p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-200">
                                    <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] font-medium">Pas Den.</span>
                                    <span className="text-3xl font-black text-[#5B4DBC] dark:text-[#A78BFA]">895</span>
                                    <div className="h-1 w-8 bg-[#5B4DBC]/20 rounded-full"></div>
                                </div>
                                <div className="bg-[#E0F7FA] dark:bg-[#1A383C] p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform duration-200">
                                    <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF] font-medium">Baş. Pas</span>
                                    <span className="text-3xl font-black text-[#00C4B4]">764</span>
                                    <div className="h-1 w-8 bg-[#00C4B4]/20 rounded-full"></div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* FAB (Floating Action Button) */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
                <button className="bg-[#5B4DBC] hover:bg-[#5B4DBC]/90 text-white p-4 rounded-full shadow-xl shadow-[#5B4DBC]/30 flex items-center gap-2 transition-all hover:scale-105 group">
                    <span className="material-icons">add</span>
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">Yeni Maç</span>
                </button>
            </div>
        </div>
    );
}
// src/pages/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans flex">

            {/* SOL MENÜ (SIDEBAR) */}
            <aside className="w-64 bg-card-light dark:bg-card-dark border-r border-gray-100 dark:border-gray-800 flex-shrink-0 hidden lg:flex flex-col">
                <div className="h-20 flex items-center px-8 border-b border-gray-100 dark:border-gray-800">
                    <h1 className="text-2xl font-bold text-primary">Odtupus</h1>
                </div>
                <nav className="p-4 space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-medium">
                        <span className="material-icons-round">dashboard</span>
                        Genel Bakış
                    </button>
                    <button onClick={() => navigate('/tournaments')} className="w-full flex items-center gap-3 px-4 py-3 text-text-sub-light hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
                        <span className="material-icons-round">emoji_events</span>
                        Turnuvalar
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-text-sub-light hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
                        <span className="material-icons-round">people</span>
                        Kadro
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-text-sub-light hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
                        <span className="material-icons-round">settings</span>
                        Ayarlar
                    </button>
                </nav>
                <div className="mt-auto p-4">
                    <button onClick={() => navigate('/teams')} className="flex items-center gap-2 text-sm text-text-sub-light hover:text-text-main-light">
                        <span className="material-icons-round">arrow_back</span>
                        Takım Değiştir
                    </button>
                </div>
            </aside>

            {/* ANA İÇERİK */}
            <main className="flex-1 p-8 overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-text-main-light dark:text-text-main-dark">Dashboard</h2>
                        <p className="text-text-sub-light">Takım performans özeti.</p>
                    </div>
                    <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-105 transition-transform">
                        <span className="material-icons-round">add</span>
                        Hızlı Maç Başlat
                    </button>
                </div>

                {/* İstatistik Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-soft border border-transparent dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                                <span className="material-icons-round">sports_score</span>
                            </div>
                            <span className="text-text-sub-light font-medium">Toplam Maç</span>
                        </div>
                        <p className="text-4xl font-bold text-text-main-light dark:text-text-main-dark">24</p>
                    </div>

                    <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-soft border border-transparent dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 rounded-full bg-green-50 text-accent-teal">
                                <span className="material-icons-round">trending_up</span>
                            </div>
                            <span className="text-text-sub-light font-medium">Kazanma Oranı</span>
                        </div>
                        <p className="text-4xl font-bold text-text-main-light dark:text-text-main-dark">%65</p>
                    </div>

                    <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-soft border border-transparent dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 rounded-full bg-purple-50 text-primary">
                                <span className="material-icons-round">group</span>
                            </div>
                            <span className="text-text-sub-light font-medium">Oyuncu Sayısı</span>
                        </div>
                        <p className="text-4xl font-bold text-text-main-light dark:text-text-main-dark">18</p>
                    </div>
                </div>

                {/* Son Maçlar Listesi */}
                <h3 className="text-lg font-bold text-text-main-light dark:text-text-main-dark mb-4">Son Aktiviteler</h3>
                <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-soft border border-transparent dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">W</div>
                            <div>
                                <h4 className="font-bold text-text-main-light dark:text-text-main-dark">vs. Steamhuck</h4>
                                <p className="text-xs text-text-sub-light">Summer League • 13-10</p>
                            </div>
                        </div>
                        <span className="text-sm text-text-sub-light">2 gün önce</span>
                    </div>
                    <div className="p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">L</div>
                            <div>
                                <h4 className="font-bold text-text-main-light dark:text-text-main-dark">vs. Caddebostan</h4>
                                <p className="text-xs text-text-sub-light">Summer League • 9-11</p>
                            </div>
                        </div>
                        <span className="text-sm text-text-sub-light">5 gün önce</span>
                    </div>
                </div>

            </main>
        </div>
    );
}
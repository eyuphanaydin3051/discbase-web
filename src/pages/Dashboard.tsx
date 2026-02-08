export default function Dashboard() {
    return (
        <div className="p-4 md:p-8 pb-24 lg:pb-8 w-full">
            {/* Başlık */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Hoş Geldin, Koç! 👋
                    </h1>
                    <p className="text-gray-500 mt-1">Takımının performansı yükselişte.</p>
                </div>
                
                {/* Profil İkonu */}
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                        <span className="material-icons-outlined text-xl">notifications</span>
                    </button>
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-[#5B4DBC] font-bold border-2 border-white shadow-sm">
                        EC
                    </div>
                </div>
            </header>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <span className="material-icons-outlined text-2xl">groups</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Toplam Oyuncu</p>
                        <h3 className="text-2xl font-bold text-gray-900">24</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                        <span className="material-icons-outlined text-2xl">emoji_events</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Turnuvalar</p>
                        <h3 className="text-2xl font-bold text-gray-900">3</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                        <span className="material-icons-outlined text-2xl">trending_up</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Galibiyet Oranı</p>
                        <h3 className="text-2xl font-bold text-gray-900">%75</h3>
                    </div>
                </div>
            </div>

            {/* İçerik Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sol Taraf - Son Maçlar */}
                <section className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Son Maçlar</h2>
                        <button className="text-sm font-medium text-[#5B4DBC] hover:text-[#4a3ea3]">Tümünü Gör</button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-12 bg-green-500 rounded-full"></div>
                                <div>
                                    <h4 className="font-bold text-gray-900">ODTÜ Pusula</h4>
                                    <p className="text-xs text-gray-500">12 Ekim, 14:30</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-bold text-gray-900">13</span>
                                <span className="text-gray-400">-</span>
                                <span className="text-xl font-bold text-gray-400">9</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Sağ Taraf - İstatistik Özeti */}
                <section className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900">Hızlı İstatistikler</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-[#5B4DBC] p-6 rounded-2xl text-white shadow-lg shadow-[#5B4DBC]/30">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-purple-200 text-sm font-medium">En Çok Gol</p>
                                    <h3 className="text-2xl font-bold mt-1">Abdullah Ç.</h3>
                                </div>
                                <span className="bg-white/20 p-2 rounded-lg">
                                    <span className="material-icons-outlined text-white text-sm">sports_soccer</span>
                                </span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                <span className="text-3xl font-bold">12</span>
                                <span className="text-sm text-purple-200">Bu sezon</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Dashboard'a Özel Hızlı Ekle Butonu */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40 md:z-10">
                <button className="bg-[#5B4DBC] hover:bg-[#5B4DBC]/90 text-white p-4 rounded-full shadow-xl shadow-[#5B4DBC]/30 flex items-center gap-2 transition-all hover:scale-105 group">
                    <span className="material-icons-outlined">add</span>
                </button>
            </div>
        </div>
    );
}
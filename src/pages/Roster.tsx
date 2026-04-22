import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { getUserTeamsAsync, getPlayersAsync, getLeaderboard } from '../services/repository';
import type { Player, TeamProfile } from '../types';
import PlayerDetailModal from '../components/PlayerDetailModal';
import { useNavigate } from 'react-router-dom';

export default function Roster() {
    const navigate = useNavigate();
    const [user] = useState(auth.currentUser);
    const [teams, setTeams] = useState<TeamProfile[]>([]);

    // Sadece localStorage'dan aktif takımı okuyoruz, sayfada değiştirmiyoruz
    // Hata Düzeltmesi: 'activeTeamId' yerine 'selectedTeamId' kullanıyoruz
    const activeTeamId = localStorage.getItem('selectedTeamId');

    const [players, setPlayers] = useState<Player[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]); // Leaderboard Data
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [viewMode, setViewMode] = useState<'roster' | 'leaderboard'>('roster'); // Görünüm Modu

    useEffect(() => {
        if (!user) return;
        if (!activeTeamId) {
            navigate('/teams');
            return;
        }

        const fetchInitialData = async () => {
            setLoading(true);
            const fetchedTeams = await getUserTeamsAsync(user.uid);
            setTeams(fetchedTeams);

            const fetchedPlayers = await getPlayersAsync(activeTeamId);
            const sortedPlayers = fetchedPlayers.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
            setPlayers(sortedPlayers);

            // Backend'den Leaderboard verisini çek
            const fetchedLeaderboard = await getLeaderboard(activeTeamId);
            setLeaderboard(fetchedLeaderboard);
            setLoading(false);
        };

        fetchInitialData();
    }, [user, activeTeamId, navigate]);

    // Süreyi (Saniye) Dakika:Saniye formatına çeviren yardımcı fonksiyon
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const filteredPlayers = players.filter(player => (player.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    // Ekranda adını göstermek için aktif takımı buluyoruz
    const activeTeam = teams.find(t => t.teamId === activeTeamId);

    return (
        <div className="p-4 md:p-8 pb-24 lg:pb-8 w-full">
            {/* Üst Başlık ve Arama */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        Kadro
                        {activeTeam && (
                            <span className="text-sm font-normal text-[#5B4DBC] bg-[#5B4DBC]/10 px-3 py-1 rounded-lg">
                                {activeTeam.teamName}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-500 mt-1">Takım oyuncularını yönet ve istatistiklerini gör.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-icons-outlined text-gray-400">search</span>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#5B4DBC] outline-none transition-all shadow-sm"
                        placeholder="Oyuncu Ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Butonlar */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                        onClick={() => setViewMode('roster')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition shadow-sm font-medium text-sm ${viewMode === 'roster' ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
                        <span className="material-icons-outlined text-lg">format_list_numbered</span>
                        Kadro
                    </button>
                    <button 
                        onClick={() => setViewMode('leaderboard')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition shadow-sm font-medium text-sm ${viewMode === 'leaderboard' ? 'bg-[#5B4DBC] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
                        <span className="material-icons-outlined text-lg">show_chart</span>
                        İstatistikler
                    </button>
                </div>
            </div>

            {/* İçerik */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
                </div>
            ) : viewMode === 'leaderboard' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[700px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sıra</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Oyuncu</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-[#5B4DBC] uppercase tracking-wider">Verimlilik</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold text-emerald-600 uppercase tracking-wider">Gol</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold text-indigo-600 uppercase tracking-wider">Asist</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold text-purple-600 uppercase tracking-wider">Blok</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold text-rose-600 uppercase tracking-wider">Turn</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-amber-600 uppercase tracking-wider">Süre (Web Özel)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leaderboard.map((stat, idx) => (
                                    <tr key={stat.id} onClick={() => navigate(`/player/${activeTeamId}/${stat.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">#{idx + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-600 overflow-hidden border border-gray-300">
                                                {stat.photoUrl ? <img src={stat.photoUrl} className="w-full h-full object-cover" /> : getInitials(stat.name)}
                                            </div>
                                            <span className="font-bold text-gray-900">{stat.name}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black text-[#5B4DBC] bg-[#5B4DBC]/5">{stat.efficiency}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700">{stat.goals}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700">{stat.assists}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700">{stat.blocks}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700">{stat.turns}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-amber-700 bg-amber-50/50">{formatTime(stat.totalTimePlayedSeconds)}</td>
                                    </tr>
                                ))}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">Henüz oynanmış maç veya istatistik bulunmuyor.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPlayers.map((player) => (
                        <div key={player.id}
                            onClick={() => navigate(`/player/${activeTeamId}/${player.id}`)}
                            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-transparent flex flex-col items-center text-center cursor-pointer">
                            <div className="relative mb-4">
                                <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-2xl font-bold overflow-hidden shadow-inner
                                    ${!player.position ? 'border-gray-300 bg-gray-100 text-gray-600' : 'border-[#00c4b4] bg-teal-50 text-teal-700'}`}>
                                    {player.photoUrl ? (
                                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                                    ) : (player.jerseyNumber !== undefined && player.jerseyNumber !== null) ? (
                                        <span className="text-3xl font-black">{player.jerseyNumber}</span>
                                    ) : (
                                        <span className="text-2xl font-bold">{getInitials(player.name)}</span>
                                    )}
                                </div>
                                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#5B4DBC] transition-colors">{player.name}</h3>
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {player.position || 'Oyuncu'}
                                </span>
                                {player.gender && (
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${player.gender.toLowerCase() === 'kadın' || player.gender.toLowerCase() === 'kadin' || player.gender.toLowerCase() === 'female'
                                            ? 'bg-pink-100 text-pink-700'
                                            : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {player.gender}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Yeni Ekle Kartı */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] group hover:border-[#5B4DBC] transition-all">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-[#5B4DBC]/10 transition-colors">
                            <span className="material-icons-outlined text-3xl text-gray-400 group-hover:text-[#5B4DBC]">add</span>
                        </div>
                        <h3 className="text-lg font-medium text-gray-500 group-hover:text-[#5B4DBC] transition-colors">Yeni Oyuncu Ekle</h3>
                    </div>
                </div>
            )}

            {/* Modalı Render Et */}
            {selectedPlayer && activeTeamId && (
                <PlayerDetailModal
                    player={selectedPlayer}
                    teamId={activeTeamId}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
}
import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { getUserTeamsAsync, getPlayersAsync } from '../services/repository';
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
    const [leaderboard, setLeaderboard] = useState<any[]>([]); // Backend'den gelen hazır hesaplanmış sıralı veri
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [viewMode, setViewMode] = useState<'roster' | 'leaderboard'>('roster');

    // --- FİLTRE VE HESAPLAMA STATE'LERİ ---
    const [calculationMode, setCalculationMode] = useState('TOTAL');
    const [selectedTournamentId, setSelectedTournamentId] = useState('GENEL');
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
    const [tournaments, setTournaments] = useState<any[]>([]);

    useEffect(() => {
        if (!user || !activeTeamId) return;

        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
                
                // İlk ana verileri tek tek beklemek yerine Promise.all ile paralel başlatıyoruz
                const [fetchedTeams, fetchedPlayers, fetchedTours] = await Promise.all([
                    getUserTeamsAsync(user.uid),
                    getPlayersAsync(activeTeamId),
                    fetch(`${API_URL}/teams/${activeTeamId}/tournaments`).then(res => res.json())
                ]);

                setTeams(fetchedTeams);
                setPlayers(fetchedPlayers.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));

                // N+1 ağ problemini çözmek için turnuva maçlarını eş zamanlı (paralel) çekiyoruz
                const tournamentsWithMatches = await Promise.all(
                    fetchedTours.map(async (t: any) => {
                        try {
                            const matchRes = await fetch(`${API_URL}/teams/${activeTeamId}/tournaments/${t.id}/matches`);
                            t.matches = await matchRes.json();
                        } catch (err) {
                            t.matches = [];
                        }
                        return t;
                    })
                );
                setTournaments(tournamentsWithMatches);
            } catch (err) {
                console.error("İlk veriler yüklenirken hata oluştu:", err);
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [user, activeTeamId, navigate]);

    // Tüm İstatistik İşlemleri Backend'e Taşındı (Filtreler Değiştikçe Backend'e İstek Atılır)
    useEffect(() => {
        if (!activeTeamId || viewMode !== 'leaderboard') return;
        
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
                // statType parametresini varsayılan olarak 'PLUS_MINUS' veriyoruz ki API oyuncuları verimliliğe göre sıralı döndürsün
                let url = `${API_URL}/teams/${activeTeamId}/leaderboard?statType=PLUS_MINUS&calculationMode=${calculationMode}`;
                
                if (selectedTournamentId && selectedTournamentId !== 'GENEL') {
                    url += `&tournamentId=${selectedTournamentId}`;
                }
                if (selectedMatchId) {
                    url += `&matchId=${selectedMatchId}`;
                }
                
                const res = await fetch(url);
                const data = await res.json();
                setLeaderboard(data);
            } catch (err) {
                console.error("Leaderboard yüklenirken hata oluştu:", err);
            }
            setLoading(false);
        };
        
        fetchLeaderboard();
    }, [activeTeamId, viewMode, selectedTournamentId, selectedMatchId, calculationMode]);

    const filteredPlayers = players.filter(player => (player.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    // Hesaplama moduna göre istatistiklerin bölüneceği maç/sayı çarpanını dinamik bulur
    const getDivisor = (item: any) => {
        if (calculationMode === 'PER_POINT') {
            return item.stats?.pointsPlayed || 1;
        }
        if (calculationMode === 'PER_MATCH') {
            if (selectedMatchId) return 1;
            if (selectedTournamentId && selectedTournamentId !== 'GENEL') {
                return tournaments.find(t => t.id === selectedTournamentId)?.matches?.length || 1;
            }
            const totalMatches = tournaments.reduce((acc, t) => acc + (t.matches?.length || 0), 0);
            return totalMatches || 1;
        }
        return 1;
    };

    // Ham istatistik değerlerini seçili moda göre oranlar ve doğru biçimde formatlar
    const formatStatValue = (value: number | undefined, isPercentage = false, item: any = null) => {
        if (value === undefined || value === null) return '0';
        if (isPercentage) return `%${value}`;
        
        const divisor = getDivisor(item);
        const calculated = value / divisor;
        
        // Tam sayıysa küsuratsız, ondalıklıysa virgülden sonra 2 basamak gösterir
        return calculated % 1 === 0 ? calculated.toString() : calculated.toFixed(2);
    };

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
                <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
                    
                    {/* 1. FİLTRELER (TURNUVA / MAÇ) */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <select 
                            className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-[#5B4DBC] focus:border-[#5B4DBC] block p-3 outline-none"
                            value={selectedTournamentId}
                            onChange={(e) => { setSelectedTournamentId(e.target.value); setSelectedMatchId(null); }}
                        >
                            <option value="GENEL">Tüm Sezon (Genel)</option>
                            {tournaments.map(t => <option key={t.id} value={t.id}>{t.tournamentName}</option>)}
                        </select>

                        {selectedTournamentId !== 'GENEL' && (
                            <select 
                                className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-[#5B4DBC] focus:border-[#5B4DBC] block p-3 outline-none animate-fade-in"
                                value={selectedMatchId || ''}
                                onChange={(e) => setSelectedMatchId(e.target.value === '' ? null : e.target.value)}
                            >
                                <option value="">Tüm Maçlar</option>
                                {tournaments.find(t => t.id === selectedTournamentId)?.matches?.map((m: any) => (
                                    <option key={m.id} value={m.id}>vs {m.opponentName}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* 2. HESAPLAMA MODU */}
                    <div className="flex bg-gray-200 p-1 rounded-full animate-fade-in mb-4">
                        {[{ id: 'TOTAL', label: 'Toplam' }, { id: 'PER_MATCH', label: 'Maç Başına' }, { id: 'PER_POINT', label: 'Sayı Başına' }].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setCalculationMode(mode.id)}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all duration-300 ${calculationMode === mode.id ? 'bg-[#5B4DBC] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    {/* 4. SIRALAMA TABLOSU */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-auto max-h-[calc(100vh-320px)] custom-scrollbar">
                        {leaderboard.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 font-medium flex flex-col items-center">
                                <span className="material-icons-outlined text-4xl text-gray-300 mb-2">sentiment_dissatisfied</span>
                                Bu kriterlere uygun istatistik bulunamadı.
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Oyuncu</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Verimlilik</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gol</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Asist</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Blok</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Callahan</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Drop</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hatalı Pas</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pas Sayısı</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Oynanan Sayı</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Yakalama %</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pas %</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {leaderboard.map((item, idx) => (
                                        <tr key={item.player.id} 
                                            onClick={() => navigate(`/player/${activeTeamId}/${item.player.id}`)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors group">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-400">#{idx + 1}</td>
                                            <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden mr-3">
                                                        {item.player.photoUrl ? <img src={item.player.photoUrl} className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-gray-500">{getInitials(item.player.name)}</span>}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{item.player.name}</div>
                                                        <div className="text-xs text-[#5B4DBC]">#{item.player.jerseyNumber || '-'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-left">
                                                <span className="text-base font-black text-[#5B4DBC]">{item.formattedValue}</span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatStatValue(item.stats?.goal, false, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatStatValue(item.stats?.assist, false, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatStatValue(item.stats?.block, false, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatStatValue(item.stats?.callahan, false, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-pink-600 font-medium">{formatStatValue(item.stats?.drop, false, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-bold">{formatStatValue(item.stats?.throwaway, false, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatStatValue(item.stats?.passCount, false, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatStatValue(item.stats?.pointsPlayed, false, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatStatValue(item.stats?.catchRate, true, item)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{formatStatValue(item.stats?.passRate, true, item)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
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
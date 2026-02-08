import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { getUserTeams, getPlayers } from '../services/repository';
import type { Player, TeamProfile } from '../types';

export default function Roster() {
    const [user] = useState(auth.currentUser);
    const [teams, setTeams] = useState<TeamProfile[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;
        const unsubscribe = getUserTeams(user.uid, (fetchedTeams) => {
            setTeams(fetchedTeams);
            if (fetchedTeams.length > 0) setSelectedTeamId(fetchedTeams[0].teamId);
            else setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!selectedTeamId) return;
        setLoading(true);
        const unsubscribe = getPlayers(selectedTeamId, (fetchedPlayers) => {
            const sortedPlayers = fetchedPlayers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setPlayers(sortedPlayers);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [selectedTeamId]);

    const filteredPlayers = players.filter(player => (player.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className="p-4 md:p-8 pb-24 lg:pb-8 w-full">
            {/* Üst Başlık ve Arama */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        Kadro
                        {teams.length > 1 && (
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                {teams.find(t => t.teamId === selectedTeamId)?.teamName}
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
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition shadow-sm font-medium text-sm">
                        <span className="material-icons-outlined text-lg">format_list_numbered</span>
                        Numaralar
                    </button>
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5B4DBC] text-white rounded-xl hover:bg-[#4a3ea3] transition shadow-sm font-medium text-sm">
                        <span className="material-icons-outlined text-lg">show_chart</span>
                        İstatistikler
                    </button>
                </div>
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium">
                    <span className="material-icons-outlined text-lg">filter_list</span>
                    Filtrele
                </button>
            </div>

            {/* İçerik */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPlayers.map((player) => (
                        <div key={player.id} className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-transparent flex flex-col items-center text-center cursor-pointer">
                            <div className="relative mb-4">
                                <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-2xl font-bold 
                                    ${!player.position ? 'border-gray-300 bg-gray-100 text-gray-600' : 
                                      'border-[#00c4b4] bg-teal-50 text-teal-700'}`}>
                                    {getInitials(player.name)}
                                </div>
                                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#5B4DBC] transition-colors">{player.name}</h3>
                            <div className="mt-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {player.position || 'Oyuncu'}
                                </span>
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
        </div>
    );
}
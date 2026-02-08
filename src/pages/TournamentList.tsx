import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { getUserTeams, getTournaments } from '../services/repository';
import type { Tournament } from '../types';

export default function TournamentList() {
    const navigate = useNavigate();
    const [user] = useState(auth.currentUser);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const unsubscribeTeams = getUserTeams(user.uid, (teams) => {
            if (teams.length > 0) {
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
        <div className="min-h-full flex items-center justify-center pt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 pb-24 lg:pb-8 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        Turnuvalar
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {tournaments.length}
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-1">Takımının katıldığı tüm organizasyonlar.</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-icons-outlined text-gray-400 text-sm">search</span>
                        </span>
                        <input 
                            type="text" 
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#5B4DBC] outline-none shadow-sm"
                            placeholder="Turnuva ara..."
                        />
                    </div>
                </div>
            </div>

            {/* Turnuva Listesi */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((tour) => (
                    <div 
                        key={tour.id} 
                        onClick={() => navigate(`/tournament/${tour.id}`)}
                        className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-[#5B4DBC]/30 cursor-pointer overflow-hidden relative"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B4DBC] to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                                    <span className="material-icons-outlined text-2xl">emoji_events</span>
                                </div>
                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Turnuva
                                </span>
                            </div>
                            
                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#5B4DBC] transition-colors line-clamp-1">
                                {tour.tournamentName}
                            </h3>
                            
                            <div className="flex items-center text-gray-500 text-sm mb-4">
                                <span className="material-icons-outlined text-base mr-1 opacity-70">calendar_today</span>
                                {tour.date || 'Tarih Yok'}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center text-sm font-medium text-gray-600">
                                    <span className="material-icons-outlined text-base mr-1 text-gray-400">sports_score</span>
                                    {tour.matches ? tour.matches.length : 0} Maç
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#5B4DBC] transition-colors">
                                    <span className="material-icons-outlined text-sm text-gray-400 group-hover:text-white">arrow_forward</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Yeni Turnuva Ekle Kartı */}
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-[#5B4DBC] hover:bg-[#5B4DBC]/5 transition-all group min-h-[200px]">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-white transition-colors">
                        <span className="material-icons-outlined text-3xl text-gray-400 group-hover:text-[#5B4DBC]">add</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-500 group-hover:text-[#5B4DBC]">Yeni Turnuva Ekle</h3>
                </div>
            </div>

            {/* MOBİL FAB */}
            <div className="fixed bottom-20 right-4 md:hidden z-30">
                <button className="flex items-center justify-center w-14 h-14 rounded-full bg-[#5B4DBC] text-white shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5B4DBC] transition-transform transform hover:scale-105">
                    <span className="material-icons-outlined text-2xl">add</span>
                </button>
            </div>
        </div>
    );
}
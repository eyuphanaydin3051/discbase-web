import React, { useEffect, useState } from 'react';
import type { Player } from '../types';
import { getPlayerCareerStats } from '../services/repository';

interface Props {
    player: Player;
    teamId: string;
    onClose: () => void;
}

export default function PlayerDetailModal({ player, teamId, onClose }: Props) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const data = await getPlayerCareerStats(teamId, player.id);
            setStats(data);
            setLoading(false);
        };
        fetchStats();
    }, [player.id, teamId]);

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
                {/* Kapatma Butonu */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors z-10"
                >
                    <span className="material-icons-outlined text-gray-800">close</span>
                </button>

                {/* Üst Profil Alanı */}
                <div className="bg-gradient-to-r from-[#5B4DBC] to-[#4a3ea3] p-8 text-white flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full border-4 border-white/30 bg-white/10 flex items-center justify-center text-3xl font-bold">
                        {getInitials(player.name)}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold mb-1">{player.name}</h2>
                        <div className="flex gap-3 text-sm font-medium text-white/80">
                            <span className="bg-white/20 px-3 py-1 rounded-full">#{player.jerseyNumber || '-'}</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">{player.position || 'Cutter'}</span>
                        </div>
                    </div>
                </div>

                {/* İstatistikler */}
                <div className="p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Kariyer İstatistikleri</h3>
                    
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B4DBC]"></div>
                        </div>
                    ) : stats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard label="+/- (Plus/Minus)" value={stats.plusMinus} highlight />
                            <StatCard label="Gol" value={stats.goals} />
                            <StatCard label="Asist" value={stats.assists} />
                            <StatCard label="Blok" value={stats.blocks} />
                            <StatCard label="Oynanan Sayı" value={stats.pointsPlayed} />
                            <StatCard label="Top Kaybı" value={stats.throwaways} />
                            <StatCard label="Drop" value={stats.drops} />
                            <StatCard label="Yak. Yüzdesi" value={`%${stats.catchRate}`} />
                            <StatCard label="Pas Yüzdesi" value={`%${stats.passRate}`} />
                            <StatCard label="O Sayısı" value={stats.oPoints} />
                            <StatCard label="D Sayısı" value={stats.dPoints} />
                        </div>
                    ) : (
                        <p className="text-gray-500">İstatistik bulunamadı.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// İstatistik Kartı Alt Bileşeni
function StatCard({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) {
    return (
        <div className={`p-4 rounded-2xl border ${highlight ? 'bg-[#5B4DBC]/10 border-[#5B4DBC]/30' : 'bg-gray-50 border-gray-100'} flex flex-col items-center justify-center text-center`}>
            <span className={`text-3xl font-bold ${highlight ? 'text-[#5B4DBC]' : 'text-gray-900'}`}>{value}</span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">{label}</span>
        </div>
    );
}
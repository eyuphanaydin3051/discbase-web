import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPlayers, getPlayerCareerStats, getTeamAggregates } from '../services/repository'; // getTeamAggregates eklendi
import type { Player } from '../types';
import EditPlayerModal from '../components/EditPlayerModal'; // Modal import edildi

export default function PlayerDetail() {
    const { t } = useTranslation();
    const { teamId, playerId } = useParams();
    const navigate = useNavigate();

    const [player, setPlayer] = useState<Player | null>(null);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]); // İsim eşleşmesi için tüm oyuncular
    const [stats, setStats] = useState<any>(null);
    const [teamAvgs, setTeamAvgs] = useState<any>(null); // Takım Ortalamaları
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Veri çekme fonksiyonunu dışarı aldık ki güncelleme sonrası tekrar çağırabilelim
    const refreshData = async () => {
        if (!teamId || !playerId) return;
        
        // 1. İstatistikleri çek
        const data = await getPlayerCareerStats(teamId, playerId);
        setStats(data);

        // 2. Takım Ortalamalarını çek
        const avgs = await getTeamAggregates(teamId);
        setTeamAvgs(avgs);
    };

    useEffect(() => {
        if (!teamId || !playerId) return;

        // Oyuncu Listesini Canlı Dinle (Pas ağı isimleri için)
        const unsubscribe = getPlayers(teamId, (fetchedPlayers) => {
            setAllPlayers(fetchedPlayers);
            const foundPlayer = fetchedPlayers.find(p => p.id === playerId);
            setPlayer(foundPlayer || null);
            setLoading(false);
        });

        refreshData();

        return () => unsubscribe();
    }, [teamId, playerId]);

    if (loading || !player) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    // ID'den İsim Bulma Helper'ı
    const getPlayerNameById = (id: string) => {
        const p = allPlayers.find(pl => pl.id === id);
        return p ? p.name.split(" ")[0] : "Bilinmeyen"; // Sadece ilk ismi göster (yer kazanmak için)
    };

    // Pas Dağılımı Hesaplama
    const passNetwork = Object.entries(stats?.passDistribution || {})
        .sort((a, b) => (b[1] as number) - (a[1] as number));
    
    const topPasses = passNetwork.slice(0, 4);
    const positions = [
        "top-0 left-1/2 -translate-x-1/2 flex flex-col items-center", 
        "bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center",
        "right-0 top-1/4 flex items-center", 
        "left-0 top-1/4 flex items-center"
    ];

    return (
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full pb-20">
            {/* Geri Dön Butonu */}
            <button 
                onClick={() => navigate(-1)}
                className="mb-4 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium"
            >
                <span className="material-icons-outlined">arrow_back</span>
                {t('back_to_team', 'Takıma Dön')}
            </button>

            {/* Üst Profil Kartı */}
            <header className="relative mb-8 rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/10">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-90"></div>
                <div className="relative px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* FOTOĞRAF ALANI */}
                        <div className="w-24 h-24 rounded-2xl border-4 border-white/20 bg-white/10 flex items-center justify-center text-3xl font-bold text-white shadow-2xl overflow-hidden">
                            {player.photoUrl ? (
                                <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                                getInitials(player.name)
                            )}
                        </div>
                        <div className="text-white text-center md:text-left">
                            <h1 className="text-3xl font-bold tracking-tight">{player.name}</h1>
                            <p className="text-indigo-100 flex items-center justify-center md:justify-start gap-2 mt-1">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
                                    #{player.jerseyNumber || '-'} • {player.position || 'Cutter'}
                                </span>
                                {player.isCaptain && <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">Kaptan</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {/* DÜZENLE BUTONU */}
                        <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 transition-all px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg"
                        >
                            <span className="material-icons-outlined text-lg">edit</span>
                            <span>{t('btn_edit_profile', 'Düzenle')}</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sol Taraf İstatistikler */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* Verimlilik ve Oyun Süresi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-teal-500/10 text-teal-600 rounded-xl flex items-center justify-center">
                                        <span className="material-icons-outlined">bolt</span>
                                    </div>
                                    <h3 className="font-bold text-slate-500 text-sm uppercase tracking-wider">{t('efficiency_score')}</h3>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-teal-600">{stats?.plusMinus > 0 ? `+${stats?.plusMinus}` : stats?.plusMinus}</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center">
                                    <span className="material-icons-outlined">schedule</span>
                                </div>
                                <h3 className="font-bold text-slate-500 text-sm uppercase tracking-wider">{t('play_time_points')}</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-3xl font-bold">{stats?.pointsPlayed}</span>
                                    <span className="text-xs text-slate-400 uppercase font-bold tracking-widest">{t('total_points')}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
                                    <div className="bg-teal-500" style={{ width: `${(stats?.oPoints / (stats?.pointsPlayed || 1)) * 100}%` }}></div>
                                    <div className="bg-rose-500" style={{ width: `${(stats?.dPoints / (stats?.pointsPlayed || 1)) * 100}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-teal-600">{stats?.oPoints} {t('offense')}</span>
                                    <span className="text-rose-600">{stats?.dPoints} {t('defense')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ana Skor Grid'i (TAKIM ORTALAMASI KIYASLAMALI) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatBox label={t('stat_goals')} value={stats?.goals} avg={teamAvgs?.avgGoals} color="indigo" />
                        <StatBox label={t('stat_assists')} value={stats?.assists} avg={teamAvgs?.avgAssists} color="emerald" />
                        <StatBox label={t('stat_blocks')} value={stats?.blocks} avg={teamAvgs?.avgBlocks} color="purple" />
                        <StatBox label={t('stat_turnovers')} value={stats?.throwaways + stats?.drops} avg={teamAvgs?.avgTurns} color="rose" />
                    </div>

                    {/* Yüzdeler (Catch/Pass Rate) - Aynen Korundu */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ... (Catch Rate Kutusu - Değişiklik Yok) ... */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                             <div className="flex items-center gap-3 mb-6">
                                <span className="material-icons-outlined text-teal-500">front_hand</span>
                                <h3 className="font-bold text-sm uppercase tracking-wider">{t('receiving')}</h3>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-400 text-sm">{t('catch_rate')}</span>
                                <span className="text-2xl font-bold text-teal-600">%{(stats?.catchRate || 0)}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-teal-500" style={{ width: `${stats?.catchRate || 0}%` }}></div>
                            </div>
                        </div>

                        {/* ... (Pass Rate Kutusu - Değişiklik Yok) ... */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                             <div className="flex items-center gap-3 mb-6">
                                <span className="material-icons-outlined text-indigo-500">trending_up</span>
                                <h3 className="font-bold text-sm uppercase tracking-wider">{t('pass_performance')}</h3>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-400 text-sm">{t('success_rate')}</span>
                                <span className="text-2xl font-bold text-indigo-600">%{(stats?.passRate || 0)}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-indigo-500" style={{ width: `${stats?.passRate || 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Taraf - Pas Ağı (Connections) */}
                <div className="lg:col-span-5">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-8">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('pass_network')}</h2>
                                <p className="text-slate-400 text-sm mt-1">{t('pass_network_desc')}</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                                <span className="material-icons-outlined">hub</span>
                            </div>
                        </div>

                        <div className="relative w-full aspect-square mb-10 flex items-center justify-center">
                            {/* Daireler */}
                            <div className="absolute inset-0 border border-slate-100 rounded-full"></div>
                            <div className="absolute inset-[15%] border border-slate-100 rounded-full"></div>
                            <div className="absolute inset-[30%] border border-slate-100 rounded-full"></div>
                            
                            {/* Merkez Oyuncu */}
                            <div className="relative z-10 w-16 h-16 bg-indigo-100 rounded-full border-4 border-indigo-500 flex items-center justify-center text-indigo-700 font-bold text-xl shadow-lg overflow-hidden">
                                {player.photoUrl ? (
                                    <img src={player.photoUrl} className="w-full h-full object-cover" />
                                ) : getInitials(player.name)}
                            </div>

                            {/* Pas Verilen Oyuncular (İSİMLERLE) */}
                            {topPasses.map(([receiverId, count], index) => {
                                const receiverName = getPlayerNameById(receiverId);
                                const receiverPlayer = allPlayers.find(p => p.id === receiverId);
                                return (
                                    <div key={receiverId} className={`absolute ${positions[index]}`}>
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg overflow-hidden">
                                                {receiverPlayer?.photoUrl ? (
                                                    <img src={receiverPlayer.photoUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white text-[10px] font-bold">{getInitials(receiverName)}</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold mt-1 text-slate-600 bg-white/80 px-1 rounded">{receiverName}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('detailed_connections')}</h4>
                            
                            {passNetwork.length > 0 ? passNetwork.map(([receiverId, count]) => {
                                const maxCount = Number(passNetwork[0][1]);
                                const percentage = ((count as number) / maxCount) * 100;
                                const rName = getPlayerNameById(receiverId);
                                
                                return (
                                    <div key={receiverId} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl">
                                        <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs">
                                            {getInitials(rName)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs font-bold mb-1 text-slate-700">
                                                <span>{rName}</span>
                                                <span>{count as number} Pas</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-sm text-slate-500">Henüz pas verisi yok.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* DÜZENLEME MODALI */}
            {isEditModalOpen && player && teamId && (
                <EditPlayerModal 
                    player={player} 
                    teamId={teamId} 
                    onClose={() => setIsEditModalOpen(false)}
                    onUpdate={refreshData}
                />
            )}
        </div>
    );
}

// İstatistik Kutucuğu (Ortalama Göstergeli)
function StatBox({ label, value, avg, color }: { label: string, value: number, avg?: number, color: string }) {
    const getColorClass = (c: string) => {
        const map: any = {
            indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            purple: 'text-purple-600 bg-purple-50 border-purple-100',
            rose: 'text-rose-600 bg-rose-50 border-rose-100',
        };
        return map[c] || map.indigo;
    };

    return (
        <div className={`p-4 rounded-2xl border text-center ${getColorClass(color)}`}>
            <p className={`text-xs font-bold uppercase mb-1 opacity-70`}>{label}</p>
            <p className="text-3xl font-black">{value}</p>
            {avg !== undefined && (
                <p className="text-[10px] mt-1 font-medium opacity-60">
                    Takım Ort: {avg}
                </p>
            )}
        </div>
    );
}
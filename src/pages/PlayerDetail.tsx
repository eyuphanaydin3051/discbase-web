import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPlayers } from '../services/repository';
import { getPlayerCareerStats } from '../services/repository';
import type { Player } from '../types';

export default function PlayerDetail() {
    const { t } = useTranslation();
    const { teamId, playerId } = useParams();
    const navigate = useNavigate();

    const [player, setPlayer] = useState<Player | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!teamId || !playerId) return;

        // Oyuncu bilgisini çek
        const unsubscribe = getPlayers(teamId, (players) => {
            const foundPlayer = players.find(p => p.id === playerId);
            setPlayer(foundPlayer || null);
        });

        // İstatistikleri çek
        const fetchStats = async () => {
            setLoading(true);
            const data = await getPlayerCareerStats(teamId, playerId);
            setStats(data);
            setLoading(false);
        };

        fetchStats();
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

    // Pas Dağılımını sırala (En çoktan en aza)
    const passNetwork = Object.entries(stats?.passDistribution || {})
        .sort((a, b) => (b[1] as number) - (a[1] as number));

    // Görseldeki çizim için max 4 kişi alalım
    const topPasses = passNetwork.slice(0, 4);
    const positions = [
        "top-0 left-1/2 -translate-x-1/2 flex flex-col items-center", // Üst
        "bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center", // Alt
        "right-0 top-1/4 flex items-center", // Sağ
        "left-0 top-1/4 flex items-center" // Sol
    ];

    return (
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full">
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
                        <div className="w-24 h-24 rounded-2xl border-4 border-white/20 bg-white/10 flex items-center justify-center text-3xl font-bold text-white shadow-2xl">
                            {getInitials(player.name)}
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
                        <button className="bg-white/10 hover:bg-white/20 transition-all text-white px-6 py-2.5 rounded-xl flex items-center gap-2 border border-white/10 backdrop-blur-sm shadow-sm">
                            <span className="material-icons-outlined text-lg">file_download</span>
                            <span className="font-medium">{t('btn_export_pdf')}</span>
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
                                    <h3 className="font-bold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">{t('efficiency_score')}</h3>
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
                                <h3 className="font-bold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">{t('play_time_points')}</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-3xl font-bold">{stats?.pointsPlayed}</span>
                                    <span className="text-xs text-slate-400 uppercase font-bold tracking-widest">{t('total_points')}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
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

                    {/* Ana Skor Grid'i */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-center">
                            <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase mb-1">{t('stat_goals')}</p>
                            <p className="text-3xl font-black text-indigo-600 dark:text-indigo-300">{stats?.goals}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                            <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase mb-1">{t('stat_assists')}</p>
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-300">{stats?.assists}</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-500/20 text-center">
                            <p className="text-xs font-bold text-purple-500 dark:text-purple-400 uppercase mb-1">{t('stat_blocks')}</p>
                            <p className="text-3xl font-black text-purple-600 dark:text-purple-300">{stats?.blocks}</p>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-500/20 text-center">
                            <p className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase mb-1">{t('stat_turnovers')}</p>
                            <p className="text-3xl font-black text-rose-600 dark:text-rose-300">{stats?.throwaways + stats?.drops}</p>
                        </div>
                    </div>

                    {/* Yüzdeler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-icons-outlined text-teal-500">front_hand</span>
                                <h3 className="font-bold text-sm uppercase tracking-wider">{t('receiving')}</h3>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-400 text-sm">{t('catch_rate')}</span>
                                <span className="text-2xl font-bold text-teal-600">%{(stats?.catchRate || 0)}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-teal-500" style={{ width: `${stats?.catchRate || 0}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                <span>{stats?.catches} / {stats?.catches + stats?.drops} Başarılı</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-icons-outlined text-indigo-500">trending_up</span>
                                <h3 className="font-bold text-sm uppercase tracking-wider">{t('pass_performance')}</h3>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-400 text-sm">{t('success_rate')}</span>
                                <span className="text-2xl font-bold text-indigo-600">%{(stats?.passRate || 0)}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-indigo-500" style={{ width: `${stats?.passRate || 0}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                <span>{stats?.passes} / {stats?.passes + stats?.throwaways} Başarılı</span>
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

                        {/* Grafik Çemberi */}
                        <div className="relative w-full aspect-square mb-10 flex items-center justify-center">
                            <div className="absolute inset-0 border border-slate-100 dark:border-slate-700 rounded-full"></div>
                            <div className="absolute inset-[15%] border border-slate-100 dark:border-slate-700 rounded-full"></div>
                            <div className="absolute inset-[30%] border border-slate-100 dark:border-slate-700 rounded-full"></div>
                            
                            {/* Merkez Oyuncu */}
                            <div className="relative z-10 w-16 h-16 bg-indigo-100 rounded-full border-4 border-indigo-500 flex items-center justify-center text-indigo-700 font-bold text-xl shadow-lg">
                                {getInitials(player.name)}
                            </div>

                            {/* Dinamik Dış Alıcılar (En fazla 4) */}
                            {topPasses.map(([receiverName, count], index) => (
                                <div key={receiverName} className={`absolute ${positions[index]}`}>
                                    {/* Basit bağlantı çizgisi görünümü CSS */}
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 bg-purple-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                                            <span className="text-white text-[10px] font-bold">{getInitials(receiverName)}</span>
                                        </div>
                                        <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">{receiverName}</span>
                                    </div>
                                </div>
                            ))}
                            {topPasses.length === 0 && (
                                <p className="absolute bottom-10 text-xs text-slate-400">Veri yok</p>
                            )}
                        </div>

                        {/* Detaylı Liste */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t('detailed_connections')}</h4>
                            
                            {passNetwork.length > 0 ? passNetwork.map(([receiverName, count]) => {
                                const maxCount = Number(passNetwork[0][1]);
                                const percentage = ((count as number) / maxCount) * 100;
                                
                                return (
                                    <div key={receiverName} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                                        <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs">
                                            {getInitials(receiverName)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                                                <span>{receiverName}</span>
                                                <span>{count as number} Pas</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-sm text-slate-500">Henüz pas istatistiği kaydedilmemiş.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatch, getMatchEvents, getPlayers } from '../services/repository';
import type { Match, MatchEvent, Player, ComputedMatchPlayerStats } from '../types';

export default function MatchDetail() {
    const { tournamentId, matchId } = useParams<{ tournamentId: string, matchId: string }>();
    const navigate = useNavigate();
    const activeTeamId = localStorage.getItem('activeTeamId');

    const [match, setMatch] = useState<Match | null>(null);
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [rosterPlayers, setRosterPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Oyuncuları çek
    useEffect(() => {
        if (!activeTeamId) return;
        const unsubscribePlayers = getPlayers(activeTeamId, (fetchedPlayers) => {
            setRosterPlayers(fetchedPlayers);
        });
        return () => unsubscribePlayers();
    }, [activeTeamId]);

    // 2. Maç ve Olayları çek
    useEffect(() => {
        if (!matchId || !tournamentId || !activeTeamId) {
            navigate('/teams');
            return;
        }

        getMatch(tournamentId, matchId).then(fetchedMatch => {
            if (!fetchedMatch) {
                navigate('/teams');
                return;
            }
            setMatch(fetchedMatch);
        });

        const unsubscribeEvents = getMatchEvents(tournamentId, matchId, (fetchedEvents) => {
            setEvents(fetchedEvents);
            setLoading(false);
        });

        const safetyTimer = setTimeout(() => setLoading(false), 2000);

        return () => {
            unsubscribeEvents();
            clearTimeout(safetyTimer);
        };
    }, [tournamentId, matchId, activeTeamId, navigate]);

    // 3. Olayları Zenginleştir
    const enrichedEvents = useMemo(() => {
        return events.map(event => {
            const p = rosterPlayers.find(rp => rp.id === event.playerId);
            const sp = rosterPlayers.find(rp => rp.id === event.secondaryPlayerId);
            const player = p ? { ...p, jerseyNumber: p.jerseyNumber ?? undefined } : undefined;
            const secondaryPlayer = sp ? { ...sp, jerseyNumber: sp.jerseyNumber ?? undefined } : undefined;
            return { ...event, player, secondaryPlayer } as MatchEvent;
        });
    }, [events, rosterPlayers]);

    // 4. İstatistik Hesaplama (Oyuncular için)
    const computePlayerStats = (): ComputedMatchPlayerStats[] => {
        const statsMap: { [key: string]: ComputedMatchPlayerStats } = {};

        rosterPlayers.forEach(player => {
            statsMap[player.id] = {
                playerId: player.id,
                name: player.name,
                jerseyNumber: player.jerseyNumber ?? undefined,
                goals: 0, assists: 0, blocks: 0, callahans: 0, completions: 0, drops: 0, throwaways: 0
            };
        });

        if (enrichedEvents.length > 0) {
            enrichedEvents.forEach(event => {
                if (!event.playerId) return;
                const stats = statsMap[event.playerId];
                if (!stats) return;

                switch (event.eventType) {
                    case 'Goal': stats.goals += 1; break;
                    case 'Assist': stats.assists += 1; break;
                    case 'D-Up': stats.blocks += 1; break;
                    case 'Callahan': stats.callahans += 1; break;
                    case 'Completion': stats.completions += 1; break;
                    case 'Drop': stats.drops += 1; break;
                    case 'Throwaway': stats.throwaways += 1; break;
                }
            });
        } 
        else if (match?.pointsArchive) {
            match.pointsArchive.forEach(point => {
                point.stats?.forEach(stat => {
                    const playerStats = statsMap[stat.playerId];
                    if (playerStats) {
                        playerStats.goals += stat.goal || 0;
                        playerStats.assists += stat.assist || 0;
                        playerStats.blocks += stat.block || 0;
                        playerStats.callahans += stat.callahan || 0;
                        playerStats.completions += stat.successfulPass || 0;
                        playerStats.drops += stat.drop || 0;
                        playerStats.throwaways += stat.throwaway || 0;
                    }
                });
            });
        }

        return Object.values(statsMap).sort((a, b) => b.goals + b.assists - (a.goals + a.assists));
    };

    // --- Takım Dinamik İstatistikleri (Düzeltildi) ---
    const computeTeamStats = () => {
        let goals = 0, assists = 0, throwaways = 0, drops = 0;
        
        enrichedEvents.forEach(e => {
            if(e.eventType === 'Goal') goals++;
            if(e.eventType === 'Assist' || e.eventType === 'Completion') assists++;
            if(e.eventType === 'Throwaway') throwaways++;
            if(e.eventType === 'Drop') drops++;
        });

        // Dummy veriler yerine dinamik hesap (Eğer hiç veri yoksa sıfıra düşmesin diye basit bir kontrol var)
        const totalPassAttempts = assists + throwaways + drops;
        const passSuccess = totalPassAttempts > 0 ? Math.round((assists / totalPassAttempts) * 100) : 0;
        const totalPossessions = goals + throwaways + drops;
        const conversionRate = totalPossessions > 0 ? Math.round((goals / totalPossessions) * 100) : 0;

        return {
            passSuccess,
            conversionRate,
            goals
        };
    };

    const teamStats = computeTeamStats();
    const computedStats = computePlayerStats();

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (!match) return <div className="p-8 text-center text-slate-500">Maç bulunamadı.</div>;

    return (
        <div className="p-6 md:p-8 pb-24 lg:pb-8 w-full font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 min-h-screen">
            
            {/* Üst Geri Dönüş ve Aksiyonlar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <span className="material-icons-outlined text-slate-600 dark:text-slate-400">arrow_back</span>
                    </button>
                    <div className="h-16 w-16 bg-gradient-to-br from-violet-600 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <span className="material-icons-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_score</span>
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                            {match.teamNames?.[0] || 'Ev Sahibi'} <span className="text-violet-600 px-2">{match.score?.[0] || 0} - {match.score?.[1] || 0}</span> {match.teamNames?.[1] || match.opponentName || 'Rakip'}
                        </h1>
                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            <span className="flex items-center gap-1"><span className="material-icons-outlined text-sm">schedule</span> Süre: {match.timer || 0}s</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                            <span className="flex items-center gap-1"><span className="material-icons-outlined text-sm">history</span> Devre: {match.period || 1}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-12 gap-6">
                
                {/* Sol Üst: Takım Performansı */}
                <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-icons-outlined text-violet-600">monitoring</span>
                            Takım Performansı
                        </h3>
                        <span className="text-xs font-bold text-violet-600 px-3 py-1 bg-violet-50 dark:bg-violet-900/30 rounded-full uppercase tracking-wider">Canlı İstatistik</span>
                    </div>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-semibold">
                                <span className="text-slate-600 dark:text-slate-400">Hold %</span>
                                <span className="text-violet-600">--%</span> {/* API'de net bir Hold datası loglarda yoksa dummy bırakıldı */}
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-500 rounded-full" style={{ width: '0%' }}></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-semibold">
                                <span className="text-slate-600 dark:text-slate-400">Break %</span>
                                <span className="text-violet-600">--%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }}></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-semibold">
                                <span className="text-slate-600 dark:text-slate-400">Pas Başarısı</span>
                                <span className="text-violet-600">{teamStats.passSuccess}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${teamStats.passSuccess}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Üst: Verimlilik */}
                <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <span className="material-icons-outlined text-emerald-600">bolt</span>
                        Verimlilik
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Gole Dönüşme Oranı</span>
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{teamStats.conversionRate}<span className="text-sm font-medium">%</span></span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Toplam Sayı</span>
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{teamStats.goals}</span>
                        </div>
                        <div className="col-span-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                    <span className="material-icons-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Performans Analizi</p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-500">Pas yüzdesi ve gole dönüşme oranına göre hesaplanır.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alt Sol: Sayı Özeti (Eski Olay Günlüğü) */}
                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-icons-outlined text-violet-600">list_alt</span>
                            Sayı Özeti
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {enrichedEvents.length > 0 ? [...enrichedEvents].reverse().map((event, index) => (
                            <div key={event.id} className="group p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/30 dark:hover:bg-slate-800 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black text-slate-400 dark:text-slate-500">OLAY #{enrichedEvents.length - index}</span>
                                    <div className="flex gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                            event.eventType === 'Goal' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            event.eventType === 'Drop' || event.eventType === 'Throwaway' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                            {event.eventType}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {event.player && (
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-400 text-xs font-bold z-10 overflow-hidden">
                                                    {event.player.photoUrl ? <img src={event.player.photoUrl} alt="" className="w-full h-full object-cover"/> : getInitials(event.player.name)}
                                                </div>
                                                {event.secondaryPlayer && (
                                                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold overflow-hidden">
                                                        {event.secondaryPlayer.photoUrl ? <img src={event.secondaryPlayer.photoUrl} alt="" className="w-full h-full object-cover"/> : getInitials(event.secondaryPlayer.name)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-2">
                                            {event.currentScore?.[0] || 0} - {event.currentScore?.[1] || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 text-slate-400 font-medium">Bu maç için henüz olay kaydedilmedi.</div>
                        )}
                    </div>
                </div>

                {/* Alt Sağ: Oyuncu İstatistikleri */}
                <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-icons-outlined text-violet-600">groups</span>
                            Oyuncu İstatistikleri
                        </h3>
                    </div>
                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-black tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4">Oyuncu</th>
                                    <th className="px-4 py-4 text-center">G</th>
                                    <th className="px-4 py-4 text-center">A</th>
                                    <th className="px-4 py-4 text-center">B</th>
                                    <th className="px-6 py-4 text-right">+/-</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {computedStats.filter(ps => ps.goals + ps.assists + ps.blocks + ps.drops + ps.throwaways > 0).map(ps => {
                                    const plusMinus = (ps.goals + ps.assists + ps.blocks + ps.callahans) - (ps.drops + ps.throwaways);
                                    return (
                                        <tr key={ps.playerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-transparent group-hover:ring-violet-200 dark:group-hover:ring-violet-800 transition-all overflow-hidden flex items-center justify-center text-slate-500 font-bold text-sm">
                                                        {ps.jerseyNumber || getInitials(ps.name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{ps.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{ps.goals}</td>
                                            <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{ps.assists}</td>
                                            <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{ps.blocks}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center justify-center h-8 w-12 rounded-lg font-black text-sm ${
                                                    plusMinus > 0 ? 'bg-emerald-500 text-white' : 
                                                    plusMinus < 0 ? 'bg-rose-500 text-white' : 
                                                    'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                }`}>
                                                    {plusMinus > 0 ? `+${plusMinus}` : plusMinus}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {computedStats.filter(ps => ps.goals + ps.assists + ps.blocks + ps.drops + ps.throwaways > 0).length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">İstatistik verisi bulunamadı.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
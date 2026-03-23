// src/pages/MatchDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatch, getMatchEvents, getPlayers } from '../services/repository';
import type { Match, MatchEvent, Player, ComputedMatchPlayerStats } from '../types';

const eventIcons: { [key: string]: { icon: string, color: string } } = {
    'Goal': { icon: 'sports_kabaddi', color: 'text-green-500' },
    'Assist': { icon: 'handshake', color: 'text-[#5B4DBC]' },
    'D-Up': { icon: 'block', color: 'text-red-500' },
    'Callahan': { icon: 'star', color: 'text-yellow-500' },
    'Drop': { icon: 'thumb_down_alt', color: 'text-pink-500' },
    'Throwaway': { icon: 'wrong_location', color: 'text-orange-500' },
    'Timeout': { icon: 'timer', color: 'text-gray-500' },
};

export default function MatchDetail() {
    const { tournamentId, matchId } = useParams<{ tournamentId: string, matchId: string }>();
    const navigate = useNavigate();
    const activeTeamId = localStorage.getItem('activeTeamId');

    const [match, setMatch] = useState<Match | null>(null);
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [rosterPlayers, setRosterPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'log' | 'stats'>('stats'); // Default istatistik sekmesi

    // DÜZELTME 1: Oyuncuları çekmek için ayrı bir listener (Sonsuz döngüyü önler)
    useEffect(() => {
        if (!activeTeamId) return;
        const unsubscribePlayers = getPlayers(activeTeamId, (fetchedPlayers) => {
            setRosterPlayers(fetchedPlayers);
        });
        return () => unsubscribePlayers();
    }, [activeTeamId]);

    // DÜZELTME 2: Sadece maç ve olay verilerini çeken ana listener
    useEffect(() => {
        if (!matchId || !tournamentId || !activeTeamId) {
            navigate('/teams');
            return;
        }

        // Doğru parametrelerle (tournamentId) maçı çağır
        getMatch(tournamentId, matchId).then(fetchedMatch => {
            if (!fetchedMatch) {
                navigate('/teams');
                return;
            }
            setMatch(fetchedMatch);
        });

        // Doğru parametrelerle (tournamentId) olayları dinle
        const unsubscribeEvents = getMatchEvents(tournamentId, matchId, (fetchedEvents) => {
            setEvents(fetchedEvents);
            setLoading(false);
        });

        // Güvenlik: Her halükarda 2 saniye sonra yükleniyor ekranını kaldır
        const safetyTimer = setTimeout(() => setLoading(false), 2000);

        return () => {
            unsubscribeEvents();
            clearTimeout(safetyTimer);
        };
    }, [tournamentId, matchId, activeTeamId, navigate]);

    // Olayları oyuncu isimleriyle birleştir (Sadece render anında yapılır, döngü yapmaz)
    const enrichedEvents = useMemo(() => {
        return events.map(event => {
            const p = rosterPlayers.find(rp => rp.id === event.playerId);
            const sp = rosterPlayers.find(rp => rp.id === event.secondaryPlayerId);
            const player = p ? { ...p, jerseyNumber: p.jerseyNumber ?? undefined } : undefined;
            const secondaryPlayer = sp ? { ...sp, jerseyNumber: sp.jerseyNumber ?? undefined } : undefined;
            return { ...event, player, secondaryPlayer } as MatchEvent;
        });
    }, [events, rosterPlayers]);

    // DÜZELTME 3: Bitmiş maçlarda istatistikleri pointsArchive üzerinden hesapla
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

        // Canlı maç ise events üzerinden hesapla
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
        // Maç bitmişse ve log silinmişse (Geçmiş maç), kalıcı arşivden (pointsArchive) hesapla
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

    const getTimeString = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#F9F9FB] dark:bg-[#121212]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
            </div>
        );
    }

    if (!match) return <div className="p-8 text-center text-gray-500">Maç bulunamadı.</div>;

    const computedStats = computePlayerStats();

    return (
        <div className="p-4 md:p-8 pb-24 lg:pb-8 w-full max-w-5xl mx-auto">
            {/* Üst Yönlendirme ve Başlık */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 transition-colors">
                    <span className="material-icons-outlined">arrow_back</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maç Detayı</h1>
            </div>

            {/* Skor Paneli */}
            <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8 flex items-center justify-between text-center gap-4">
                <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{match.teamNames?.[0] || 'Ev Sahibi'}</h2>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 px-6 py-4 rounded-2xl">
                    <span className="text-5xl font-extrabold text-[#5B4DBC]">{match.score?.[0] || 0}</span>
                    <span className="text-2xl font-bold text-gray-300">-</span>
                    <span className="text-5xl font-extrabold text-gray-400">{match.score?.[1] || 0}</span>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{match.teamNames?.[1] || match.opponentName || 'Rakip'}</h2>
                </div>
            </div>

            {/* Sekme Seçicisi (Tabs) */}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl mb-8 w-full sm:max-w-md">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-[#1E1E1E] text-[#5B4DBC] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                    <span className="material-icons-outlined text-lg">format_list_numbered</span>
                    İstatistikler
                </button>
                <button
                    onClick={() => setActiveTab('log')}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'log' ? 'bg-white dark:bg-[#1E1E1E] text-[#5B4DBC] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                    <span className="material-icons-outlined text-lg">history</span>
                    Olay Günlüğü
                </button>
            </div>

            {/* İÇERİK BÖLÜMÜ */}
            {activeTab === 'log' ? (
                <div className="space-y-4">
                    {enrichedEvents.length > 0 ? [...enrichedEvents].reverse().map(event => {
                        const eventStyle = eventIcons[event.eventType] || { icon: 'history', color: 'text-gray-500' };
                        return (
                            <div key={event.id} className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4 transition-transform hover:scale-[1.01]">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`h-12 w-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${eventStyle.color}`}>
                                        <span className="material-icons text-2xl">{eventStyle.icon}</span>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {event.description || (
                                                <>
                                                    {event.player ? `${event.player.name} #${event.player.jerseyNumber || ''}` : 'Bir Oyuncu'} {event.eventType} yaptı.
                                                    {event.secondaryPlayer && ` (Asist: ${event.secondaryPlayer.name})`}
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">{getTimeString(event.timestamp ?? Date.now())}</div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <span className={`px-4 py-1.5 text-sm font-bold rounded-xl ${event.eventType === 'Goal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                                        {event.currentScore?.[0] || 0} - {event.currentScore?.[1] || 0}
                                    </span>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-12 text-gray-500 bg-white dark:bg-[#1E1E1E] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                            <span className="material-icons-outlined text-4xl mb-2 opacity-30">history_toggle_off</span>
                            <p>Bu maç için olay günlüğü bulunmuyor.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-5">Oyuncu</th>
                                    <th className="px-6 py-5 text-center text-green-600">Sayı</th>
                                    <th className="px-6 py-5 text-center text-[#5B4DBC]">Asist</th>
                                    <th className="px-6 py-5 text-center text-gray-700 dark:text-gray-300">Blok</th>
                                    <th className="px-6 py-5 text-center text-pink-500">Drop</th>
                                    <th className="px-6 py-5 text-center text-orange-500">T.A</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {computedStats.filter(ps => ps.goals + ps.assists + ps.blocks + ps.drops + ps.throwaways > 0).map(ps => (
                                    <tr key={ps.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[#5B4DBC] font-bold text-sm">
                                                    {ps.jerseyNumber || '??'}
                                                </div>
                                                <div className="font-semibold text-gray-900 dark:text-white">{ps.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-green-500 text-lg">{ps.goals}</td>
                                        <td className="px-6 py-4 text-center font-black text-[#5B4DBC] text-lg">{ps.assists}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-gray-700 dark:text-gray-300">{ps.blocks}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-pink-500">{ps.drops}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-orange-500">{ps.throwaways}</td>
                                    </tr>
                                ))}
                                {computedStats.filter(ps => ps.goals + ps.assists + ps.blocks + ps.drops + ps.throwaways > 0).length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">İstatistik verisi bulunamadı.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
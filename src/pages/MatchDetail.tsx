// --- src/pages/MatchDetail.tsx (YENİ DOSYA) ---
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatch, getMatchEvents, getPlayers } from '../services/repository';
import type { Match, MatchEvent, Player, ComputedMatchPlayerStats } from '../types';

// Olay ikonları için yardımcı harita (Material Icons)
const eventIcons: { [key: string]: { icon: string, color: string } } = {
    'Goal': { icon: 'sports_kabaddi', color: 'text-green-500' }, // Sayı ikonu
    'Assist': { icon: 'handshake', color: 'text-[#5B4DBC]' }, // Asist ikonu
    'D-Up': { icon: 'block', color: 'text-red-500' }, // Blok ikonu
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
    const [rosterPlayers, setRosterPlayers] = useState<Player[]>([]); // Takım oyuncuları (ad ve forma no için)
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'log' | 'stats'>('log'); // Fotoğraftaki gibi sekmeler

    useEffect(() => {
        if (!matchId || !activeTeamId) {
            navigate('/teams'); // Takım seçilmemişse geri gönder
            return;
        }

        // 1. Adım: Maç dokümanını çek
        getMatch(matchId).then(fetchedMatch => {
            if (!fetchedMatch) {
                navigate('/tournaments'); // Maç bulunamazsa geri gönder
                return;
            }
            setMatch(fetchedMatch);
        });

        // 2. Adım: Takımın oyuncularını çek (Olaylarda ad ve no göstermek için)
        const unsubscribePlayers = getPlayers(activeTeamId, (fetchedPlayers) => {
            setRosterPlayers(fetchedPlayers);
        });

        // 3. Adım: Maç olaylarını GERÇEK ZAMANLI dinle (Android startMatchStream)
        const unsubscribeEvents = getMatchEvents(matchId, (fetchedEvents) => {
            // Olayları oyuncu bilgileriyle zenginleştirelim
            const enrichedEvents = fetchedEvents.map(event => {
                const player = rosterPlayers.find(p => p.id === event.playerId);
                const secondaryPlayer = rosterPlayers.find(p => p.id === event.secondaryPlayerId);
                return { ...event, player, secondaryPlayer };
            });
            setEvents(enrichedEvents);
            setLoading(false);
        });

        return () => {
            unsubscribePlayers();
            unsubscribeEvents();
        };
    }, [matchId, activeTeamId, navigate, rosterPlayers]);

    // Olaylardan oyuncu istatistiklerini hesaplama (Android'deki StatsCalculator mantığı)
    const computePlayerStats = (): ComputedMatchPlayerStats[] => {
        const statsMap: { [key: string]: ComputedMatchPlayerStats } = {};

        // Sadece maça katılan takımın oyuncularını istatistik tablosuna ekleyelim
        rosterPlayers.forEach(player => {
            statsMap[player.id] = {
                playerId: player.id,
                name: player.name,
                jerseyNumber: player.jerseyNumber,
                goals: 0, assists: 0, blocks: 0, callahans: 0, completions: 0, drops: 0, throwaways: 0
            };
        });

        // Olayları tek tek dönerek istatistikleri topla
        events.forEach(event => {
            if (!event.playerId) return;
            const stats = statsMap[event.playerId];
            if (!stats) return; // Oyuncu kadroda yoksa istatistiğini tutma (rakip oyuncu vb.)

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

        return Object.values(statsMap).sort((a, b) => b.goals + b.assists - (a.goals + a.assists)); // Sayı+Asist toplamına göre sırala
    }

    const getTimeString = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading || !match) {
        return <div className="p-8 text-center text-gray-500">Maç yükleniyor...</div>;
    }

    const computedStats = computePlayerStats();

    return (
        <div className="p-4 md:p-8 pb-24 lg:pb-8 w-full">
            {/* Üst Skor Paneli - Fotoğraftaki gibi */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8 flex items-center justify-between text-center gap-4">
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{match.teamNames[0] || 'Ev Sahibi'}</h2>
                    <span className="text-sm text-gray-500">Skor</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-5xl font-extrabold text-[#5B4DBC]">{match.score[0]}</span>
                    <span className="text-2xl font-bold text-gray-300">-</span>
                    <span className="text-5xl font-extrabold text-gray-400">{match.score[1]}</span>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{match.teamNames[1] || 'Rakip'}</h2>
                    <span className="text-sm text-gray-500">Süre: {match.timer} sn • Devre: {match.period}</span>
                </div>
            </div>

            {/* Sekme Seçicisi (Tabs) - Fotoğraftaki gibi */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl mb-6 max-w-sm">
                <button
                    onClick={() => setActiveTab('log')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${activeTab === 'log' ? 'bg-[#5B4DBC] text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                    <span className="material-icons-outlined text-lg">view_list</span>
                    Önemli Olaylar
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${activeTab === 'stats' ? 'bg-[#5B4DBC] text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                    <span className="material-icons-outlined text-lg">format_list_numbered</span>
                    Oyuncu İstatistikleri
                </button>
            </div>

            {/* İÇERIK BÖLÜMÜ */}
            {activeTab === 'log' ? (
                /* --- MAÇ GÜNLÜĞÜ (LOG) SEKÜSÜ - Fotoğraftaki gibi --- */
                <div className="space-y-4">
                    {[...events].reverse().map(event => { // En son olayı en üstte göster
                        const eventStyle = eventIcons[event.eventType] || { icon: 'history', color: 'text-gray-500' };
                        
                        return (
                            <div key={event.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center ${eventStyle.color}`}>
                                        <span className="material-icons text-xl">{eventStyle.icon}</span>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {event.description || (
                                                <>
                                                    {event.player ? `${event.player.name} #${event.player.jerseyNumber}` : 'Bir Oyuncu'} {event.eventType} yaptı.
                                                    {event.secondaryPlayer && ` (Asist: ${event.secondaryPlayer.name} #${event.secondaryPlayer.jerseyNumber})`}
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">{getTimeString(event.timestamp)} • Devre: {event.period}</div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${event.eventType === 'Goal' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {event.currentScore[0]} - {event.currentScore[1]}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* --- OYUNCU İSTATİSTİKLERİ SEKÜSÜ (Daha önceki turnuva tablosu tasarımına sadık kalınarak) --- */
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Oyuncu</th>
                                    <th className="px-6 py-4">G</th> {/* Goal */}
                                    <th className="px-6 py-4">A</th> {/* Assist */}
                                    <th className="px-6 py-4">B</th> {/* Block */}
                                    <th className="px-6 py-4">C</th> {/* Callahan */}
                                    <th className="px-6 py-4">Drops</th>
                                    <th className="px-6 py-4">T.A</th> {/* Throwaway */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {computedStats.filter(ps => ps.goals + ps.assists + ps.blocks + ps.drops + ps.throwaways > 0).map(ps => (
                                    <tr key={ps.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[#5B4DBC] font-bold text-xs overflow-hidden">
                                                    {ps.jerseyNumber || '??'}
                                                </div>
                                                <div className="font-medium text-gray-900 dark:text-white">{ps.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-green-500">{ps.goals}</td>
                                        <td className="px-6 py-4 font-bold text-[#5B4DBC]">{ps.assists}</td>
                                        <td className="px-6 py-4">{ps.blocks}</td>
                                        <td className="px-6 py-4">{ps.callahans}</td>
                                        <td className="px-6 py-4 text-pink-500">{ps.drops}</td>
                                        <td className="px-6 py-4 text-orange-500">{ps.throwaways}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
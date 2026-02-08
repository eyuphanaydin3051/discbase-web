import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTournamentMatches, getTournamentPlayers } from '../services/repository';
import LanguageSelector from '../components/LanguageSelector';
import type { TournamentPlayer, Match, MatchEvent } from '../types';

export default function TournamentDetails() {
    const { t } = useTranslation();
    const { teamId, tournamentId } = useParams<{ teamId: string; tournamentId: string }>();
    const navigate = useNavigate();

    // Ham veriler
    const [matches, setMatches] = useState<Match[]>([]);
    const [rawPlayers, setRawPlayers] = useState<TournamentPlayer[]>([]);

    // İşlenmiş (Hesaplanmış) Oyuncu Listesi
    const [calculatedPlayers, setCalculatedPlayers] = useState<TournamentPlayer[]>([]);

    const [loadingMatches, setLoadingMatches] = useState(true);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const [activeTab, setActiveTab] = useState<'matches' | 'stats'>('matches');

    // 1. Verileri Çekme
    useEffect(() => {
        if (!teamId || !tournamentId) return;

        const unsubscribeMatches = getTournamentMatches(teamId, tournamentId, (data) => {
            // Gelen veriyi Match tipine zorla
            setMatches(data as Match[]);
            setLoadingMatches(false);
        });

        const unsubscribePlayers = getTournamentPlayers(teamId, tournamentId, (data) => {
            setRawPlayers(data);
            setLoadingPlayers(false);
        });

        return () => {
            unsubscribeMatches();
            unsubscribePlayers();
        };
    }, [teamId, tournamentId]);

    // 2. İstatistikleri Hesaplama Motoru
    useEffect(() => {
        if (loadingMatches || loadingPlayers || rawPlayers.length === 0) return;

        // Başlangıçta tüm sayaçları sıfırla
        const statsMap: Record<string, TournamentPlayer> = {};

        rawPlayers.forEach(p => {
            statsMap[p.id] = {
                ...p,
                goals: 0,
                assists: 0,
                blocks: 0,
                turnovers: 0,
                matchesPlayed: 0
            };
        });

        // Tüm maçları gez
        matches.forEach(match => {
            // Eğer maçın 'events' (olaylar) listesi varsa oradan say
            if (match.events && Array.isArray(match.events)) {
                // Maçta oynayanları işaretlemek için (basit mantık)
                const playersInThisMatch = new Set<string>();

                match.events.forEach((event: MatchEvent) => {
                    const pid = event.playerId;
                    if (!statsMap[pid]) return; // Oyuncu listede yoksa geç

                    playersInThisMatch.add(pid);

                    if (event.type === 'goal') statsMap[pid].goals! += 1;
                    if (event.type === 'assist') statsMap[pid].assists! += 1;
                    if (event.type === 'block') statsMap[pid].blocks! += 1;
                    if (event.type === 'turnover') statsMap[pid].turnovers! += 1;
                });

                // Maç oynama sayısını artır (Event'i olan oyuncular için)
                playersInThisMatch.forEach(pid => {
                    if (statsMap[pid]) statsMap[pid].matchesPlayed! += 1;
                });
            }

            // ALTERNATİF: Eğer Android uygulaması 'playerStats' diye bir map tutuyorsa:
            else if (match.playerStats) {
                Object.entries(match.playerStats).forEach(([pid, stats]: [string, any]) => {
                    if (!statsMap[pid]) return;
                    statsMap[pid].goals! += (stats.goals || 0);
                    statsMap[pid].assists! += (stats.assists || 0);
                    statsMap[pid].blocks! += (stats.blocks || 0);
                    statsMap[pid].turnovers! += (stats.turnovers || 0);
                    statsMap[pid].matchesPlayed! += 1;
                });
            }
        });

        // Map'i tekrar listeye çevir ve Gol sayısına göre sırala
        const sortedList = Object.values(statsMap).sort((a, b) => (b.goals || 0) - (a.goals || 0));
        setCalculatedPlayers(sortedList);

    }, [matches, rawPlayers, loadingMatches, loadingPlayers]);

    // Yükleniyor Ekranı
    if (loadingMatches && loadingPlayers) return <div className="p-8 text-center">{t('loading')}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mb-6 flex items-center justify-between">
                <button onClick={() => navigate(`/team/${teamId}`)} className="flex items-center text-blue-600 hover:text-blue-800">
                    ← {t('back_to_team')}
                </button>
                <LanguageSelector />
            </div>

            <div className="mx-auto max-w-5xl">
                <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('tournament_matches_title')}</h1>

                {/* Sekmeler */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button onClick={() => setActiveTab('matches')} className={`pb-4 text-lg font-medium transition ${activeTab === 'matches' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t('tab_matches')} ({matches.length})
                        </button>
                        <button onClick={() => setActiveTab('stats')} className={`pb-4 text-lg font-medium transition ${activeTab === 'stats' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t('tab_stats')}
                        </button>
                    </nav>
                </div>

                {/* MAÇLAR */}
                {activeTab === 'matches' && (
                    <div className="space-y-4">
                        {matches.map((match) => {
                            const us = match.scoreUs || 0;
                            const them = match.scoreThem || 0;
                            let resultClass = 'bg-gray-100 text-gray-800';
                            let resultLabel = t('label_draw');
                            if (us > them) { resultClass = 'bg-green-100 text-green-800'; resultLabel = t('label_win'); }
                            else if (us < them) { resultClass = 'bg-red-100 text-red-800'; resultLabel = t('label_loss'); }

                            return (
                                <div key={match.id} className="flex items-center justify-between rounded-lg bg-white p-6 shadow">
                                    <div className="flex flex-col">
                                        <span className="text-lg font-bold text-gray-800">VS. {match.opponentName || t('default_opponent')}</span>
                                        <span className="text-sm text-gray-500">{match.date || t('date_unknown')}</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-xl font-bold">
                                            <span className={us > them ? "text-green-600" : "text-gray-900"}>{us}</span>
                                            <span className="mx-2 text-gray-400">-</span>
                                            <span className={them > us ? "text-red-600" : "text-gray-900"}>{them}</span>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded font-bold ${resultClass}`}>{resultLabel}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {matches.length === 0 && <div className="py-12 text-center text-gray-500 bg-white rounded-lg shadow">{t('no_matches_in_tournament')}</div>}
                    </div>
                )}

                {/* İSTATİSTİKLER */}
                {activeTab === 'stats' && (
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('col_player')}</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">{t('col_goals')}</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">{t('col_assists')}</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">{t('col_blocks')}</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">{t('col_turns')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {calculatedPlayers.map((player) => (
                                        <tr key={player.id} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                                                        {player.jerseyNumber || '#'}
                                                    </div>
                                                    <div className="ml-4 font-medium text-gray-900">{player.name}</div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-bold text-gray-900">{player.goals}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">{player.assists}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">{player.blocks}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">{player.turnovers}</td>
                                        </tr>
                                    ))}
                                    {calculatedPlayers.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">{t('no_stats_data')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
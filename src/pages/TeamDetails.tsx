import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlayers, getTournaments } from '../services/repository';
import type { Player, Tournament } from '../types';
import { useTranslation } from 'react-i18next'; // Import
import LanguageSelector from '../components/LanguageSelector';

export default function TeamDetails() {
    const { t } = useTranslation(); // BU SATIR OLMADIĞI İÇİN HATA ALIYORDUNUZ
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();

    const [players, setPlayers] = useState<Player[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [activeTab, setActiveTab] = useState<'players' | 'tournaments'>('players');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!teamId) return;
        const unsubscribePlayers = getPlayers(teamId, (data) => setPlayers(data));
        const unsubscribeTournaments = getTournaments(teamId, (data) => {
            setTournaments(data);
            setLoading(false);
        });
        return () => { unsubscribePlayers(); unsubscribeTournaments(); };
    }, [teamId]);

    if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mb-6 flex items-center justify-between">
                <button onClick={() => navigate('/')} className="flex items-center text-blue-600 hover:text-blue-800">
                    ← {t('back_to_teams')}
                </button>
                <LanguageSelector />
            </div>

            <div className="mx-auto max-w-5xl">
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button onClick={() => setActiveTab('players')} className={`pb-4 text-lg font-medium transition ${activeTab === 'players' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t('nav_roster')} ({players.length})
                        </button>
                        <button onClick={() => setActiveTab('tournaments')} className={`pb-4 text-lg font-medium transition ${activeTab === 'tournaments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t('nav_tournaments')} ({tournaments.length})
                        </button>
                    </nav>
                </div>

                {activeTab === 'players' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {players.map((player) => (
                            <div key={player.id} className="flex items-center space-x-4 rounded-lg bg-white p-4 shadow">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-600">
                                    {player.jerseyNumber || '#'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{player.name}</h3>
                                    <p className="text-sm text-gray-500">{player.position} - {player.gender}</p>
                                </div>
                            </div>
                        ))}
                        {players.length === 0 && <div className="col-span-full py-8 text-center text-gray-500">{t('no_players')}</div>}
                    </div>
                )}

                {activeTab === 'tournaments' && (
                    <div className="space-y-4">
                        {tournaments.map((tournament) => (
                            <div key={tournament.id} className="flex flex-col justify-between rounded-lg bg-white p-6 shadow sm:flex-row sm:items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{tournament.tournamentName}</h3>
                                    <p className="text-gray-500">{tournament.date} • {tournament.matches?.length || 0} {t('label_match')}</p>
                                </div>
                                <button
                                    onClick={() => navigate(`/team/${teamId}/tournament/${tournament.id}`)}
                                    className="mt-4 rounded bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 sm:mt-0">
                                    {t('btn_view_report')}
                                </button>
                            </div>
                        ))}
                        {tournaments.length === 0 && <div className="py-8 text-center text-gray-500">{t('tour_empty')}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
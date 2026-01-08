import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTournamentMatches } from '../services/repository';
import LanguageSelector from '../components/LanguageSelector';

export default function TournamentDetails() {
    const { t } = useTranslation();
    const { teamId, tournamentId } = useParams<{ teamId: string; tournamentId: string }>();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!teamId || !tournamentId) return;
        const unsubscribe = getTournamentMatches(teamId, tournamentId, (data) => {
            setMatches(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [teamId, tournamentId]);

    if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mb-6 flex items-center justify-between">
                <button onClick={() => navigate(`/team/${teamId}`)} className="flex items-center text-blue-600 hover:text-blue-800">
                    ← {t('back_to_team')}
                </button>
                <LanguageSelector />
            </div>
            <div className="mx-auto max-w-4xl">
                <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('tournament_matches_title')}</h1>
                <div className="space-y-4">
                    {matches.map((match) => {
                        const us = match.ourScore || 0;
                        const them = match.theirScore || 0;
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
            </div>
        </div>
    );
}
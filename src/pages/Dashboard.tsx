import { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { getUserTeams } from '../services/repository';
import type { TeamProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

export default function Dashboard() {
    const { t } = useTranslation();
    const [teams, setTeams] = useState<TeamProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user: User | null) => {
            if (!user) {
                navigate('/login');
                return;
            }
            const unsubscribeTeams = getUserTeams(user.uid, (fetchedTeams) => {
                setTeams(fetchedTeams);
                setLoading(false);
            });
            return () => unsubscribeTeams();
        });
        return () => unsubscribeAuth();
    }, [navigate]);

    const handleLogout = () => {
        auth.signOut();
        navigate('/login');
    };

    if (loading) return <div className="flex h-screen items-center justify-center">{t('loading')}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">{t('team_my_teams')}</h1>
                    <div className="flex items-center space-x-4">
                        <LanguageSelector />
                        <button onClick={handleLogout} className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
                            {t('btn_logout')}
                        </button>
                    </div>
                </div>

                {teams.length === 0 ? (
                    <div className="rounded-lg bg-white p-6 shadow text-center text-gray-500">
                        {t('team_empty_web')}
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {teams.map((team) => (
                            <div key={team.teamId} onClick={() => navigate(`/team/${team.teamId}`)} className="cursor-pointer overflow-hidden rounded-lg bg-white shadow transition hover:shadow-lg">
                                <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <span className="text-4xl font-bold text-white uppercase">{team.teamName.substring(0, 2)}</span>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-xl font-semibold text-gray-900">{team.teamName}</h3>
                                    <p className="mt-1 text-sm text-gray-500">{t('role_label')}: {team.members[auth.currentUser?.uid || ''] || 'Member'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
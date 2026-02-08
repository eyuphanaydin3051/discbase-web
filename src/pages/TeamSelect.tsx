// src/pages/TeamSelect.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Sahte Veri (Takımlar)
const MOCK_TEAMS = [
    { id: '1', name: 'Odtupus', code: 'QNGCdDoJnAYQ4JTk6bq1' },
    { id: '2', name: 'Odtupus 2', code: 'flECWlyZXzZGYvWFx8oU' },
    { id: '3', name: 'GORİLLAS', code: 'qfx8Is0BbrPRM4ImFnc2' },
];

export default function TeamSelect() {
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) navigate('/');
            else setUser(currentUser);
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    // Takıma tıklandığında Dashboard'a git
    const handleTeamSelect = (teamId: string) => {
        // Gerçek uygulamada teamId'yi state'e veya context'e kaydetmelisin
        console.log("Seçilen Takım:", teamId);
        navigate('/dashboard');
    };

    if (!user) return null;

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-sans min-h-screen antialiased">
            {/* HEADER */}
            <header className="w-full bg-card-light dark:bg-card-dark shadow-sm border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">DiscBase Hub</h1>
                    <button onClick={handleLogout} className="text-sm font-medium text-text-sub-light hover:text-primary">
                        Çıkış Yap
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <h2 className="text-3xl font-bold mb-2">Hangi takımı yönetmek istiyorsun?</h2>
                <p className="text-text-sub-light mb-8">Devam etmek için bir takım seç.</p>

                <div className="grid gap-4">
                    {MOCK_TEAMS.map((team) => (
                        <div
                            key={team.id}
                            onClick={() => handleTeamSelect(team.id)}
                            className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-soft border border-transparent hover:border-primary/30 cursor-pointer transition-all hover:shadow-md flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                    {team.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{team.name}</h3>
                                    <p className="text-sm text-text-sub-light">Kod: {team.code}</p>
                                </div>
                            </div>
                            <span className="material-icons-round text-gray-300 group-hover:text-primary transition-colors text-3xl">
                                chevron_right
                            </span>
                        </div>
                    ))}

                    {/* Yeni Takım Ekle Butonu */}
                    <button className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 flex items-center justify-center gap-2 text-text-sub-light hover:border-primary hover:text-primary transition-all">
                        <span className="material-icons-round">add_circle_outline</span>
                        <span className="font-medium">Yeni Takım Oluştur</span>
                    </button>
                </div>
            </main>
        </div>
    );
}
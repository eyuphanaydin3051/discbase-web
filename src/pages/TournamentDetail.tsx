// src/pages/TournamentDetail.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function TournamentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'matches' | 'stats'>('matches');

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 dark:bg-gray-900 dark:text-white">
            <div className="mb-6 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-800 font-medium">
                    ← Geri Dön
                </button>
            </div>

            <div className="mx-auto max-w-5xl">
                <h1 className="mb-2 text-3xl font-bold">Turnuva Detayı</h1>
                <p className="text-gray-500 mb-6">ID: {id}</p>

                {/* Sekmeler */}
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('matches')}
                            className={`pb-4 text-lg font-medium transition ${activeTab === 'matches' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Maçlar
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`pb-4 text-lg font-medium transition ${activeTab === 'stats' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            İstatistikler
                        </button>
                    </nav>
                </div>

                <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
                    {activeTab === 'matches' ? (
                        <p>Henüz maç kaydı bulunamadı.</p>
                    ) : (
                        <p>İstatistik verisi yok.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore'; // Firebase eklentileri
import { db } from '../services/firebase'; // DB importu
import { getPlayers, getTeamAggregates } from '../services/repository';
import type { Player, Match } from '../types';

export default function Dashboard() {
    const navigate = useNavigate();
    
    // Uygulama genelinde seçili olan takımın ID'sini localStorage'dan alıyoruz
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [recentMatches, setRecentMatches] = useState<any[]>([]); // any[] yapıyoruz çünkü içine turnuva tarihi ekleyeceğiz
    const [teamStats, setTeamStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const teamId = localStorage.getItem('selectedTeamId');
        if (teamId) {
            setSelectedTeamId(teamId);
        } else {
            // Takım seçilmemişse TeamSelect sayfasına yönlendir
            navigate('/teams');
        }
    }, [navigate]);

    useEffect(() => {
        if (!selectedTeamId) return;

        // 1. Oyuncuları Çek
        const unsubPlayers = getPlayers(selectedTeamId, (fetchedPlayers) => {
            setPlayers(fetchedPlayers);
        });

        // 2. Alt koleksiyonlardan (sub-collection) Maçları Topla
        const fetchRecentMatches = async () => {
            try {
                // Önce tüm turnuvaları alıyoruz
                const tourSnapshot = await getDocs(collection(db, `teams/${selectedTeamId}/tournaments`));
                let allMatchesTemp: any[] = [];

                // Her turnuvanın içindeki 'matches' klasörüne giriyoruz
                for (const tourDoc of tourSnapshot.docs) {
                    const tourData = tourDoc.data();
                    const matchesSnapshot = await getDocs(collection(db, `teams/${selectedTeamId}/tournaments/${tourDoc.id}/matches`));

                    const matchesData = matchesSnapshot.docs.map(d => ({
                        id: d.id,
                        ...d.data(),
                        tournamentDate: tourData.date // Maçları sıralayabilmek için turnuvanın tarihini miras alıyoruz
                    }));

                    allMatchesTemp = [...allMatchesTemp, ...matchesData];
                }

                // Tarihe göre sırala (En yeni en üstte)
                const sortedMatches = allMatchesTemp.sort((a, b) => {
                    const dateA = a.tournamentDate ? new Date(a.tournamentDate).getTime() : 0;
                    const dateB = b.tournamentDate ? new Date(b.tournamentDate).getTime() : 0;
                    return dateB - dateA; 
                });
                
                setRecentMatches(sortedMatches.slice(0, 4));
            } catch (error) {
                console.error("Maçlar çekilirken hata:", error);
            }
        };

        // 3. Takım İstatistiklerini Çek
        const fetchTeamStats = async () => {
            const stats = await getTeamAggregates(selectedTeamId);
            setTeamStats(stats);
            setLoading(false);
        };

        // Fonksiyonları çalıştır
        fetchRecentMatches();
        fetchTeamStats();

        return () => {
            unsubPlayers();
        };
    }, [selectedTeamId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
            </div>
        );
    }

    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    // Oranların Hesaplanması
    const holdPercentage = 66.7; // Backend eklendiğinde dinamikleştirilecek
    const breakPercentage = 42.9; // Backend eklendiğinde dinamikleştirilecek
    const passSuccess = teamStats && (teamStats.avgAssists + teamStats.avgTurns) > 0 
        ? ((teamStats.avgAssists / (teamStats.avgAssists + teamStats.avgTurns)) * 100).toFixed(1) 
        : 85.3;
    const totalPasses = teamStats ? Math.round(teamStats.avgAssists * players.length * 10) : 895; 
    const totalTurns = teamStats ? Math.round(teamStats.avgTurns * players.length) : 154;

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full pb-24 lg:pb-8">
            {/* Üst Banner */}
            <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#3A1078] to-[#2F58CD] shadow-lg text-white">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-40 h-40 bg-purple-400 opacity-10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Hoş Geldin, Koç! 👋</h1>
                        <p className="text-purple-100 text-lg">Takımının performansı yükselişte.</p>
                        <div className="mt-6 flex flex-wrap gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                                <span className="text-xs uppercase tracking-wider text-purple-200">Toplam Oyuncu</span>
                                <div className="text-2xl font-bold">{players.length}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                                <span className="text-xs uppercase tracking-wider text-purple-200">Görüntülenen Maç</span>
                                <div className="text-2xl font-bold">{recentMatches.length}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sol ve Orta Kolon (Birleşik) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Son Maçlar Listesi */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="material-icons text-[#5B4DBC]">history</span>
                                Son Maçlar
                            </h2>
                            <button onClick={() => navigate('/tournaments')} className="text-sm font-medium text-[#5B4DBC] hover:text-[#4a3ea3] flex items-center gap-1">
                                Tümünü Gör
                                <span className="material-icons text-sm">chevron_right</span>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {recentMatches.length > 0 ? recentMatches.map((match) => {
                                const isWin = match.scoreUs > match.scoreThem;
                                const isDraw = match.scoreUs === match.scoreThem;
                                const resultColor = isWin ? 'border-[#00C4B4] text-[#00C4B4]' : isDraw ? 'border-gray-400 text-gray-500' : 'border-red-500 text-red-500';
                                const resultText = isWin ? 'KAZANDIK' : isDraw ? 'BERABERE' : 'KAYBETTİK';

                                return (
                                    <div key={match.id} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${resultColor.split(' ')[0]} hover:shadow-md transition-shadow cursor-pointer`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <h3 className="font-bold text-lg text-gray-800">vs {match.opponentName}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold ${resultColor.split(' ')[1]} uppercase tracking-wide mt-1`}>{resultText}</span>
                                                    {match.tournamentDate && (
                                                        <span className="text-xs text-gray-400 font-medium mt-1 border-l border-gray-200 pl-2">
                                                            {match.tournamentDate}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className={`block text-2xl font-bold ${resultColor.split(' ')[1]}`}>
                                                        {match.scoreUs} - {match.scoreThem}
                                                    </span>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-[#5B4DBC] hover:text-white transition-colors">
                                                    <span className="material-icons text-sm text-gray-400 hover:text-white">arrow_forward_ios</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
                                    Henüz kayıtlı maç bulunmuyor.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Takım Performans Barları */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="material-icons text-[#5B4DBC]">trending_up</span>
                            Takım Performansı (Ortalama)
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-medium text-gray-500">Hold % (Hücum) - Örnek</span>
                                    <span className="text-lg font-bold text-gray-800">{holdPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3">
                                    <div className="bg-[#00C4B4] h-3 rounded-full" style={{ width: `${holdPercentage}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-medium text-gray-500">Break % (Defans) - Örnek</span>
                                    <span className="text-lg font-bold text-gray-800">{breakPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3">
                                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${breakPercentage}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-medium text-gray-500">Pas Başarısı (Hesaplanan)</span>
                                    <span className="text-lg font-bold text-gray-800">%{passSuccess}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3">
                                    <div className="bg-[#5B4DBC] h-3 rounded-full" style={{ width: `${passSuccess}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sağ Kolon */}
                <div className="space-y-8">
                    
                    {/* Detaylı Analiz Grid'i */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="material-icons text-[#5B4DBC]">analytics</span>
                            Detaylı Analiz
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-purple-50 p-4 rounded-xl flex flex-col justify-between h-32">
                                <span className="text-sm text-gray-500">Tahmini Pas</span>
                                <span className="text-3xl font-bold text-[#5B4DBC]">{totalPasses}</span>
                            </div>
                            <div className="bg-teal-50 p-4 rounded-xl flex flex-col justify-between h-32">
                                <span className="text-sm text-gray-500">Ort. Gol (Kişi)</span>
                                <span className="text-3xl font-bold text-[#00C4B4]">{teamStats?.avgGoals || 0}</span>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl flex flex-col justify-between h-32">
                                <span className="text-sm text-gray-500">Toplam Turn.</span>
                                <span className="text-3xl font-bold text-red-500">{totalTurns}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl flex flex-col justify-between h-32">
                                <span className="text-sm text-gray-500">Kişi Başı Turn.</span>
                                <span className="text-3xl font-bold text-gray-800">{teamStats?.avgTurns || 0}</span>
                            </div>
                        </div>
                    </section>

                    {/* Kadro Özeti */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="material-icons text-[#5B4DBC]">groups</span>
                                Kadro
                            </h2>
                        </div>
                        <div className="space-y-3">
                            {players.slice(0, 4).map((player) => (
                                <div key={player.id} onClick={() => navigate(`/player/${selectedTeamId}/${player.id}`)} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 text-[#5B4DBC] flex items-center justify-center font-bold border-2 border-purple-100 overflow-hidden">
                                        {player.photoUrl ? (
                                            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                                        ) : getInitials(player.name)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{player.name}</p>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{player.position || 'Oyuncu'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => navigate('/roster')} className="w-full mt-4 py-2 text-sm text-[#5B4DBC] font-medium border border-[#5B4DBC]/30 rounded-lg hover:bg-[#5B4DBC] hover:text-white transition-colors">
                            Tüm Kadroyu Gör
                        </button>
                    </section>
                </div>
            </div>
        </main>
    );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

        // 2. Alt koleksiyonlardan (sub-collection) Maçları Topla (API Üzerinden)
        const fetchRecentMatches = async () => {
            try {
                const API_URL = "http://localhost:3000/api";
                
                // Önce backend'den turnuvaları çekiyoruz
                const tourResponse = await fetch(`${API_URL}/teams/${selectedTeamId}/tournaments`);
                const tournaments = await tourResponse.json();
                
                let allMatchesTemp: any[] = [];

                // Her turnuvanın içindeki maçları yine backend üzerinden alıyoruz
                for (const tour of tournaments) {
                    const matchesResponse = await fetch(`${API_URL}/teams/${selectedTeamId}/tournaments/${tour.id}/matches`);
                    const matchesData = await matchesResponse.json();

                    const matchesWithDate = matchesData.map((m: any) => ({
                        ...m,
                        tournamentDate: tour.date // Maçları sıralayabilmek için turnuvanın tarihini miras alıyoruz
                    }));

                    allMatchesTemp = [...allMatchesTemp, ...matchesWithDate];
                }

                // Tarihe göre sırala (En yeni en üstte)
                const sortedMatches = allMatchesTemp.sort((a, b) => {
                    const dateA = a.tournamentDate ? new Date(a.tournamentDate).getTime() : 0;
                    const dateB = b.tournamentDate ? new Date(b.tournamentDate).getTime() : 0;
                    return dateB - dateA; 
                });
                
                setRecentMatches(sortedMatches.slice(0, 4));
            } catch (error) {
                console.error("Maçlar API'den çekilirken hata:", error);
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


    // Firebase'den Gelen Gerçek Performans ve Analiz Verileri
    const holdPercentage = teamStats?.holdPercentage || 0;
    const breakPercentage = teamStats?.breakPercentage || 0;
    const passSuccess = teamStats?.passSuccess || 0;
    const totalPasses = teamStats?.totalPassAttempts || 0;
    const totalTurns = teamStats?.totalTurnovers || 0;
    
    // Verimlilik Analizi Değişkenleri (App ile Birebir)
    const totalMatches = teamStats?.totalMatches || 0;
    const totalPointsPlayed = teamStats?.totalPointsPlayed || 0;
    const cleanHolds = teamStats?.cleanHolds || 0;
    const cleanHoldPercentage = teamStats?.oPoints > 0 ? ((cleanHolds / teamStats.oPoints) * 100).toFixed(1) : 0;
    const avgTurnPerMatch = totalMatches > 0 ? (totalTurns / totalMatches).toFixed(1) : 0;
    
    // Conversion Rate (Sayı Dönüşümü ve Blok Dönüşümü)
    const conversionRate = teamStats?.conversionRate || 0;
    const blockConversionRate = teamStats?.blockConversionRate || 0;
    const totalPossessions = teamStats?.totalPossessions || 0;
    const totalGoals = teamStats?.totalGoals || 0;
    
    // Ekstra string etiketleri
    const oHoldsStr = `${teamStats?.oHolds || 0} / ${teamStats?.oPoints || 0}`;
    const dBreaksStr = `${teamStats?.dBreaks || 0} / ${teamStats?.dPoints || 0}`;
    const blockConversionStr = `${teamStats?.blocksConvertedToGoals || 0} / ${teamStats?.totalBlockPoints || 0}`;
    const passesStr = `${teamStats?.totalPassesCompleted || 0} / ${teamStats?.totalPassAttempts || 0}`;
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
                                <span className="material-icons-outlined text-[#5B4DBC]">history</span>
                                Son Maçlar
                            </h2>
                            <button onClick={() => navigate('/tournaments')} className="text-sm font-medium text-[#5B4DBC] hover:text-[#4a3ea3] flex items-center gap-1">
                                Tümünü Gör
                                <span className="material-icons-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {recentMatches.length > 0 ? recentMatches.map((match) => {
                                const isWin = match.scoreUs > match.scoreThem;
                                const isDraw = match.scoreUs === match.scoreThem;
                                const resultColor = isWin ? 'border-[#00C4B4] text-[#00C4B4]' : isDraw ? 'border-gray-400 text-gray-500' : 'border-red-500 text-red-500';
                                const resultText = isWin ? 'KAZANDIK' : isDraw ? 'BERABERE' : 'KAYBETTİK';

                                return (
                                    <div key={match.id}onClick={() => navigate(`/tournament/${match.tournamentId}/match/${match.id}`)} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${resultColor.split(' ')[0]} hover:shadow-md transition-shadow cursor-pointer`}>
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
                                                    <span className="material-icons-outlined text-sm text-gray-400 hover:text-white">arrow_forward_ios</span>
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

                    {/* Takım Performansı Barları */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="material-icons-outlined text-[#5B4DBC]">trending_up</span>
                            Takım Performansı
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-500">Hold % (Hücum)</span>
                                    <span className="text-lg font-bold text-gray-800">{holdPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                                    <div className="bg-[#00C4B4] h-3 rounded-full" style={{ width: `${holdPercentage}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">{oHoldsStr} pozisyon</p>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-500">Break % (Defans)</span>
                                    <span className="text-lg font-bold text-gray-800">{breakPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${breakPercentage}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">{dBreaksStr} pozisyon</p>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-500">Pas Başarısı</span>
                                    <span className="text-lg font-bold text-gray-800">%{passSuccess}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                                    <div className="bg-[#5B4DBC] h-3 rounded-full" style={{ width: `${passSuccess}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">{passesStr} başarılı pas</p>
                            </div>
                        </div>
                    </section>
                    {/* Verimlilik Analizi Kartı */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="material-icons-outlined text-[#00C4B4]">insights</span>
                            Verimlilik Analizi
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-500">Sayı Dönüşümü (Conversion Rate)</span>
                                    <span className="text-lg font-bold text-gray-800">%{conversionRate}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                                    <div className="bg-[#5B4DBC] h-3 rounded-full" style={{ width: `${conversionRate}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">{totalGoals} / {totalPossessions} hücum pozisyonu (possession) gol oldu</p>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-500">Hatasız Hücum (Clean Hold)</span>
                                    <span className="text-lg font-bold text-gray-800">%{cleanHoldPercentage}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                                    <div className="bg-[#00C4B4] h-3 rounded-full" style={{ width: `${cleanHoldPercentage}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">{cleanHolds} / {teamStats?.oPoints || 0} ofans sayısı turnover olmadan bitirildi</p>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-500">Blok Dönüşümü (Block Conversion)</span>
                                    <span className="text-lg font-bold text-gray-800">%{blockConversionRate}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${blockConversionRate}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">{blockConversionStr} blok yapılan sayılarda golü bulduk</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sağ Kolon */}
                <div className="space-y-8">
                    
                    {/* Detaylı Analiz Grid'i */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="material-icons-outlined text-[#5B4DBC]">analytics</span>
                            Detaylı Analiz
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-purple-50 p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform">
                                <span className="text-sm text-gray-500">Pas Denemesi</span>
                                <span className="text-3xl font-bold text-[#5B4DBC]">{totalPasses}</span>
                            </div>
                            <div className="bg-teal-50 p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform">
                                <span className="text-sm text-gray-500">Başarılı Pas</span>
                                <span className="text-3xl font-bold text-[#00C4B4]">{teamStats?.totalPassesCompleted || 0}</span>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform">
                                <span className="text-sm text-gray-500">Turnover</span>
                                <span className="text-3xl font-bold text-red-500">{totalTurns}</span>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform">
                                <span className="text-sm text-gray-500">Ort. Turn/Maç</span>
                                <span className="text-3xl font-bold text-red-500">{avgTurnPerMatch}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform">
                                <span className="text-sm text-gray-500">Oynanan Sayı</span>
                                <span className="text-3xl font-bold text-gray-800">{totalPointsPlayed}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform">
                                <span className="text-sm text-gray-500">Toplam Maç</span>
                                <span className="text-3xl font-bold text-gray-800">{totalMatches}</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
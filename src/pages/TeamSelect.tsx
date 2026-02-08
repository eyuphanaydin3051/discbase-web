// src/pages/TeamSelect.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, storage } from '../services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserTeams, getPlayers, getTournaments, getTournamentPlayers } from '../services/repository';
import type { TeamProfile, TournamentPlayer } from '../types';

// Genişletilmiş Tip Tanımı
interface ExtendedTournamentPlayer extends TournamentPlayer {
    passDistribution?: Record<string, number>;
    pointsPlayed?: number;
    offensePoints?: number;
    defensePoints?: number;
    catchStat?: number;
    drop?: number;
}

export default function TeamSelect() {
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);
    
    // Veriler
    const [teams, setTeams] = useState<TeamProfile[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtreleme State'leri
    const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    
    // Sekme Kontrolü
    const [activeTab, setActiveTab] = useState<'stats' | 'network'>('stats');

    // Hesaplanan İstatistikler
    const [stats, setStats] = useState({
        goals: 0,
        assists: 0,
        blocks: 0,
        matchesPlayed: 0,
        turnovers: 0,
        pointsPlayed: 0,
        offensePoints: 0,
        defensePoints: 0,
        catchRate: 0,
        totalPasses: 0,
        passNetwork: {} as Record<string, number>
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                navigate('/');
                return;
            }
            setUser(currentUser);
            console.log("Kullanıcı Giriş Yaptı:", currentUser.email);

            // 1. Takımları Çek
            const unsubscribeTeams = getUserTeams(currentUser.uid, (fetchedTeams) => {
                console.log("Çekilen Takımlar:", fetchedTeams);
                setTeams(fetchedTeams);
                
                // 2. İstatistikleri Hesapla
                calculateStats(fetchedTeams, currentUser.email, selectedTeamId);
                setLoading(false);
            });

            return () => unsubscribeTeams();
        });

        return () => unsubscribeAuth();
    }, [navigate]);

    // Filtre değişince yeniden hesapla
    useEffect(() => {
        if (teams.length > 0 && user?.email) {
            calculateStats(teams, user.email, selectedTeamId);
        }
    }, [selectedTeamId, teams, user]);

    const calculateStats = (allTeams: TeamProfile[], userEmail: string | null, teamFilter: string) => {
        if (!userEmail) return;

        // Geçici Değişkenler (Toplamları burada biriktireceğiz)
        let totalGoals = 0;
        let totalAssists = 0;
        let totalBlocks = 0;
        let totalMatches = 0;
        let totalTurnovers = 0;
        let totalPoints = 0;
        let totalOffense = 0;
        let totalDefense = 0;
        let totalCatches = 0;
        let totalDrops = 0;
        let consolidatedPassNetwork: Record<string, number> = {};

        const targetTeams = teamFilter === 'ALL' ? allTeams : allTeams.filter(t => t.teamId === teamFilter);

        targetTeams.forEach(team => {
            getPlayers(team.teamId, (players) => {
                // E-posta ile oyuncuyu bul (Küçük harf duyarlılığı için lowerCase kullanıyoruz)
                const myPlayer = players.find(p => p.email?.toLowerCase() === userEmail.toLowerCase());
                
                if (myPlayer) {
                    console.log(`Takım: ${team.teamName} - Oyuncu Bulundu ID: ${myPlayer.id}`);
                    
                    getTournaments(team.teamId, (tournaments) => {
                        tournaments.forEach(tournament => {
                            getTournamentPlayers(team.teamId, tournament.id, (tPlayers) => {
                                const myStats = tPlayers.find(tp => tp.id === myPlayer.id) as ExtendedTournamentPlayer;
                                
                                if (myStats) {
                                    // Verileri Topla
                                    totalGoals += (myStats.goals || 0);
                                    totalAssists += (myStats.assists || 0);
                                    totalBlocks += (myStats.blocks || 0);
                                    totalMatches += (myStats.matchesPlayed || 0);
                                    totalTurnovers += (myStats.turnovers || 0);
                                    
                                    // Gelişmiş İstatistikler
                                    if (myStats.pointsPlayed) {
                                        totalPoints += myStats.pointsPlayed;
                                        totalOffense += (myStats.offensePoints || 0);
                                        totalDefense += (myStats.defensePoints || 0);
                                    } else {
                                        // Veri yoksa maç başına ortalama varsayım (Görsellik için)
                                        totalPoints += (myStats.matchesPlayed || 0) * 15;
                                    }

                                    totalCatches += (myStats.catchStat || 0);
                                    totalDrops += (myStats.drop || 0);

                                    // Pas Ağı
                                    if (myStats.passDistribution) {
                                        Object.entries(myStats.passDistribution).forEach(([receiver, count]) => {
                                            consolidatedPassNetwork[receiver] = (consolidatedPassNetwork[receiver] || 0) + count;
                                        });
                                    }

                                    // State Güncelleme (Her veri geldiğinde güncelle)
                                    const totalCatchOpportunities = totalCatches + totalGoals + totalDrops;
                                    const calculatedCatchRate = totalCatchOpportunities > 0 
                                        ? Math.round(((totalCatches + totalGoals) / totalCatchOpportunities) * 100) 
                                        : 100;

                                    const totalPasses = Object.values(consolidatedPassNetwork).reduce((a, b) => a + b, 0);

                                    setStats({
                                        goals: totalGoals,
                                        assists: totalAssists,
                                        blocks: totalBlocks,
                                        matchesPlayed: totalMatches,
                                        turnovers: totalTurnovers,
                                        pointsPlayed: totalPoints,
                                        offensePoints: totalOffense,
                                        defensePoints: totalDefense,
                                        catchRate: calculatedCatchRate,
                                        totalPasses: totalPasses,
                                        passNetwork: consolidatedPassNetwork
                                    });
                                }
                            });
                        });
                    });
                } else {
                    console.log(`Takım: ${team.teamName} - Oyuncu EŞLEŞMEDİ. (Aranan: ${userEmail})`);
                }
            });
        });
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    const getPercentage = (val: number, total: number) => {
        return total > 0 ? Math.round((val / total) * 100) : 0;
    };

    // --- LOGO BİLEŞENİ (Firebase Storage Desteğiyle) ---
    const TeamLogo = ({ src, name, size = "md" }: { src?: string | null, name: string, size?: "sm" | "md" }) => {
        const [imageUrl, setImageUrl] = useState<string | null>(null);
        const [error, setError] = useState(false);
        const sizeClasses = size === "sm" ? "w-10 h-10 text-sm" : "w-14 h-14 text-xl";

        useEffect(() => {
            if (src) {
                if (src.startsWith('http')) {
                    setImageUrl(src); // Zaten tam link ise direkt kullan
                } else {
                    // Firebase Storage yolu ise (örn: logos/team1.jpg) URL al
                    getDownloadURL(ref(storage, src))
                        .then((url) => setImageUrl(url))
                        .catch((err) => {
                            console.error("Logo yüklenemedi:", err);
                            setError(true);
                        });
                }
            }
        }, [src]);

        if (imageUrl && !error) {
            return (
                <div className={`${sizeClasses} rounded-full bg-white border border-gray-200 dark:border-gray-700 p-1 flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center`}>
                    <img 
                        src={imageUrl} 
                        alt={name} 
                        className="w-full h-full object-cover rounded-full"
                        onError={() => setError(true)}
                    />
                </div>
            );
        }

        // Resim yoksa veya yüklenemediyse Baş Harf göster
        return (
            <div className={`${sizeClasses} rounded-full bg-stat-bg-purple-light dark:bg-stat-bg-purple-dark border-2 border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm`}>
                {name.charAt(0).toUpperCase()}
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-sans min-h-screen transition-colors duration-300">
            {/* HEADER */}
            <header className="w-full bg-card-light dark:bg-card-dark shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm text-text-muted-light dark:text-text-muted-dark font-medium">Hoş Geldin,</span>
                        <h1 className="text-2xl font-bold text-primary dark:text-white tracking-tight">
                            {user?.displayName || 'Oyuncu'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-text-muted-light dark:text-text-muted-dark hover:text-danger transition-colors font-medium text-sm"
                        >
                            <span>Çıkış Yap</span>
                            <span className="material-icons-round text-lg">logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* SOL KOLON: TAKIMLAR */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                                <span className="material-icons-round text-primary">groups</span>
                                Takımlarım
                            </h2>
                            <div className="flex gap-3">
                                <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95">
                                    <span className="material-icons-round text-lg">add</span>
                                    Yeni Takım
                                </button>
                                <button className="bg-card-light dark:bg-card-dark border border-gray-200 dark:border-gray-700 text-primary hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95">
                                    <span className="material-icons-round text-lg">person_add</span>
                                    Katıl
                                </button>
                            </div>
                        </div>

                        {teams.length === 0 ? (
                            <div className="bg-card-light dark:bg-card-dark p-8 rounded-2xl text-center shadow-soft border border-dashed border-gray-300 dark:border-gray-700">
                                <span className="material-icons-round text-4xl text-gray-300 mb-2">sports_handball</span>
                                <p className="text-text-muted-light">Henüz bir takımın yok.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {teams.map((team) => (
                                    <div 
                                        key={team.teamId}
                                        onClick={() => navigate('/dashboard')}
                                        className="bg-card-light dark:bg-card-dark rounded-2xl p-5 shadow-soft hover:shadow-lg transition-all duration-300 border-l-4 border-primary cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <TeamLogo src={team.logoPath} name={team.teamName} size="md" />
                                                
                                                <div>
                                                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">{team.teamName}</h3>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                                                        {team.members && team.members[user?.uid || ''] === 'admin' ? 'Yönetici' : 'Oyuncu'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="material-icons-round text-gray-300 group-hover:text-primary transition-colors text-3xl">
                                                chevron_right
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SAĞ KOLON: OYUNCU KARİYERİ */}
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                                <span className="material-icons-round text-accent">person</span>
                                Kariyer Özeti
                            </h2>
                            <button className="text-sm text-primary hover:underline font-medium">Tam Profil</button>
                        </div>
                        
                        <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-soft border border-transparent dark:border-gray-800 overflow-hidden flex flex-col h-full">
                            {/* Gradient Header */}
                            <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-icons-round text-9xl">sports_score</span>
                                </div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10 text-2xl font-bold backdrop-blur-sm overflow-hidden">
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            user?.displayName?.charAt(0).toUpperCase() || 'U'
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{user?.displayName || 'İsimsiz Oyuncu'}</h3>
                                        <p className="text-white/80 text-sm font-light">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filtreler */}
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 space-y-3">
                                <div className="relative">
                                    <div 
                                        onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                                        className="bg-background-light dark:bg-background-dark rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div>
                                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-0.5">Takım Filtresi</p>
                                            <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                                                {selectedTeamId === 'ALL' ? 'Tüm Takımlar (Kariyer)' : teams.find(t => t.teamId === selectedTeamId)?.teamName}
                                            </p>
                                        </div>
                                        <span className="material-icons-round text-text-muted-light dark:text-text-muted-dark">arrow_drop_down</span>
                                    </div>
                                    
                                    {isTeamDropdownOpen && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-card-dark rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden">
                                            <div 
                                                onClick={() => { setSelectedTeamId('ALL'); setIsTeamDropdownOpen(false); }}
                                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm font-medium border-b border-gray-100 dark:border-gray-700"
                                            >
                                                Tüm Takımlar
                                            </div>
                                            {teams.map(team => (
                                                <div 
                                                    key={team.teamId}
                                                    onClick={() => { setSelectedTeamId(team.teamId); setIsTeamDropdownOpen(false); }}
                                                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm flex items-center gap-2"
                                                >
                                                    <TeamLogo src={team.logoPath} name={team.teamName} size="sm" />
                                                    {team.teamName}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sekmeler */}
                            <div className="flex border-b border-gray-100 dark:border-gray-700">
                                <button 
                                    onClick={() => setActiveTab('stats')}
                                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'stats' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-muted-light hover:text-text-light'}`}
                                >
                                    İstatistikler
                                </button>
                                <button 
                                    onClick={() => setActiveTab('network')}
                                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'network' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-muted-light hover:text-text-light'}`}
                                >
                                    Pas Ağı
                                </button>
                            </div>

                            {/* İÇERİK ALANI */}
                            <div className="p-6 flex-grow flex flex-col justify-center min-h-[300px]">
                                
                                {activeTab === 'stats' ? (
                                    <>
                                        {/* Oyun Süresi */}
                                        <div className="flex items-center gap-2 mb-6">
                                            <span className="material-icons-round text-primary text-xl">schedule</span>
                                            <h4 className="font-bold text-text-light dark:text-text-dark text-lg">Oyun Süresi (Sayı)</h4>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-4xl font-black text-text-light dark:text-text-dark tracking-tight">{stats.pointsPlayed}</span>
                                                <span className="text-sm text-text-muted-light dark:text-text-muted-dark font-medium mt-1">Toplam</span>
                                            </div>
                                            <div className="flex flex-col items-center border-l border-r border-gray-100 dark:border-gray-700 px-2">
                                                <span className="text-3xl font-bold text-accent">{stats.offensePoints}</span>
                                                <span className="text-sm text-accent font-medium mt-1">Ofans</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-3xl font-bold text-danger">{stats.defensePoints}</span>
                                                <span className="text-sm text-danger font-medium mt-1">Defans</span>
                                            </div>
                                        </div>

                                        {/* Gol & Asist & Blok */}
                                        <div className="grid grid-cols-3 gap-3 mt-6">
                                            <div className="bg-stat-bg-teal-light dark:bg-stat-bg-teal-dark p-3 rounded-xl text-center">
                                                <div className="text-2xl font-bold text-accent">{stats.goals}</div>
                                                <div className="text-xs text-text-muted-light font-medium">Gol</div>
                                            </div>
                                            <div className="bg-stat-bg-purple-light dark:bg-stat-bg-purple-dark p-3 rounded-xl text-center">
                                                <div className="text-2xl font-bold text-primary">{stats.assists}</div>
                                                <div className="text-xs text-text-muted-light font-medium">Asist</div>
                                            </div>
                                            <div className="bg-stat-bg-red-light dark:bg-stat-bg-red-dark p-3 rounded-xl text-center">
                                                <div className="text-2xl font-bold text-danger">{stats.blocks}</div>
                                                <div className="text-xs text-text-muted-light font-medium">Blok</div>
                                            </div>
                                        </div>

                                        {/* Top Kaybı Ekstra */}
                                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex items-center justify-between mt-3">
                                            <span className="text-xs font-bold text-text-muted-light">Top Kaybı</span>
                                            <span className="text-xl font-bold text-text-light dark:text-text-dark">{stats.turnovers}</span>
                                        </div>

                                        {/* Yakalama */}
                                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="material-icons-round text-accent text-xl">pan_tool</span>
                                                <h4 className="font-bold text-text-light dark:text-text-dark">Yakalama (Receiving)</h4>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm text-text-muted-light dark:text-text-muted-dark">Tutuş Yüzdesi</span>
                                                <span className="text-lg font-bold text-text-light dark:text-text-dark">{stats.catchRate}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                <div className="bg-accent h-2 rounded-full" style={{ width: `${stats.catchRate}%` }}></div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Pas Ağı Sekmesi */
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-text-light dark:text-text-dark">En Çok Paslaşılanlar</h4>
                                            <span className="text-xs text-text-muted-light">{stats.totalPasses} Toplam Pas</span>
                                        </div>
                                        
                                        {Object.keys(stats.passNetwork).length === 0 ? (
                                            <div className="text-center py-8 text-text-muted-light">
                                                <span className="material-icons-round text-4xl mb-2 opacity-50">connect_without_contact</span>
                                                <p>Henüz pas verisi bulunmuyor.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                                {Object.entries(stats.passNetwork)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .map(([name, count]) => {
                                                        const percentage = getPercentage(count, stats.totalPasses);
                                                        return (
                                                            <div key={name} className="bg-background-light dark:bg-background-dark p-3 rounded-xl flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-text-muted-light">
                                                                        {name.charAt(0)}
                                                                    </div>
                                                                    <span className="font-medium text-sm text-text-light dark:text-text-dark">{name}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="block font-bold text-primary">{count}</span>
                                                                    <span className="text-xs text-text-muted-light">{percentage}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
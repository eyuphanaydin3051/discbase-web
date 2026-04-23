import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserTeams } from '../services/repository';
import type { TeamProfile } from '../types';

export default function TeamSelect() {
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);
    const [teams, setTeams] = useState<TeamProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // Oturum ve Veri Çekme İşlemleri
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const unsubscribeTeams = getUserTeams(currentUser.uid, (fetchedTeams) => {
                    setTeams(fetchedTeams);
                    setLoading(false);
                });
                return () => unsubscribeTeams();
            } else {
                setLoading(false);
                navigate('/');
            }
        });
        return () => unsubscribeAuth();
    }, [navigate]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-surface transition-colors">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div 
            className="bg-surface transition-colors text-on-surface font-sans min-h-screen flex flex-col"
            style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-primary) 15%, transparent) 0%, transparent 50%), radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-secondary) 10%, transparent) 0%, transparent 50%)' }}
        >
            {/* TopNavBar */}
            <header className="sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-50 flex justify-between items-center w-full px-6 py-4 bg-surface-container-lowest/40 backdrop-blur-xl border-b border-outline-variant/20">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-black tracking-tighter text-primary drop-shadow-[0_0_8px_var(--color-primary)] font-sans">Discbase</span>
                </div>
                <nav className="hidden md:flex gap-8">
                    <a className="text-primary font-bold border-b-2 border-primary pb-1 font-sans tracking-tight" href="#">Takımlar</a>
                </nav>
                <div className="flex items-center gap-4">
                    <button onClick={handleLogout} className="text-primary hover:bg-surface-container-highest/50 hover:backdrop-blur-md transition-all duration-300 p-2 rounded-lg active:scale-95 flex items-center gap-2">
                        <span className="font-semibold text-sm hidden md:block">Çıkış Yap</span>
                        <span className="material-icons-outlined">logout</span>
                    </button>
                    {user?.photoURL ? (
                        <img alt="User profile photo" className="w-8 h-8 rounded-full border border-outline-variant/20" src={user.photoURL} />
                    ) : (
                        <div className="w-8 h-8 rounded-full border border-outline-variant/20 bg-surface-container-high flex items-center justify-center text-on-surface font-bold">
                            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                    )}
                </div>
            </header>

            {/* Main Layout */}
            <main className="flex-1 flex flex-col md:flex-row gap-6 p-6 max-w-[1440px] mx-auto w-full">
                {/* Left Section: My Teams */}
                <section className="flex-1 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <h1 className="font-sans text-[32px] font-semibold text-on-surface">Takımlarım</h1>
                        <div className="flex gap-4">
                            <button className="bg-surface-container-low/60 backdrop-blur-md border border-primary/30 px-4 py-2 rounded-lg text-primary hover:bg-surface-container-highest/50 transition-colors flex items-center gap-2">
                                <span className="material-icons-outlined text-sm">add</span>
                                <span className="font-sans text-[12px] font-semibold tracking-wider uppercase">Yeni Takım</span>
                            </button>
                            <button className="bg-primary/20 text-primary border border-primary px-4 py-2 rounded-lg hover:bg-primary/30 transition-colors flex items-center gap-2 shadow-glow">
                                <span className="material-icons-outlined text-sm">group_add</span>
                                <span className="font-sans text-[12px] font-semibold tracking-wider uppercase">Katıl</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        {teams.map((team) => (
                            <div key={team.teamId} onClick={() => { localStorage.setItem('selectedTeamId', team.teamId); navigate('/dashboard'); }} className="bg-surface-container-low/60 backdrop-blur-md border border-outline-variant/20 rounded-xl p-4 flex items-center justify-between group hover:border-primary/50 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center font-sans font-bold text-[20px]">
                                        {team.teamName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-sans font-semibold text-[20px] text-on-surface mb-1">{team.teamName}</h3>
                                        <div className="flex gap-2 items-center">
                                            <span className="bg-surface-container-highest px-2 py-0.5 rounded font-sans text-[12px] font-semibold text-on-surface-variant">
                                                {(user && team.members && team.members[user.uid]) ? team.members[user.uid] : 'Üye'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-error hover:opacity-80 p-2" onClick={(e) => { e.stopPropagation(); /* Ayrılma mantığı eklenebilir */ }}>
                                        <span className="material-icons-outlined">delete</span>
                                    </button>
                                    <button className="text-primary hover:text-primary-container p-2">
                                        <span className="material-icons-outlined">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {teams.length === 0 && (
                            <div className="text-center py-10 bg-surface-container-low/60 backdrop-blur-md rounded-xl border-2 border-dashed border-outline-variant/20">
                                <span className="material-icons-outlined text-4xl text-on-surface-variant mb-2">groups</span>
                                <p className="text-on-surface-variant font-medium">Henüz bir takımınız yok.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Section: Player Career */}
                <aside className="w-full md:w-80 flex flex-col gap-6">
                    <div className="glass-card glass-card-highlight p-6">
                        <h2 className="font-sans font-semibold text-[24px] text-on-surface mb-6 relative z-10">Oyuncu Kariyeri</h2>
                        
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-primary text-primary flex items-center justify-center font-sans font-bold text-[28px] shadow-glow">
                                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <h3 className="font-sans text-[16px] text-on-surface font-semibold">{user?.displayName || 'Kullanıcı'}</h3>
                                <p className="font-sans text-[12px] font-semibold tracking-wider text-on-surface-variant mt-1 uppercase">ID: #{user?.uid.substring(0, 4) || '8924'}</p>
                            </div>
                        </div>

                        <div className="flex border-b border-outline-variant/20 mb-6 relative z-10">
                            <button className="px-4 py-2 text-primary border-b-2 border-primary font-sans text-[12px] font-semibold uppercase tracking-wider">İstatistikler</button>
                            <button className="px-4 py-2 text-on-surface-variant hover:text-on-surface transition-colors font-sans text-[12px] font-semibold uppercase tracking-wider">Bağlantılar</button>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <h4 className="font-sans text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Oyun Süresi</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-surface-container/50 p-2 rounded-lg text-center border border-outline-variant/20">
                                        <div className="text-primary font-sans font-bold text-[20px]">0</div>
                                        <div className="font-sans text-[10px] font-semibold text-on-surface-variant mt-1 uppercase">Toplam</div>
                                    </div>
                                    <div className="bg-surface-container/50 p-2 rounded-lg text-center border border-outline-variant/20">
                                        <div className="text-secondary font-sans font-bold text-[20px]">0</div>
                                        <div className="font-sans text-[10px] font-semibold text-on-surface-variant mt-1 uppercase">Ofans</div>
                                    </div>
                                    <div className="bg-surface-container/50 p-2 rounded-lg text-center border border-outline-variant/20">
                                        <div className="text-tertiary font-sans font-bold text-[20px]">0</div>
                                        <div className="font-sans text-[10px] font-semibold text-on-surface-variant mt-1 uppercase">Defans</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-sans text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Yakalama</h4>
                                <div className="bg-surface-container/50 p-4 rounded-lg border border-outline-variant/20">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="font-sans text-[14px] text-on-surface">Tutuş Yüzdesi</span>
                                        <span className="font-sans font-bold text-[24px] text-primary">0%</span>
                                    </div>
                                    <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary to-secondary w-[5%] rounded-full shadow-glow"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
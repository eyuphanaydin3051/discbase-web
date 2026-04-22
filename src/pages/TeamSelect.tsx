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
        <div className="min-h-screen flex items-center justify-center bg-[#051424]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#bc13fe]"></div>
        </div>
    );

    return (
        <div className="bg-[#051424] text-[#d4e4fa] font-['Inter'] min-h-screen flex flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(188,19,254,0.15)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(0,241,253,0.1)_0%,transparent_50%)]">
            {/* TopNavBar */}
            <header className="sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-50 flex justify-between items-center w-full px-6 py-4 bg-slate-950/40 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-black tracking-tighter text-[#bc13fe] drop-shadow-[0_0_8px_rgba(188,19,254,0.6)] font-['Inter']">Discbase</span>
                </div>
                <nav className="hidden md:flex gap-8">
                    <a className="text-[#bc13fe] font-bold border-b-2 border-[#bc13fe] pb-1 font-['Inter'] tracking-tight" href="#">Takımlar</a>
                </nav>
                <div className="flex items-center gap-4">
                    <button onClick={handleLogout} className="text-[#bc13fe] hover:bg-white/5 hover:backdrop-blur-md transition-all duration-300 p-2 rounded-lg active:scale-95 flex items-center gap-2">
                        <span className="font-semibold text-sm hidden md:block">Çıkış Yap</span>
                        <span className="material-icons-outlined">logout</span>
                    </button>
                    {user?.photoURL ? (
                        <img alt="User profile photo" className="w-8 h-8 rounded-full border border-white/20" src={user.photoURL} />
                    ) : (
                        <div className="w-8 h-8 rounded-full border border-white/20 bg-[#1c2b3c] flex items-center justify-center text-white font-bold">
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
                        <h1 className="font-['Inter'] text-[32px] font-semibold text-[#d4e4fa]">Takımlarım</h1>
                        <div className="flex gap-4">
                            <button className="bg-[#0d1c2d]/60 backdrop-blur-md border border-[#ebb2ff]/30 px-4 py-2 rounded-lg text-[#ebb2ff] hover:bg-white/5 transition-colors flex items-center gap-2">
                                <span className="material-icons-outlined text-sm">add</span>
                                <span className="font-['Inter'] text-[12px] font-semibold tracking-wider uppercase">Yeni Takım</span>
                            </button>
                            <button className="bg-[#ebb2ff]/20 text-[#ebb2ff] border border-[#ebb2ff] px-4 py-2 rounded-lg hover:bg-[#ebb2ff]/30 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(188,19,254,0.3)]">
                                <span className="material-icons-outlined text-sm">group_add</span>
                                <span className="font-['Inter'] text-[12px] font-semibold tracking-wider uppercase">Katıl</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        {teams.map((team) => (
                            <div key={team.teamId} onClick={() => { localStorage.setItem('selectedTeamId', team.teamId); navigate('/dashboard'); }} className="bg-[#0d1c2d]/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-[#ebb2ff]/50 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#bc13fe]/20 border border-[#ebb2ff] text-[#ebb2ff] flex items-center justify-center font-['Inter'] font-bold text-[20px]">
                                        {team.teamName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-['Inter'] font-semibold text-[20px] text-[#d4e4fa] mb-1">{team.teamName}</h3>
                                        <div className="flex gap-2 items-center">
                                            <span className="bg-[#273647] px-2 py-0.5 rounded font-['Inter'] text-[12px] font-semibold text-[#d4c0d7]">
                                                {(user && team.members && team.members[user.uid]) ? team.members[user.uid] : 'Üye'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-[#ffb4ab] hover:text-[#ffdad6] p-2" onClick={(e) => { e.stopPropagation(); /* Ayrılma mantığı eklenebilir */ }}>
                                        <span className="material-icons-outlined">delete</span>
                                    </button>
                                    <button className="text-[#ebb2ff] hover:text-[#f8d8ff] p-2">
                                        <span className="material-icons-outlined">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {teams.length === 0 && (
                            <div className="text-center py-10 bg-[#0d1c2d]/60 backdrop-blur-md rounded-xl border-2 border-dashed border-white/10">
                                <span className="material-icons-outlined text-4xl text-gray-500 mb-2">groups</span>
                                <p className="text-gray-400 font-medium">Henüz bir takımınız yok.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Section: Player Career */}
                <aside className="w-full md:w-80 flex flex-col gap-6">
                    <div className="bg-[#0d1c2d]/60 backdrop-blur-md border border-white/10 rounded-xl p-6 relative overflow-hidden">
                        {/* Corner Highlights */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#dcfdff]"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#dcfdff]"></div>
                        
                        <h2 className="font-['Inter'] font-semibold text-[24px] text-[#d4e4fa] mb-6">Oyuncu Kariyeri</h2>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-[#1c2b3c] border-2 border-[#ebb2ff] text-[#ebb2ff] flex items-center justify-center font-['Inter'] font-bold text-[28px] shadow-[0_0_20px_rgba(188,19,254,0.2)]">
                                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <h3 className="font-['Inter'] text-[16px] text-[#d4e4fa] font-semibold">{user?.displayName || 'Kullanıcı'}</h3>
                                <p className="font-['Inter'] text-[12px] font-semibold tracking-wider text-[#d4c0d7] mt-1 uppercase">ID: #{user?.uid.substring(0, 4) || '8924'}</p>
                            </div>
                        </div>

                        <div className="flex border-b border-white/10 mb-6">
                            <button className="px-4 py-2 text-[#ebb2ff] border-b-2 border-[#ebb2ff] font-['Inter'] text-[12px] font-semibold uppercase tracking-wider">İstatistikler</button>
                            <button className="px-4 py-2 text-[#d4c0d7] hover:text-[#d4e4fa] transition-colors font-['Inter'] text-[12px] font-semibold uppercase tracking-wider">Bağlantılar</button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="font-['Inter'] text-[12px] font-semibold text-[#d4c0d7] uppercase tracking-wider mb-3">Oyun Süresi</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-[#122131]/50 p-2 rounded-lg text-center border border-white/5">
                                        <div className="text-[#ebb2ff] font-['Inter'] font-bold text-[20px]">0</div>
                                        <div className="font-['Inter'] text-[10px] font-semibold text-[#d4c0d7] mt-1 uppercase">Toplam</div>
                                    </div>
                                    <div className="bg-[#122131]/50 p-2 rounded-lg text-center border border-white/5">
                                        <div className="text-[#dcfdff] font-['Inter'] font-bold text-[20px]">0</div>
                                        <div className="font-['Inter'] text-[10px] font-semibold text-[#d4c0d7] mt-1 uppercase">Ofans</div>
                                    </div>
                                    <div className="bg-[#122131]/50 p-2 rounded-lg text-center border border-white/5">
                                        <div className="text-[#e1e0fb] font-['Inter'] font-bold text-[20px]">0</div>
                                        <div className="font-['Inter'] text-[10px] font-semibold text-[#d4c0d7] mt-1 uppercase">Defans</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-['Inter'] text-[12px] font-semibold text-[#d4c0d7] uppercase tracking-wider mb-3">Yakalama</h4>
                                <div className="bg-[#122131]/50 p-4 rounded-lg border border-white/5">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="font-['Inter'] text-[14px] text-[#d4e4fa]">Tutuş Yüzdesi</span>
                                        <span className="font-['Inter'] font-bold text-[24px] text-[#ebb2ff]">0%</span>
                                    </div>
                                    <div className="h-1 w-full bg-[#1c2b3c] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-[#ebb2ff] to-[#dcfdff] w-[5%] rounded-full shadow-[0_0_10px_rgba(188,19,254,0.5)]"></div>
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
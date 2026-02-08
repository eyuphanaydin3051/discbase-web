import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';

export default function Layout() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/');
    };

    // Linklerin aktif/pasif durumuna göre stil belirleme
    const getLinkClass = ({ isActive }: { isActive: boolean }) => {
        const baseClass = "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group";
        const activeClass = "bg-[#5B4DBC]/10 text-[#5B4DBC] font-bold shadow-sm ring-1 ring-[#5B4DBC]/20";
        const inactiveClass = "text-gray-500 hover:bg-gray-50 hover:text-[#5B4DBC] font-medium";
        return `${baseClass} ${isActive ? activeClass : inactiveClass}`;
    };

    return (
        <div className="min-h-screen bg-[#F9F9FB] font-sans flex text-[#1F2937]">
            
            {/* --- SIDEBAR (Masaüstü) --- */}
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden lg:flex flex-col fixed h-full z-20">
                <div className="h-20 flex items-center px-8 border-b border-gray-200 gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5B4DBC] to-[#2F58CD] flex items-center justify-center text-white shadow-md">
                        <span className="material-icons-outlined text-xl">sports_handball</span>
                    </div>
                    <h1 className="text-xl font-bold text-[#5B4DBC] tracking-tight">DiscBase</h1>
                </div>
                
                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    <div className="mb-6">
                        <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ana Menü</h3>
                        <div className="space-y-1">
                            <NavLink to="/dashboard" className={getLinkClass}>
                                <span className="material-icons-outlined text-[22px]">dashboard</span>
                                <span>Panel</span>
                            </NavLink>
                            <NavLink to="/tournaments" className={getLinkClass}>
                                <span className="material-icons-outlined text-[22px]">emoji_events</span>
                                <span>Turnuvalar</span>
                            </NavLink>
                            <NavLink to="/roster" className={getLinkClass}>
                                <span className="material-icons-outlined text-[22px]">groups</span>
                                <span>Kadro</span>
                            </NavLink>
                            <NavLink to="/team-select" className={getLinkClass}>
                                <span className="material-icons-outlined text-[22px]">fitness_center</span>
                                <span>İdman</span>
                            </NavLink>
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-medium">
                        <span className="material-icons-outlined text-[22px]">logout</span>
                        <span>Çıkış Yap</span>
                    </button>
                </div>
            </aside>

            {/* --- ANA İÇERİK ALANI --- */}
            <main className="flex-1 lg:ml-64 w-full">
                <Outlet />
            </main>

            {/* --- MOBİL MENÜ --- */}
            <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe z-30">
                <div className="flex justify-around items-center h-16 px-2">
                    <NavLink to="/dashboard" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-[#5B4DBC]' : 'text-gray-400 hover:text-[#5B4DBC]'}`}>
                        <span className="material-icons-outlined">dashboard</span>
                        <span className="text-[10px] font-medium mt-1">Panel</span>
                    </NavLink>
                    <NavLink to="/tournaments" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-[#5B4DBC]' : 'text-gray-400 hover:text-[#5B4DBC]'}`}>
                        <span className="material-icons-outlined">emoji_events</span>
                        <span className="text-[10px] font-medium mt-1">Turnuva</span>
                    </NavLink>
                    <NavLink to="/roster" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-[#5B4DBC]' : 'text-gray-400 hover:text-[#5B4DBC]'}`}>
                        <span className="material-icons-outlined">groups</span>
                        <span className="text-[10px] font-medium mt-1">Kadro</span>
                    </NavLink>
                    <NavLink to="/team-select" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-[#5B4DBC]' : 'text-gray-400 hover:text-[#5B4DBC]'}`}>
                        <span className="material-icons-outlined">fitness_center</span>
                        <span className="text-[10px] font-medium mt-1">İdman</span>
                    </NavLink>
                </div>
            </div>
        </div>
    );
}
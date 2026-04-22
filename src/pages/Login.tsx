import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';
import logo from '../../discbaselogopng.png';

export default function Login() {
    const navigate = useNavigate();

    // Google ile Giriş Fonksiyonu
    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // Başarılı giriş sonrası Dashboard'a git
            navigate('/teams');
        } catch (error: any) {
            console.error("Giriş Hatası:", error);
            alert("Giriş yapılırken bir hata oluştu: " + error.message);
        }
    };

    return (
        <div className="bg-[#051424] text-[#d4e4fa] min-h-screen flex items-center justify-center relative overflow-hidden antialiased selection:bg-[#bc13fe] selection:text-white">
            {/* Top Right Buttons */}
            <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
                <button className="text-[#bc13fe] hover:bg-white/5 backdrop-blur-sm transition-all duration-300 p-2 rounded-lg active:scale-95 flex items-center justify-center group" title="Dil Seçenekleri">
                    <span className="material-icons-outlined group-hover:drop-shadow-[0_0_8px_rgba(188,19,254,0.6)]">language</span>
                </button>
                <button onClick={() => navigate('/settings')} className="text-[#bc13fe] hover:bg-white/5 backdrop-blur-sm transition-all duration-300 p-2 rounded-lg active:scale-95 flex items-center justify-center group" title="Ayarlar">
                    <span className="material-icons-outlined group-hover:drop-shadow-[0_0_8px_rgba(188,19,254,0.6)]">settings</span>
                </button>
            </div>

            {/* Atmospheric Background */}
            <div className="absolute inset-0 z-0">
                <img alt="Discbase system backdrop" className="w-full h-full object-cover opacity-70 scale-100" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5p2Urlra2uqqVutErrq7nd-ZZkP3X14UaTEQ0p6zGHDph1GUWgL7uMYpwFX3IkOKjzBY4wKtsn4DH6Zndjeb3xNRuUXR55oScbKAl9Z6iO9-4ic1ynCuChXQ7TQortI21olZBU0uvxCmzWy3M1KUWCwqYLiejEfY5PxIACn1pCW1FhLhi5JbUznTQchLos-fA1c4fhghuSi4NHp0WaIGW6HsDRpCYZ7OfaprmT95KkIRCat48h0x_nxBYYvF7DYXCREV5UhpN4z4" />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/70 via-fuchsia-900/40 to-[#051424]/20 backdrop-blur-[2px]"></div>
            </div>

            {/* Decorative Cybernetic Grid Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
                <div className="absolute top-0 left-[10%] w-[1px] h-full bg-gradient-to-b from-transparent via-[#ebb2ff] to-transparent"></div>
                <div className="absolute top-0 right-[20%] w-[1px] h-full bg-gradient-to-b from-transparent via-[#dcfdff] to-transparent"></div>
                <div className="absolute top-[30%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#c5c4df] to-transparent"></div>
            </div>

            {/* Main Login Card Container */}
            <main className="relative z-10 w-full max-w-[440px] px-6">
                {/* Glassmorphism Card */}
                <div className="relative bg-[#010f1f]/60 backdrop-blur-2xl border border-white/10 rounded-xl p-10 shadow-[0_0_50px_rgba(188,19,254,0.15),inset_0_0_20px_rgba(255,255,255,0.05)] overflow-hidden">
                    {/* Corner Highlights (Secondary Color) */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#dcfdff]/50 rounded-tl-xl pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#dcfdff]/50 rounded-br-xl pointer-events-none"></div>

                    {/* Card Header */}
                    <div className="text-center mb-10 flex flex-col items-center">
                        <div className="w-30 h-30 rounded-full bg-[#273647]/50 border-2 border-[#ebb2ff]/40 shadow-[0_0_30px_rgba(188,19,254,0.3)] flex items-center justify-center mb-6 relative overflow-hidden">
                            <img src={logo} alt="Discbase Logo" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="font-['Inter'] text-[48px] leading-[1.1] font-bold text-white tracking-tighter drop-shadow-[0_0_12px_rgba(188,19,254,0.6)] mb-2">Discbase</h1>
                    </div>

                    {/* Authentication Form Area */}
                    <div className="space-y-6">
                        {/* Google Sign-in Button */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full cursor-pointer relative group overflow-hidden rounded bg-[#051424]/40 border border-[#9d8ba0]/30 hover:border-[#bc13fe] transition-all duration-300 py-4 px-6 flex items-center justify-center gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                        >
                            {/* Hover Bloom Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#bc13fe]/0 via-[#bc13fe]/10 to-[#bc13fe]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                            {/* Inner Glow Border */}
                            <div className="absolute inset-0 border border-white/5 rounded pointer-events-none"></div>
                            {/* Google Logo SVG */}
                            <div className="bg-white p-1 rounded-sm relative z-10">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                                </svg>
                            </div>
                            <span className="font-['Inter'] text-[16px] text-white relative z-10 font-semibold tracking-wide">Sign in with Google</span>
                        </button>

                        {/* Secure Connection Note */}
                        <div className="flex items-center justify-center gap-2 mt-8 opacity-50">
                            <svg className="w-3 h-3 text-[#dcfdff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                            <span className="font-['Inter'] text-[10px] font-semibold text-[#c5c4df] tracking-widest uppercase">End-to-end encrypted datalink</span>
                        </div>
                    </div>

                    {/* Subtle base line */}
                    <div className="absolute bottom-0 left-[10%] w-[80%] h-[1px] bg-gradient-to-r from-transparent via-[#ebb2ff]/30 to-transparent"></div>
                </div>
            </main>
        </div>
    );
}
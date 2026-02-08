// src/pages/Login.tsx
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';

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
        <div className="bg-slate-50 min-h-screen w-full flex flex-col md:flex-row font-sans text-slate-900">
            {/* SOL TARAF: Marka ve Görsel Alanı */}
            <div className="relative w-full md:w-1/2 min-h-[40vh] md:h-screen bg-gradient-to-br from-[#3A1078] to-[#2F58CD] flex flex-col justify-center items-center p-8 md:p-16 text-white overflow-hidden">

                {/* Arka Plan Efektleri */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"></path>
                            </pattern>
                        </defs>
                        <rect fill="url(#grid)" height="100%" width="100%"></rect>
                    </svg>
                </div>

                {/* İçerik */}
                <div className="relative z-10 max-w-lg text-center md:text-left flex flex-col items-center md:items-start">
                    <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 tracking-tight drop-shadow-sm">
                        Takımının İstatistiklerini <br className="hidden md:block" />
                        <span className="text-indigo-200">Profesyonelce Yönet.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-indigo-100 font-light opacity-90 max-w-md mx-auto md:mx-0">
                        DiscBase ile maç analizlerini yap, oyuncu performanslarını takip et ve şampiyonluğa giden yolda verileri kullan.
                    </p>
                </div>
            </div>

            {/* SAĞ TARAF: Giriş Formu */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
                <div className="w-full max-w-md space-y-8 flex flex-col justify-center">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                            DiscBase
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Hesabınıza erişmek için giriş yapın
                        </p>
                    </div>

                    <div className="mt-8 bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-100">
                        {/* GOOGLE BUTONU */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-2xl shadow-sm bg-white hover:bg-slate-50 transition-all duration-200 cursor-pointer group"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                                Google ile Giriş Yap
                            </span>
                        </button>

                        <div className="relative mt-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500">veya</span>
                            </div>
                        </div>

                        <p className="mt-6 text-center text-xs text-slate-500">
                            Hesabınız yok mu? <span className="font-medium text-indigo-600">Giriş yapınca otomatik oluşur.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
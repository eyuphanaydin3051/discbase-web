import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NameFormat } from '../types';

export default function Setting() {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    
    // Web'e Özel Öneri: Klavye Kısayolları Durumu
    const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
    const [nameFormat, setNameFormat] = useState<NameFormat>('FULL_NAME');

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <button onClick={() => navigate(-1)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2 font-medium transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Geri Dön
                        </button>
                        <h1 className="text-4xl font-bold tracking-tight">Ayarlar</h1>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* SOL SÜTUN: Genel & Görünüm */}
                    <div className="md:col-span-2 space-y-6">
                        {/* DİL & TEMA */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5a18.022 18.022 0 01-3.827-5.806m6.3 5.806a18.023 18.023 0 003.473-5.806m-6.3 5.806V11m0 0a5.997 5.997 0 01-4.705-2.295M12 11a5.997 5.997 0 004.705-2.295M12 11V3" />
                                </svg>
                                Genel Tercihler
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Uygulama Dili</span>
                                    <select 
                                        value={i18n.language} 
                                        onChange={(e) => changeLanguage(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option value="tr">Türkçe</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* İSİM FORMATI (Android Analizinden) */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h2 className="text-lg font-semibold mb-4">İsim Formatı</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'FULL_NAME' as NameFormat, label: 'Ad Soyad', sample: 'Eyüphan Aydın' },
                                    { id: 'FIRST_NAME_LAST_INITIAL' as NameFormat, label: 'Ad S.', sample: 'Eyüphan A.' },
                                    { id: 'INITIAL_LAST_NAME' as NameFormat, label: 'A. Soyad', sample: 'E. Aydın' },
                                ].map((format) => (
                                    <button
                                        key={format.id}
                                        onClick={() => setNameFormat(format.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${nameFormat === format.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <p className="text-sm font-bold text-slate-800">{format.label}</p>
                                        <p className="text-xs text-slate-500 mt-1 italic">{format.sample}</p>
                                    </button>
                                ))}
                            </div>
                        </section>
                        
                        {/* WEB ÖZEL: KLAVYE KISAYOLLARI */}
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold">Klavye Kısayolları</h2>
                                <p className="text-sm text-slate-500">Maç takibi sırasında hızlı veri girişi (G: Gol, T: Turn vb.)</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={shortcutsEnabled} onChange={() => setShortcutsEnabled(!shortcutsEnabled)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </section>
                    </div>

                    {/* SAĞ SÜTUN: Veri & Yedekleme */}
                    <div className="space-y-6">
                        <section className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg">
                            <h2 className="text-lg font-bold mb-2">Veri Yönetimi</h2>
                            <p className="text-indigo-100 text-sm mb-6">İstatistiklerini JSON veya CSV formatında dışa aktarabilirsin.</p>
                            <div className="space-y-3">
                                <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all border border-white/20 text-sm">
                                    Yedek İndir (JSON)
                                </button>
                                <button className="w-full py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold transition-all text-sm">
                                    Excel Olarak Dışa Aktar (CSV)
                                </button>
                            </div>
                        </section>

                        <div className="p-6 bg-slate-100 rounded-2xl text-center">
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">DiscBase Web</p>
                            <p className="text-sm text-slate-500 mt-1 font-medium">v1.2.2 - 2025</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
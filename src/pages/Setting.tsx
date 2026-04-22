import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NameFormat, EfficiencyCriterion, StatType } from '../types';

export default function Setting() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    
    // State Yönetimi (Persistence - Yerel Depolama)
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
    const [nameFormat, setNameFormat] = useState<NameFormat>((localStorage.getItem('nameFormat') as NameFormat) || 'FULL_NAME');
    const [shortcutsEnabled, setShortcutsEnabled] = useState(localStorage.getItem('shortcuts') !== 'false');
    const [captureMode, setCaptureMode] = useState(localStorage.getItem('captureMode') || 'SIMPLE');
    
    // Verimlilik Kriterleri State
    const [criteria, setCriteria] = useState<EfficiencyCriterion[]>(JSON.parse(localStorage.getItem('efficiencyCriteria') || '[]'));
    const [isAddingCriteria, setIsAddingCriteria] = useState(false);

    // Tema Değiştirme Fonksiyonu
    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        const root = window.document.documentElement;
        const isDark = newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };

    // Sayfa yüklendiğinde temayı uygula
    useEffect(() => {
        handleThemeChange(theme);
    }, []);

    // Ayar Değiştirme Fonksiyonları
    const handleNameFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value as NameFormat;
        setNameFormat(value);
        localStorage.setItem('nameFormat', value);
    };

    const handleShortcutsToggle = () => {
        const newValue = !shortcutsEnabled;
        setShortcutsEnabled(newValue);
        localStorage.setItem('shortcuts', newValue.toString());
    };

    const handleCaptureModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setCaptureMode(value);
        localStorage.setItem('captureMode', value);
    };

    const handleCsvExport = () => {
        // İleride global statelerden veya backend'den çekilen verilerle CSV doldurulacak.
        const csvContent = "data:text/csv;charset=utf-8,ID,Oyuncu Adi,Istatistik,Deger\n1,Ornek Oyuncu,Gol,1";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `discbase_istatistik_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Yedekleme (JSON Export)
    const handleBackup = () => {
        const data = { criteria, nameFormat, shortcutsEnabled, captureMode };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `discbase_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    // Veri İçe Aktarma (JSON Import)
    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.criteria) setCriteria(data.criteria);
                alert("Yedek başarıyla yüklendi!");
            } catch (err) {
                alert("Geçersiz yedek dosyası.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans text-slate-900 dark:text-slate-100 transition-colors">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <button onClick={() => navigate(-1)} className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 mb-2 font-medium">
                            ← {t('common.back', 'Geri')}
                        </button>
                        <h1 className="text-4xl font-bold tracking-tight">{t('settings.title', 'Ayarlar')}</h1>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        
                        {/* TEMA SEÇİMİ */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <h2 className="text-lg font-semibold mb-4">{t('settings.theme', 'Görünüm')}</h2>
                            <div className="flex gap-4">
                                {['light', 'dark', 'system'].map((tMode) => (
                                    <button 
                                        key={tMode}
                                        onClick={() => handleThemeChange(tMode)}
                                        className={`px-4 py-2 rounded-lg border capitalize transition-all ${theme === tMode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-600'}`}
                                    >
                                        {tMode}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* DİL SEÇİMİ */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="font-semibold">Dil / Language</span>
                            <select 
                                value={i18n.language} 
                                onChange={(e) => i18n.changeLanguage(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2"
                            >
                                <option value="tr">Türkçe</option>
                                <option value="en">English</option>
                            </select>
                        </section>

                        {/* GÖRÜNÜM VE ARAYÜZ (İsim Formatı) */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="font-semibold">İsim Formatı</span>
                                <span className="text-xs text-slate-500">Geniş tablolarda oyuncu isimlerinin gösterim şekli.</span>
                            </div>
                            <select 
                                value={nameFormat} 
                                onChange={handleNameFormatChange}
                                className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2"
                            >
                                <option value="FULL_NAME">Eyüphan Aydın</option>
                                <option value="INITIAL_LAST">E. Aydın</option>
                                <option value="FIRST_INITIAL">Eyüphan A.</option>
                            </select>
                        </section>

                        {/* VERİ GİRİŞ SEÇENEKLERİ (Mod ve Kısayollar) */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                            <h2 className="text-lg font-semibold mb-2">Veri Giriş Seçenekleri</h2>
                            
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="font-semibold">Mod Seçimi</span>
                                    <span className="text-xs text-slate-500">Canlı maç verisi girmek için (Web / Tablet).</span>
                                </div>
                                <select 
                                    value={captureMode} 
                                    onChange={handleCaptureModeChange}
                                    className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2"
                                >
                                    <option value="SIMPLE">Basit Mod (Özet)</option>
                                    <option value="ADVANCED">Gelişmiş Mod (Detaylı)</option>
                                </select>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col">
                                    <span className="font-semibold">Klavye Kısayolları</span>
                                    <span className="text-xs text-slate-500">Hızlı veri girişi için (Örn: G = Gol, T = Turn).</span>
                                </div>
                                <button 
                                    onClick={handleShortcutsToggle}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${shortcutsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shortcutsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </section>

                        {/* VERİMLİLİK KRİTERLERİ (Admin Paneli Mantığı) */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Verimlilik Ayarları (+/-)</h2>
                                <button 
                                    onClick={() => setIsAddingCriteria(true)}
                                    className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700"
                                >
                                    + Kriter Ekle
                                </button>
                            </div>
                            <div className="space-y-2">
                                {criteria.length === 0 && <p className="text-sm text-slate-500 italic">Henüz bir puanlama kuralı eklenmedi.</p>}
                                {criteria.map(c => (
                                    <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                                        <span>{c.name} <span className="text-xs text-slate-500">({c.statType})</span></span>
                                        <div className="flex items-center gap-4">
                                            <span className={`font-bold ${c.points >= 0 ? 'text-green-500' : 'text-red-500'}`}>{c.points > 0 ? '+' : ''}{c.points}</span>
                                            <button onClick={() => setCriteria(criteria.filter(x => x.id !== c.id))} className="text-red-400">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* SAĞ SÜTUN: VERİ & DOSYA İŞLEMLERİ */}
                    <div className="space-y-6">
                        <section className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg">
                            <h2 className="text-lg font-bold mb-4">Veri & Yedekleme</h2>
                            <div className="space-y-3">
                                <button onClick={handleBackup} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-sm transition-all">
                                    JSON Yedek Al
                                </button>
                                <label className="block w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-sm text-center cursor-pointer transition-all">
                                    Yedek Yükle
                                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                                </label>
                                {/* DİL SEÇİMİ */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="font-semibold">Dil / Language</span>
                            <select 
                                value={i18n.language} 
                                onChange={(e) => i18n.changeLanguage(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2"
                            >
                                <option value="tr">Türkçe</option>
                                <option value="en">English</option>
                            </select>
                        </section>

                        {/* GÖRÜNÜM VE ARAYÜZ (İsim Formatı) */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="font-semibold">İsim Formatı</span>
                                <span className="text-xs text-slate-500">Geniş tablolarda oyuncu isimlerinin gösterim şekli.</span>
                            </div>
                            <select 
                                value={nameFormat} 
                                onChange={handleNameFormatChange}
                                className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2"
                            >
                                <option value="FULL_NAME">Eyüphan Aydın</option>
                                <option value="INITIAL_LAST">E. Aydın</option>
                                <option value="FIRST_INITIAL">Eyüphan A.</option>
                            </select>
                        </section>

                        {/* VERİ GİRİŞ SEÇENEKLERİ (Mod ve Kısayollar) */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                            <h2 className="text-lg font-semibold mb-2">Veri Giriş Seçenekleri</h2>
                            
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="font-semibold">Mod Seçimi</span>
                                    <span className="text-xs text-slate-500">Canlı maç verisi girmek için (Web / Tablet).</span>
                                </div>
                                <select 
                                    value={captureMode} 
                                    onChange={handleCaptureModeChange}
                                    className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2"
                                >
                                    <option value="SIMPLE">Basit Mod (Özet)</option>
                                    <option value="ADVANCED">Gelişmiş Mod (Detaylı)</option>
                                </select>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col">
                                    <span className="font-semibold">Klavye Kısayolları</span>
                                    <span className="text-xs text-slate-500">Hızlı veri girişi için (Örn: G = Gol, T = Turn).</span>
                                </div>
                                <button 
                                    onClick={handleShortcutsToggle}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${shortcutsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shortcutsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </section>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
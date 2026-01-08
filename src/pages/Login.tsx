import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

export default function Login() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err: any) {
            setError(t('login_error') + err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/');
        } catch (err: any) {
            setError(t('google_login_error') + err.message);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 relative">
            <div className="absolute top-4 right-4">
                <LanguageSelector />
            </div>

            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
                    {t('login_title')}
                </h2>
                {error && <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('label_email')}</label>
                        <input type="email" className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('label_password')}</label>
                        <input type="password" className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                        {t('btn_login')}
                    </button>
                </form>
                <div className="mt-6">
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500">{t('or')}</span>
                    </div>
                    <button onClick={handleGoogleLogin} className="mt-4 flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                        {t('btn_google_login')}
                    </button>
                </div>
            </div>
        </div>
    );
}
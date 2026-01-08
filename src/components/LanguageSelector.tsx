import { useTranslation } from 'react-i18next';

export default function LanguageSelector() {
    const { i18n } = useTranslation();

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
    };

    return (
        <div className="flex space-x-2">
            <button
                onClick={() => changeLanguage('tr')}
                className={`px-3 py-1 rounded border text-sm transition ${i18n.language === 'tr'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
            >
                TR
            </button>
            <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded border text-sm transition ${i18n.language === 'en'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
            >
                EN
            </button>
        </div>
    );
}
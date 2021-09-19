import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import germanLocale from './de-DE.json';
import englishLocale from './en-US.json';
import frenchLocale from './fr-FR.json';

i18n.on('languageChanged', (lang) => {
    localStorage.setItem('currentLang', lang);
});
const getLang = () => localStorage.getItem('currentLang') || '';
i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources: {
            'en-US': {
                translation: englishLocale,
            },
            'de-DE': {
                translation: germanLocale,
            },
            'fr-FR': {
                translation: frenchLocale,
            },
        },
        keySeparator: '/',
        lng: getLang() ? getLang() : 'de-DE',
        fallbackLng: 'de-DE',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;

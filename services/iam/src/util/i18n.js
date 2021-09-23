
const DEFAULT_LANG = 'en';

const supportedLanguages = {
    de: 'de',
    en: 'en',
};

module.exports = {
    DEFAULT_LANG,

    getClientLanguage: (acceptedLanguages) => {
        const hit = acceptedLanguages.find((elem) => supportedLanguages[elem.toLowerCase().substr(0, 2)]);
        if (hit) {
            return hit.toLowerCase().substr(0, 2);
        } else {
            return DEFAULT_LANG;
        }
    },

};

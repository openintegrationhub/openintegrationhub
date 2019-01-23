module.exports = {

    removeEmptyProps: (obj) => {

        /* eslint-disable-next-line no-restricted-syntax  */
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] === undefined) {
                delete obj[key];
            }
        }
        return obj;
    },
};


const iterator = (obj, func) => {
    Object.keys(obj).forEach((k) => {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            return iterator(obj[k], func);
        }
        if (typeof obj[k] === 'string') {
            obj[k] = func(obj[k]);
        }
    });
};

const maskString = (string = '') => {
    const regex = string.length < 10 ? /./g : /.(?=.{4,}$)/g;

    return string.replace(regex, '*');
};

module.exports = {

    maskString,

    maskSecret: (val) => {
        if (typeof val === 'object' && val !== null) {
            const copy = { ...val };
            iterator(copy, maskString);
            return copy;
        }
        return maskString(val);
    },

};

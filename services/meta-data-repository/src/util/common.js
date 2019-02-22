
module.exports = {

    maskString: string => (string ? string.replace(/.(?=.{4,}$)/g, '*') : ''),

};

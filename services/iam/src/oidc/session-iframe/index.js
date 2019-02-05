const pug = require('pug');
const path = require('path');

module.exports = (debug, cookieBase) => pug.renderFile(path.join(`${__dirname}/index.pug`), {
    debug,
    cookieBase,
}); 


const fs = require('fs');
const path = require('path');

const modelFolder = path.join(__dirname);

module.exports = function() {
    fs.readdirSync(modelFolder).forEach((file) => {
        if (file.match(/\.js/) && !file.match(/\.test/)) {
            const name = file.replace('.js', '');
            require(`${modelFolder}/${name}`); // eslint-disable-line global-require
        }
    });
};

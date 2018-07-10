const fs = require('fs');
const path = require('path');

const nodemonEnv = '.nodemon-env';
const nodemonPath = '../../nodemon.json';

const iterateEnvs = (callback) => {
    const { env } = JSON.parse(fs.readFileSync(path.join(__dirname, nodemonPath), 'utf-8'));
    Object.entries(env).forEach((key) => {
        callback(key[0], key[1]);
    });
};

const applyToProcessEnv = () => {
    iterateEnvs((key, value) => {
        if (!process.env[key]) {
            process.env[key] = value;
        }
    });
};

const saveToFile = () => {
    fs.writeFileSync(nodemonEnv, '');
    iterateEnvs((key, value) => {
        fs.appendFileSync(nodemonEnv, `${key}=${value}\n`);
    });
};

module.exports.apply = applyToProcessEnv;
module.exports.saveToFile = saveToFile;

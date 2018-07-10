const Logger = require('@basaas/node-logger');
const conf = require('../../conf');
const fs = require('fs');
const path = require('path');
const { createKeyStore } = require('oidc-provider');

const keystore = createKeyStore();

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/keystore`, {
    level: 'debug',
});

const keyStorePath = conf.oidc.keystorePath || path.join(__dirname, '../../../', 'keystore/keystore.json');

const generate = async (keySize) => {

    try {

        await Promise.all([
            keystore.generate('RSA', keySize, {
                kid: 'sig-rs-0',
                use: 'sig',
            }),
            keystore.generate('RSA', keySize, {
                kid: 'enc-rs-0',
                use: 'enc',
            }),
            keystore.generate('EC', 'P-256', {
                kid: 'sig-ec2-0',
                use: 'sig',
            }),
            keystore.generate('EC', 'P-256', {
                kid: 'enc-ec2-0',
                use: 'enc',
            }),
            keystore.generate('EC', 'P-384', {
                kid: 'sig-ec3-0',
                use: 'sig',
            }),
            keystore.generate('EC', 'P-384', {
                kid: 'enc-ec3-0',
                use: 'enc',
            }),
            keystore.generate('EC', 'P-521', {
                kid: 'sig-ec5-0',
                use: 'sig',
            }),
            keystore.generate('EC', 'P-521', {
                kid: 'enc-ec5-0',
                use: 'enc',
            }),
        ]);

    } catch (err) {
        log.error(err);
    }

    return keystore.toJSON(true);
};

module.exports.getKeystore = async () => {
    await module.exports.generateFile();
    return require(keyStorePath);
};

module.exports.generateFile = async (keySize) => {

    const keystoreDir = path.dirname(keyStorePath);

    if (!fs.existsSync(keystoreDir)) {
        log.info(`Creating keystore dir ${keystoreDir}`);
        fs.mkdirSync(keystoreDir);
    }

    if (!fs.existsSync(keyStorePath)) {
        log.info(`Creating keystore file ${keyStorePath}`);
        const keystore = await generate(keySize);
        return fs.writeFileSync(keyStorePath, JSON.stringify(keystore), 'utf8');
    }

};

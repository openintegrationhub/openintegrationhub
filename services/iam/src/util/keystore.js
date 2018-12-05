const Logger = require('@basaas/node-logger');
const fs = require('fs');
const path = require('path');
const jose = require('node-jose');
const conf = require('../conf/index');

const { JWK: { createKeyStore } } = jose;

const keystore = createKeyStore();

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/keystore`, {
    level: 'debug',
});

const keyStorePath = conf.oidc.keystorePath || path.join(__dirname, '../../', 'keystore/keystore.json');

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

module.exports.deleteKeystore = () => {

    try {
        fs.unlinkSync(path.join(keyStorePath));
    } catch (err) {
        log.error(err);
        return false;
    }

    return true;

};

module.exports.getKeystoreFile = async () => {
    await module.exports.generateFile();
    return require(keyStorePath);
};

module.exports.getKeystore = async () => {
    const keystoreFile = await module.exports.getKeystoreFile();
    return jose.JWK.asKeyStore(keystoreFile.keys);
};

module.exports.getKeystoreAsJSON = async () => {

    const _keystore = await module.exports.getKeystore();
    return _keystore.toJSON();
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

module.exports.getRsaKeys = async () => {
    const keystore = await module.exports.getKeystore();
    // console.log(keystore.toJSON(true))
    return keystore.get({ kty: 'RSA', use: 'sig' });
};

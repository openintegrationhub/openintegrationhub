const fs = require('fs');
const path = require('path');
/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
const forge = require('node-forge');

const CERTIFICATES = {
    'public': 'dev.cert.pem',
    'private': 'dev.key.pem',
};

const createSelfSignedCertificates = () => {
    console.log('Generating key-pair...');
    const keys = forge.pki.rsa.generateKeyPair(2048);
    console.log('Key-pair created.');

    console.log('Creating self-signed certificate...');
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    const attrs = [{
        name: 'commonName',
        value: 'example.org',
    }, {
        name: 'countryName',
        value: 'DE',
    }, {
        shortName: 'ST',
        value: 'Berlin',
    }, {
        name: 'localityName',
        value: 'Berlin',
    }, {
        name: 'organizationName',
        value: 'OIH',
    }, {
        shortName: 'OU',
        value: 'Test',
    }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([{
        name: 'basicConstraints',
        cA: true, /*,
  pathLenConstraint: 4*/
    }, {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
    }, {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true,
    }, {
        name: 'nsCertType',
        client: true,
        server: true,
        email: true,
        objsign: true,
        sslCA: true,
        emailCA: true,
        objCA: true,
    }, {
        name: 'subjectAltName',
        altNames: [{
            type: 6, // URI
            value: 'http://example.org/webid#me',
        }, {
            type: 7, // IP
            ip: '127.0.0.1',
        }],
    }, {
        name: 'subjectKeyIdentifier',
    }]);
    // FIXME: add authorityKeyIdentifier extension

    // self-sign certificate
    cert.sign(keys.privateKey/*, forge.md.sha256.create()*/);
    console.log('Certificate created.');

    // PEM-format keys and cert

    return {
        privateKey: forge.pki.privateKeyToPem(keys.privateKey),
        publicKey: forge.pki.publicKeyToPem(keys.publicKey),
        certificate: forge.pki.certificateToPem(cert),
    };
};

if (!fs.existsSync(path.join(__dirname, CERTIFICATES.public))) {
    console.info(`Creating Public / Private key pair in ${__dirname}`);
    const pem = createSelfSignedCertificates();
    fs.writeFileSync(path.join(__dirname, CERTIFICATES.public), pem.certificate);
    fs.writeFileSync(path.join(__dirname, CERTIFICATES.private), pem.privateKey);
}


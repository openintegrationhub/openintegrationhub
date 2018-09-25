const Logger = require('@basaas/node-logger');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const request = require('request-promise');
const log = Logger.getLogger(`iam-middleware`);
const CONF = require('./conf');

log.info('iam-middleware config', CONF);

const client = jwksClient({
    strictSsl: true,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 3600 * 1000 * 2, // 2h in ms
    jwksUri: CONF.getJwksUri()
});

const getKey = (header, callback) =>{
    client.getSigningKey(header.kid, (err, key) => {
        let signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
};

const decodeHeader = (token) => {
    const tokenBlocks = token.split('.');
    if(tokenBlocks.length !== 3) {
        throw new Error('Invalid token. Token does not contain three parts.')
    }

    return JSON.parse(Buffer.from(tokenBlocks[0], 'base64').toString());

};


const getJwtOptions = (opts = {}) => {
    return Object.assign({}, {
        issuer: CONF.issuer,
        audience: CONF.audience,
    }, opts);
};


const getUserAndTenantInfo = (token) => {
    return Object.assign({}, {
        issuer: CONF.issuer,
        audience: CONF.audience,
    }, opts);
};


module.exports = {

    verify: (token) => {

        return new Promise((resolve, reject) => {

            const alg = decodeHeader(token).alg;

            let secret;

            if(alg.indexOf('RS') === 0) {
                console.info('Received RS-ALG', alg);
                secret = getKey;
            } else if(alg.indexOf('HS') === 0) {
                console.info('Received HS-ALG', alg);
                secret = CONF.hmacSecret;
            } else {
                return reject(`Unsupported algorithm ${alg}`);
            }

            jwt.verify(token, secret, getJwtOptions(), function(err, decoded) {
                if(err) {
                    log.debug(` Token ${err.name === 'TokenExpiredError' ? 'expired' : 'invalid'}`, err);
                    return reject(err);
                }
                return resolve(decoded);
            });
        });


    },

    updateUserData: async (token, userid) => {
        const iamToken = `Bearer ${token}`;
        try {
            const { body } =await request({
                method: 'get',
                uri: CONF.getUserData(userid),
                headers: {'Authorization': `${iamToken}`},
                json: true,
            }
        );
            let resobj = {
                memberships: body.memberships,
                role: body.role
            }
            console.log(resobj);
            return resobj
        } catch (error) {
            return error;
        }
    },

    middleware: async (req, res, next) => {

        let payload = null;
        let token = null;
        if (!req.headers.authorization) {
            return next({ status: 401, message: 'Missing authorization header.' });
        }

        try {
            const header = req.headers.authorization.split(' ');
            if (!header || header.length < 2) {
                log.debug('Authorization header length is incorrect');
                return next({ status: 401, message: 'Invalid authorization header' });
            }
            token = header[1];
            payload = await module.exports.verify(token);
        } catch (err) {
            log.debug('Failed to parse token', err);
            return next({ status: 401, message: `Token invalid. Error: ${err.name}. Details: ${err.message}` });
        }
        if (CONF.updateUserData){
            try {
                const updateRes = await module.exports.updateUserData(token,payload.sub);
                if (payload) {
                payload = Object.assign(payload,updateRes);
                }
                console.log('Role and Memberships updated');
            } catch (err) {
                console.log(err);
            }
        }

        if (payload) {
            req.__HEIMDAL__ = Object.assign({}, (req.__HEIMDAL__ || {}), {
                token: req.headers.authorization,
                auth: payload,
                username: payload.username,
                userid: payload.sub,
                memberships: payload.memberships,
                role: payload.role,
            });
            return next();
        } else {
            log.error('JWT payload is empty or undefined', { payload });
            return next({ status: 400, message: 'JWT payload is either empty or undefined' });
        }


    }

};
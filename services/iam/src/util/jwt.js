
const jwt = require('jsonwebtoken');

const uuid = require('uuid');

const conf = require('./../conf');
const CONSTANTS = require('./../constants');

const keystore = require('./../util/keystore');

const getJwtOptions = opts => Object.assign({}, {
    issuer: conf.jwt.issuer,
    audience: conf.jwt.audience,
    algorithm: conf.jwt.algorithm,
    expiresIn: conf.jwt.expiresIn,
}, opts);

module.exports = {

    basic: {

        sign: async (jwtPayload, opts = {}) => {

            if (conf.jwt.algorithmType === CONSTANTS.JWT_ALGORITHMS.HMAC) {
                return jwt.sign(jwtPayload, conf.jwt.jwtsecret, getJwtOptions(opts));
            } else if (conf.jwt.algorithmType === CONSTANTS.JWT_ALGORITHMS.RSA) {
                const key = await keystore.getRsaKeys();
                return jwt.sign(jwtPayload, key.toPEM(true), getJwtOptions(Object.assign({}, opts, {
                    keyid: key.kid,
                    jwtid: uuid.v4(),
                })));
            }
        },

        verify: async (token, opts = {}) => {
            if (conf.jwt.algorithmType === CONSTANTS.JWT_ALGORITHMS.HMAC) {
                return jwt.verify(token, conf.jwt.jwtsecret, getJwtOptions(opts));
            } else if (conf.jwt.algorithmType === CONSTANTS.JWT_ALGORITHMS.RSA) {
                const key = await keystore.getRsaKeys();
                return jwt.verify(token, key.toPEM(), getJwtOptions(Object.assign({}, opts, { keyid: key.kid })));
            }

        },
    },

    getJwtPayload: ({
        _id, username, role, permissions,
    }) => ({
        sub: _id,
        username,
        role,
        permissions,
    }),

    getJwtOptions,

};

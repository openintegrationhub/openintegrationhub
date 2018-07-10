
const jwt = require('jsonwebtoken');

const conf = require('./../conf');

module.exports = {

    basic: {
        sign: jwtPayload => jwt.sign(jwtPayload, conf.jwt.jwtsecret, {
            issuer: conf.jwt.issuer,
            audience: conf.jwt.audience,
            algorithm: conf.jwt.algorithm,
            expiresIn: conf.jwt.expiresIn,
        }),

        verify: token => jwt.verify(token, conf.jwt.jwtsecret, {
            issuer: conf.jwt.issuer,
            audience: conf.jwt.audience,
            algorithm: conf.jwt.algorithm,
            expiresIn: conf.jwt.expiresIn,
        }),
    },

};

const express = require('express');
const pug = require('pug');
const path = require('path');

const router = express.Router();
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const authMiddleware = require('../util/auth');
const conf = require('./../conf');
const CONSTANTS = require('./../constants/index');
const jwtUtils = require('./../util/jwt');
const keystore = require('./../util/keystore');

router.get('/', (req, res) => {
    
    res
        .send(
            pug.renderFile(
                path.join(__dirname, '../views/home.pug'), {
                },
            ),
        );
});

router.get('/.well-known/jwks.json', async (req, res) => {

    const jwks = await keystore.getKeystoreAsJSON();

    if (conf.jwt.algorithmType === CONSTANTS.JWT_ALGORITHMS.RSA) {
        return res.send(jwks);
    } else {
        return res.status(423).send({ message: 'RSA algorithm is not activated' });
    }

});

router.post('/login', jsonParser,
    authMiddleware.authenticate,
    authMiddleware.userIsEnabled,
    async (req, res, next) => {

        if (!req.user) {
            return next({ status: 401, message: CONSTANTS.ERROR_CODES.NOT_LOGGED_IN });
        }

        // genarate JWT Token
        const jwtpayload = jwtUtils.getJwtPayload(req.user);

        const token = await jwtUtils.basic.sign(jwtpayload);
        req.headers.authorization = `Bearer ${token}`;
        res.status(200).send({ token });

    });

router.post('/logout', (req, res) => {
    req.logout();
    res.clearCookie(conf.jwt.cookieName);
    res.send({ loggedOut: true });
});

module.exports = router;

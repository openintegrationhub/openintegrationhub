const express = require('express');
const pug = require('pug');
const path = require('path');

const router = express.Router();
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const authMiddleware = require('../util/auth');
const conf = require('./../conf');
const CONSTANTS = require('./../constants/index');
const PERMISSIONS = require('./../access-control/permissions');
const auth = require('./../util/auth');
const jwtUtils = require('./../util/jwt');
const AccountDAO = require('./../dao/users');
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

// router.get('/verify', jsonParser,
//     authMiddleware.userIsEnabled,
//     async (req, res, next) => {
//
//         if (!req.user) {
//             return next({ status: 401, message: CONSTANTS.ERROR_CODES.NOT_LOGGED_IN });
//         }
//
//         const token = req.query.token;
//         const decrypted = await jwtUtils.basic.verify(token);
//         res.status(200).send({ decrypted });
//
//     });

router.get('/token', auth.validateAuthentication, async (req, res) => {

    const account = await AccountDAO.findOne({ _id: req.__HEIMDAL__.userid, status: CONSTANTS.STATUS.ACTIVE });

    if (!account) {
        // User is either disabled or does not exist anymore
        return res.status(403).send({ message: CONSTANTS.ERROR_CODES.FORBIDDEN });
    }

    const token = await jwtUtils.basic.sign(account);
    req.headers.authorization = `Bearer ${token}`;
    res.status(200).send({ token });

});

router.post('/ephemeral-token/:accountId',
    auth.validateAuthentication,
    auth.hasPermissions([PERMISSIONS['ephemeral-token:create']]),
    jsonParser,
    async (req, res) => {

        const account = await AccountDAO.findOne({ _id: req.params.accountId, status: CONSTANTS.STATUS.ACTIVE });

        if (!account) {
        // User is either disabled or does not exist anymore
            return res.status(403).send({ message: CONSTANTS.ERROR_CODES.FORBIDDEN });
        }

        const token = await jwtUtils.basic.sign({
            ...jwtUtils.getJwtPayload(account),
            type: CONSTANTS.ROLES.SERVICE_ACCOUNT,
            purpose: 'portable-token',
            consumerServiceId: req.body.consumerServiceId,
        }, {
            expiresIn: '2h',
        });
        req.headers.authorization = `Bearer ${token}`;
        res.status(200).send({ token });

    });

router.post('/logout', (req, res) => {
    req.logout();
    res.clearCookie(conf.jwt.cookieName);
    res.send({ loggedOut: true });
});

module.exports = router;

const express = require('express');
const pug = require('pug');
const path = require('path');

const router = express.Router();
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const authMiddleware = require('../util/auth');
const conf = require('./../conf');
const CONSTANTS = require('./../constants/index');
const auth = require('./../util/auth');
const jwtUtils = require('./../util/jwt');
const AccountDAO = require('./../dao/users');
const keystore = require('./../util/keystore');

router.get('/', (req, res) => {
    console.log('TestPUG: ', pug.renderFile(
        path.join(__dirname, '../views/home.pug'), {}));
    console.log('PATHJOIN:', path.join(__dirname, '../views/home.pug'));
    console.log('PATH:', __dirname);
    res.sendStatus(200);
    
    // res
    //     .send(
    //         pug.renderFile(
    //             path.join(__dirname, '../views/home.pug'), {
    //             },
    //         ),
    //     );
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
        const jwtpayload = {
            sub: req.user._id,
            username: req.user.username,
            role: req.user.role,
            memberships: req.user.memberships,
        };

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

    const { _id, username, role, memberships } = account;

    const token = await jwtUtils.basic.sign({
        sub: _id,
        username,
        role,
        memberships,
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

const express = require('express');
const pug = require('pug');
const path = require('path');
const Logger = require('@basaas/node-logger');

const router = express.Router();

const authMiddleware = require('../util/auth');
const CONF = require('../conf');
const CONSTANTS = require('../constants/index');
const TokenUtils = require('../util/tokens');
const keystore = require('../util/keystore');
const AccountDAO = require('../dao/accounts');

const logger = Logger.getLogger(`${CONF.general.loggingNameSpace}/general`, {
    level: 'debug',
});

router.get('/', (req, res, next) => {
    try {
        res.send(
            pug.renderFile(
                path.join(__dirname, '../views/home.pug'), {
                },
            ),
        );
    } catch (err) {
        next(err);
    }
});

router.get('/.well-known/jwks.json', async (req, res) => {

    const jwks = await keystore.getKeystoreAsJSON();

    if (CONF.jwt.algorithmType === CONSTANTS.JWT_ALGORITHMS.RSA) {
        return res.send(jwks);
    } else {
        return res.status(423).send({ message: 'RSA algorithm is not activated' });
    }

});

router.post('/login', authMiddleware.authenticate, authMiddleware.accountIsEnabled, async (req, res, next) => {

    if (!req.user) {
        return next({ status: 401, message: CONSTANTS.ERROR_CODES.NOT_LOGGED_IN });
    }

    // TODO: should normal users always receive a token? Is that token long living?
    const tokenObj = await TokenUtils.sign(req.user);
    req.headers.authorization = `Bearer ${tokenObj.token}`;
    res.status(200).send({ token: tokenObj.token, id: tokenObj._id });

});

// router.get('/context', authMiddleware.validateAuthentication, async (req, res, next) => {
//
//     try {
//         const account = await AccountDAO.findOne({ _id: req.user.userid });
//
//         res.status(200).send({
//             account,
//             currentContext: req.user.currentContext,
//         });
//
//     } catch (err) {
//         logger.error(err);
//         return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
//     }
//
// });

// router.post('/context', authMiddleware.validateAuthentication,
//     async (req, res, next) => {
//
//         const { tenant } = req.body;
//
//         if (!tenant) {
//             return next({ status: 400, message: 'Missing tenant in body' });
//         }
//
//         try {
//
//             if (await AccountDAO.userHasContext({ userId: req.user.userid, tenantId: tenant })) {
//
//                 const { currentContext } = await AccountDAO.setCurrentContext({ userId: req.user.userid, tenantId: tenant });
//
//                 // const jwtpayload = jwtUtils.getJwtPayload(await AccountDAO.findOne({ _id: req.user.userid }));
//                 //
//                 // const token = await jwtUtils.basic.sign(jwtpayload);
//                 // req.headers.authorization = `Bearer ${token}`;
//                 res.status(200).send({ currentContext });
//
//             } else {
//                 res.sendStatus(403);
//             }
//
//         } catch (err) {
//             logger.error(err);
//             return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
//         }
//
//     });

router.post('/logout', authMiddleware.validateAuthentication, async (req, res) => {

    const accountId = req.user.userid;

    req.logout();
    res.clearCookie(CONF.jwt.cookieName);

    try {
        await TokenUtils.deleteSessionToken({ accountId });
        res.send({ loggedOut: true });
    } catch (e) {
        logger.error('Failed to delete session token', e);
        res.sendStatus(500);
    }
});

module.exports = router;

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

router.get('/', (req, res) => {

    res
        .send(
            pug.renderFile(
                path.join(__dirname, '../views/home.pug'), {
                },
            ),
        );
});

router.post('/login', jsonParser, 
    authMiddleware.authenticate,
    authMiddleware.userIsEnabled, 
    (req, res, next) => {

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

        const token = jwtUtils.basic.sign(jwtpayload, conf.jwt.jwtsecret, {
            issuer: conf.jwt.issuer,
            audience: conf.jwt.audience,
            algorithm: conf.jwt.algorithm,
            expiresIn: conf.jwt.expiresIn,
        });
        req.headers.authorization = `Bearer ${token}`;
        res.status(200).send({ token });
        
    });

router.get('/token/refresh', auth.validateAuthentication, async (req, res) => {

    const account = await AccountDAO.findOne({ _id: req.__HEIMDAL__.userid, status: CONSTANTS.STATUS.ACTIVE });

    if (!account) {
        // User is either disabled or does not exist anymore
        return res.status(403).send({ message: CONSTANTS.ERROR_CODES.FORBIDDEN });
    }

    const { sub, username, role, memberships } = account;

    const token = jwtUtils.basic.sign({
        sub,
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

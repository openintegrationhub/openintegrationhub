const express = require('express');
const bodyParser = require('body-parser');
const ms = require('ms');
const Logger = require('@basaas/node-logger');

const router = express.Router();

const jsonParser = bodyParser.json();
const CONF = require('./../conf');
const CONSTANTS = require('./../constants');
const PERMISSIONS = require('./../access-control/permissions');
const auth = require('./../util/auth');
const TokenDAO = require('./../dao/tokens');
const AccountDAO = require('./../dao/users');
const jwtUtils = require('./../util/jwt');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/token`, {
    level: 'debug',
});

/**
 * get token data from req.user object
 */
router.use(auth.validateAuthentication);

/**
 * Create a new token
 * */
router.post('/ephemeral-token', jsonParser, auth.hasPermissions([PERMISSIONS['ephemeral-token:create']]), async (req, res, next) => {

    const account = await AccountDAO.findOne({ _id: req.body.accountId, status: CONSTANTS.STATUS.ACTIVE });
    const tokenLifespan = req.body.expiresIn || CONF.jwt.expiresIn;

    if (!account) {
        // User is either disabled or does not exist anymore
        return res.status(403).send({ message: CONSTANTS.ERROR_CODES.FORBIDDEN });
    }

    const token = await jwtUtils.basic.sign({
        ...jwtUtils.getJwtPayload(account),
        type: CONSTANTS.TOKEN_TYPES.EPHEMERAL_SERVICE_ACCOUNT,
        purpose: 'ephemeral-token',
        consumerServiceId: req.body.consumerServiceId,
    }, {
        expiresIn: tokenLifespan,
    });

    await TokenDAO.create({
        inquirer: account._id,
        initiator: req.user.userid,
        tokenId: JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).jti,
        type: CONSTANTS.TOKEN_TYPES.EPHEMERAL_SERVICE_ACCOUNT,
        description: '',
        permissions: account.permissions,
        expireAt: new Date(new Date().getTime() + ms(tokenLifespan)),
    });

    req.headers.authorization = `Bearer ${token}`;
    res.status(200).send({ token });
});

/**
 * Get all Tokens
 */
router.post('/introspect', jsonParser, auth.hasPermissions([PERMISSIONS['token:introspect']]), async (req, res, next) => {
    try {
        const payload = await jwtUtils.basic.verify(req.body.token);

        // const token = await TokenDAO.findOne({ tokenId: payload.tokenId });
        // const accountData = await AccountDAO.findOne({ _id: token.inquirer });
        return res.send(payload);
    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});
/**
 * Get all Tokens
 */
router.get('/', auth.isAdmin, async (req, res, next) => {
    try {
        const docs = await TokenDAO.find({});
        return res.send(docs);
    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Get my token & refresh my token
 */
router.get('/refresh', async (req, res, next) => {

    try {
        const account = await AccountDAO.findOne({ _id: req.user.userid, status: CONSTANTS.STATUS.ACTIVE });

        if (!account) {
            // User is either disabled or does not exist anymore
            return res.status(403).send({ message: CONSTANTS.ERROR_CODES.FORBIDDEN });
        }

        const token = await jwtUtils.basic.sign(jwtUtils.getJwtPayload(account));
        req.headers.authorization = `Bearer ${token}`;
        res.status(200).send({ token });

    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Get token by id
 */
router.get('/:id', auth.isAdmin, async (req, res, next) => {
    try {
        const doc = await TokenDAO.find({ _id: req.params.id });
        if (!doc) {
            return res.sendStatus(404);
        } else {
            return res.send(doc[0]);
        }

    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Delete a token
 */
router.delete('/:id', auth.hasPermissions([PERMISSIONS['ephemeral-token:delete']]), async (req, res, next) => {
    try {
        await TokenDAO.delete({ id: req.params.id });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

module.exports = router;

const express = require('express');
const bodyParser = require('body-parser');
const Logger = require('@basaas/node-logger');

const router = express.Router();

const CONF = require('../conf');
const CONSTANTS = require('../constants');
const { PERMISSIONS, RESTRICTED_PERMISSIONS } = require('../access-control/permissions');
const auth = require('../util/auth');
const TokenDAO = require('../dao/tokens');
const AccountDAO = require('../dao/accounts');
const TokenUtils = require('../util/tokens');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/token`, {
    level: 'debug',
});
const auditLog = Logger.getAuditLogger(`${CONF.general.loggingNameSpace}/token-router`);

/**
 * Get all tokens
 */
router.get('/', auth.isAdmin, async (req, res, next) => {

    const query = {};

    if (req.query.token) {
        query.token = decodeURIComponent(req.query.token);
    }

    if (req.query.accountId) {
        query.accountId = req.query.accountId;
    }

    try {
        const docs = await TokenDAO.find(query);
        docs.forEach((elem) => {
            elem.token = elem.token.replace(/.(?=.{4,}$)/g, '*');
        });
        if (req.query.meta) {
            return res.send({ data: docs, meta: { total: docs.length } });
        }
        return res.send(docs);
    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Create a new token
 * */
router.post('/', auth.can([RESTRICTED_PERMISSIONS['iam.token.create']]), async (req, res, next) => {

    const account = await AccountDAO.findOne({ _id: req.body.accountId, status: CONSTANTS.STATUS.ACTIVE });
    const tokenLifespan = req.body.expiresIn;
    const inquirer = req.body.inquirer || req.user.userid;

    if (!account) {
        // User is either disabled or does not exist anymore
        return next({ status: 404, message: CONSTANTS.ERROR_CODES.FORBIDDEN });
    }

    if (req.body.customPermissions && !auth.hasPermissions({
        user: req.user,
        requiredPermissions: [RESTRICTED_PERMISSIONS['iam.token.update']],
    })) {
        return next({ status: 403, message: CONSTANTS.ERROR_CODES.FORBIDDEN });
    }

    if (!inquirer) {
        return next({ status: 400, message: 'Missing inquirer' });
    }

    const tokenObj = await TokenUtils.sign({
        ...account,
        purpose: req.body.purpose || 'accountToken',
        initiator: req.user.userid,
        inquirer,
        accountId: account._id.toString(),
        description: req.body.description || '',
        permissions: Array.from(new Set((account.permissions || []).concat(req.body.customPermissions || []))),
    }, {
        type: tokenLifespan === -1 ? CONSTANTS.TOKEN_TYPES.PERSISTENT : CONSTANTS.TOKEN_TYPES.EPHEMERAL_SERVICE_ACCOUNT,
        lifespan: tokenLifespan,
        new: req.body.new, // return an existing token if new != true
    });

    auditLog.info('token.create', {
        data: req.body,
        accountId: req.user.userid,
        'x-request-id': req.headers['x-request-id'],
    });

    res.status(200).send({ token: tokenObj.token, id: tokenObj._id });
});

/**
 * Get all Tokens
 */
router.post('/introspect', auth.can([RESTRICTED_PERMISSIONS['iam.token.introspect']]), async (req, res, next) => {

    try {
        log.debug('token.introspect', {
            data: {
                token: req.body.token,
                'x-request-id': req.headers['x-request-id'],
            },
        });
        const accountData = await TokenUtils.getAccountData(req.body.token);

        if (accountData) {
            auditLog.info('iam.token.introspect', {
                token: req.body.token.replace(/.(?=.{4,}$)/g, '*'),
                accountId: req.user.userid,
                'x-request-id': req.headers['x-request-id'],
            });
            return res.send(accountData);
        } else {
            log.warn('token.introspect', {
                data: {
                    token: req.body.token,
                    'x-request-id': req.headers['x-request-id'],
                    status: 404,
                },
            });
            return res.sendStatus(404);
        }

    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Get & refresh my token
 */
router.get('/refresh', async (req, res, next) => {

    try {
        const newToken = await TokenUtils.fetchAndProlongToken(req.user.token);

        if (newToken) {
            auditLog.info('token.refresh', {
                newToken: newToken.token.replace(/.(?=.{4,}$)/g, '*'),
                accountId: req.user.userid,
                'x-request-id': req.headers['x-request-id'],
            });
            req.headers.authorization = `Bearer ${newToken.token}`;
            return res.send({ token: newToken.token });
        } else {
            return next({ status: 401, message: CONSTANTS.ERROR_CODES.SESSION_EXPIRED });
        }

    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Get token by id
 */
router.get('/:id', auth.isAdmin, async (req, res, next) => {

    try {
        const doc = await TokenDAO.findOne({ _id: req.params.id });
        if (!doc) {
            return res.sendStatus(404);
        } else {
            if (req.query.meta) {
                return res.send({ data: doc });
            }
            return res.send(doc);
        }

    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Delete a token
 */
router.delete('/:id', auth.can([RESTRICTED_PERMISSIONS['iam.token.delete']]), async (req, res, next) => {

    try {
        await TokenDAO.delete({ id: req.params.id });
        auditLog.info('iam.token.delete', {
            token: req.params.id,
            accountId: req.user.userid,
            'x-request-id': req.headers['x-request-id'],
        });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

module.exports = router;

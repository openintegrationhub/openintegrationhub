const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const Logger = require('@basaas/node-logger');
const CONF = require('./../conf');
const CONSTANTS = require('./../constants');
const auth = require('./../util/auth');
const UserDAO = require('./../dao/users');

const log = Logger.getLogger(`${CONF.general.loggingNameSpace}/user`, {
    level: 'debug',
});

/**
 * get token data from req.user object
 */
router.use(auth.validateAuthentication);

/**
 * Create a new user
 * */
router.post('/', jsonParser, auth.isAdmin, async (req, res, next) => {
    const userObj = req.body;
    try {

        const doc = await UserDAO.create({ userObj });
        return res.send({ id: doc._id });

    } catch (err) {
        if (err.name === 'ValidationError') {
            log.debug(err);
            return next({
                status: 400,
                message: CONSTANTS.ERROR_CODES.INPUT_INVALID,
            });
        } else if (/duplicate/.test(err.message)) {
            return next({
                status: 409,
                message: CONSTANTS.ERROR_CODES.DUPLICATE_KEY,
            });
        } else {
            return next(err);
        }
    }
});

/**
 * Get all Users
 */
router.get('/', auth.isAdmin, async (req, res, next) => {
    try {
        const doc = await UserDAO.find({});
        return res.send(doc);
    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Get data of current user
 */
router.get('/me', auth.isLoggedIn, async (req, res, next) => {

    try {
        const doc = await UserDAO.find({ _id: req.user.userid });
        return res.send(doc && doc[0]);
    } catch (err) {
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Get user by id
 */
router.get('/:id', auth.paramsMatchesUserId, async (req, res, next) => {
    try {
        const doc = await UserDAO.find({ _id: req.params.id });
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
 * Partial modify of a user
 */
router.patch('/:id', auth.paramsMatchesUserId, jsonParser, async (req, res, next) => {
    const userObj = req.body;
    try {
        await UserDAO.update({
            id: req.params.id, userObj, partialUpdate: true, method: 'patch', 
        });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

/**
 * Complete modify of user data ith given data
 * */
router.put('/:id', auth.paramsMatchesUserId, jsonParser, async (req, res, next) => {

    const userObj = req.body;

    try {
        await UserDAO.update({
            id: req.params.id, userObj, partialUpdate: false, method: 'put', 
        });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }

});

/**
 * Remove user from tenant membership
 */
router.delete('/:id/tenant/:tenantId', auth.paramsMatchesUserId, async (req, res, next) => {
    try {
        const doc = await UserDAO.removeUserFromTenant({
            tenantId: req.params.tenantId, 
            userId: req.params.id,
        });

        return res.send(doc);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }

});

/**
 * Delete a user
 */
router.delete('/:id', auth.paramsMatchesUserId, async (req, res, next) => {
    try {
        await UserDAO.delete({ id: req.params.id });
        return res.sendStatus(200);
    } catch (err) {
        log.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

module.exports = router;

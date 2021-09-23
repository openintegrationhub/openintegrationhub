const express = require('express');
const Logger = require('@basaas/node-logger');

const router = express.Router();

const CONF = require('../conf');
const CONSTANTS = require('../constants');
const { PERMISSIONS, RESTRICTED_PERMISSIONS } = require('../access-control/permissions');
// const auth = require('./../util/auth');
// const PermissionsDAO = require('./../dao/tokens');

const logger = Logger.getLogger(`${CONF.general.loggingNameSpace}/permission`, {
    level: 'debug',
});

/**
 * Get all permissions
 */
router.get('/', async (req, res, next) => {
    try {
        let docs = Object.values(PERMISSIONS);
        if (req.user && req.user.isAdmin) {
            docs = docs.concat(Object.values(RESTRICTED_PERMISSIONS));
        }
        if (req.query.meta) {
            return res.send({ data: docs, meta: { total: docs.length } });
        }
        return res.send(docs);
    } catch (err) {
        logger.error(err);
        return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
    }
});

// /**
//  * Get permission by id
//  */
// router.get('/:id', async (req, res, next) => {
//     try {
//         const doc = await PermissionsDAO.findOne({ _id: req.params.id });
//         if (!doc) {
//             return res.sendStatus(404);
//         } else {
//             return res.send(doc[0]);
//         }

//     } catch (err) {
//         logger.error(err);
//         return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
//     }
// });

// router.use(auth.isAdmin);

// /**
//  * Create a new permission
//  * */
// router.post('/', async (req, res, next) => {

//     const {
//         name,
//         type,
//         description,
//     } = req.body;

//     if (!name) {
//         return next({ status: 400, message: CONSTANTS.ERROR_CODES.INPUT_INVALID });
//     }

//     try {
//         const newPermission = await PermissionsDAO.create({
//             name,
//             type,
//             description,
//         });

//         res.status(200).send(newPermission.toJSON());
//     } catch (err) {
//         logger.error(err);
//         return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
//     }

// });

// /**
//  * Update permission
//  * */
// router.patch('/:id', async (req, res, next) => {

//     const props = req.body;

//     try {
//         await PermissionsDAO.update({
//             id: req.params.id,
//             props,
//         });

//         res.sendStatus(200);
//     } catch (err) {
//         logger.error(err);
//         return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
//     }

// });

// /**
//  * Delete a permission
//  */
// router.delete('/:id', async (req, res, next) => {
//     try {
//         await PermissionsDAO.delete({ id: req.params.id });
//         return res.sendStatus(200);
//     } catch (err) {
//         logger.error(err);
//         return next({ status: 500, message: CONSTANTS.ERROR_CODES.DEFAULT });
//     }
// });

module.exports = router;

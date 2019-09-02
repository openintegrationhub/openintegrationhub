const express = require('express');

const getRouter = require('./get');
const postRouter = require('./post');
const putRouter = require('./put');
const deleteRouter = require('./delete');
const schemasRouter = require('./schemas');

const router = express.Router();

router.use(getRouter);
router.use(postRouter);
router.use(putRouter);
router.use(deleteRouter);
router.use('/:id/schemas', async (req, res, next) => {

    req.domainId = req.params.id;
    next();
}, schemasRouter);

module.exports = router;

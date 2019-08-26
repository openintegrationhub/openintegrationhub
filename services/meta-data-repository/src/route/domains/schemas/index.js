const express = require('express');
const getRouter = require('./get');
const putRouter = require('./put');
const deleteRouter = require('./delete');
const postRouter = require('./post');

const router = express.Router();

router.use(getRouter);
router.use(postRouter);
router.use(putRouter);
router.use(deleteRouter);

module.exports = router;

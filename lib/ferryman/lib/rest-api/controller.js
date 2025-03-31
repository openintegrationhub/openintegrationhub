const express = require('express');
const { processAction } = require('./processing');
const errorHandler = require('./error');
const router = express.Router();

router.post('/process', express.json({ limit: '5mb' }), processAction);
router.use(errorHandler);

module.exports = router;

const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser');
const { parsePagedQuery } = require('../../middleware');

router.get('/', parsePagedQuery(), asyncHandler(require('./GetList')));
router.post('/', bodyParser.json(), asyncHandler(require('./Create')));
router.get('/:id', asyncHandler(require('./GetOne')));
router.patch('/:id', bodyParser.json(), asyncHandler(require('./PatchOne')));
router.delete('/:id', asyncHandler(require('./Delete')));

module.exports = router;

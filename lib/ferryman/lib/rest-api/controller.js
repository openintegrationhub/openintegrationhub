const express = require('express');
const iamLib = require('@openintegrationhub/iam-utils');
const { verify } = require('./secret');

const { can } = iamLib;

const router = express.Router();

router.use(iamLib.middleware);
router.get('/secret/verify', can('component.secret.verify'), verify);

module.exports = router;

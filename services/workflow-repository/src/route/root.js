const express = require('express');
const conf = require('../conf');

const router = express.Router();

router.get('/', async (req, res) => {
    res.send(conf.wellKnown);
});

module.exports = router;

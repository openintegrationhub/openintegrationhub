const express = require('express');
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/', jsonParser, async (req, res) => {
  res.status(200).send({ status: 'pass' });
});


module.exports = router;

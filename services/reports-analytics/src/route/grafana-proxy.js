const express = require('express');
const fetch = require('node-fetch');
const conf = require('../conf');

const router = express.Router();

router.get('/*', async (req, res) => {
    const options = {
      method: req.method,
      headers: {
        Authorization: `Bearer ${conf.grafana.token}`,
      },
    };

    await fetch(`${conf.grafana.url}/${req.originalUrl.replace('/grafana-proxy/', '')}`, options)
      .then(response => response.body.pipe(res));

});

module.exports = router;

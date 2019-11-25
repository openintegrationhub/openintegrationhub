const express = require('express');
const request = require('request');
const conf = require('../conf');

const router = express.Router();

router.get('/*', (req, res) => {
    request({
        uri: `${conf.grafana.url}/${req.originalUrl.replace('/grafana-proxy/', '')}`,
        method: req.method,
        headers: {
            Authorization: `Bearer ${conf.grafana.token}`,
        },
    }, () => {

    }).pipe(res);
});

module.exports = router;

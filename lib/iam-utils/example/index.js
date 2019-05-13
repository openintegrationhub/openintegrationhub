
const express = require('express');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
process.env['IAM_TOKEN'] = 'd25eb0ad-d36c-4a8c-83ca-00b81996d98c';
process.env['INTROSPECT_BASIC'] = 'true';

const iamUtils = require('../index');

const app = express();

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/secure', (req, res, next) => {
    if (req.query.token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
}, iamUtils.middleware, (req, res) => {
    res.send(JSON.stringify(req.user));
});

app.use((err, req, res, next) => {
    res.send({ status: err.status, message: err.message }).status(err.status);
});

app.listen(3210, () => console.log('Example app listening on port 3210!'));

iamUtils.verify('246d63f0-5303-415e-8c7e-a26d515dee28')
    .then(data => console.log(data))
    .catch(err => console.error(err));

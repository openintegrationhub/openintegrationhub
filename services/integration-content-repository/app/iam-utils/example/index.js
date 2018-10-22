
const iamUtils = require('../index');

const express = require('express')
const app = express()

app.get('/', (req, res) => res.send('Hello World!'))

app.get('/secure', (req, res, next) => {
    if(req.query.token && !req.headers.authorization) {
        req.headers.authorization = 'Bearer ' + req.query.token;
    }
    next();
}, iamUtils.middleware, (req, res) => {
    res.send(JSON.stringify(req.__HEIMDAL__));
})

app.use((err, req, res, next) => {
    res.send({status: err.status, message: err.message}).status(err.status);
})

app.listen(3210, () => console.log('Example app listening on port 3210!'))


iamUtils.verify('YOUR_TOKEN_GOES_HERE')
    .then(data => console.log(data))
    .catch(err => console.error(err))
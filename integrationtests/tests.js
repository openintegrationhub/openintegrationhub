process.env.AUTH_TYPE = 'basic';
const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;

const mockgoose = new Mockgoose(mongoose);
const request = require('supertest')('http://iam.openintegrationhub.com/login');

const CONSTANTS = require('./../src/constants');

let conf = null;

describe('User Routes', () => {

    let tokenUser = null; 
    let tokenAdmin = null;
    let app = null;
    
    beforeAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_AUTH_TYPE = 'basic';
        conf = require('./services/iam/src/conf/index');   //tbd 
        const App = require('..services/iam/src/app');   //tbd 
        app = new App();
        await mockgoose.prepareStorage();
        await app.setup(mongoose);
        await app.start();

        setTimeout(async () => {

            const jsonPayload = {
                username: conf.accounts.admin.username,
                password: conf.accounts.admin.password,
            };
            const response = await request.post('/login')
                .send(jsonPayload)
                .set('Accept', /application/json/)
                .expect(200);
            tokenAdmin = `Bearer ${response.body.token}`;

            done();

        }, 200);

    });
});

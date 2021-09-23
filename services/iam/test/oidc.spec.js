const path = require('path');
const request = require('supertest')('http://127.0.0.1:3099');
const { encode } = require('base64-url');
const fs = require('fs');
const CONSTANTS = require('../src/constants');

let conf = null;

describe('basic OIDC test Suite', () => {
    let app = null;
    let getHeader = null;
    let serviceAccessToken = null;

    beforeAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
        process.env.IAM_SERVICE_CLIENT_ID = 'test';
        process.env.IAM_SERVICE_CLIENT_SECRET = 'test';
        process.env.IAM_AUTH_TYPE = 'oidc';
        process.env.IAM_BASEURL = 'http://127.0.0.1:3099';
        process.env.IAM_ACC_SERVICEACCOUNT_USERNAME = 'testuser@basaas.de';
        process.env.IAM_ACC_SERVICEACCOUNT_PASSWORD = 'testpass';
        process.env.IAM_DEBUG = 'true';
        process.env.IAM_MONGODB_CONNECTION = global.__MONGO_URI__.replace('changeme', 'oidc');

        getHeader = `Basic ${encode(`${encodeURIComponent(process.env.IAM_SERVICE_CLIENT_ID)}:${encodeURIComponent(process.env.IAM_SERVICE_CLIENT_SECRET)}`)
        }`;

        const { generateFile } = require('../src/util/keystore');

        // const pathToKeystore = path.join(__dirname, '../keystore/keystore.json');
        // console.log('Keystore path:', pathToKeystore);
        // if (!fs.existsSync(pathToKeystore)) {
        //          generateFile()
        //         .then();
        // }

        await generateFile();
        conf = require('../src/conf/index');

        const App = require('../src/app');
        app = new App({
            mongoConnection: process.env.IAM_MONGODB_CONNECTION,
        });
        await app.setup();
        await app.start();

        setTimeout(() => {
            done();
        }, 1000);

    });

    afterAll(() => {
        app.stop();
    });

    test('get config successful', async () => {
        const response = await request.get('/op/.well-known/openid-configuration')
            .set('Accept', /application\/json/)
            .set('Authorization', getHeader)
            .expect(200);
        expect(response.body.authorization_endpoint).toBe('http://127.0.0.1:3099/op/auth');
    });

    test('get Token via Client Sec successful', async () => {
        const jsonPayload = {
            scope: 'global',
            grant_type: 'password',
            username: conf.accounts.admin.username,
            password: conf.accounts.admin.password,
        };
        const response = await request.post('/op/token')
            .send(jsonPayload)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .set('Authorization', getHeader)
            .expect(200);
        expect(response.body.token_type).toBe('Bearer');
        serviceAccessToken = response.body.access_token;
    });

    test('create Service Account Token via Client Sec successful', async () => {
        const jsonPayload = {
            username: 'service-test@basaas.com',
            password: 'abcDEF1',
            firstname: 'sa',
            lastname: 'sa',
            phone: '',
            status: CONSTANTS.STATUS.ACTIVE,
            confirmed: true,
            role: CONSTANTS.ROLES.SERVICE_ACCOUNT,
        };
        const response = await request.post('/api/v1/users')
            .send(jsonPayload)
            .set('Authorization', `Bearer ${serviceAccessToken}`)
            .set('x-auth-type', 'oidc');
        expect(response.body.id).toBeDefined;
    });

    test('get Token via introspec successful', async () => {
        const response = await request.post('/op/token/introspection')
            .send({ token: serviceAccessToken })
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .set('Authorization', getHeader)
            .expect(200);
        expect(response.body.token_type).toBeDefined;
    });

    test('get /me via oidc call successful', async () => {
        const response = await request.get('/op/me')
            .set('Authorization', `Bearer ${serviceAccessToken}`)
            .expect(200);
        expect(response.body.username).toBe(conf.accounts.admin.username);
    });

    test('create User Account via Client Sec successful', async () => {
        const jsonPayload = {
            username: 'user@basaas.com',
            password: 'abcDEF1',
            firstname: 'user',
            lastname: 'user',
            phone: '',
            status: CONSTANTS.STATUS.ACTIVE,
            confirmed: true,
            role: CONSTANTS.ROLES.USER,
        };
        const response = await request.post('/api/v1/users')
            .send(jsonPayload)
            .set('Authorization', `Bearer ${serviceAccessToken}`)
            .set('x-auth-type', 'oidc');
        expect(response.body.id).toBeDefined;
    });

    test('Deny token request via password grant as user', async () => {
        const jsonPayload = {
            scope: 'global',
            grant_type: 'password',
            username: 'user@basaas.com',
            password: 'abcDEF1',
        };
        await request.post('/op/token')
            .send(jsonPayload)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .set('Authorization', getHeader)
            .expect(400);
    });

    // test('create new client via oidc call successful', async () => {
    //     const jsonPayload = {
    //         grant_types: ['client_credentials'],
    //         application_type: 'native',
    //         redirect_uris: [],
    //         response_types: [],
    //         client_name: 'a fresh client',
    //     };
    //     const response = await request.post('/op/reg')
    //         .send(jsonPayload)
    //         .set('Content-Type', 'application/x-www-form-urlencoded')
    //         .set('Authorization', `Bearer ${serviceAccessToken}`)
    //         .expect(404);
    //         expect(response.body).toBe(0)
    // });

    test('generate Keystore successful', async () => {
        const pathToKeystore = path.join(__dirname, '../keystore/keystore.json');
        const { generateFile } = require('../src/util/keystore');

        await fs.unlinkSync(pathToKeystore);
        await generateFile();

    });
});


const express = require('express');
const mongoose = require('mongoose');
const getPort = require('get-port');
const { fork } = require('child_process');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const conf = require('../../conf');
const Server = require('../../server');
const token = require('../../test/token');

let port;
let request;
let server;

describe('secrets', () => {
    beforeAll(async () => {
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            port
        });
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Get all secrets', async () => {
        // invalid request body
        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                type: 'asd',
                data: {},
            })
            .expect(400);
        // add example secrets
        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                type: 'simple',
                data: {
                    username: 'foo',
                    passphrase: 'bar',
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                type: 'apiKey',
                data: {
                    value: 'foo',
                    headerName: 'bar',
                },
            })
            .expect(200);

        await request.post('/secrets')
            .set(...global.userAuth1)
            .send({
                name: 'string',
                type: 'oAuth2',
                data: {
                    clientId: 'test',
                    refreshToken: 'only with refresh token',
                    refreshTokenUrl: 'and url',
                },
            })
            .expect(200);

        const secrets = (await request.get('/secrets')
            .set(...global.userAuth1)
            .expect(200)).body;

        expect(secrets.length).toEqual(3);
        secrets.forEach((secret) => {
            expect(secret.owner[0].entityId).toEqual(jwt.decode(token.userToken1).sub);
        });
    });

    test('Get the secret anonymously throws', async () => {

        const secretBody = {
            name: 'string333444',
            type: 'simple',
            data: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        await request.get(`/secrets/${body._id}`)
            .expect(401);
    });

    test('Get the secret by id', async () => {

        const secretBody = {
            name: 'string123',
            type: 'simple',
            data: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        const secondResp = await request.get(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .expect(200);
        expect(secondResp.body.name).toEqual(secretBody.name);
    });

    test('Get the secret by wrong id returns 404', async () => {

        await request.get(`/secrets/${mongoose.Types.ObjectId()}`)
            .set(...global.userAuth1)
            .expect(404);
    });

    test('Replace the secret', async () => {

        const secretBody = {
            name: 'string567',
            type: 'simple',
            data: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        await request.put(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .send({ ...secretBody, name: 'newName' })
            .expect(200);

        const secondResp = await request.get(`/secrets/${body._id}`)
            .set(...global.userAuth1);
        expect(secondResp.body.name).toEqual('newName');
    });

    test('Modify the secret', async () => {

        const secretBody = {
            name: 'string567',
            type: 'simple',
            data: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        await request.patch(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .send({ name: 'newName2' })
            .expect(200);

        const secondResp = await request.get(`/secrets/${body._id}`)
            .set(...global.userAuth1);
        expect(secondResp.body.name).toEqual('newName2');
        expect(secondResp.body.type).toEqual(secretBody.type);
    });

    test('Delete secret', async () => {

        const secretBody = {
            name: 'string99',
            type: 'simple',
            data: {
                username: 'foo',
                passphrase: 'bar',
            },
        };

        // add example secrets
        const { body } = await request.post('/secrets')
            .set(...global.userAuth1)
            .send(secretBody)
            .expect(200);

        await request.delete(`/secrets/${body._id}`)
            .set(...global.userAuth1)
            .expect(200);

        // await request.get(`/secrets/${body._id}`)
        //     .set(...global.userAuth1)
        //     .expect(404);
    });

    test('Get a fresh generated access Token related to the Secret', async (done) => {
        // use external test
        const forked = fork(`${__dirname}/access-token-test.js`);

        forked.on('message', (msg) => {
            expect(msg.foo).toEqual('bar');
            done();
        });
    });

    test('Get audit data for a specific secret', async () => {
        await request.get('/secrets/fofo/audit')
            .set(...global.userAuth1)
            .expect(200);
    });
});

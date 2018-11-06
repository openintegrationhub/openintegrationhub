const express = require('express');
const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const Server = require('../../server');
const auth = require('../auth');

let port;
let request;
let server;

xdescribe('auth', () => {
    beforeAll(async () => {
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        server = new Server({
            port,
        });
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('authorize admin only', async () => {
        await request.get('/auth-admin')
            .set(...global.adminAuth1)
            .expect(200);

        await request.get('/auth-admin')
            .set(...global.userAuth1)
            .expect(401);

        await request.get('/auth-admin')
            .expect(401);
    });

    test('authorize user only', async () => {
        await request.get('/auth-user')
            .set(...global.userAuth1)
            .expect(200);

        await request.get('/auth-user')
            .set(...global.adminAuth1)
            .expect(200);

        await request.get('/auth-user')
            .expect(401);
    });

    test('check is logged in', async () => {
        await request.get('/auth-login')
            .set(...global.userAuth1)
            .expect(200);

        await request.get('/auth-login')
            .set(...global.adminAuth1)
            .expect(200);

        await request.get('/auth-user')
            .expect(401);
    });
});

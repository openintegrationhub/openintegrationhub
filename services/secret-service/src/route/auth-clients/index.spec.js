const express = require('express');
const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const Server = require('../../server');

let port;
let request;
let server;

describe('auth-clients', () => {
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

    test('Get all platform auth clients', async () => {
        await request.get('/auth-clients')
            .expect(200);
    });

    test('Create a platform oauth secret for a specific oauth provider', async () => {
        await request.post('/auth-clients')
            .expect(200);
    });

    test('Get auth client by id', async () => {
        await request.get('/auth-clients/fofo')
            .expect(200);
    });

    test('Replace a platform oauth secret', async () => {
        await request.put('/auth-clients/fofo')
            .expect(200);
    });

    test('Modify a platform oauth secret', async () => {
        await request.patch('/auth-clients/fofo')
            .expect(200);
    });
});

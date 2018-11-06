const express = require('express');
const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const Server = require('../../server');

let port;
let request;
let server;

describe('healthcheck', () => {
    beforeAll(async () => {
        port = await getPort();
        request = supertest(`http://localhost:${port}`);
        server = new Server({
            port,
        });
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('Cluster tools', async () => {
        await request.get('/healthcheck')
            .expect(200);
    });
});

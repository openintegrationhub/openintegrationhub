const express = require('express');
const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const Server = require('../../server');

let port;
let request;

describe('error', () => {
    beforeAll(async () => {
        port = await getPort();
        const host = `http://localhost:${port}`;
        request = supertest(host);
    });
    test('status and message', async () => {
        const server = new Server({
            port,
        });

        await server.start();
        await request.get('/404')
            .expect(404);
        await server.stop();
    });
});

const express = require('express');
const getPort = require('get-port');
const supertest = require('supertest');
const conf = require('../../conf');
const Server = require('../../server');

let port;
let request;
let server;

describe('root', () => {
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

    test('Service Info', async () => {
        const res = await request.get('/')
            .expect(200);

        expect(res.body).toEqual(conf.wellKnown);
    });
});

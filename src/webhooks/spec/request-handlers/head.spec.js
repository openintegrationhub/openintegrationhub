const Head = require('../../src/request-handlers/head');
const express = require('express');
const superagent = require('supertest');

describe('Head Request Handler', () => {
    let app;
    beforeEach(() => {
        app = express();
        app.head('/', async (req, res, next) => {
            try {
                new Head(req, res).handle();
            } catch (e) {
                return next(e);
            }
        });
    });

    it('should respond', async () => {
        await superagent(app)
            .head('/')
            .expect(200);
    });
});

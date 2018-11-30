'use strict';
const bodyParser = require('../src/body-parser');
const express = require('express');
const supertest = require('supertest');
const zlib = require('zlib');
const { expect } = require('chai');

describe('Body parser', () => {
    let app;
    let req;

    beforeEach(() => {
        app = bodyParser(express());
        app.post('/', (_req, res) => {
            req = _req;
            res.status(200).end();
        });
    });

    describe('Content-Type: application/json', () => {
        const body = {
            test: 'test'
        };
        const contentType = 'application/json';
        const rawBody = Buffer.from(JSON.stringify(body), 'utf8');

        it('should set raw body and parse body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(body)
                .set('Content-Type', contentType);

            const { status } = res;
            expect(status).to.equal(200);
            expect(req.body).to.deep.equal(body);
            expect(req.rawBody).to.deep.equal(rawBody);
        })
    });

    describe('No specified content type', async () => {
        it('should set raw body', async () => {
            const res = await supertest(app)
                .post('/');
            const { status } = res;
            expect(status).to.equal(200);
            expect(req.body).to.deep.equal({});
            expect(req.rawBody).to.be.undefined;
        });
    });

    describe('Content-Type: text/plain', () => {
        const body = {
            test: 'test'
        };
        const contentType = 'text/plain';
        const rawBody = Buffer.from(JSON.stringify(body), 'utf8');

        it('should set raw body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(JSON.stringify(body))
                .set('Content-Type', contentType);

            const { status } = res;
            expect(status).to.equal(200);
            expect(req.body).to.deep.equal(body);
            expect(req.rawBody).to.deep.equal(rawBody);
        });
    });

    describe('Content-Type: text/csv', () => {
        const body = 'foo,bar,baz';
        const contentType = 'text/csv';

        it('should set raw body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(body)
                .set('Content-Type', contentType);

            const { status } = res;
            expect(status).to.equal(200);
            expect(req.rawBody).not.to.be.undefined;
            expect(req.body).not.to.be.undefined;
            expect(req.files).not.to.be.undefined;
            expect(req.files.payload).not.to.be.undefined;
            expect(req.files.payload.originalFilename).to.equal('payload.csv');
            expect(req.files.payload.size).to.equal(11);
            expect(req.body).to.deep.equal(body);
        });
    });

    describe('Content-Type: image/jpeg', () => {
        const body = require('fs').readFileSync(__dirname + '/data/sample.jpg');
        const contentType = 'image/jpeg';

        it('should set raw body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(body)
                .set('Content-Type', contentType);

            const { status } = res;
            expect(status).to.equal(200);
            expect(req.rawBody).not.to.be.undefined;
            expect(req.body).not.to.be.undefined;
            expect(req.files).not.to.be.undefined;
            expect(req.files.payload).not.to.be.undefined;
            expect(req.files.payload.originalFilename).to.equal('payload.jpeg');
            expect(req.files.payload.size).to.equal(31164);
            expect(req.body).to.deep.equal(body);
        });
    });

    describe('Content-Type: application/xml', () => {
        const contentType = 'application/xml';
        const rawBody = require('fs').readFileSync(__dirname + '/data/sample.xml');
        const parsedJSON = require('./data/sample.json');

        it('should set raw body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(rawBody)
                .set('Content-Type', contentType);

            const { status } = res;
            expect(status).to.equal(200);
            expect(req.body).to.deep.equal(parsedJSON);
            expect(req.rawBody).to.deep.equal(rawBody.toString());
        });
    });

    describe('Content-Type: application/xml po.xml', () => {
        const contentType = 'application/xml';
        const rawBody = require('fs').readFileSync(__dirname + '/data/po.xml');
        const parsedJSON = require('./data/po.json');

        it('should set raw body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(rawBody)
                .set('Content-Type', contentType);
            const { status } = res;
            expect(status).to.equal(200);
            expect(req.body).to.deep.equal(parsedJSON);
            expect(req.rawBody).to.deep.equal(rawBody.toString());
        });
    });

    describe('Content-Type: application/xml soap.xml', () => {
        const contentType = 'application/xml';
        const rawBody = require('fs').readFileSync(__dirname + '/data/soap.xml');
        const parsedJSON = require('./data/soap.json');

        it('should set raw body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(rawBody)
                .set('Content-Type', contentType);
            const { status } = res;
            expect(status).to.equal(200);
            expect(req.body).to.deep.equal(parsedJSON);
            expect(req.rawBody).to.deep.equal(rawBody.toString());
        });
    });

    describe('Content-Type: application/x-www-form-urlencoded', () => {
        const body = 'test=test';
        const contentType = 'application/x-www-form-urlencoded';
        const rawBody = Buffer.from(body, 'utf8');

        it('should set raw body and parse body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(body)
                .set('Content-Type', contentType);
            const { status } = res;
            expect(status).to.equal(200);
            expect(req.body).to.deep.equal({
                test: 'test'
            });
            expect(req.rawBody).to.deep.equal(rawBody);
        });
    });

    describe('Content-Type: multipart/form-data', () => {
        it('should set raw body', async () => {
            const res = await supertest(app)
                .post('/')
                .field('foo', 'value')
                .field('bar', 'value1')
                .field('bar', 'value2')
                .field('bar', 'value3')
                .attach('attachment', __dirname + '/data/sample.jpg');

            const { status } = res;
            expect(status).to.equal(200);
            expect(req.body).to.deep.equal({
                foo: 'value',
                bar: ['value1', 'value2', 'value3']
            });
            expect(req.files).not.to.be.undefined;
            expect(req.files.attachment).not.to.be.undefined;
            expect(req.files.attachment.fieldName).to.equal('attachment');
            expect(req.files.attachment.originalFilename).to.equal('sample.jpg');
            expect(req.files.attachment.path).not.to.be.undefined;
            expect(req.files.attachment.size).to.equal(31164);
            expect(req.files.attachment.headers['content-type']).to.equal('image/jpeg');
        });
    });

    describe('Content-Type: application/json with float number containing zero after dot in json', () => {
        const body = '{"float": 1.0}';
        const contentType = 'application/json';
        const rawBody = Buffer.from(body, 'utf8');

        it('should set raw body and parse body', async () => {
            const res = await supertest(app)
                .post('/')
                .send(body)
                .set('Content-Type', contentType);

            const { status } = res;
            expect(status).to.equal(status);
            expect(req.body).to.deep.equal({
                float: 1
            });
            expect(req.rawBody).to.deep.equal(rawBody);
        });
    });

    describe('Content-Type: application/json deflated', () => {
        const body = {
            test: 'test'
        };
        const json = JSON.stringify(body);
        const contentType = 'application/json';
        const rawBody = Buffer.from(json, 'utf8');
        let deflatedBody;

        beforeEach(done => {
            zlib.deflate(rawBody, (err, buf) => {
                if (err) {
                    return done(err);
                }

                deflatedBody = buf;
                done();
            });
        });

        it('should set raw body and parse body', done => {
            const request = supertest(app)
                .post('/')
                .set('Content-Encoding', 'deflate')
                .set('Content-Type', contentType);

            request.write(deflatedBody);

            request.end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                expect(status).to.equal(200);
                expect(req.body).to.deep.equal(body);
                expect(req.rawBody).to.deep.equal(rawBody);
                done();
            });
        });
    });
});

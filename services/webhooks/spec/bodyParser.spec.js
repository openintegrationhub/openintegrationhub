'use strict';
const bodyParser = require('../lib/bodyParser');
const express = require('express');
const supertest = require('supertest');
const zlib = require('zlib');

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

        it('should set raw body and parse body', done => supertest(app)
            .post('/')
            .send(body)
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual(body);
                expect(req.rawBody.equals(rawBody)).toEqual(true);
                done();
            }));
    });

    describe('No specified content type', () => {
        it('should set raw body', done => supertest(app)
            .post('/')
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual({});
                expect(req.rawBody).toBeUndefined();
                done();
            }));
    });


    describe('Content-Type: text/plain', () => {
        const body = {
            test: 'test'
        };
        const contentType = 'text/plain';
        const rawBody = Buffer.from(JSON.stringify(body), 'utf8');

        it('should set raw body', done => supertest(app)
            .post('/')
            .send(JSON.stringify(body))
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual(body);
                expect(req.rawBody.equals(rawBody)).toEqual(true);
                done();
            }));
    });

    describe('Content-Type: text/csv', () => {
        const body = 'foo,bar,baz';
        const contentType = 'text/csv';

        it('should set raw body', done => supertest(app)
            .post('/')
            .send(body)
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.rawBody).toBeDefined();
                expect(req.body).toBeDefined();
                expect(req.files).toBeDefined();
                expect(req.files.payload).toBeDefined();
                expect(req.files.payload.originalFilename).toEqual('payload.csv');
                expect(req.files.payload.size).toEqual(11);
                expect(req.body).toEqual(body);
                done();
            }));
    });

    describe('Content-Type: image/jpeg', () => {
        const body = require('fs').readFileSync('spec/data/sample.jpg');
        const contentType = 'image/jpeg';

        it('should set raw body', done => supertest(app)
            .post('/')
            .send(body)
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.rawBody).toBeDefined();
                expect(req.body).toBeDefined();
                expect(req.files).toBeDefined();
                expect(req.files.payload).toBeDefined();
                expect(req.files.payload.originalFilename).toEqual('payload.jpeg');
                expect(req.files.payload.size).toEqual(31164);
                expect(req.body).toEqual(body);
                done();
            }));
    });

    describe('Content-Type: application/xml', () => {
        const contentType = 'application/xml';
        const rawBody = require('fs').readFileSync('./spec/data/sample.xml');
        const parsedJSON = require('./data/sample.json');
        it('should set raw body', done => supertest(app)
            .post('/')
            .send(rawBody)
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual(parsedJSON);
                expect(req.rawBody).toEqual(rawBody.toString());
                done();
            }));
    });

    describe('Content-Type: application/xml po.xml', () => {
        const contentType = 'application/xml';
        const rawBody = require('fs').readFileSync('./spec/data/po.xml');
        const parsedJSON = require('./data/po.json');
        it('should set raw body', done => supertest(app)
            .post('/')
            .send(rawBody)
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual(parsedJSON);
                expect(req.rawBody).toEqual(rawBody.toString());
                done();
            }));
    });

    describe('Content-Type: application/xml soap.xml', () => {
        const contentType = 'application/xml';
        const rawBody = require('fs').readFileSync('./spec/data/soap.xml');
        const parsedJSON = require('./data/soap.json');
        it('should set raw body', done => supertest(app)
            .post('/')
            .send(rawBody)
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual(parsedJSON);
                expect(req.rawBody).toEqual(rawBody.toString());
                done();
            }));
    });


    describe('Content-Type: application/x-www-form-urlencoded', () => {
        const body = 'test=test';
        const contentType = 'application/x-www-form-urlencoded';
        const rawBody = Buffer.from(body, 'utf8');

        it('should set raw body and parse body', done => supertest(app)
            .post('/')
            .send(body)
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual({
                    test: 'test'
                });
                expect(req.rawBody.equals(rawBody)).toEqual(true);
                done();
            }));
    });

    describe('Content-Type: multipart/form-data', () => {
        it('should set raw body', done => supertest(app)
            .post('/')
            .field('foo', 'value')
            .field('bar', 'value1')
            .field('bar', 'value2')
            .field('bar', 'value3')
            .attach('attachment', 'spec/data/sample.jpg')
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual({
                    foo: 'value',
                    bar: ['value1', 'value2', 'value3']
                });
                expect(req.files).toBeDefined();
                expect(req.files.attachment).toBeDefined();
                expect(req.files.attachment.fieldName).toEqual('attachment');
                expect(req.files.attachment.originalFilename).toEqual('sample.jpg');
                expect(req.files.attachment.path).toBeDefined();
                expect(req.files.attachment.size).toEqual(31164);
                expect(req.files.attachment.headers['content-type']).toEqual('image/jpeg');
                done();
            }));
    });

    describe('Content-Type: application/json with float number containing zero after dot in json', () => {
        const body = '{"float": 1.0}';
        const contentType = 'application/json';
        const rawBody = Buffer.from(body, 'utf8');

        it('should set raw body and parse body', done => supertest(app)
            .post('/')
            .send(body)
            .set('Content-Type', contentType)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                const { status } = res;
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual({
                    float: 1
                });
                expect(req.rawBody.equals(rawBody)).toEqual(true);
                done();
            }));
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
                if (status !== 200) {
                    return done(new Error(`Bad request: ${status}`));
                }
                expect(req.body).toEqual(body);
                expect(req.rawBody.equals(rawBody)).toEqual(true);
                done();
            });
        });
    });

});

import Server from '../server';
import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import DataObject from '../models/data-object';

describe('Data Route', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({name: 'test', level: 'fatal'});
        await mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true});
        this.server = new Server({config, logger});
        this.request = agent(this.server.serverCallback);
    });

    after(async function () {
        await mongoose.connection.close();
    });

    beforeEach(async function f() {
        await DataObject.deleteMany({});
    });

    describe('POST /data/:id', () => {
        it('should create new item', async function () {
            const record = {
                "oihUid": "some-oih-id",
                "modelId": "some-model-id",
                "content": {
                    "some": "data"
                },
                "refs": [
                    {
                        "applicationUid": "app-id",
                        "recordUid": "record-id",
                        "modificationHistory": [
                            {
                                "user": "user1",
                                "operation": "put",
                                "timestamp": "2019-07-18T13:37:50.867Z"
                            }
                        ]
                    }
                ]
            };

            const { body, statusCode } = await this.request
                .post('/data')
                .send(record);

            expect(body).to.be.a('object');
            expect(body).to.haveOwnProperty('data');
            expect(body.data.id).to.be.a('string');
            delete body.data.id;
            expect(body.data).to.deep.equal(record);
            expect(statusCode).to.equal(201);
        });
    });

    describe('PUT /data/:id', () => {
        it('should rewrite existing object', async function () {
            const record = {
                "oihUid": "some-oih-id",
                "modelId": "some-model-id",
                "content": {
                    "some": "data"
                },
                "refs": [
                    {
                        "applicationUid": "app-id",
                        "recordUid": "record-id",
                        "modificationHistory": [
                            {
                                "user": "user1",
                                "operation": "put",
                                "timestamp": "2019-07-18T13:37:50.867Z"
                            }
                        ]
                    }
                ]
            };

            let { body, statusCode } = await this.request
                .post('/data')
                .send(record);

            expect(body).to.haveOwnProperty('data');
            expect(statusCode).to.equal(201);

            const recordId = body.data.id;
            const newRecord = {
                "oihUid": "new-oih-id",
                "modelId": "new-model-id",
                "content": {
                    "some": "new data"
                }
            };
            const res = await this.request
                .put(`/data/${recordId}`)
                .send(newRecord);
            expect(res.body).to.be.a('object');
            expect(res.body).to.haveOwnProperty('data');
            expect(res.body.data.id).to.be.a('string');
            delete res.body.data.id;
            expect(res.body.data).to.deep.equal(newRecord);
            expect(statusCode).to.equal(201);
        });
    });

    describe('PATCH /data/:id', () => {
        it('should patch existing object', async function () {
            const record = {
                "oihUid": "some-oih-id",
                "modelId": "some-model-id",
                "content": {
                    "some": "data"
                },
                "refs": [
                    {
                        "applicationUid": "app-id",
                        "recordUid": "record-id",
                        "modificationHistory": [
                            {
                                "user": "user1",
                                "operation": "put",
                                "timestamp": "2019-07-18T13:37:50.867Z"
                            }
                        ]
                    }
                ]
            };

            let { body, statusCode } = await this.request
                .post('/data')
                .send(record);

            expect(body).to.haveOwnProperty('data');
            expect(statusCode).to.equal(201);

            const recordId = body.data.id;
            const patchRecord = {
                "oihUid": "new-oih-id",
                "modelId": "new-model-id",
                "content": {
                    "some": "new data"
                },
                "refs": [
                    {
                        "applicationUid": "new-app-id",
                        "recordUid": "new-record-id",
                        "modificationHistory": [
                            {
                                "user": "user1",
                                "operation": "put",
                                "timestamp": "2019-07-18T13:37:50.867Z"
                            }
                        ]
                    }
                ]
            };
            const res = await this.request
                .patch(`/data/${recordId}`)
                .send(patchRecord);
            expect(res.body).to.be.a('object');
            expect(res.body).to.haveOwnProperty('data');
            expect(res.body.data.id).to.be.a('string');
            delete res.body.data.id;
            expect(res.body.data).to.deep.equal(patchRecord);
            expect(statusCode).to.equal(201);
        });
    });

    describe('GET /data', () => {
        it('should get empty response', async function () {
            const { body, statusCode } = await this.request
                .get('/data');

            expect(body).to.deep.equal({
                data: [],
                meta: {}
            });
            expect(statusCode).to.equal(200);
        });

        it('should return multiple items', async function f() {
            let res = await this.request
                .post('/data')
                .send({
                    "oihUid": "some-oih-id-1",
                    "modelId": "some-model-id-1",
                    "content": {
                        "some": "data"
                    }
                });

            expect(res.statusCode).to.equal(201);
            const id1 = res.body.data.id;

            res = await this.request
                .post('/data')
                .send({
                    "oihUid": "some-oih-id-2",
                    "modelId": "some-model-id-2",
                    "content": {
                        "some": "data"
                    }
                });
            expect(res.statusCode).to.equal(201);
            const id2 = res.body.data.id;

            res = await this.request.get('/data');
            expect(res.body.data).to.deep.equal([
                {
                    "id": id1,
                    "oihUid": "some-oih-id-1",
                    "modelId": "some-model-id-1",
                    "content": {
                        "some": "data"
                    },
                    "refs": []
                },
                {
                    "id": id2,
                    "oihUid": "some-oih-id-2",
                    "modelId": "some-model-id-2",
                    "content": {
                        "some": "data"
                    },
                    "refs": []
                }
            ]);
        });
    });
});

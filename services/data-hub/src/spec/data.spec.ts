import Server from '../server';
import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import DataObject from '../models/data-object';
import nock from 'nock';

function nockIamIntrospection({status = 200, body = {sub: 'user-id', role: 'ADMIN'}} = {}) {
    return nock('http://iam.openintegrationhub.com')
        .post('/api/v1/tokens/introspect')
        .reply(status, body);
}

describe('Data Route', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({name: 'test', level: 'fatal'});
        await mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true});
        this.server = new Server({config, logger});
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer blablabla';
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
                "domainId": "my-domain",
                "schemaUri": "my-schema",
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

            const scope = nockIamIntrospection();
            const { body, statusCode } = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send(record);

            expect(body).to.be.a('object');
            expect(body).to.haveOwnProperty('data');
            expect(body.data.id).to.be.a('string');
            delete body.data.id;
            expect(body.data).to.deep.equal(Object.assign(record, {
                owners: [{id: 'user-id', type: 'user'}]
            }));
            expect(statusCode).to.equal(201);
        });
    });

    describe('PUT /data/:id', () => {
        it('should rewrite existing object', async function () {
            const record = {
                "domainId": "my-domain",
                "schemaUri": "my-schema",
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

            nockIamIntrospection();
            let { body, statusCode } = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send(record);

            expect(body).to.haveOwnProperty('data');
            expect(statusCode).to.equal(201);

            const recordId = body.data.id;
            const newRecord = {
                "domainId": "my-domain",
                "schemaUri": "my-schema",
                "content": {
                    "some": "new data"
                }
            };
            nockIamIntrospection();
            const res = await this.request
                .put(`/data/${recordId}`)
                .set('Authorization', this.auth)
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
                "domainId": "my-domain",
                "schemaUri": "my-schema",
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

            nockIamIntrospection();
            let { body, statusCode } = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send(record);

            expect(body).to.haveOwnProperty('data');
            expect(statusCode).to.equal(201);

            const recordId = body.data.id;
            const patchRecord = {
                "domainId": "my-domain",
                "schemaUri": "my-schema",
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

            nockIamIntrospection();
            const res = await this.request
                .patch(`/data/${recordId}`)
                .set('Authorization', this.auth)
                .send(patchRecord);
            expect(res.body).to.be.a('object');
            expect(res.body).to.haveOwnProperty('data');
            expect(res.body.data.id).to.be.a('string');
            delete res.body.data.id;
            expect(res.body.data).to.deep.equal(Object.assign(patchRecord, {
                owners: [{id: 'user-id', type: 'user'}]
            }));
            expect(statusCode).to.equal(201);
        });
    });

    describe('GET /data', () => {
        it('should get empty response', async function () {
            nockIamIntrospection();
            const { body, statusCode } = await this.request
                .get('/data')
                .set('Authorization', this.auth);

            expect(body).to.deep.equal({
                data: [],
                meta: {
                    page: 1,
                    perPage: 50,
                    total: 0,
                    totalPages: 0
                }
            });
            expect(statusCode).to.equal(200);
        });

        it('should return multiple items', async function f() {
            nockIamIntrospection();
            let res = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send({
                    "domainId": "my-domain",
                    "schemaUri": "my-schema",
                    "content": {
                        "some": "data"
                    }
                });

            expect(res.statusCode).to.equal(201);
            const id1 = res.body.data.id;

            nockIamIntrospection();
            res = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send({
                    "domainId": "my-domain",
                    "schemaUri": "my-schema",
                    "content": {
                        "some": "data"
                    }
                });
            expect(res.statusCode).to.equal(201);
            const id2 = res.body.data.id;

            nockIamIntrospection();
            res = await this.request
                .get('/data')
                .set('Authorization', this.auth);
            expect(res.body).to.deep.equal({
                data: [
                    {
                        "id": id1,
                        "domainId": "my-domain",
                        "schemaUri": "my-schema",
                        "content": {
                            "some": "data"
                        },
                        "refs": [],
                        "owners": [{"id": "user-id", "type": "user"}]
                    },
                    {
                        "id": id2,
                        "domainId": "my-domain",
                        "schemaUri": "my-schema",
                        "content": {
                            "some": "data"
                        },
                        "refs": [],
                        "owners": [{"id": "user-id", "type": "user"}]
                    }
                ],
                meta: {
                    page: 1,
                    perPage: 50,
                    total: 2,
                    totalPages: 1
                }
            });
        });

        it('should return only 2-nd page', async function f() {
            nockIamIntrospection();
            let res = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send({
                    "domainId": "my-domain",
                    "schemaUri": "my-schema",
                    "content": {
                        "some": "data"
                    }
                });

            expect(res.statusCode).to.equal(201);

            nockIamIntrospection();
            res = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send({
                    "domainId": "my-domain",
                    "schemaUri": "my-schema",
                    "content": {
                        "some": "data"
                    }
                });
            expect(res.statusCode).to.equal(201);
            const id2 = res.body.data.id;

            nockIamIntrospection();
            res = await this.request
                .get('/data?page[number]=2&page[size]=1')
                .set('Authorization', this.auth);
            expect(res.body).to.deep.equal({
                data: [
                    {
                        "id": id2,
                        "domainId": "my-domain",
                        "schemaUri": "my-schema",
                        "content": {
                            "some": "data"
                        },
                        "refs": [],
                        "owners": [{"id": "user-id", "type": "user"}]
                    }
                ],
                meta: {
                    page: 2,
                    perPage: 1,
                    total: 2,
                    totalPages: 2
                }
            });
        });
    });
});

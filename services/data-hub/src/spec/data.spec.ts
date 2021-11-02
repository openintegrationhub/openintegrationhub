import Server from '../server';
import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import DataObject from '../models/data-object';
import nock from 'nock';

function nockIamIntrospection({
    status = 200,
    body = { sub: 'user-id', role: 'ADMIN', permissions: ['all'] },
    body2 = { sub: 'user-id2', role: 'ADMIN', permissions: ['all'] }
} = {}
) {
    // return nock('http://iam.openintegrationhub.com')
    //     .post('/api/v1/tokens/introspect')
    //     .reply(status, body);

    nock('http://iam.openintegrationhub.com')
        .post('/api/v1/tokens/introspect', {
            token: 'someOtherUser',
        })
        .reply(status, body2);

    nock('http://iam.openintegrationhub.com')
        .post('/api/v1/tokens/introspect', {
            token: 'blablabla',
        })
        .reply(status, body);

    return;
}

let objectId: any;

describe('Data Route', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });
        const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri);
        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer blablabla';
    });

    after(async ()  => {
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
            objectId = body.data.id;
            delete body.data.id;
            expect(body.data).to.deep.equal(Object.assign(record, {
                owners: [{ id: 'user-id', type: 'user' }]
            }));
            expect(statusCode).to.equal(201);
        });
    });

    describe('POST /data/recordId', () => {
        it('should create new item with recordId', async function () {
            const record = {
                "applicationUid": "app-id",
                "recordUid": "record-id",
            };

            const scope = nockIamIntrospection();
            const { body, statusCode } = await this.request
                .post('/data/recordId')
                .set('Authorization', this.auth)
                .send(record);

            expect(body).to.be.a('object');

            expect(body).to.haveOwnProperty('action');
            expect(body.action).to.equal('insert');

            expect(body).to.haveOwnProperty('data');
            expect(body.data.id).to.be.a('string');
            objectId = body.data.id;
            delete body.data.id;
            expect(body.data).to.deep.equal({
                refs: [
                    { recordUid: 'record-id', applicationUid: 'app-id', modificationHistory: [] }
                ],
                owners: [{ id: 'user-id', type: 'user' }],
            });
            expect(statusCode).to.equal(201);
        });

        it('should update existing item with recordId', async function () {
            const record = {
                recordUid: 'record',
                applicationUid: 'app'
            };


            let scope = nockIamIntrospection();

            // Create
            const createResponse = await this.request
                .post('/data/recordId')
                .set('Authorization', 'Bearer someOtherUser')
                .send(record);

            const oihUid = createResponse.body.data.id;

            scope = nockIamIntrospection();

            const anotherRecord = {
                oihUid,
                recordUid: 'another-record',
                applicationUid: 'another-app'
            };


            // Update
            const { body, statusCode } = await this.request
                .post('/data/recordId')
                .set('Authorization', this.auth)
                .send(anotherRecord);

            expect(body).to.be.a('object');

            expect(body).to.haveOwnProperty('action');
            expect(body.action).to.equal('update');

            expect(body).to.haveOwnProperty('data');
            expect(body.data.id).to.be.a('string');
            objectId = body.data.id;
            delete body.data.id;
            expect(body.data.refs).to.deep.equal([
                {
                    recordUid: 'record',
                    applicationUid: 'app',
                    modificationHistory: []
                },
                {
                    recordUid: 'another-record',
                    applicationUid: 'another-app',
                    modificationHistory: []
                }
            ]);
            expect(statusCode).to.equal(201);
        });

        it('should update existing item as an different user with recordId', async function () {
            const record = {
                recordUid: 'record',
                applicationUid: 'app'
            };


            let scope = nockIamIntrospection();

            // Create
            const createResponse = await this.request
                .post('/data/recordId')
                .set('Authorization', this.auth)
                .send(record);

            const oihUid = createResponse.body.data.id;

            scope = nockIamIntrospection();

            const anotherRecord = {
                oihUid,
                recordUid: 'another-record',
                applicationUid: 'another-app'
            };


            // Update
            const { body, statusCode } = await this.request
                .post('/data/recordId')
                .set('Authorization', this.auth)
                .send(anotherRecord);

            expect(body).to.be.a('object');

            expect(body).to.haveOwnProperty('action');
            expect(body.action).to.equal('update');

            expect(body).to.haveOwnProperty('data');
            expect(body.data.id).to.be.a('string');
            objectId = body.data.id;
            delete body.data.id;
            expect(body.data.refs).to.deep.equal([
                {
                    recordUid: 'record',
                    applicationUid: 'app',
                    modificationHistory: []
                },
                {
                    recordUid: 'another-record',
                    applicationUid: 'another-app',
                    modificationHistory: []
                }
            ]);
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

            const { body, statusCode } = await this.request
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


        it('should not change existing object if nothing is new', async function () {
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
            // Post record
            await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send(record);

            // Write without waiting
            nockIamIntrospection();
            this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send(record);

            // Post same record again
            nockIamIntrospection();
            const { body, statusCode } = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send(record);


            expect(body).to.haveOwnProperty('data');
            expect(statusCode).to.equal(201);

            const recordId = body.data.id;

            const modificationHistory: any[] = [];
            const newRecord = {
                "domainId": "my-domain",
                "schemaUri": "my-schema",
                "content": {
                    "some": "new data"
                },
                "refs": [{
                    applicationUid: 'app-id',
                    recordUid: 'record-id',
                    modificationHistory,
                }],
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
            const { body, statusCode } = await this.request
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
                owners: [{ id: 'user-id', type: 'user' }]
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
                        "owners": [{ "id": "user-id", "type": "user" }]
                    },
                    {
                        "id": id2,
                        "domainId": "my-domain",
                        "schemaUri": "my-schema",
                        "content": {
                            "some": "data"
                        },
                        "refs": [],
                        "owners": [{ "id": "user-id", "type": "user" }]
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
                        "owners": [{ "id": "user-id", "type": "user" }]
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

        it('should return only elements with min score', async function f() {
            nockIamIntrospection();
            let res = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send({
                    "domainId": "my-domain",
                    "schemaUri": "my-schema",
                    "content": {
                        "some": "data"
                    },
                    "enrichmentResults": {
                      "score": 5
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
                    },
                    "enrichmentResults": {
                      "score": 10
                    }
                });
            expect(res.statusCode).to.equal(201);
            const id2 = res.body.data.id;

            nockIamIntrospection();
            res = await this.request
                .get('/data?min_score=10')
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
                        "owners": [{ "id": "user-id", "type": "user" }],
                        "enrichmentResults": {
                          "score": 10
                        }
                    }
                ],
                meta: {
                    page: 1,
                    perPage: 50,
                    total: 1,
                    totalPages: 1
                }
            });
        });

        it('should return only elements with duplicates or subsets', async function f() {
            nockIamIntrospection();
            let res = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send({
                    "domainId": "my-domain",
                    "schemaUri": "my-schema",
                    "content": {
                        "some": "data"
                    },
                    "enrichmentResults": {
                      "knownSubsets": ["abcdef"]
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
                    },
                    "enrichmentResults": {
                      "knownDuplicates": ["defgh"]
                    }
                });
            expect(res.statusCode).to.equal(201);
            const id2 = res.body.data.id;

            nockIamIntrospection();
            res = await this.request
                .get('/data?has_duplicates=true')
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
                        "owners": [{ "id": "user-id", "type": "user" }],
                        "enrichmentResults": {
                          "knownDuplicates": ["defgh"]
                        }
                    }
                ],
                meta: {
                    page: 1,
                    perPage: 50,
                    total: 1,
                    totalPages: 1
                }
            });

            nockIamIntrospection();
            res = await this.request
                .get('/data?has_subsets=true')
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
                        "owners": [{ "id": "user-id", "type": "user" }],
                        "enrichmentResults": {
                          "knownSubsets": ["abcdef"]
                        }
                    }
                ],
                meta: {
                    page: 1,
                    perPage: 50,
                    total: 1,
                    totalPages: 1
                }
            });
        });
    });
});


describe('GET /data/:id and /data/recordId/:id', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });
        const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri);
        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer blablabla';
    });

    after(async ()  => {
        await mongoose.connection.close();
    });

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
        objectId = body.data.id;
        delete body.data.id;
        expect(body.data).to.deep.equal(Object.assign(record, {
            owners: [{ id: 'user-id', type: 'user' }]
        }));
        expect(statusCode).to.equal(201);

    });

    it('should get an entry by id', async function () {
        nockIamIntrospection();
        const { body, statusCode } = await this.request
            .get(`/data/${objectId}`)
            .set('Authorization', this.auth);

        expect(body.data.id).to.not.be.empty;

        delete body.data.id;

        expect(body).to.deep.equal({
            "data": {
                "content": {
                    "some": "data",
                },
                "domainId": "my-domain",
                "owners": [
                    {
                        "id": "user-id",
                        "type": "user"
                    }
                ],
                "refs": [
                    {
                        "applicationUid": "app-id",
                        "modificationHistory": [
                            {
                                "operation": "put",
                                "timestamp": "2019-07-18T13:37:50.867Z",
                                "user": "user1"
                            }
                        ],
                        "recordUid": "record-id",
                    },
                ],
                "schemaUri": "my-schema",
            },
        });
        expect(statusCode).to.equal(200);
    });

    it('should get an entry by recordId', async function () {
        nockIamIntrospection();
        const { body, statusCode } = await this.request
            .get('/data/recordId/record-id')
            .set('Authorization', this.auth);

        expect(body.data.id).to.not.be.empty;

        delete body.data.id;

        expect(body).to.deep.equal({
            "data": {
                "content": {
                    "some": "data",
                },
                "domainId": "my-domain",
                "owners": [
                    {
                        "id": "user-id",
                        "type": "user"
                    }
                ],
                "refs": [
                    {
                        "applicationUid": "app-id",
                        "modificationHistory": [
                            {
                                "operation": "put",
                                "timestamp": "2019-07-18T13:37:50.867Z",
                                "user": "user1"
                            }
                        ],
                        "recordUid": "record-id",
                    },
                ],
                "schemaUri": "my-schema",
            },
        });
        expect(statusCode).to.equal(200);
    });
});

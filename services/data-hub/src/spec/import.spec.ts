import Server from '../server';
import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import nock from 'nock';

import DataObject from '../models/data-object';
import getDummyOihPersons, { Person } from '../util/getDummyOihPersons';

function nockIamIntrospection({
    status = 200,
    body = { sub: 'user-id', role: 'ADMIN', permissions: ['all'] },
} = {}
) {
    nock('http://iam.openintegrationhub.com')
        .persist()
        .post('/api/v1/tokens/introspect', {
            token: 'foobar',
        })
        .reply(status, body);

    return;
}

const PERSONS_SET_LENGTH = 100

describe('Data Import Route', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { useNewUrlParser: true });
        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer foobar';
        await DataObject.deleteMany({});
        nockIamIntrospection();
    });

    after(async ()  => {
        await mongoose.connection.close();
    });

    describe('POST /data/import', () => {
        it('should import many items', async function () {
            this.timeout(5000);

            const records = []

            getDummyOihPersons(PERSONS_SET_LENGTH).forEach(person => records.push(
                {
                    domainId: "my-domain",
                    schemaUri: "my-schema",
                    content: {
                        ...person.data
                    },
                    refs: [
                        {
                            applicationUid: "app-id",
                            recordUid: person.metadata.recordUid,
                            modificationHistory: [
                                {
                                    user: "user-id",
                                    operation: "import",
                                    timestamp: (new Date()).toISOString()
                                }
                            ]
                        }
                    ]
                }
            ))

            getDummyOihPersons(PERSONS_SET_LENGTH).forEach(person => records.push(
                {
                    domainId: "my-domain2",
                    schemaUri: "my-schema",
                    content: {
                        ...person.data
                    },
                    refs: [
                        {
                            applicationUid: "app-id",
                            recordUid: person.metadata.recordUid,
                            modificationHistory: [
                                {
                                    user: "user-id",
                                    operation: "import",
                                    timestamp: (new Date()).toISOString()
                                }
                            ]
                        }
                    ]
                }
            ))

            getDummyOihPersons(PERSONS_SET_LENGTH).forEach(person => records.push(
                {
                    domainId: "my-domain2",
                    schemaUri: "my-schema2",
                    content: {
                        ...person.data
                    },
                    refs: [
                        {
                            applicationUid: "app-id",
                            recordUid: person.metadata.recordUid,
                            modificationHistory: [
                                {
                                    user: "user-id",
                                    operation: "import",
                                    timestamp: (new Date()).toISOString()
                                }
                            ]
                        }
                    ]
                }
            ))
            
            await this.request
                .post('/data/import')
                .set('Authorization', this.auth)
                .send(records)
                .expect(201)

        });

        it('should return 400 if wrong request format', async function () {

            await this.request
                .post('/data/import')
                .set('Authorization', this.auth)
                .send()
                .expect(400)

            await this.request
                .post('/data/import')
                .set('Authorization', this.auth)
                .send([])
                .expect(400)

        });
    });

    describe('Export with GET /data', () => {
        it('should export all data objects owned', async function () {
            const { body } = await this.request
                .get('/data')
                .set('Authorization', this.auth)
                .expect(200)
            
            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 3 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(3 * PERSONS_SET_LENGTH / 50)
            });

        });

        it('should export all data objects owned by requester with matching query param "domainId"', async function () {
            let body = (await this.request
                .get('/data')
                .query({ "domain_id": 'my-domain' })
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 1 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(1 * PERSONS_SET_LENGTH / 50)
            });

            body.data.forEach((dataObject) => {
                expect(dataObject.domainId).to.equal("my-domain")
            })

            body = (await this.request
                .get('/data')
                .query({ "domain_id": 'my-domain2' })
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 2 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(2 * PERSONS_SET_LENGTH / 50)
            });

            body.data.forEach((dataObject) => {
                expect(dataObject.domainId).to.equal("my-domain2")
            })
        });

        it('should export all data objects owned by requester with matching query param "schemaUri"', async function () {
            let body = (await this.request
                .get('/data')
                .query({ "schema_uri": 'my-schema' })
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 2 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(2 * PERSONS_SET_LENGTH / 50)
            });

            body.data.forEach((dataObject) => {
                expect(dataObject.schemaUri).to.equal("my-schema")
            })

            body = (await this.request
                .get('/data')
                .query({ "schema_uri": 'my-schema2' })
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 1 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(1 * PERSONS_SET_LENGTH / 50)
            });

            body.data.forEach((dataObject) => {
                expect(dataObject.schemaUri).to.equal("my-schema2")
            })
        });
    });
});

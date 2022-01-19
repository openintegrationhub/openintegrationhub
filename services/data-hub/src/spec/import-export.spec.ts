import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import nock from 'nock';

import Server from '../server';
import DataObject from '../models/data-object';
import getDummyOihPersons from '../util/getDummyOihPersons';

function nockIamIntrospection(user = {}) {
    nock('http://iam.openintegrationhub.com')
        .post('/api/v1/tokens/introspect')
        .reply(200, user);
    return;
}

const PERSONS_SET_LENGTH = 100

const user1 = { sub: 'user1', role: 'USER', permissions: [], tenant: "tenant1" }

const admin2 = { sub: 'admin2', role: 'ADMIN', permissions: ["all"], tenant: "tenant2" }
const tenantAdmin2 = { sub: 'tenant-admin2', role: 'TENANT_ADMIN', permissions: ["tenant.all"], tenant: "tenant2" }
const user2 = { sub: 'user2', role: 'USER', permissions: [], tenant: "tenant2" }

const admin = { sub: 'admin', role: 'ADMIN', permissions: ["all"], tenant: "tenant3" }
const tenantAdmin = { sub: 'tenant-admin', role: 'TENANT_ADMIN', permissions: ["tenant.all"], tenant: "tenant3" }
const user3 = { sub: 'user3', role: 'USER', permissions: [], tenant: "tenant3" }


describe('Mass Data Handling', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });
        const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri);
        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer justSomeToken';
        await DataObject.deleteMany({});
    });

    after(async ()  => {
        await mongoose.connection.close();
    });

    describe('POST /data/import', () => {
        it('should import many items', async function () {
            this.timeout(5000);

            type Record = {
                domainId: string;
                schemaUri: string;
                content: any;
                refs: any[];
              };

            let records: Record[] = []

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
                                    user: user1.sub,
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
                                    user: user1.sub,
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
                                    user: user1.sub,
                                    operation: "import",
                                    timestamp: (new Date()).toISOString()
                                }
                            ]
                        }
                    ]
                }
            ))
            
            nockIamIntrospection(user1);

            await this.request
                .post('/data/import')
                .set('Authorization', this.auth)
                .send(records)
                .expect(201)
            
            records = []

            getDummyOihPersons(PERSONS_SET_LENGTH).forEach(person => records.push(
                {
                    domainId: "my-domain1",
                    schemaUri: "my-schema1",
                    content: {
                        ...person.data
                    },
                    refs: [
                        {
                            applicationUid: "app-id",
                            recordUid: person.metadata.recordUid,
                            modificationHistory: [
                                {
                                    user: user2.sub,
                                    operation: "import",
                                    timestamp: (new Date()).toISOString()
                                }
                            ]
                        }
                    ]
                }
            ))
                
            nockIamIntrospection(user2);
    
            await this.request
                .post('/data/import')
                .set('Authorization', this.auth)
                .send(records)
                .expect(201)

        });

        it('should return 400 if wrong request format', async function () {

            nockIamIntrospection(user1);

            await this.request
                .post('/data/import')
                .set('Authorization', this.auth)
                .send()
                .expect(400)

            nockIamIntrospection(user1);
            
            await this.request
                .post('/data/import')
                .set('Authorization', this.auth)
                .send([])
                .expect(400)

        });
    });

    describe('Export with GET /data', () => {
        it('should export all data objects owned by user1', async function () {

            nockIamIntrospection(user1);

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

        it('should export all data objects owned by user2', async function () {

            nockIamIntrospection(user2);

            const { body } = await this.request
                .get('/data')
                .set('Authorization', this.auth)
                .expect(200)
            
            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 1 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(1 * PERSONS_SET_LENGTH / 50)
            });

        });

        it('should get empty result list if user does not own any record', async function () {

            nockIamIntrospection(user3);

            const { body } = await this.request
                .get('/data')
                .set('Authorization', this.auth)
                .expect(200)
            
            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 0 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(0 * PERSONS_SET_LENGTH / 50)
            });

        });

        it('should export all data objects if user is an admin', async function () {

            nockIamIntrospection(admin);

            const { body } = await this.request
                .get('/data')
                .set('Authorization', this.auth)
                .expect(200)
            
            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 4 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(4 * PERSONS_SET_LENGTH / 50)
            });

        });


        it('should export all data objects owned by requester with matching query param "domainId"', async function () {

            nockIamIntrospection(user1);

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

            nockIamIntrospection(user1);

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

            nockIamIntrospection(user1);

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

            nockIamIntrospection(user1);

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

        it('should export all data objects by tenant if requester is admin', async function () {

            nockIamIntrospection(admin);

            let body = (await this.request
                .get('/data')
                .query({ "tenant": 'tenant1' })
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 3 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(3 * PERSONS_SET_LENGTH / 50)
            });

            body.data.forEach((dataObject) => {
                expect(dataObject.tenant).to.equal("tenant1")
            })

            nockIamIntrospection(admin);

            body = (await this.request
                .get('/data')
                .query({ "tenant": 'tenant1' , "schema_uri": "my-schema2"})
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 1 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(1 * PERSONS_SET_LENGTH / 50)
            });

            body.data.forEach((dataObject) => {
                expect(dataObject.tenant).to.equal("tenant1")
                expect(dataObject.schemaUri).to.equal("my-schema2")
            })

            nockIamIntrospection(admin);

            body = (await this.request
                .get('/data')
                .query({ "tenant": 'tenant2' })
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.meta).to.deep.equal({
                page: 1,
                perPage: 50,
                total: 1 * PERSONS_SET_LENGTH,
                totalPages: Math.ceil(1 * PERSONS_SET_LENGTH / 50)
            });

            body.data.forEach((dataObject) => {
                expect(dataObject.tenant).to.equal("tenant2")
            })
        });
    });

    describe('Get record status with GET /data/status', () => {

        it('should send a record status if requester is admin or tenant admin', async function () {

            nockIamIntrospection(admin);

            let body = (await this.request
                .get('/data/status')
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.data.totalRecords).to.equal(4 * PERSONS_SET_LENGTH);

            nockIamIntrospection(tenantAdmin);

            body = (await this.request
                .get('/data/status')
                .set('Authorization', this.auth)
                .expect(200)).body

            expect(body.data.totalRecords).to.equal(0 * PERSONS_SET_LENGTH);

            nockIamIntrospection(user1);

            body = (await this.request
                .get('/data/status')
                .set('Authorization', this.auth)
                .expect(403)).body
            
            nockIamIntrospection(admin2);

            body = (await this.request
                .get('/data/status')
                .query({
                    tenant: "tenant2",
                })
                .set('Authorization', this.auth)
                .expect(200)).body
    
            expect(body.data.totalRecords).to.equal(1 * PERSONS_SET_LENGTH);

            nockIamIntrospection(tenantAdmin2);

            body = (await this.request
                .get('/data/status')
                .set('Authorization', this.auth)
                .expect(200)).body
    
            expect(body.data.totalRecords).to.equal(1 * PERSONS_SET_LENGTH);

            nockIamIntrospection(tenantAdmin2);

            await this.request
                .get('/data/status')
                .query({
                    tenant: "tenant1",
                })
                .set('Authorization', this.auth)
                .expect(403)

        });
    });
});

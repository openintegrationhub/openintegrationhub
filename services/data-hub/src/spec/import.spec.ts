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
    // body2 = { sub: 'user-id2', role: 'ADMIN', permissions: ['all'] }
} = {}
) {
    // nock('http://iam.openintegrationhub.com')
    //     .post('/api/v1/tokens/introspect', {
    //         token: 'someOtherUser',
    //     })
    //     .reply(status, body2);

    nock('http://iam.openintegrationhub.com')
        .post('/api/v1/tokens/introspect', {
            token: 'foobar',
        })
        .reply(status, body);

    return;
}

describe('Data Import Route', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test-import'
        await mongoose.connect(mongoUri, { useNewUrlParser: true });
        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer foobar';
    });

    after(async function () {
        await mongoose.connection.close();
    });

    beforeEach(async function f() {
        await DataObject.deleteMany({});
    });

    describe('POST /data/import', () => {
        it('should create new item', async function () {

            nockIamIntrospection();

            const persons: Person[] = getDummyOihPersons(1000)
            const records = []

            persons.forEach(person => records.push(
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
            
            const { statusCode } = await this.request
                .post('/data')
                .set('Authorization', this.auth)
                .send(records);

            expect(statusCode).to.equal(201);

        });
    });
});

import Server from '../server';
import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import DataObject from '../models/data-object';
import nock from 'nock';

import scoreObject from '../handlers/scorer';

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

let uid: any;

const testEntry : any = {
  domainId: '',
  schemaUri: '',
  meta: {},
  content: {
      firstName: 'James',
      lastName: 'Blond',
  },
};

const configuration = {
         "functions":[
            {
               "name":"score",
               "active":true,
               "fields":[
                  {
                     "key":"firstName",
                     "minLength":5,
                     "weight":2
                  }
               ]
            }
         ]
      };


describe.only('Data Enrichment and Cleansing', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { useNewUrlParser: true });
        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer blablabla';
    });

    after(async function () {
        await mongoose.connection.close();
    });

    beforeEach(async function f() {
        await DataObject.deleteMany({});

        uid = await DataObject.create(testEntry);
        uid = uid._id;
        // refs: [],
        // owners: []

        console.log('Uid:', uid);

    });

    describe('scorer', () => {
        it('should score test entry correctly', async function () {
            const result = scoreObject(testEntry, configuration.functions[0].fields);
            console.log('Result:');
            console.log(JSON.stringify(result));

            expect(result.domainId).to.exist;
            expect(result.schemaUri).to.exist;

            expect(result.meta).to.be.an('object');

            expect(result.meta.score).to.be.equal(0);
            expect(result.meta.normalizedScore).to.be.equal(0);

            expect(result.content).to.be.an('object');

            expect(result.content.firstName).to.be.equal('James');
            expect(result.content.lastName).to.be.equal('Blond');
        });
    });

    describe('POST /data/apply', () => {
        it('should start scorer', async function () {
            const scope = nockIamIntrospection();
            const { text, statusCode } = await this.request
                .post('/data/apply')
                .set('Authorization', this.auth)
                .send(configuration);

            expect(statusCode).to.equal(200);

            expect(text).to.be.equal('Preparing data');
        });

        it('should correctly fail if configuration is missing', async function () {
            const configuration = {
                  };

            const scope = nockIamIntrospection();
            const { text, statusCode } = await this.request
                .post('/data/apply')
                .set('Authorization', this.auth)
                .send(configuration);

            expect(statusCode).to.equal(500);
            expect(text).to.be.equal('No functions configured');
        });
    });


});

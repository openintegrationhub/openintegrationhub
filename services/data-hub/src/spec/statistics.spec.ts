import Server from '../server';
import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import DataObject from '../models/data-object';
import nock from 'nock';


function nockIamIntrospection({
    status = 200,
    body = { sub: 'user-id', role: 'ADMIN', permissions: ['all'] }
    } = {}
  ) {

    nock('http://iam.openintegrationhub.com')
        .post('/api/v1/tokens/introspect', {
          token: 'blablabla',
        })
        .reply(status, body);

    return;
}


describe('Data Statistics', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });
        const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri);
        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer blablabla';


        const obj1 = new DataObject({
          domainId: '',
          schemaUri: '',
          owners: [{id: 'user-id', type: 'user'}],
          content: {
            firstName: 'Jane',
            lastName: 'Doe',
            birthday: '1.1.1980'
          },
          enrichmentResults: {
            score: 15,
            knownSubsets: ['abcd', 'defg']
          }
        })

        const obj2 = new DataObject({
          domainId: '',
          schemaUri: '',
          owners: [{id: 'user-id', type: 'user'}],
          content: {
            firstName: 'Jane',
            lastName: 'Doe',
          },
          enrichmentResults: {
            score: 7,
            knownDuplicates: ['abcd']
          }
        })

        const obj3 = new DataObject({
          domainId: '',
          schemaUri: '',
          owners: [{id: 'user-id', type: 'user'}],
          content: {
            firstName: 'Jane',
            lastName: 'Doe',
          },
          enrichmentResults: {
            score: 7,
            knownDuplicates: ['defg']
          }
        })

        const obj4 = new DataObject({
          domainId: '',
          schemaUri: '',
          owners: [{id: 'user-id', type: 'user'}],
          content: {
            firstName: 'Jimmy',
            lastName: 'Dinny',
          },
          enrichmentResults: {
            score: 4,
          }
        })

        await obj1.save();
        await obj2.save();
        await obj3.save();
        await obj4.save();
    });

    after(async function () {
        await DataObject.deleteMany({});
        await mongoose.connection.close();
    });


    it('should return the correct statistics', async function () {
      const scope = nockIamIntrospection();
      const { body, statusCode } = await this.request
          .get('/data/statistics')
          .set('Authorization', this.auth)

      expect(statusCode).to.equal(200);
      expect(body.data).to.be.deep.equal({
        scores: {
          '4': 1,
          '7': 2,
          '15': 1
        },
        duplicateCount: 2,
        subsetCount: 2,
        uniqueCount: 1
      });

    });

});

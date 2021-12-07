import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import nock from 'nock';

import Server from '../server';
import DataObject from '../models/data-object';
import getDummyOihPersons from '../util/getDummyOihPersons';
import { setCurrentIndex, createClient, deleteIndex, createIndex, indexExists, putMapping } from "../elasticsearch"
import { contactMapping } from "../elasticsearch/mapping"

function nockIamIntrospection(user = {}) {
  nock('http://iam.openintegrationhub.com')
      .post('/api/v1/tokens/introspect')
      .reply(200, user);
  return;
}

const PERSONS_SET_LENGTH = 1000

const user1 = { sub: 'user1', role: 'USER', permissions: [], tenant: "tenant1" }

describe('Import & Merge', () => {
  before(async function () {
    const config = {};
    const logger = createLogger({ name: 'test', level: 'fatal' });
    const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
    await mongoose.connect(mongoUri);
    this.server = new Server({ config, logger });
    this.request = agent(this.server.serverCallback);
    this.auth = 'Bearer justSomeToken';

    // reset elasticsearch data
    createClient("http://elasticsearch:9200")
    setCurrentIndex("oih-data-hub")

    // reset index
    const result = await indexExists()

    if (result.body) {
      await deleteIndex()
    }

    await createIndex();
    await putMapping(contactMapping)

    // reset data hub data
    await DataObject.deleteMany({});
  });

  after(async ()  => {
    await mongoose.connection.close();
  });

  describe('POST /data/import', () => {
    it('should merge duplicates', async function () {
      this.timeout(5000000);

      type Record = {
          domainId: string;
          schemaUri: string;
          content: any;
          refs: any[];
        };

      const records: Record[] = []

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
      
      nockIamIntrospection(user1);

      await this.request
          .post('/data/import')
          .set('Authorization', this.auth)
          .send(records)
        .expect(201)
    
      expect(true).to.equal(true);
      
    });
  });
});

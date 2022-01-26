import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import nock from 'nock';
import mergeContacts from "../util/merge-contacts"
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

const PERSONS_SET_LENGTH = 100

const user1 = { sub: 'user1', role: 'USER', permissions: [], tenant: "tenant1" }

describe('Import & Merge', () => {
  before(async function () {
    this.timeout(500000000);
    const config = {};
    const logger = createLogger({ name: 'test', level: 'fatal' });
    const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
    await mongoose.connect(mongoUri);
    this.server = new Server({ config, logger });
    this.request = agent(this.server.serverCallback);
    this.auth = 'Bearer justSomeToken';

    // reset elasticsearch data
    createClient("http://localhost:9200")
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
      this.timeout(500000000);

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
      
      // manually add duplicates
      records[0] = {
          domainId: "my-domain",
          schemaUri: "my-schema",
          content: {
              firstName: "Bert",
              lastName: "Meier Foo",
              contactData: [{ type: "email", value: "bmeier@gmx.net" }]
          },
          refs: [
            {
              applicationUid: "app-id",
              recordUid: "1234",
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

      records[1] = {
          domainId: "my-domain",
          schemaUri: "my-schema",
          content: {
              firstName: "Bert",
              lastName: "Meier Foo",
              contactData: [{ type: "email", value: "blub@asdas.com" }]
          },
          refs: [
            {
              applicationUid: "app-id",
              recordUid: "1235",
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

        records.push({
          domainId: "my-domain",
          schemaUri: "my-schema",
          content: {
              firstName: "B",
              lastName: "Meier Foo",
              contactData: [{ type: "email", value: "bmeier@gmx.net" }]
          },
          refs: [
            {
              applicationUid: "app-id",
              recordUid: "1236",
              modificationHistory: [
                {
                  user: user1.sub,
                  operation: "import",
                  timestamp: (new Date()).toISOString()
                }
              ]
            }
          ]
        })

        records.push({
          domainId: "my-domain",
          schemaUri: "my-schema",
          content: {
              firstName: "B",
              lastName: "Meier Foo",
              contactData: [{ type: "email", value: "blub@asdasdasd.com" }]
          },
          refs: [
            {
              applicationUid: "app-id",
              recordUid: "1237",
              modificationHistory: [
                {
                  user: user1.sub,
                  operation: "import",
                  timestamp: (new Date()).toISOString()
                }
              ]
            }
          ]
        })
       
        records.push({
          domainId: "my-domain",
          schemaUri: "my-schema",
          content: {
              firstName: "Bert",
              lastName: "Meier F",
              contactData: [{ type: "email", value: "bmeier@gmx.net" }]
          },
          refs: [
            {
              applicationUid: "app-id",
              recordUid: "1238",
              modificationHistory: [
                {
                  user: user1.sub,
                  operation: "import",
                  timestamp: (new Date()).toISOString()
                }
              ]
            }
          ]
        })

        records.push({
          domainId: "my-domain",
          schemaUri: "my-schema",
          content: {
              firstName: "Bert",
              lastName: "Meier Foo",
              contactData: [{ type: "email", value: "bertmeierfoo@gmail.com" }]
          },
          refs: [
            {
              applicationUid: "app-id",
              recordUid: "1239",
              modificationHistory: [
                {
                  user: user1.sub,
                  operation: "import",
                  timestamp: (new Date()).toISOString()
                }
              ]
            }
          ]
        })

        records.push({
          domainId: "my-domain",
          schemaUri: "my-schema",
          content: {
              firstName: "Caterina",
              lastName: "Corkery",
              contactData: [{ type: "email", value: "Gleichner@company.com" }]
          },
          refs: [
            {
              applicationUid: "app-id",
              recordUid: "1240",
              modificationHistory: [
                {
                  user: user1.sub,
                  operation: "import",
                  timestamp: (new Date()).toISOString()
                }
              ]
            }
          ]
        })

        records.push({
          domainId: "my-domain",
          schemaUri: "my-schema",
          content: {
              firstName: "Caterina",
              lastName: "Corkery",
              contactData: [{ type: "email", value: "Gleichner@gmx.de" }]
          },
          refs: [
            {
              applicationUid: "app-id",
              recordUid: "1241",
              modificationHistory: [
                {
                  user: user1.sub,
                  operation: "import",
                  timestamp: (new Date()).toISOString()
                }
              ]
            }
          ]
        })

      nockIamIntrospection(user1);

      await this.request
          .post('/data/import')
          .set('Authorization', this.auth)
          .send(records)
        .expect(201)
    
      expect(true).to.equal(true);
      
    });
    it("should merge objects", async () => {

      const recordA  = {
        content: {
            firstName: "Bert1",
            lastName: "Meier Foo1",
            jobTitle: "blub",
            photo: "url",
            contactData: [{ type: "email", value: "bertmeierfoo@gmail.com" }],
            addresses: [{
              street: "foostreet", streetNumber: "3"
            }]
        }, 
      }

      const recordB  = {
        content: {
            firstName: "Bert",
            lastName: "Meier Foo",
            middleName: "foo",
            jobTitle: "bla",
            test: "test",
            contactData: [{ type: "email", value: "bertmeierfoo@gmx.com" }],
            addresses: [{
              street: "barstreet", streetNumber: "123"
            }, {
              street: "foostreet", streetNumber: "2"
            }]
        }, 
      }

      const newContent = mergeContacts(recordB.content, recordA.content)

      // @ts-ignore
      expect(newContent.contactData.length).to.equal(2)
      // @ts-ignore
      expect(newContent.addresses.length).to.equal(2)

    })
  });
});

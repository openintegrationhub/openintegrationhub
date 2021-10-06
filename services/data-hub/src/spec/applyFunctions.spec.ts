import Server from '../server';
import { createLogger } from 'bunyan';
import mongoose from 'mongoose';
import { agent } from 'supertest';
import { expect } from 'chai';
import DataObject from '../models/data-object';
import nock from 'nock';

import scoreObject from '../handlers/scorer';
import tagObject from '../handlers/tagger';
import transformObject from '../handlers/transformer';
import dedupeObject from '../handlers/deduplicator';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
  enrichmentResults: {},
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
            },
            {
               "name": "tag",
               "active": true,
               "fields":[
                  {
                     comparator: 'hasField',
                     tag: 'Has a Name',
                     arguments: {
                       field: 'firstName',
                     }
                  }
               ]
            },
            {
               "name": "tag",
               "active": true,
               "fields":[
                  {
                     comparator: 'fieldEquals',
                     tag: 'Is a James',
                     arguments: {
                       field: 'firstName',
                       targetValue: 'James'
                     }
                  }
               ]
            }
         ]
      };


describe('Data Enrichment and Cleansing', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });
        const mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri);
        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer blablabla';
    });

    after(async function () {
        await DataObject.deleteMany({});
        await mongoose.connection.close();
    });


    describe('scorer', () => {
        it('should score test entry correctly', async function () {
            const result = scoreObject(testEntry, configuration.functions[0].fields);

            expect(result.domainId).to.exist;
            expect(result.schemaUri).to.exist;

            expect(result.enrichmentResults).to.be.an('object');

            expect(result.enrichmentResults.score).to.be.equal(2);
            expect(result.enrichmentResults.normalizedScore).to.be.equal(1);

            expect(result.content).to.be.an('object');

            expect(result.content.firstName).to.be.equal('James');
            expect(result.content.lastName).to.be.equal('Blond');
        });
    });

    describe('tagger', () => {
        it('should tag an object correctly with hasField', async function () {
            const result = tagObject(testEntry, configuration.functions[1].fields);

            expect(result.domainId).to.exist;
            expect(result.schemaUri).to.exist;

            expect(result.enrichmentResults).to.be.an('object');

            expect(result.enrichmentResults.tags).to.deep.equal(['Has a Name']);

            expect(result.content).to.be.an('object');

            expect(result.content.firstName).to.be.equal('James');
            expect(result.content.lastName).to.be.equal('Blond');
        });

        it('should tag an object correctly with fieldEquals', async function () {
            const result = tagObject(testEntry, configuration.functions[2].fields);

            expect(result.domainId).to.exist;
            expect(result.schemaUri).to.exist;

            expect(result.enrichmentResults).to.be.an('object');

            expect(result.enrichmentResults.tags).to.deep.equal(['Is a James']);

            expect(result.content).to.be.an('object');

            expect(result.content.firstName).to.be.equal('James');
            expect(result.content.lastName).to.be.equal('Blond');
        });
    });

    describe('transformer', () => {
        it('should transform test entry correctly', async function () {
            const result = transformObject(testEntry, [{expression: '{ "fullName": firstName & " " & lastName }' }]);

            expect(result.domainId).to.exist;
            expect(result.schemaUri).to.exist;

            expect(result.content).to.be.an('object');

            expect(result.content.fullName).to.be.equal('James Blond');
        });
    });

    describe('deduplicator', () => {
      let subsetUid;
      let dupeUid;
      let noMatchUid;

      before(async function () {
        const subset = await DataObject.create({
          domainId: '',
          schemaUri: '',
          refs: [
            {
              applicationUid: 'google',
              recordUid: 'moogle'
            }
          ],
          content: {
            firstName: 'Jane',
            lastName: 'Doe',
            contactData: [
              {
                type: 'email',
                value: 'j@doe.com'
              }
            ]
          }
        })
        subsetUid = subset._id.toString();

        const noMatch = await DataObject.create({
          domainId: '',
          schemaUri: '',
          content: {
            lastName: 'Doe',
            contactData: [
              {
                type: 'email',
                value: 'j@doe.com'
              },
              {
                type: 'phone',
                value: '654321'
              }
            ]
          }
        })
        noMatchUid = noMatch._id.toString();

        const dupe = await DataObject.create({
          domainId: '',
          schemaUri: '',
          refs: [
            {
              applicationUid: 'snazzy',
              recordUid: 'bazzy'
            }
          ],
          content: {
            firstName: 'Jane',
            lastName: 'Doe',
            birthday: '10.09.1985',
            contactData: [
              {
                type: 'email',
                value: 'j@doe.com'
              },
              {
                type: 'phone',
                value: '123456'
              }
            ]
          }
        })
        dupeUid = dupe._id.toString();
      });


        it('should correctly recognize duplicates and subsets', async function () {
          const result = await dedupeObject(
            {
              content: {
                firstName: 'Jane',
                lastName: 'Doe',
                birthday: '10.09.1985',
                contactData: [
                  {
                    type: 'email',
                    value: 'j@doe.com'
                  },
                  {
                    type: 'phone',
                    value: '123456'
                  }
                ]
              },
              refs: [],
              enrichmentResults: {
                knownDuplicates: [],
                knownSubsets: []
              }
            },
            [{checkSubset: true}],
            {}
          )

          expect(result.content).to.deep.equal({
            firstName: 'Jane',
            lastName: 'Doe',
            birthday: '10.09.1985',
            contactData: [
              {
                type: 'email',
                value: 'j@doe.com'
              },
              {
                type: 'phone',
                value: '123456'
              }
            ]
          })

          expect(result.enrichmentResults.knownDuplicates.length).to.be.equal(1);
          expect(result.enrichmentResults.knownDuplicates[0]).to.be.equal(dupeUid);
          expect(result.enrichmentResults.knownSubsets.length).to.be.equal(1);
          expect(result.enrichmentResults.knownSubsets[0]).to.be.equal(subsetUid);
        });

        it('should automatically delete duplicates and subsets', async function () {
          const result = await dedupeObject(
            {
              content: {
                firstName: 'Jane',
                lastName: 'Doe',
                birthday: '10.09.1985',
                contactData: [
                  {
                    type: 'email',
                    value: 'j@doe.com'
                  },
                  {
                    type: 'phone',
                    value: '123456'
                  }
                ]
              },
              refs: [],
              enrichmentResults: {
                knownDuplicates: [],
                knownSubsets: []
              }
            },
            [{checkSubset: true, autoDeleteDuplicactes: true, autoDeleteSubsets: true, mergeRefs: true}],
            {}
          )

          expect(result.content).to.deep.equal({
            firstName: 'Jane',
            lastName: 'Doe',
            birthday: '10.09.1985',
            contactData: [
              {
                type: 'email',
                value: 'j@doe.com'
              },
              {
                type: 'phone',
                value: '123456'
              }
            ]
          })

          expect(result.refs).to.deep.equal([
            {
              applicationUid: 'google',
              recordUid: 'moogle',
              modificationHistory: []
            },
            {
              applicationUid: 'snazzy',
              recordUid: 'bazzy',
              modificationHistory: []
            }
          ])

          expect(result.enrichmentResults.knownDuplicates.length).to.be.equal(0);
          expect(result.enrichmentResults.knownSubsets.length).to.be.equal(0);

          const allObjects = await DataObject.find().lean();
          expect(allObjects.length).to.be.equal(1);
          expect(allObjects[0]._id.toString()).to.be.equal(noMatchUid);

        });
    });

    describe('POST /data/enrich', () => {
      before(async function () {
        await DataObject.deleteMany({});
        const testObject = new DataObject({
          domainId: '',
          schemaUri: '',
          refs: [
            {
              applicationUid: 'google',
              recordUid: 'moogle'
            }
          ],
          content: {
            firstName: 'James',
            lastName: 'Jameson',
          },
          owners: [{id: 'user-id', type: 'user'}],
        })

        await testObject.save();
      })

      after(async function () {
        await DataObject.deleteMany({});
      })


        it('should start scorer', async function () {
            const scope = nockIamIntrospection();
            const { text, statusCode } = await this.request
                .post('/data/enrich')
                .set('Authorization', this.auth)
                .send(configuration);

            expect(statusCode).to.equal(200);

            expect(text).to.be.equal('Preparing data');

            await sleep(100);
            const allObjects = await DataObject.find().lean();
            expect(allObjects.length).to.be.equal(1);
            expect(allObjects[0].enrichmentResults).to.not.be.empty;
            expect(allObjects[0].enrichmentResults.score).to.be.equal(2);
            expect(allObjects[0].enrichmentResults.normalizedScore).to.be.equal(1);
            expect(allObjects[0].enrichmentResults.tags.length).to.be.equal(1);
            expect(allObjects[0].enrichmentResults.tags[0]).to.be.equal('Is a James');
        });

        it('should correctly fail if configuration is missing', async function () {
            const configuration = {
                  };

            const scope = nockIamIntrospection();
            const { text, statusCode } = await this.request
                .post('/data/enrich')
                .set('Authorization', this.auth)
                .send(configuration);

            expect(statusCode).to.equal(500);
            expect(text).to.be.equal('No functions configured');
        });
    });


});

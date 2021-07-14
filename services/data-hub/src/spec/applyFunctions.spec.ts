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

describe.only('Data Enrichment and Cleansing', () => {
    before(async function () {
        const config = {};
        const logger = createLogger({ name: 'test', level: 'fatal' });

        this.server = new Server({ config, logger });
        this.request = agent(this.server.serverCallback);
        this.auth = 'Bearer blablabla';
    });

    after(async function () {

    });

    beforeEach(async function f() {

    });

    describe('POST /data/apply', () => {
        it('should start scorer', async function () {
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

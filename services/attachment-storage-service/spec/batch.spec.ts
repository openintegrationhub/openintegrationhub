import Maester from '../src';
import config from '../src/config';
import StorageObjectService from '../src/storage-drivers/redis/redis-storage';
import chai from 'chai';
import { pseudoRandomBytes } from 'crypto';
import { agent } from 'supertest';
import uuid from 'uuid';
import nock from 'nock';

const { expect } = chai;

function nockIamIntrospection({ status = 200, body = { sub: 'user-id', permissions: ['all'] } } = {}) {
    return nock('http://iam.openintegrationhub.com')
        .post('/api/v1/tokens/introspect')
        .reply(status, body);
}

describe('/batch', () => {
    before(async function () {
        this.maester = new Maester(config);
        await this.maester.connect();
        this.storageObjects = new StorageObjectService(this.maester.redis);
        this.request = agent(this.maester.serverCallback);
        await this.storageObjects.deleteAllStorageObjects();
        this.jwt = 'custom jwt';
    });

    after(async function () {
        await this.storageObjects.deleteAllStorageObjects();
        await this.maester.stop();
    });

    describe('POST /batch/delete', () => {
        it('should properly delete objects according conditions', async function () {
            const firstId = uuid.v4();
            const secondId = uuid.v4();
            const thirdId = uuid.v4();

            nockIamIntrospection();
            let res = await this.request
                .put(`/objects/${firstId}`)
                .set('Content-Type', 'application/octet-stream')
                .set('Authorization', `Bearer ${this.jwt}`)
                .send(pseudoRandomBytes(100));
            expect(res).to.have.property('statusCode', 201);

            nockIamIntrospection();
            res = await this.request
                .put(`/objects/${secondId}`)
                .set('Content-Type', 'application/octet-stream')
                .set('Authorization', `Bearer ${this.jwt}`)
                .send(pseudoRandomBytes(100));
            expect(res).to.have.property('statusCode', 201);

            nockIamIntrospection();
            res = await this.request
                .put(`/objects/${thirdId}`)
                .set('Content-Type', 'text/plain')
                .set('Authorization', `Bearer ${this.jwt}`)
                .send(pseudoRandomBytes(100));
            expect(res).to.have.property('statusCode', 201);

            nockIamIntrospection();
            res = await this.request
                .post(`/batch/delete`)
                .set('Authorization', `Bearer ${this.jwt}`)
                .send({
                    conditions: [
                        { key: 'contentType', value: 'application/octet-stream' }
                    ]
                });
            expect(res.body.id).to.be.a('string');
            expect(res.body.status).to.equal('started');
            expect(res.statusCode).to.equal(202);

            await new Promise(resolve => setTimeout(resolve, 1000)); // waiting for deletion

            nockIamIntrospection();
            res = await this.request
                .get(`/objects/${firstId}`)
                .set('Authorization', `Bearer ${this.jwt}`);
            expect(res).to.have.property('statusCode', 404);

            nockIamIntrospection();
            res = await this.request
                .get(`/objects/${secondId}`)
                .set('Authorization', `Bearer ${this.jwt}`);
            expect(res).to.have.property('statusCode', 404);

            nockIamIntrospection();
            res = await this.request
                .get(`/objects/${thirdId}`)
                .set('Authorization', `Bearer ${this.jwt}`);
            console.log(res.body);
            expect(res).to.have.property('statusCode', 200);
        });
    });

    xdescribe('GET /batch/delete/:id', () => {
        it('should properly delete objects according conditions', async function () {
            const firstId = uuid.v4();

            nockIamIntrospection();
            let res = await this.request
                .put(`/objects/${firstId}`)
                .set('Content-Type', 'application/octet-stream')
                .set('Authorization', `Bearer ${this.jwt}`)
                .send(pseudoRandomBytes(100));
            expect(res).to.have.property('statusCode', 201);

            nockIamIntrospection();
            res = await this.request
                .post(`/batch/delete`)
                .set('Authorization', `Bearer ${this.jwt}`)
                .send({
                    conditions: [
                        { key: 'contentType', value: 'application/octet-stream' }
                    ]
                });
            const processId = res.body.id;
            expect(res.body.id).to.be.a('string');
            expect(res.body.status).to.equal('started');
            expect(res.statusCode).to.equal(202);

            nockIamIntrospection();
            res = await this.request
                .get(`/batch/delete/${processId}`)
                .set('Authorization', `Bearer ${this.jwt}`);

            expect(res.body).to.deep.equal({
                id: processId,
                status: 'started'
            });
            expect(res.statusCode).to.equal(200);


            // await new Promise(resolve => setTimeout(resolve, 1000)); // waiting for deletion

            nockIamIntrospection();
            res = await this.request
                .get(`/batch/delete/${processId}`)
                .set('Authorization', `Bearer ${this.jwt}`);

            // expect(res.body).to.deep.equal({
            //     id: processId,
            //     status: 'success'
            // });
            expect(res.statusCode).to.equal(200);
        });
    });
});

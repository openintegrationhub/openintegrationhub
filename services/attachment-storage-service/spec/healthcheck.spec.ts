import Maester from '../src';
import config from '../src/config';
import chai from 'chai';
import { agent } from 'supertest';
const { expect } = chai;

describe('GET /healthcheck', () => {
    before(async function () {
        this.maester = new Maester(config);
        await this.maester.connect();
        this.request = agent(this.maester.serverCallback);
    });

    after(async function () {
        await this.maester.stop();
    });

    it('should return OK', async function () {
        const res = await this.request.get('/healthcheck');
        expect(res).to.have.property('statusCode', 200);
        expect(res).to.have.property('text', 'OK');
    });
});

//FIXME @see https://github.com/elasticio/commons/issues/811
process.env.ENVIRONMENT = 'integration_test';
const { expect } = require('chai');
const sinon = require('sinon');

const commons = require('@elastic.io/commons');
const rp = require('request-promise-native');
const uuid = require('uuid');

const { Task, makeObjectId } = commons.mongo;

const FakeFlow = require('./fake-flow.js');
const webhooksService = require('./service-runner.js');
const configHelpers = require('../spec/helpers.js');
const init = require('../lib/init');

describe('Paralel requests', () => {
    let task;
    let fakeFlow;
    let configStub;
    let server;
    let sandbox;

    before(async () => {
        sandbox = sinon.createSandbox();
        configStub = configHelpers.buildFakeConfig();
        sandbox.stub(init, 'getConfig').returns(configStub);
        server = await webhooksService();
        const taskJSON = require('./webhook_task_request_reply.json');
        taskJSON.orgId = makeObjectId();
        task = await Task.create(taskJSON);
        fakeFlow = new FakeFlow(configStub.get('AMQP_URI'), task);
        await fakeFlow.start();
    });

    after(async () => {
        await fakeFlow.stop();
        await init.getAmqpConnection().close();
        await init.getMongoConnection().close();
        server.close();
        sandbox.restore();
    });

    it('should work', async () => {
        async function push(url) {
            const marker = uuid.v4();
            const timeout = Math.round(1000 * Math.random());
            const data = await rp({ url: url + `?uuid=${marker}&timeout=${timeout}`, forever: true });
            const gotMarker = JSON.parse(data).elasticio.step_1.query.uuid;
            expect(gotMarker).to.equal(marker);
        }
        async function paralel(url, level) {
            return Promise.all((new Array(level)).fill(null).map(push.bind(null, url)));
        }
        await paralel(`http://localhost:${configStub.get('PORT_GATEWAY')}/hook/${task.id}`, 10);
    });
});

const getPort = require('get-port');
const supertest = require('supertest');
const mongoose = require('mongoose');
const iamMock = require('../../../test/iamMock');
const flowRepoMock = require('../../../test/flowRepoMock');
const EventBusMock = require('../../../test/eventBusMock');
const conf = require('../../conf');
const {
    WORKFLOW_TYPES, SCOPES, STATUS, DEPENDENCY_TYPES,
} = require('../../constant');
const Server = require('../../server');

let port;
let request;
let server;
let eventBusMock = null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('connectors', () => {
    beforeAll(async () => {
        console.log('CSCS', global.__MONGO_URI__);
        port = await getPort();
        request = supertest(`http://localhost:${port}${conf.apiBase}`);
        eventBusMock = new EventBusMock();
        server = new Server({
            mongoDbConnection: `${global.__MONGO_URI__}workflows`,
            port,
            eventBus: eventBusMock,
        });
        iamMock.setup();
        flowRepoMock.setup();
        await server.start();
        // done();
    });

    afterAll(async () => {
        await server.stop();
        // done();
    });

    afterEach(async () => {
        await request.delete('/workflows?all=true')
            .set(...global.adminAuth1)
            .expect(204);
    });

    test('Create a workflow', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.DEFAULT,
            scope: SCOPES.PRIVATE,
            flows: [],
        };

        const response = await request.post('/workflows')
            .set(...global.adminAuth1)
            .send(workflowData)
            .expect(200);

        // await request.post('/apps')
        //     .set(...global.adminAuth1)
        //     .send(workflowData)
        //     .expect(400);

        const workflowResp = (await request.get(`/workflows/${response.body.data._id}`)
            .set(...global.adminAuth1)
            .expect(200)).body;
        expect(workflowResp.data.name).toEqual(workflowData.name);
    });

    test('Only admin can create global workflows', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.TEMPLATE,
            scope: SCOPES.GLOBAL,
            flows: [],
        };

        await request.post('/workflows')
            .set(...global.adminAuth1)
            .send(workflowData)
            .expect(200);

        await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData)
            .expect(403);
    });


    test('User cannot access other private workflows or workflows from other tenants', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.DEFAULT,
            scope: SCOPES.PRIVATE,
            flows: [],
        };

        const response1 = await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData)
            .expect(200);

        await request.post('/workflows')
            .set(...global.userAuth1SecondUser)
            .send(workflowData)
            .expect(403);


        const response2 = await request.post('/workflows')
            .set(...global.userAuth2)
            .send(workflowData)
            .expect(200);

        await request.get(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        await request.get(`/workflows/${response2.body.data._id}`)
            .set(...global.userAuth1)
            .expect(404);
    });

    test('Can clone an existing template', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.TEMPLATE,
            scope: SCOPES.TENANT,
            flows: [],
        };

        const response1 = await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData)
            .expect(200);

        const response2 = await request.post(`/workflows/${response1.body.data._id}/clone`)
            .set(...global.userAuth1)
            .expect(200);

        expect(response1.body.data.name).toEqual(response2.body.data.name);
        expect(response1.body.data._id).not.toEqual(response2.body.data._id);
    });

    test('User receives all templates', async () => {
        const workflowData1 = {
            name: 'FooBarWFTenant',
            type: WORKFLOW_TYPES.TEMPLATE,
            scope: SCOPES.TENANT,
            flows: [],
        };
        const workflowData2 = {
            name: 'FooBarWFGlobal',
            type: WORKFLOW_TYPES.TEMPLATE,
            scope: SCOPES.GLOBAL,
            flows: [],
        };

        await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData1)
            .expect(200);

        await request.post('/workflows')
            .set(...global.adminAuth1)
            .send(workflowData2)
            .expect(200);

        const response = await request.get('/workflows/templates')
            .set(...global.userAuth1)
            .expect(200);

        expect(response.body.data.length).toEqual(2);
    });

    test('Users can modify their workflow', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.DEFAULT,
            scope: SCOPES.TENANT,
            flows: [],
        };

        const response1 = await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData)
            .expect(200);

        await request.patch(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .send({
                name: 'NEWNAME',
            })
            .expect(200);

        const resp3 = await request.get(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(resp3.body.data.name).toEqual('NEWNAME');

        await request.patch(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth2)
            .send({
                name: 'NEWNAME2',
            })
            .expect(403);

        const wf = await request.patch(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .send({
                scope: SCOPES.PRIVATE,
            })
            .expect(200);

        console.log('###wf', wf.body.data);

        await request.patch(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1SecondUser)
            .send({
                name: 'NEWNAME2',
            })
            .expect(403);
    });

    test('Owner can delete workflow', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.DEFAULT,
            scope: SCOPES.PRIVATE,
            flows: [],
        };

        const response1 = await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData)
            .expect(200);

        await request.delete(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .expect(204);

        const resp1 = await request.get('/workflows')
            .set(...global.userAuth1)
            .expect(200);

        expect(resp1.body.data.length).toEqual(0);

        const workflowData2 = {
            name: 'FooBarWF2',
            type: WORKFLOW_TYPES.DEFAULT,
            scope: SCOPES.PRIVATE,
            flows: [],
        };

        const response2 = await request.post('/workflows')
            .set(...global.userAuth2)
            .send(workflowData2)
            .expect(200);

        await request.delete(`/workflows/${response2.body.data._id}`)
            .set(...global.userAuth1)
            .expect(403);
    });

    test('Users can start a workflow', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.DEFAULT,
            scope: SCOPES.PRIVATE,
            flows: [{
                flowId: '123',
                dependencies: [],
            }],
        };

        const response1 = await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData)
            .expect(200);

        await request.post(`/workflows/${response1.body.data._id}/start`)
            .set(...global.userAuth1)
            .expect(200);
    });

    test('Triggers next flow if previous has finished', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.DEFAULT,
            scope: SCOPES.PRIVATE,
            flows: [{
                flowId: '123',
                dependencies: [],
            }, {
                flowId: '456',
                dependencies: [{
                    id: '123',
                }],
            }],
        };

        const response1 = await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData)
            .expect(200);

        await request.post(`/workflows/${response1.body.data._id}/start`)
            .set(...global.userAuth1)
            .expect(200);

        eventBusMock.trigger('flow.stopped', { id: '123' });

        await sleep(100);

        eventBusMock.trigger('flow.started', { id: '456' });

        const response2 = await request.get(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(response2.body.data.status).toEqual(STATUS.RUNNING);
        expect(response2.body.data.flows.find(flow => flow.flowId === '123').status).toEqual(STATUS.FINISHED);
        expect(response2.body.data.flows.find(flow => flow.flowId === '456').status).toEqual(STATUS.STARTED);

        await sleep(100);

        eventBusMock.trigger('flow.stopped', { id: '456' });

        await sleep(100);

        const response3 = await request.get(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(response3.body.data.status).toEqual(STATUS.FINISHED);
    });

    test('Aborting a running workflow also aborts all of its started flows', async () => {
        const workflowData = {
            name: 'FooBarWF',
            type: WORKFLOW_TYPES.DEFAULT,
            scope: SCOPES.PRIVATE,
            flows: [{
                flowId: '123',
                dependencies: [],
            }, {
                flowId: '456',
                dependencies: [],
            }],
        };

        const response1 = await request.post('/workflows')
            .set(...global.userAuth1)
            .send(workflowData)
            .expect(200);

        await request.post(`/workflows/${response1.body.data._id}/start`)
            .set(...global.userAuth1)
            .expect(200);

        eventBusMock.trigger('flow.started', { id: '123' });
        eventBusMock.trigger('flow.started', { id: '456' });

        const response2 = await request.get(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(response2.body.data.status).toEqual(STATUS.RUNNING);
        expect(response2.body.data.flows.find(flow => flow.flowId === '123').status).toEqual(STATUS.STARTED);
        expect(response2.body.data.flows.find(flow => flow.flowId === '456').status).toEqual(STATUS.STARTED);

        await request.post(`/workflows/${response1.body.data._id}/stop`)
            .set(...global.userAuth1)
            .expect(200);

        await sleep(100);

        const response3 = await request.get(`/workflows/${response1.body.data._id}`)
            .set(...global.userAuth1)
            .expect(200);

        expect(response3.body.data.status).toEqual(STATUS.ABORTED);
    });
});

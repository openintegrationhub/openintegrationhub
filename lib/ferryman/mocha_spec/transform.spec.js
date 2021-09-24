
const nock = require('nock');

const { expect } = require('chai');

const jwt = require('jsonwebtoken');

const Settings = require('../lib/settings');

const { Ferryman } = require('../lib/ferryman');

const { transform } = require('../lib/transformer.js');

// eslint-disable-next-line no-unused-vars
let ferryman;
// eslint-disable-next-line no-unused-vars
// let sandbox;

const orchestratorTokenBefore = jwt.sign({
    flowId: '5559edd38968ec0736000003',
    stepId: 'step_1',
    userId: '5559edd38968ec0736000002',
    function: 'httpReply',
    apiKey: '123456',
    apiUsername: 'someuser@openintegrationhub.com',
    nodeSettings: {
        applyTransform: 'before',
        transformFunction: '{value: $sum(payload.data.example.value)}'
    }
}, 'somesecret');

const orchestratorTokenAfter = jwt.sign({
    flowId: '5559edd38968ec0736000003',
    stepId: 'step_1',
    userId: '5559edd38968ec0736000002',
    function: 'httpReply',
    apiKey: '123456',
    apiUsername: 'someuser@openintegrationhub.com',
    nodeSettings: {
        applyTransform: 'after',
        transformFunction: '{value: $sum(payload.data.example.value)}'
    }
}, 'somesecret');

const orchestratorTokenBoth = jwt.sign({
    flowId: '5559edd38968ec0736000003',
    stepId: 'step_1',
    userId: '5559edd38968ec0736000002',
    function: 'httpReply',
    apiKey: '123456',
    apiUsername: 'someuser@openintegrationhub.com',
    nodeSettings: {
        applyTransform: 'both',
        transformFunction: '{value: $sum(payload.data.example.value)}',
        secondTransformFunction: '{value: $sum(payload.data.example.value)}'
    }
}, 'somesecret');

let requestRecordUid;
let requestOihId;
describe('ferryman message processing with transform', () => {
    before(()=>{
        const envVars = {};
        envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
        envVars.ELASTICIO_AMQP_PUBLISH_RETRY_ATTEMPTS = 10;
        envVars.ELASTICIO_AMQP_PUBLISH_MAX_RETRY_DELAY = 60 * 1000;

        envVars.ELASTICIO_DATAHUB_BASE_URL = 'http://localhost:1234';

        envVars.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
        envVars.ELASTICIO_STEP_ID = 'step_1';
        envVars.ELASTICIO_EXEC_ID = 'some-exec-id';
        envVars.ELASTICIO_WORKSPACE_ID = '5559edd38968ec073600683';
        envVars.ELASTICIO_CONTAINER_ID = 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948';

        envVars.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
        envVars.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';
        envVars.ELASTICIO_FUNCTION = 'list';

        envVars.ELASTICIO_LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
        envVars.ELASTICIO_PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';

        envVars.ELASTICIO_BACKCHANNEL_EXCHANGE = 'backChannel:5527f0ea43238e5d5f000001';
        envVars.ELASTICIO_NODE_EXCHANGE = 'node:exchange';

        envVars.ELASTICIO_OUTPUT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:output';
        envVars.ELASTICIO_ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
        envVars.ELASTICIO_REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
        // envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

        envVars.ELASTICIO_COMPONENT_PATH = '/spec/component';
        envVars.ELASTICIO_DEBUG = 'Ferryman';

        envVars.ELASTICIO_API_URI = 'http://apihost.com';
        envVars.ELASTICIO_API_USERNAME = 'test@test.com';
        envVars.ELASTICIO_API_KEY = '5559edd';

        envVars.ELASTICIO_SNAPSHOTS_SERVICE_BASE_URL = 'https://localhost:2345';

        const settings = Settings.readFrom(envVars);

        ferryman = new Ferryman(settings);
    });

    it('should run before transform without error', async () => {
        const payload = {
            data: {
                example: [
                    { value: 1 },
                    { value: 2 },
                    { value: 3 }
                ]
            },
            metadata: {
                applicationUid: 'someApp',
                recordUid: 'record-abc'
                // id: 'oih-abc',
            }
        };

        const message = {
            properties: {
                headers: {
                    orchestratorToken: orchestratorTokenBefore
                },
                payload
            },
            fields: {
            }
        };


        const data = await ferryman.processMessage(payload, message);
        expect(data).to.equal(false);
    });

    it('should run after transform without error', async () => {
        const payload = {
            data: {
                example: [
                    { value: 1 },
                    { value: 2 },
                    { value: 3 }
                ]
            },
            metadata: {
                applicationUid: 'someApp',
                recordUid: 'record-abc'
                // id: 'oih-abc',
            }
        };

        const message = {
            properties: {
                headers: {
                    orchestratorToken: orchestratorTokenAfter
                },
                payload
            },
            fields: {
            }
        };


        const data = await ferryman.processMessage(payload, message);
        expect(data).to.equal(false);
    });


    it('should run both transforms without error', async () => {
        const payload = {
            data: {
                example: [
                    { value: 1 },
                    { value: 2 },
                    { value: 3 }
                ]
            },
            metadata: {
                applicationUid: 'someApp',
                recordUid: 'record-abc'
                // id: 'oih-abc',
            }
        };

        const message = {
            properties: {
                headers: {
                    orchestratorToken: orchestratorTokenBoth
                },
                payload
            },
            fields: {
            }
        };


        const data = await ferryman.processMessage(payload, message);
        expect(data).to.equal(false);
    });

    it('should transform payload correctly', async () => {
        const payload = {
            data: {
                name: 'Black',
                vorname: 'Joe'
            },
            metadata: {
                applicationUid: 'someApp',
                recordUid: 'record-abc'
                // id: 'oih-abc',
            }
        };

        const message = {
            properties: {
                headers: {
                    orchestratorToken: orchestratorTokenBoth
                },
                payload
            },
            fields: {
            }
        };

        const cfg = {
            customMapping: '{"name": $.properties.payload.data.name, "lastName": $.properties.payload.data.vorname}'
        };

        const transformedMsg = transform(message, cfg, false);

        expect(transformedMsg).to.to.be.an('object');
        expect(transformedMsg.name).to.equal('Black');
        expect(transformedMsg.lastName).to.equal('Joe');
    });
});

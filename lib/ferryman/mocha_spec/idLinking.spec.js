
const nock = require('nock');

const { expect } = require('chai');

const jwt = require('jsonwebtoken');

const Settings = require('../lib/settings');

const { Ferryman } = require('../lib/ferryman');

// eslint-disable-next-line no-unused-vars
let ferryman;
// eslint-disable-next-line no-unused-vars
// let sandbox;

const orchestratorToken = jwt.sign({
    flowId: '5559edd38968ec0736000003',
    stepId: 'step_1',
    userId: '5559edd38968ec0736000002',
    function: 'httpReply',
    apiKey: '123456',
    apiUsername: 'someuser@openintegrationhub.com',
    nodeSettings: {
        idLinking: true
    }
}, 'somesecret');

let requestRecordUid;
let requestOihId;
describe('ferryman message processing with ID-Linking', () => {
    before(()=>{
        requestRecordUid = nock('http://localhost:1234/data/recordId/record-abc').get('').reply(200, {});
        requestOihId = nock('http://localhost:1234/data/oih-abc').get('').reply(200, {});

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

        nock(`https://localhost:1001/data/:id`)
            .get(`/oih-abc`)
            .reply(200, {
                data: {

                }
            });

        nock(`https://localhost:1001/data/recordId/:id`)
            .get(`/record-abc`)
            .reply(200, {
                data: {

                }
            });
    });

    it('should return 200 if get via recordUid is successful', async () => {
        const payload = {
            data: {
                key: 'value'
            },
            metadata: {
                applicationUid: 'someApp',
                recordUid: 'record-abc'
                // id: 'oih-abc',
            }
        };

        // @todo: check structure
        const message = {
            properties: {
                headers: {
                    orchestratorToken: orchestratorToken
                },
                payload
            },
            fields: {
            }
        };


        const data = await ferryman.processMessage(payload, message);

        expect(requestRecordUid.isDone()).to.be.true;

        expect(data).to.equal(false);
    });

    it('should return 200 if get via oihUid is successful', async () => {
        const payload = {
            data: {
                key: 'value'
            },
            metadata: {
                applicationUid: 'someApp',
                recordUid: 'record-abc',
                oihUid: 'oih-abc'
            }
        };

        // @todo: check structure
        const message = {
            properties: {
                headers: {
                    orchestratorToken: orchestratorToken
                },
                payload
            },
            fields: {
            }
        };


        const data = await ferryman.processMessage(payload, message);

        expect(requestOihId.isDone()).to.be.true;

        expect(data).to.equal(false);
    });

    // afterEach(()=> {
    // });
});

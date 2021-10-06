
const nock = require('nock');

const { expect } = require('chai');

const jwt = require('jsonwebtoken');

const Settings = require('../lib/settings');

const { Ferryman } = require('../lib/ferryman');

// eslint-disable-next-line no-unused-vars
let ferryman;
// eslint-disable-next-line no-unused-vars
// let sandbox;

const orchestratorToken1 = jwt.sign({
    flowId: '5559edd38968ec0736000003',
    stepId: 'step_1',
    userId: '5559edd38968ec0736000002',
    function: 'httpReply',
    apiKey: '123456',
    apiUsername: 'someuser@openintegrationhub.com',
    nodeSettings: {
        applyPolicy: true,
        policyAction: 'distribute'
    }
}, 'somesecret');

const orchestratorToken2 = jwt.sign({
    flowId: '5559edd38968ec0736000003',
    stepId: 'step_1',
    userId: '5559edd38968ec0736000002',
    function: 'httpReply',
    apiKey: '123456',
    apiUsername: 'someuser@openintegrationhub.com',
    nodeSettings: {
        flowPolicy: {
            permission: [{
                action: 'distribute',
                constraint: {
                    leftOperand: 'categories.label',
                    operator: 'equals',
                    rightOperand: 'Customer'
                }
            }]
        },
        policyAction: 'distribute'
    }
}, 'somesecret');

describe('ferryman message processing with policy application', () => {
    before(()=>{
        const envVars = {};
        envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
        envVars.ELASTICIO_AMQP_PUBLISH_RETRY_ATTEMPTS = 10;
        envVars.ELASTICIO_AMQP_PUBLISH_MAX_RETRY_DELAY = 60 * 1000;

        envVars.ELASTICIO_DATAHUB_BASE_URL = 'http://localhost:1234';
        envVars.ELASTICIO_GOVERNANCE_SERVICE_BASE_URL = 'https://localhost:3009';

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

    it('should make a call to apply an object policy', async () => {

        const objectPolicyCall = nock(`https://localhost:3009`)
            .post('/applyPolicy', {
                data: {
                    firstName: 'Jane',
                    lastName: 'Doe'
                },
                metadata: {
                    policy: {
                        duty: [
                            {
                                action: 'anonymize',
                                constraint: {
                                    leftOperand: 'lastName',
                                    operator: 'applyToKey'
                                }
                            }
                        ]
                    }
                }
            })
            .query({
                action: 'distribute'
            })
            .reply(200, {
                data: {
                    firstName: 'Jane',
                    lastName: 'XXXXXXXXXX'
                },
                passes: true
            });

        const payload = {
            data: {
                firstName: 'Jane',
                lastName: 'Doe'
            },
            metadata: {
                policy: {
                    duty: [
                        {
                            action: 'anonymize',
                            constraint: {
                                leftOperand: 'lastName',
                                operator: 'applyToKey'
                            }
                        }
                    ]
                }
            }
        };

        const message = {
            properties: {
                headers: {
                    orchestratorToken: orchestratorToken1
                },
                payload
            },
            fields: {
            }
        };

        const data = await ferryman.processMessage(payload, message);

        expect(objectPolicyCall.isDone()).to.be.true;

    });

    it('should make a call to apply a flow policy', async () => {

        const flowPolicyCall = nock(`https://localhost:3009`)
            .post('/applyPolicy', {
                data: {
                    firstName: 'Jane',
                    lastName: 'Doe'
                },
                metadata: {
                    policy: {
                        permission: [{
                            action: 'distribute',
                            constraint: {
                                leftOperand: 'categories.label',
                                operator: 'equals',
                                rightOperand: 'Customer'
                            }
                        }]
                    }
                }
            })
            .query({
                action: 'distribute'
            })
            .reply(200, {
                data: {
                    firstName: 'Jane',
                    lastName: 'Doe'
                },
                passes: false
            });

        const payload = {
            data: {
                firstName: 'Jane',
                lastName: 'Doe'
            }
        };

        const message = {
            properties: {
                headers: {
                    orchestratorToken: orchestratorToken2
                },
                payload
            },
            fields: {
            }
        };

        const data = await ferryman.processMessage(payload, message);

        expect(flowPolicyCall.isDone()).to.be.true;

    });

    // afterEach(()=> {
    // });
});

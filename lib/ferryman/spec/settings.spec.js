const settings = require('../lib/settings.js');

describe('Settings', () => {
    it('should throw error if no important settings provided', () => {
        expect(() => {
            settings.readFrom({});
        }).toThrow('ELASTICIO_COMP_ID is missing');
    });

    it('should not throw error if all important settings provided', () => {
        const envVars = {};

        envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
        // envVars.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
        // envVars.ELASTICIO_EXEC_ID = 'some-exec-id';
        // envVars.ELASTICIO_STEP_ID = 'step_1';
        envVars.ELASTICIO_WORKSPACE_ID = '5559edd38968ec073600683';
        envVars.ELASTICIO_CONTAINER_ID = 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948';

        // envVars.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
        envVars.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';
        // envVars.ELASTICIO_FUNCTION = 'list';

        envVars.ELASTICIO_LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
        envVars.ELASTICIO_PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';

        envVars.ELASTICIO_BACKCHANNEL_EXCHANGE = 'backChannel:5527f0ea43238e5d5f000001';
        envVars.ELASTICIO_NODE_EXCHANGE = 'NODE_EXCHANGE';

        envVars.ELASTICIO_OUTPUT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:output';

        envVars.ELASTICIO_GOVERNANCE_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:governance';

        envVars.ELASTICIO_ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
        envVars.ELASTICIO_REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
        envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

        envVars.ELASTICIO_API_URI = 'http://apihost.com';
        // envVars.ELASTICIO_API_USERNAME = 'test@test.com';
        // envVars.ELASTICIO_API_KEY = '5559edd';

        const result = settings.readFrom(envVars);

        expect(result.LISTEN_MESSAGES_ON).toEqual('5559edd38968ec0736000003:step_1:1432205514864:messages');
    });

    it('should support also numbers as a settings parameter', () => {
        const envVars = {};

        envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
        // envVars.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
        // envVars.ELASTICIO_EXEC_ID = 'some-exec-id';
        envVars.ELASTICIO_STEP_ID = 'step_1';
        envVars.ELASTICIO_WORKSPACE_ID = '5559edd38968ec073600683';
        envVars.ELASTICIO_CONTAINER_ID = 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948';

        // envVars.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
        envVars.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';
        // envVars.ELASTICIO_FUNCTION = 'list';

        envVars.ELASTICIO_LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
        envVars.ELASTICIO_PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';

        envVars.ELASTICIO_BACKCHANNEL_EXCHANGE = 'backChannel:5527f0ea43238e5d5f000001';
        envVars.ELASTICIO_NODE_EXCHANGE = 'NODE_EXCHANGE';

        envVars.ELASTICIO_OUTPUT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:output';

        envVars.ELASTICIO_GOVERNANCE_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:governance';

        envVars.ELASTICIO_ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
        envVars.ELASTICIO_REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
        envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

        envVars.ELASTICIO_API_URI = 'http://apihost.com';
        // envVars.ELASTICIO_API_USERNAME = 'test@test.com';
        // envVars.ELASTICIO_API_KEY = '5559edd';

        envVars.ELASTICIO_RABBITMQ_PREFETCH_SAILOR = '20';

        const result = settings.readFrom(envVars);

        expect(result.LISTEN_MESSAGES_ON).toEqual('5559edd38968ec0736000003:step_1:1432205514864:messages');
        expect(result.RABBITMQ_PREFETCH_SAILOR).toEqual(20);
    });


    it('should pass additional vars to settings that are listed in ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS', () => {
        const envVars = {};

        envVars.ELASTICIO_AMQP_URI = 'amqp://test2/test2';
        // envVars.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
        // envVars.ELASTICIO_EXEC_ID = 'some-exec-id';
        // envVars.ELASTICIO_STEP_ID = 'step_1';
        envVars.ELASTICIO_WORKSPACE_ID = '5559edd38968ec073600683';
        envVars.ELASTICIO_CONTAINER_ID = 'dc1c8c3f-f9cb-49e1-a6b8-716af9e15948';

        // envVars.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
        envVars.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';
        // envVars.ELASTICIO_FUNCTION = 'list';

        envVars.ELASTICIO_LISTEN_MESSAGES_ON = '5559edd38968ec0736000003:step_1:1432205514864:messages';
        envVars.ELASTICIO_PUBLISH_MESSAGES_TO = 'userexchange:5527f0ea43238e5d5f000001';

        envVars.ELASTICIO_BACKCHANNEL_EXCHANGE = 'backChannel:5527f0ea43238e5d5f000001';
        envVars.ELASTICIO_NODE_EXCHANGE = 'NODE_EXCHANGE';

        envVars.ELASTICIO_OUTPUT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:output';

        envVars.ELASTICIO_GOVERNANCE_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:governance';

        envVars.ELASTICIO_ERROR_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:error';
        envVars.ELASTICIO_REBOUND_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:rebound';
        envVars.ELASTICIO_SNAPSHOT_ROUTING_KEY = '5559edd38968ec0736000003:step_1:1432205514864:snapshot';

        envVars.ELASTICIO_API_URI = 'http://apihost.com';
        // envVars.ELASTICIO_API_USERNAME = 'test@test.com';
        // envVars.ELASTICIO_API_KEY = '5559edd';

        envVars.ELASTICIO_ADDITIONAL_VARS_FOR_HEADERS = 'ELASTICIO_FIRST, ELASTICIO_SECOND ,'
            + 'ELASTICIO_THIRD_ELASTICIO_ENV,ELASTICIO_NOT_PRESENT';

        envVars.ELASTICIO_RANDOM = 'random';
        envVars.ELASTICIO_FIRST = 'first';
        envVars.ELASTICIO_SECOND = 'second';
        envVars.ELASTICIO_THIRD_ELASTICIO_ENV = 'third';

        const result = settings.readFrom(envVars);

        expect(result.additionalVars).toEqual({
            FIRST: 'first',
            SECOND: 'second',
            THIRD_ELASTICIO_ENV: 'third',
            NOT_PRESENT: undefined
        });
    });
});

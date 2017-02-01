const nock = require('nock');
const expect = require('chai').expect;
const amqplib = require('amqplib');
const co = require('co');
const express = require('express');
const bodyParser = require('body-parser');
const sinon = require('sinon');
const logging = require('../lib/logging.js');

describe('Integration Test', () => {
    process.env.ELASTICIO_AMQP_URI = 'amqp://guest:guest@localhost:5672';
    process.env.ELASTICIO_RABBITMQ_PREFETCH_SAILOR = '10';
    process.env.ELASTICIO_FLOW_ID = '5559edd38968ec0736000003';
    process.env.ELASTICIO_STEP_ID = 'step_1';
    process.env.ELASTICIO_EXEC_ID = 'some-exec-id';

    process.env.ELASTICIO_USER_ID = '5559edd38968ec0736000002';
    process.env.ELASTICIO_COMP_ID = '5559edd38968ec0736000456';

    process.env.ELASTICIO_LISTEN_MESSAGES_ON = 'integration_test:messages';
    process.env.ELASTICIO_PUBLISH_MESSAGES_TO = 'integration_test:exchange';
    process.env.ELASTICIO_DATA_ROUTING_KEY = 'integration_test:routing_key:message';
    process.env.ELASTICIO_ERROR_ROUTING_KEY = 'integration_test:routing_key:error';
    process.env.ELASTICIO_REBOUND_ROUTING_KEY = 'integration_test:routing_key:rebound';
    process.env.ELASTICIO_SNAPSHOT_ROUTING_KEY = 'integration_test:routing_key:snapshot';

    process.env.ELASTICIO_COMPONENT_PATH = '/mocha_spec/integration_component';

    process.env.ELASTICIO_API_URI = 'https://apidotelasticidotio';
    process.env.ELASTICIO_API_USERNAME = 'test@test.com';
    process.env.ELASTICIO_API_KEY = '5559edd';
    process.env.ELASTICIO_FLOW_WEBHOOK_URI = 'https://in.elastic.io/hooks/' + process.env.ELASTICIO_FLOW_ID;

    process.env.DEBUG = 'sailor:debug';

    process.env.ELASTICIO_TIMEOUT = 3000;

    let subscriptionChannel;
    let publishChannel;
    const customers = [
        {
            name: 'Homer Simpson'
        },
        {
            name: 'Marge Simpson'
        }
    ];
    const inputMessage = {
        headers: {},
        body: {
            message: 'Just do it!'
        }
    };

    beforeEach((done) => {

        process.env.ELASTICIO_FUNCTION = 'init_trigger';

        co(function* gen() {
            const amqp = yield amqplib.connect(process.env.ELASTICIO_AMQP_URI);
            subscriptionChannel = yield amqp.createChannel();
            publishChannel = yield amqp.createChannel();

            yield subscriptionChannel.assertQueue(process.env.ELASTICIO_LISTEN_MESSAGES_ON);
            yield publishChannel.assertQueue('integration_test_queue');
            yield publishChannel.assertQueue('integration_test_queue_errors');

            const exchangeOptions = {
                durable: true,
                autoDelete: false
            };
            yield subscriptionChannel.assertExchange(process.env.ELASTICIO_LISTEN_MESSAGES_ON, 'direct', exchangeOptions);
            yield publishChannel.assertExchange(process.env.ELASTICIO_PUBLISH_MESSAGES_TO, 'direct', exchangeOptions);

            yield subscriptionChannel.bindQueue(
                process.env.ELASTICIO_LISTEN_MESSAGES_ON,
                process.env.ELASTICIO_LISTEN_MESSAGES_ON,
                process.env.ELASTICIO_DATA_ROUTING_KEY);

            yield publishChannel.bindQueue(
                'integration_test_queue',
                process.env.ELASTICIO_PUBLISH_MESSAGES_TO,
                process.env.ELASTICIO_DATA_ROUTING_KEY);

            yield publishChannel.bindQueue(
                'integration_test_queue_errors',
                process.env.ELASTICIO_PUBLISH_MESSAGES_TO,
                process.env.ELASTICIO_ERROR_ROUTING_KEY);
            done();
        }).catch(done);
    });

    afterEach(() => {
        delete process.env.STARTUP_REQUIRED;
        delete process.env.ELASTICIO_FUNCTION;
    });

    it('should run sailor successfully', (done) => {

        subscriptionChannel.publish(
            process.env.ELASTICIO_LISTEN_MESSAGES_ON,
            process.env.ELASTICIO_DATA_ROUTING_KEY,
            new Buffer(JSON.stringify(inputMessage)),
            {
                headers: {
                    execId: process.env.ELASTICIO_EXEC_ID,
                    taskId: process.env.ELASTICIO_FLOW_ID,
                    userId: process.env.ELASTICIO_USER_ID
                }
            });

        nock('https://apidotelasticidotio')
            .log(console.log)
            .get('/v1/tasks/5559edd38968ec0736000003/steps/step_1')
            .reply(200, {
                config: {
                    apiKey: 'secret'
                },
                snapshot: {
                    lastModifiedDate: 123456789
                }
            });

        nock('https://api.acme.com')
            .log(console.log)
            .post('/subscribe')
            .reply(200, {
                id: 'subscription_12345'
            })
            .get('/customers')
            .reply(200, customers);

        publishChannel.consume('integration_test_queue', (message) => {
            publishChannel.ack(message);

            const emittedMessage = JSON.parse(message.content.toString());

            delete message.properties.headers.start;
            delete message.properties.headers.end;
            delete message.properties.headers.cid;

            expect(message.properties.headers).to.eql({
                execId: process.env.ELASTICIO_EXEC_ID,
                taskId: process.env.ELASTICIO_FLOW_ID,
                userId: process.env.ELASTICIO_USER_ID,
                stepId: process.env.ELASTICIO_STEP_ID,
                compId: process.env.ELASTICIO_COMP_ID,
                function: process.env.ELASTICIO_FUNCTION
            });
            expect(emittedMessage.body).to.deep.equal({
                originalMsg: inputMessage,
                customers: customers,
                subscription: {
                    id: 'subscription_12345',
                    cfg: {
                        apiKey: 'secret'
                    }
                }
            });

            done();
        });
        requireRun();
    });

    it('should execute startup successfully', (done) => {

        process.env.ELASTICIO_STARTUP_REQUIRED = '1';

        const app = express();
        const port = 8080;

        app.use(bodyParser.json());

        app.post('/webhooks', (req, res) => {
            expect(req.body).to.eql({
                url: 'https://in.elastic.io/hooks/5559edd38968ec0736000003'
            });
            res.json({
                id: 'webhook_123'
            });
            done();
        });

        nock('https://apidotelasticidotio')
            .log(console.log)
            .get('/v1/tasks/5559edd38968ec0736000003/steps/step_1')
            .reply(200, {
                config: {
                    apiKey: 'secret'
                },
                snapshot: {
                    lastModifiedDate: 123456789
                }
            });
        nock.enableNetConnect('localhost');

        app.listen(port, () => {
            console.log('Express listening on port', port);
            requireRun();
        });
    });

    it('should pulish init errors to RabbitMQ', (done) => {

        const logCriticalErrorStub = sinon.stub(logging, 'criticalError');

        process.env.ELASTICIO_FUNCTION = 'fails_to_init';

        nock('https://apidotelasticidotio')
            .log(console.log)
            .get('/v1/tasks/5559edd38968ec0736000003/steps/step_1')
            .reply(200, {
                config: {
                    apiKey: 'secret'
                },
                snapshot: {
                    lastModifiedDate: 123456789
                }
            });

        publishChannel.consume('integration_test_queue_errors', (message) => {
            publishChannel.ack(message);
            const error = JSON.parse(message.content.toString());
            expect(JSON.parse(error.error).message).to.equal('OMG. I cannot init');

            expect(message.properties.headers).to.eql({
                execId: process.env.ELASTICIO_EXEC_ID,
                taskId: process.env.ELASTICIO_FLOW_ID,
                userId: process.env.ELASTICIO_USER_ID
            });

            done();
        });

        requireRun();
    });
});

function requireRun() {
    const path = '../run.js';
    var resolved = require.resolve(path);
    delete require.cache[resolved];
    require(path);
}

// const { expect } = require('chai');
// const jwt = require('jsonwebtoken');
//
// const helpers = require('./integration_helpers');
//
// const { env } = process;
//
// let fakeApiServer; // eslint-disable-line no-unused-vars
//
// describe('Graceful shutdown', function test() {
//     this.timeout(helpers.ShellTester.TIMEOUT_DEFAULT * 1.1);
//
//     const orchestratorToken = jwt.sign({
//         flowId: 'flow_1',
//         stepId: 'step_1',
//         userId: 'user1234',
//         function: 'triggerme',
//         apiKey: '123456',
//         apiUsername: 'someuser@openintegrationhub.com'
//     }, 'somesecret');
//
//     const inputMessage = {
//         headers: {
//             stepId: 'step_1',
//             orchestratorToken
//         },
//         body: {
//             message: 'test'
//         }
//     };
//
//     // let fakeApiServer;
//     const amqpHelper = helpers.amqp();
//
//     beforeEach(async () => {
//         helpers.prepareEnv();
//         await amqpHelper.prepare();
//
//         fakeApiServer = await helpers.fakeApiServerStart();
//     });
//
//     afterEach(async () => {
//         await helpers.fakeApiServerStop();
//         await amqpHelper.cleanUp();
//     });
//
//     describe('start, no messages, shutdown', () => {
//         it('should shutdown instantly', async () => {
//             env.ELASTICIO_FUNCTION = 'echo_incoming_data';
//
//             const sailorTester = helpers.ShellTester.init({
//                 timeout: 1000
//             });
//
//             await sailorTester.run();
//
//             // let (sailor) to start consuming messages
//             await new Promise(resolve => setTimeout(resolve, 500));
//
//             await sailorTester.sendKill();
//
//             // if sailor won't shutdown shortly,
//             // this promise will be rejected since sailorTester.timeout is 1000ms
//             await sailorTester.getPromise();
//         });
//     });
//     describe('start, no messages, shutdown, send more messages', () => {
//         it('should not consume messages', async () => {
//             env.ELASTICIO_FUNCTION = 'echo_incoming_data';
//
//             const sailorTester = helpers.ShellTester.init({
//                 timeout: 1500
//             });
//
//             await sailorTester.run();
//
//             // let sailor to start consuming messages
//             await new Promise(resolve => setTimeout(resolve, 500));
//
//             await sailorTester.sendKill();
//
//             // let sailor to schedule shutdown
//             await new Promise(resolve => setTimeout(resolve, 200));
//             amqpHelper.publishMessage(inputMessage);
//
//             // let amqp to take the messages
//             await new Promise(resolve => setTimeout(resolve, 500));
//
//             // if sailor won't shutdown shortly,
//             // this promise will be rejected since sailorTester.timeout is 1000ms
//             await sailorTester.getPromise();
//
//             // make sure, that the message won't be consubed by the sailor
//             const messagesLeft = await amqpHelper.retrieveAllMessagesNotConsumedBySailor(200);
//             expect(messagesLeft).to.have.lengthOf(1);
//         });
//     });
//
//     describe('start, one message, fast message processing in sailor, shutdown', () => {
//         it('should shutdown shortly', async () => {
//             // selecting certain trigger of the component
//             env.ELASTICIO_FUNCTION = 'echo_incoming_data';
//
//             const sailorTester = helpers.ShellTester.init();
//             await sailorTester.run();
//
//             amqpHelper.publishMessage(inputMessage);
//
//             // let (sailor + amqp) some time to handle all messages
//             await new Promise(resolve => setTimeout(resolve, 500));
//
//             await sailorTester.sendKill();
//
//             // waiting until sailor finished
//             await sailorTester.getPromise();
//
//             // make sure that echo_incoming_data finished processing
//             expect(amqpHelper.dataMessages).to.have.lengthOf(1);
//
//             // make sure that incoming messages queue is empty
//             const messagesLeft = await amqpHelper.retrieveAllMessagesNotConsumedBySailor();
//             console.log('messagesLeft', messagesLeft);
//             expect(messagesLeft).to.have.lengthOf(0);
//         });
//     });
//
//     describe('start, one message, slow processing, shutdown earlier than processing time', () => {
//         it('should shutdown after processing', async () => {
//             // selecting certain trigger of the component
//             env.ELASTICIO_FUNCTION = 'wait_2_seconds_and_echo_incoming_data';
//
//             const sailorTester = helpers.ShellTester.init();
//             await sailorTester.run();
//
//             amqpHelper.publishMessage(inputMessage);
//
//             // let (sailor + amqp) some time to handle all messages
//             await new Promise(resolve => setTimeout(resolve, 500));
//
//             // just to double check, that sailor is not processed the message yet
//             // (otherwise this test is equal to previous)
//             expect(amqpHelper.dataMessages).to.have.lengthOf(0);
//
//             await sailorTester.sendKill();
//
//             // waiting until sailor finished
//             await sailorTester.getPromise();
//
//             // make sure that echo_incoming_data finished processing
//             expect(amqpHelper.dataMessages).to.have.lengthOf(1);
//
//             // make sure that incoming messages queue is empty
//             const messagesLeft = await amqpHelper.retrieveAllMessagesNotConsumedBySailor();
//             expect(messagesLeft).to.have.lengthOf(0);
//         });
//     });
//
//     describe('start, one message, slow processing, shutdown twice', () => {
//         it('should shutdown after processing', async () => {
//             // selecting certain trigger of the component
//             env.ELASTICIO_FUNCTION = 'wait_2_seconds_and_echo_incoming_data';
//
//             const sailorTester = helpers.ShellTester.init();
//             await sailorTester.run();
//
//             amqpHelper.publishMessage(inputMessage);
//
//             // let (sailor + amqp) some time to handle all messages
//             await new Promise(resolve => setTimeout(resolve, 500));
//
//             // just to double check, that sailor is not processed the message yet
//             // (otherwise this test is equal to previous)
//             expect(amqpHelper.dataMessages).to.have.lengthOf(0);
//
//             await sailorTester.sendKill();
//             await new Promise(resolve => setTimeout(resolve, 50));
//             await sailorTester.sendKill();
//             await new Promise(resolve => setTimeout(resolve, 50));
//
//             // waiting until sailor finished
//             await sailorTester.getPromise();
//
//             // make sure that echo_incoming_data finished processing
//             expect(amqpHelper.dataMessages).to.have.lengthOf(1);
//
//             // make sure that incoming messages queue is empty
//             const messagesLeft = await amqpHelper.retrieveAllMessagesNotConsumedBySailor();
//             expect(messagesLeft).to.have.lengthOf(0);
//         });
//     });
//
//     describe('start, two messages, slow processing, shutdown earlier than processing time', () => {
//         it('should shutdown after processing of the first message', async () => {
//             // selecting certain trigger of the component
//             env.ELASTICIO_FUNCTION = 'wait_2_seconds_and_echo_incoming_data';
//
//             const sailorTester = helpers.ShellTester.init();
//             await sailorTester.run();
//
//             amqpHelper.publishMessage(inputMessage);
//             amqpHelper.publishMessage(inputMessage);
//
//             // let (sailor + amqp) some time to handle all messages
//             await new Promise(resolve => setTimeout(resolve, 500));
//
//             // just to double check, that sailor is not processed the message yet
//             expect(amqpHelper.dataMessages).to.have.lengthOf(0);
//
//             await sailorTester.sendKill();
//
//             // waiting until sailor finished
//             await sailorTester.getPromise();
//
//             // make sure that echo_incoming_data finished processing
//             expect(amqpHelper.dataMessages).to.have.lengthOf(1);
//
//             // sailor must not consume new messages once shutdown is scheduled
//             // so make sure that the second messages is not consumed
//             const messagesLeft = await amqpHelper.retrieveAllMessagesNotConsumedBySailor();
//             expect(messagesLeft).to.have.lengthOf(1);
//         });
//     });
//
//     // describe('start, two messages, wait for the first message processed, shutdown', () => {
//     //     // FIXME –  I don't know how to test this without making a Wunderwaffe
//     //     it('should shutdown after processing of the last message');
//     // });
//
//     describe('start, two messages, fast processing, wait, shutdown', () => {
//         it('should shutdown shortly', async () => {
//             // selecting certain trigger of the component
//             env.ELASTICIO_FUNCTION = 'echo_incoming_data';
//
//             const sailorTester = helpers.ShellTester.init();
//
//             amqpHelper.publishMessage(inputMessage);
//             amqpHelper.publishMessage(inputMessage);
//
//             await sailorTester.run();
//             // let (sailor + amqp) some time to handle all messages
//             await new Promise(resolve => setTimeout(resolve, 2000));
//
//             // make sure sailor is processed the messages
//             expect(amqpHelper.dataMessages).to.have.lengthOf(2);
//
//             await sailorTester.sendKill();
//
//             // waiting until sailor finished
//             await sailorTester.getPromise();
//
//             // sailor must not consume new messages once shutdown is scheduled
//             // so make sure that the second messages is not consumed
//             const messagesLeft = await amqpHelper.retrieveAllMessagesNotConsumedBySailor();
//             expect(messagesLeft).to.have.lengthOf(0);
//         });
//     });
// });

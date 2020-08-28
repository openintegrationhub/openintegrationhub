const QueueCreator = require('../src/QueueCreator');
const chai = require('chai');
const { expect } = chai;

const Flow = require('./Flow');

describe('QueueCreator', () => {
    let queueCreator;
    let channel;

    beforeEach(() => {
        channel = {
            assertExchange: () => { },
            assertQueue: () => { },
            bindQueue: () => { },
            bindExchange: () => { }
        };
        queueCreator = new QueueCreator(channel);
    });

    describe('#makeQueuesForTheFlow', () => {
        it('should return config', async () => {
            const flow = new Flow({
                id: '12345',
                graph: {
                    nodes: [
                        { id: 'step_1' },
                        { id: 'step_2' },
                        { id: 'step_3' },
                        { id: 'step_4' },
                        { id: 'step_5' }
                    ],
                    edges: [
                        { source: 'step_1', target: 'step_2' },
                        { source: 'step_2', target: 'step_3' },
                        { source: 'step_3', target: 'step_4' },
                        { source: 'step_4', target: 'step_5' }
                    ]
                }
            });

            const component = {
                id: 'fooo',
                isGlobal: false
            }

            const globalComponent = {
                id: 'fooo1',
                isGlobal: true
            }

            const componentsMap = new Map()

            componentsMap.set('step_1', component)
            componentsMap.set('step_2', component)
            componentsMap.set('step_3', component)
            componentsMap.set('step_4', globalComponent)
            componentsMap.set('step_5', component)

            const result = await queueCreator.makeQueuesForTheFlow(flow, componentsMap);
            expect(result).to.deep.equal({
                step_1: {
                    'BACKCHANNEL_EXCHANGE': 'orchestrator_backchannel',
                    'OUTPUT_ROUTING_KEY': 'orchestrator_backchannel.input',
                    'ERROR_ROUTING_KEY': 'flow-12345.step_1.error',
                    'LISTEN_MESSAGES_ON': 'flow-12345:step_1:messages',
                    'REBOUND_ROUTING_KEY': 'flow-12345.step_1.rebound',
                    'SNAPSHOT_ROUTING_KEY': 'flow-12345.step_1.snapshot'
                },
                step_2: {
                    'BACKCHANNEL_EXCHANGE': 'orchestrator_backchannel',
                    'OUTPUT_ROUTING_KEY': 'orchestrator_backchannel.input',
                    'ERROR_ROUTING_KEY': 'flow-12345.step_2.error',
                    'LISTEN_MESSAGES_ON': 'flow-12345:step_2:messages',
                    'REBOUND_ROUTING_KEY': 'flow-12345.step_2.rebound',
                    'SNAPSHOT_ROUTING_KEY': 'flow-12345.step_2.snapshot'
                },
                step_3: {
                    'BACKCHANNEL_EXCHANGE': 'orchestrator_backchannel',
                    'OUTPUT_ROUTING_KEY': 'orchestrator_backchannel.input',
                    'ERROR_ROUTING_KEY': 'flow-12345.step_3.error',
                    'LISTEN_MESSAGES_ON': 'flow-12345:step_3:messages',
                    'REBOUND_ROUTING_KEY': 'flow-12345.step_3.rebound',
                    'SNAPSHOT_ROUTING_KEY': 'flow-12345.step_3.snapshot'
                },
                //
                // step 4 for was skipped
                //
                step_5: {
                    'BACKCHANNEL_EXCHANGE': 'orchestrator_backchannel',
                    'OUTPUT_ROUTING_KEY': 'orchestrator_backchannel.input',
                    'ERROR_ROUTING_KEY': 'flow-12345.step_5.error',
                    'LISTEN_MESSAGES_ON': 'flow-12345:step_5:messages',
                    'REBOUND_ROUTING_KEY': 'flow-12345.step_5.rebound',
                    'SNAPSHOT_ROUTING_KEY': 'flow-12345.step_5.snapshot'
                }
            });
        });
    });
});

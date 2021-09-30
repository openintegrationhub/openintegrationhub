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
                        { id: 'step_1', componentId: 'local' },
                        { id: 'step_2', componentId: 'local' },
                        { id: 'step_3', componentId: 'global' },
                        { id: 'step_4', componentId: 'global' },
                        { id: 'step_5', componentId: 'local' }
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
                id: 'local',
                isGlobal: false
            }

            const globalComponent = {
                id: 'global',
                isGlobal: true
            }

            const components = {}

            components['local'] = component
            components['global'] = globalComponent

            const result = await queueCreator.makeQueuesForTheFlow(flow, components);
            expect(result).to.deep.equal({
                step_1: {
                    'BACKCHANNEL_EXCHANGE': 'orchestrator_backchannel',
                    'NODE_EXCHANGE': 'flow-12345',
                    'OUTPUT_ROUTING_KEY': 'orchestrator_backchannel.input',
                    'ERROR_ROUTING_KEY': 'orchestrator_backchannel.error',
                    'LISTEN_MESSAGES_ON': 'flow-12345:step_1:messages',
                    'REBOUND_ROUTING_KEY': 'flow-12345.step_1.rebound',
                    'SNAPSHOT_ROUTING_KEY': 'flow-12345.step_1.snapshot'
                },
                step_2: {
                    'BACKCHANNEL_EXCHANGE': 'orchestrator_backchannel',
                    'NODE_EXCHANGE': 'flow-12345',
                    'OUTPUT_ROUTING_KEY': 'orchestrator_backchannel.input',
                    'ERROR_ROUTING_KEY': 'orchestrator_backchannel.error',
                    'LISTEN_MESSAGES_ON': 'flow-12345:step_2:messages',
                    'REBOUND_ROUTING_KEY': 'flow-12345.step_2.rebound',
                    'SNAPSHOT_ROUTING_KEY': 'flow-12345.step_2.snapshot'
                },

                //
                // step 3 for was skipped (global)
                //

                //
                // step 4 for was skipped (global)
                //

                step_5: {
                    'BACKCHANNEL_EXCHANGE': 'orchestrator_backchannel',
                    'NODE_EXCHANGE': 'flow-12345',
                    'OUTPUT_ROUTING_KEY': 'orchestrator_backchannel.input',
                    'ERROR_ROUTING_KEY': 'orchestrator_backchannel.error',
                    'LISTEN_MESSAGES_ON': 'flow-12345:step_5:messages',
                    'REBOUND_ROUTING_KEY': 'flow-12345.step_5.rebound',
                    'SNAPSHOT_ROUTING_KEY': 'flow-12345.step_5.snapshot'
                }
            });
        });
    });
});

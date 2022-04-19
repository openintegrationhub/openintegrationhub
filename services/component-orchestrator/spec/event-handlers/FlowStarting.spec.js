const mongoose = require('mongoose');
const Flow = require('../../src/models/Flow');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const FlowStarting = require('../../src/event-handlers/FlowStarting');
const { Event } = require('@openintegrationhub/event-bus');
const sinon = require('sinon');

describe('FlowStarting event handler', () => {
    before(async () => {
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { });
    });

    after(async () => {
        await mongoose.disconnect();
    });

    let flowStarting;

    beforeEach(async () => {
        await Flow.deleteMany();
        const logger = {
            info: () => { },
            trace: () => { },
            error: err => console.error(err)
        };
        flowStarting = FlowStarting({ logger });
    });

    afterEach(async () => {
        await Flow.deleteMany();
        sinon.restore();
    });

    describe('if flow', () => {
        [
            { name: 'doesnt exist', flow: new Flow() },
            { name: 'exists', flow: Flow.create({}) }
        ].forEach(({ name, flow }) => {
            it(name, async () => {
                flow = await flow;
                const event = new Event({
                    headers: {},
                    payload: {
                        id: flow.id,
                        graph: {
                            nodes: [
                                { id: 'step_1' }
                            ]
                        },
                        status: 'starting'
                    }
                });

                sinon.stub(event, 'ack').resolves();
                sinon.stub(event, 'nack').resolves();

                await flowStarting(event);

                expect(event.ack).to.have.been.calledOnce;
                expect(event.nack).not.to.have.been.called;

                const foundFlow = await Flow.findById(flow.id);
                expect(foundFlow.graph).to.deep.equal({
                    nodes: [{ id: 'step_1' }]
                });
                expect(foundFlow.status).to.equal('starting');
            });
        });
    });
});

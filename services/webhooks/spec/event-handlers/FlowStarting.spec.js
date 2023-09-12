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
    const logger = {
        info: () => { },
        trace: () => { },
        error: err => console.error(err)
    };

    beforeEach(async () => {
        await Flow.deleteMany();

        flowStarting = FlowStarting({ logger });
    });

    afterEach(async () => {
        await Flow.deleteMany();
        sinon.restore();
    });

    describe('flow with cron', () => {
        describe('if flow is not found', () => {
            it('should do nothing', async () => {
                const event = new Event({
                    headers: {},
                    payload: {
                        id: new Flow().id,
                        cron: '* * * * *'
                    }
                });

                sinon.stub(event, 'ack').resolves();
                sinon.stub(event, 'nack').resolves();

                await flowStarting(event);

                expect(event.ack).to.have.been.calledOnce;
                expect(event.nack).not.to.have.been.called;
            });
        });

        describe('if is allowed scheduled flow', () => {
            it('should create it', async () => {
                flowStarting = FlowStarting({ logger, config: {
                    'ALLOW_RUN_SCHEDULED_FLOWS': 'true'
                } });
                const flow = await Flow.create({});

                const event = new Event({
                    headers: {},
                    payload: {
                        id: flow.id,
                        cron: '* * * * *'
                    }
                });

                sinon.stub(event, 'ack').resolves();
                sinon.stub(event, 'nack').resolves();

                await flowStarting(event);

                expect(event.ack).to.have.been.calledOnce;
                expect(event.nack).not.to.have.been.called;

                expect(await Flow.findById(flow.id)).not.to.be.null;
            });
        });

        describe('if flow has been found', () => {
            it('should remove it', async () => {
                const flow = await Flow.create({});

                const event = new Event({
                    headers: {},
                    payload: {
                        id: flow.id,
                        cron: '* * * * *'
                    }
                });

                sinon.stub(event, 'ack').resolves();
                sinon.stub(event, 'nack').resolves();

                await flowStarting(event);

                expect(event.ack).to.have.been.calledOnce;
                expect(event.nack).not.to.have.been.called;

                expect(await Flow.findById(flow.id)).to.be.null;
            });
        });
    });

    describe('flow without cron', () => {
        [
            { name: 'if a flow doesnt exist', flow: new Flow() },
            { name: 'if a flow exists', flow: Flow.create({}) }
        ].forEach(({ name, flow }) => {
            it(name, async () => {
                flow = await flow;

                const event = new Event({
                    headers: {},
                    payload: {
                        id: flow.id,
                        graph: {
                            nodes: { id: 'step_1' }
                        }
                    }
                });

                sinon.stub(event, 'ack').resolves();
                sinon.stub(event, 'nack').resolves();

                await flowStarting(event);

                expect(event.ack).to.have.been.calledOnce;
                expect(event.nack).not.to.have.been.called;

                const foundFlow = await Flow.findById(flow.id);
                expect(foundFlow).not.to.be.null;
                expect(foundFlow.graph).to.deep.equal({
                    nodes: { id: 'step_1' }
                });
                expect(foundFlow.status).to.equal('starting');
            });
        });
    });
});

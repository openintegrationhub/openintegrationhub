const mongoose = require('mongoose');
const Flow = require('../../src/models/Flow');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const FlowStarted = require('../../src/event-handlers/FlowStarted');
const { Event } = require('@openintegrationhub/event-bus');
const sinon = require('sinon');

describe('FlowStarted event handler', () => {
    before(async () => {
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { });
    });

    after(async () => {
        await mongoose.disconnect();
    });

    let flowStarted;

    beforeEach(async () => {
        await Flow.deleteMany();
        const logger = {
            info: () => { },
            trace: () => { },
            error: err => console.error(err)
        };
        flowStarted = FlowStarted({ logger });
    });

    afterEach(async () => {
        await Flow.deleteMany();
        sinon.restore();
    });

    describe('if a flow is not found', () => {
        it('should do nothing', async () => {
            const event = new Event({
                headers: {},
                payload: {
                    id: new Flow().id
                }
            });

            sinon.stub(event, 'ack').resolves();
            sinon.stub(event, 'nack').resolves();

            await flowStarted(event);

            expect(event.ack).to.have.been.calledOnce;
            expect(event.nack).not.to.have.been.called;
        });
    });

    describe('if a flow is found', () => {
        it('should change it\'s status', async () => {
            const flow = await Flow.create({
                status: 'starting'
            });

            const event = new Event({
                headers: {},
                payload: {
                    id: flow.id
                }
            });

            sinon.stub(event, 'ack').resolves();
            sinon.stub(event, 'nack').resolves();

            await flowStarted(event);

            expect(event.ack).to.have.been.calledOnce;
            expect(event.nack).not.to.have.been.called;

            const foundFlow = await Flow.findById(flow.id);
            expect(foundFlow.status).to.equal('started');
        });
    });
});

const mongoose = require('mongoose');
const Flow = require('../../src/models/Flow');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;
const FlowStopping = require('../../src/event-handlers/FlowStopping');
const { Event } = require('@openintegrationhub/event-bus');
const sinon = require('sinon');

describe('FlowStopping event handler', () => {
    before(async () => {
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { });
    });

    after(async () => {
        await mongoose.disconnect();
    });

    let flowStopping;

    beforeEach(async () => {
        await Flow.deleteMany();
        const logger = {
            info: () => { },
            trace: () => { },
            error: err => console.error(err)
        };
        flowStopping = FlowStopping({ logger });
    });

    afterEach(async () => {
        await Flow.deleteMany();
        sinon.restore();
    });

    describe('should delete local record', () => {
        [
            { name: 'if a flow doesnt exist', flow: new Flow() },
            { name: 'if a flow exists', flow: Flow.create({}) }
        ].forEach(({ name, flow }) => {
            it(name, async () => {
                flow = await flow;
                const event = new Event({
                    headers: {},
                    payload: {
                        id: flow.id
                    }
                });

                sinon.stub(event, 'ack').resolves();
                sinon.stub(event, 'nack').resolves();

                await flowStopping(event);

                expect(event.ack).to.have.been.calledOnce;
                expect(event.nack).not.to.have.been.called;
            });
        });
    });
});

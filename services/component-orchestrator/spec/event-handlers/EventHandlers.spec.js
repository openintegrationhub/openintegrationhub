const eventHandlers = require('../../src/event-handlers/EventHandlers');
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = require('chai');

describe('EventHandlers', () => {
    const eventBus = {
        subscribe() {},
        connect() {},
    };
    const flowStarting = () => {};
    const flowStopping = () => {};
    let eh;

    beforeEach(async () => {
        sinon.stub(eventBus, 'subscribe').resolves();
        sinon.stub(eventBus, 'connect').resolves();

        eh = eventHandlers({
            eventBus,
            flowStarting,
            flowStopping,
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should subscribe to events', async () => {
        expect(eventBus.subscribe).to.have.been.calledWith('flow.starting', flowStarting);
        expect(eventBus.subscribe).to.have.been.calledWith('flow.stopping', flowStopping);
    });

    describe('#connect', () => {
        it('should connect to event bus', async () => {
            await eh.connect();

            expect(eventBus.connect).to.have.been.calledOnce;
        });
    });
});

const RunningComponent = require('../../src/drivers/RunningComponent');
const { expect } = require('chai');

describe('RunningFlowNode', () => {
    let rn;

    beforeEach(() => {
        rn = new RunningComponent();
    });

    describe('#getId', () => {
        it('should throw', async () => {
            expect(rn.getId).to.throw('To be implemented');
        });
    });

    describe('#getFlowId', () => {
        it('should throw', async () => {
            expect(rn.getFlowId).to.throw('To be implemented');
        });
    });

    describe('#getNodeId', () => {
        it('should throw', async () => {
            expect(rn.getNodeId).to.throw('To be implemented');
        });
    });

    describe('#getType', () => {
        it('should throw', async () => {
            expect(rn.getType).to.throw('To be implemented');
        });
    });
});

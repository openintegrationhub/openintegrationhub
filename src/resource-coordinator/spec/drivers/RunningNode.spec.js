const RunningNode = require('../../src/drivers/RunningNode');
const { expect } = require('chai');

describe('RunningNode', () => {
    let rn;

    beforeEach(() => {
        rn = new RunningNode();
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
});

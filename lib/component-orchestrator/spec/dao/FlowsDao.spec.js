const FlowsDao = require('../../src/dao/FlowsDao');
const { expect } = require('chai');

describe('FlowsDao', () => {
    let fd;

    beforeEach(() => {
        fd = new FlowsDao();
    });

    describe('#findAll', () => {
        it('should throw', async () => {
            expect(fd.findAll).to.throw('To be implemented');
        });
    });
});

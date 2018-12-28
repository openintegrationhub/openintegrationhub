const FlowsDao = require('../../src/dao/FlowsDao');
const { expect } = require('chai');

describe('FlowsDao', () => {
    let fd;

    beforeEach(() => {
        fd = new FlowsDao();
    });

    describe('#findById', () => {
        it('should throw', async () => {
            expect(fd.findById).to.throw('To be implemented');
        });
    });

    describe('#update', () => {
        it('should throw', async () => {
            expect(fd.update).to.throw('To be implemented');
        });
    });

    describe('#findAll', () => {
        it('should throw', async () => {
            expect(fd.findAll).to.throw('To be implemented');
        });
    });

    describe('#ensureFinalizer', () => {
        it('should not throw', async () => {
            expect(fd.ensureFinalizer).not.to.throw();
        });
    });

    describe('#removeFinalizer', () => {
        it('should not throw', async () => {
            expect(fd.removeFinalizer).not.to.throw();
        });
    });
});

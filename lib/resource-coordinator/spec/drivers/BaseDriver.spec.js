const BaseDriver = require('../../src/drivers/BaseDriver');
const { expect } = require('chai');

describe('BaseDriver', () => {
    let bd;

    beforeEach(() => {
        bd = new BaseDriver();
    });

    describe('#createApp', () => {
        it('should throw', async () => {
            expect(bd.createApp).to.throw('To be implemented');
        });
    });

    describe('#destroyApp', () => {
        it('should throw', async () => {
            expect(bd.destroyApp).to.throw('To be implemented');
        });
    });

    describe('#getAppList', () => {
        it('should throw', async () => {
            expect(bd.getAppList).to.throw('To be implemented');
        });
    });
});

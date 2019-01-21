const index = require('..');
const { expect } = require('chai');

describe('index', () => {
    it('should expose BaseDriver', () => {
        expect(index.BaseDriver).to.equal(require('../src/drivers/BaseDriver'));
    });

    it('should expose RunningNode', () => {
        expect(index.RunningNode).to.equal(require('../src/drivers/RunningNode'));
    });

    it('should expose FlowsDao', () => {
        expect(index.FlowsDao).to.equal(require('../src/dao/FlowsDao'));
    });

    it('should expose ResourceCoordinator', () => {
        expect(index.ResourceCoordinator).to.equal(require('../src/ResourceCoordinator'));
    });
});

const index = require('..');
const { expect } = require('chai');

describe('index', () => {
    it('should expose BaseDriver', () => {
        expect(index.BaseDriver).to.equal(require('../src/drivers/BaseDriver'));
    });

    it('should expose RunningComponent', () => {
        expect(index.RunningComponent).to.equal(require('../src/drivers/RunningComponent'));
    });

    it('should expose FlowsDao', () => {
        expect(index.FlowsDao).to.equal(require('../src/dao/FlowsDao'));
    });

    it('should expose ComponentOrchestrator', () => {
        expect(index.ComponentOrchestrator).to.equal(require('../src/ComponentOrchestrator'));
    });
});

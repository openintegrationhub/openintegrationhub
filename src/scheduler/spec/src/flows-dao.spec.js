const { FlowsDao } = require('../../src/index');
const { expect } = require('chai');

describe('FlowsDao', () => {
    it('#findForScheduling', () => {
        const flowsDao = new FlowsDao();
        expect(typeof flowsDao.findForScheduling).to.equal('function');
    });

    it('#planNextRun', () => {
        const flowsDao = new FlowsDao();
        expect(typeof flowsDao.planNextRun).to.equal('function');
    });
});

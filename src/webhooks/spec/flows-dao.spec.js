const FlowsDao = require('../src/flows-dao');
const { expect } = require('chai');

describe('FlowsDao', () => {
    it('#findById', () => {
        const fdao = new FlowsDao();
        expect(fdao.findById).to.be.a('function');
        expect(fdao.findById).to.throw('To be implemented');
    });
});

const BasePublisher = require('../../src/message-publishers/base');
const { expect } = require('chai');

describe('Base Message Publisher', () => {
    it('#publish', () => {
        const mp = new BasePublisher();
        expect(mp.publish).to.be.a('function');
        expect(mp.publish).to.throw('To be implemented');
    });
});

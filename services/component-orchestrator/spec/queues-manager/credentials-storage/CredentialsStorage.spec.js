const CredentialsStorage = require('../../../src/queues-manager/credentials-storage/CredentialsStorage');
const { expect } = require('chai');

describe('CredentialsStorage', () => {
    let cs;

    beforeEach(() => {
        cs = new CredentialsStorage();
    });

    describe('#get', () => {
        it('should be defined', () => {
            expect(cs.get).to.be.a('function');
        });
    });

    describe('#set', () => {
        it('should be defined', () => {
            expect(cs.set).to.be.a('function');
        });
    });

    describe('#remove', () => {
        it('should be defined', () => {
            expect(cs.remove).to.be.a('function');
        });
    });

    describe('#getAllForFlow', () => {
        it('should be defined', () => {
            expect(cs.getAllForFlow).to.be.a('function');
        });
    });
});

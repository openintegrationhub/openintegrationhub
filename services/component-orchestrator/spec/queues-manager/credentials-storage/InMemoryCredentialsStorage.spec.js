const InMemoryCredentialsStorage = require('../../../src/queues-manager/credentials-storage/InMemoryCredentialsStorage');
const { expect } = require('chai');

describe('InMemoryCredentialsStorage', () => {
    let cs;

    beforeEach(() => {
        cs = new InMemoryCredentialsStorage();
    });

    describe('get - set - remove', () => {
        it('should return stored creds', async () => {
            await cs.set('flow1', 'node1', { my: 'creds' });
            expect(await cs.get('flow1', 'node1')).to.deep.equal({ my: 'creds' });
        });

        it('should return undefined', async () => {
            expect(await cs.get()).to.be.undefined;
        });

        it('should remove stored cred', async () => {
            await cs.set('flow1', 'node1', { my: 'creds' });
            expect(await cs.get('flow1', 'node1')).to.deep.equal({ my: 'creds' });
            await cs.remove('flow1', 'node1');
            expect(await cs.get()).to.be.undefined;
        });
    });

    describe('#getAllForFlow', () => {
        it('should return all credentials for flow', async () => {
            await cs.set('flow1', 'node1', { my: 'creds' });
            await cs.set('flow1', 'node2', { my: 'creds2' });

            expect(await cs.getAllForFlow('flow1')).to.deep.equal([
                {
                    nodeId: 'node1',
                    credential: { my: 'creds' },
                },
                {
                    nodeId: 'node2',
                    credential: { my: 'creds2' },
                },
            ]);
        });
    });
});

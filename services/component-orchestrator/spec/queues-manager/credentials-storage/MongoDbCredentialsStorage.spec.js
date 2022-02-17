const MongoDbCredentialsStorage = require('../../../src/queues-manager/credentials-storage/MongoDbCredentialsStorage');
const { expect } = require('chai');
const mongoose = require('mongoose');

describe('MongoDbCredentialsStorage', () => {
    let cs;

    before(async () => {
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { });
    });

    after(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        cs = new MongoDbCredentialsStorage();
        await cs.clear();
    });

    afterEach(async () => {
        await cs.clear();
    });

    describe('get - set - remove', () => {
        it('should return stored creds', async () => {
            await cs.set('flow1', 'node1', { username: 'user1', password: 'pass1' });
            expect(await cs.get('flow1', 'node1')).to.deep.equal({ username: 'user1', password: 'pass1' });
        });

        it('should return falsy', async () => {
            expect(await cs.get()).to.be.not.ok;
        });

        it('should remove stored cred', async () => {
            await cs.set('flow1', 'node1', { username: 'user1', password: 'pass1' });
            expect(await cs.get('flow1', 'node1')).to.deep.equal({ username: 'user1', password: 'pass1' });
            await cs.remove('flow1', 'node1');
            expect(await cs.get('flow1', 'node1')).to.be.not.ok;
        });
    });

    describe('#getAllForFlow', () => {
        it('should return all credentials for flow', async () => {
            await cs.set('flow1', 'node1', { username: 'user1', password: 'pass1' });
            await cs.set('flow1', 'node2', { username: 'user2', password: 'pass2' });

            expect(await cs.getAllForFlow('flow1')).to.deep.equal([
                {
                    nodeId: 'node1',
                    credential: { username: 'user1', password: 'pass1' }
                },
                {
                    nodeId: 'node2',
                    credential: { username: 'user2', password: 'pass2' }
                }
            ]);

            await cs.clear();
            expect(await cs.getAllForFlow('flow1')).to.deep.equal([]);
        });
    });
});

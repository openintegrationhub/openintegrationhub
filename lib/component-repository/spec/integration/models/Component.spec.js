const Component = require('../../../src/models/Component');
const { expect } = require('chai');
const mongoose = require('mongoose');

describe('Component model', () => {
    before(async () => {
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { useNewUrlParser: true });
    });

    after(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Component.deleteMany({});
    });

    afterEach(async () => {
        await Component.deleteMany({});
    });

    describe('#removeOwner', () => {
        it('should remove owner from owners array', () => {
            const c = new Component({
                owners: [
                    {
                        type: 'user',
                        id: 123
                    },
                    {
                        type: 'tenant',
                        id: 123
                    }
                ]
            });

            c.removeOwner({ id: '123', type: 'user' });

            expect(c.toJSON().owners).to.deep.equal([{
                type: 'tenant',
                id: '123'
            }]);
        });
    });

    describe('#findByOwner', () => {
        it('should find components by owner', async () => {
            const c1 = await Component.create({
                name: 'comp1',
                distribution: {
                    type: 'docker',
                    image: 'koko'
                },
                owners: [
                    { id: 1, type: 'user' }
                ]
            });

            await Component.create({
                name: 'comp2',
                distribution: {
                    type: 'docker',
                    image: 'koko'
                },
                owners: [
                    { id: 2, type: 'user' }
                ]
            });

            const comps = await Component.findByOwner({ id: 1, type: 'user' });
            expect(comps.length).to.equal(1);
            const [comp] = comps;
            expect(comp.name).to.equal(c1.name);
        });
    });
});

const mongoose = require('mongoose');
const { expect } = require('chai');
const EventSubscription = require('../../src/EventSubscription');
const Component = require('../../src/models/Component');
const EventBusMock = require('./EventBusMock');
const logger = require('bunyan').createLogger({ name: 'test-logger' });

describe('EventSubscription', () => {
    before(async () => {
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { });
    });

    after(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async function f() {
        await Component.deleteMany({});
        this.eventBus = new EventBusMock();
        this.eventSubscription = new EventSubscription({ eventBus: this.eventBus, logger });
        await this.eventSubscription.subscribe();
    });

    afterEach(async () => {
        await Component.deleteMany({});
    });

    it('should subscribe', async function () {
        await Component.create({
            name: 'comp1',
            distribution: {
                type: 'docker',
                image: 'koko'
            },
            owners: [
                { id: '1', type: 'user' }
            ]
        });

        await Component.create({
            name: 'comp2',
            distribution: {
                type: 'docker',
                image: 'koko'
            },
            owners: [
                { id: '1', type: 'user' },
                { id: '2', type: 'user' }
            ]
        });
        await this.eventBus.trigger('iam.user.deleted', {
            header: {},
            payload: {
                id: '1'
            },
            ack() { },
            nack() { },
        });

        const foundComponents = await Component.find({});
        expect(foundComponents.length).to.equal(2);
        const c1 = foundComponents[0].toJSON();
        const c2 = foundComponents[1].toJSON();
        expect(c1.name).to.equal('comp1');
        expect(c1.owners).to.deep.equal([]);
        expect(c2.name).to.equal('comp2');
        expect(c2.owners).to.deep.equal([
            { id: '2', type: 'user' }
        ]);
    });
});

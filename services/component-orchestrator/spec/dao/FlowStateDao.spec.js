const FlowStateDao = require('../../src/dao/FlowStateDao');
const mongoose = require('mongoose')
const { expect } = require('chai');

const flowExecId = 'foobar'
const flowExecId2 = 'foobar2'

const flowStateDao = new FlowStateDao();

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

describe('FlowStateDao', () => {
    before(async () => {
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test'
        await mongoose.connect(mongoUri, { useNewUrlParser: true, useFindAndModify: false });
        await flowStateDao.delete(flowExecId)
        await flowStateDao.delete(flowExecId2)
    });

    after(async () => {
        await mongoose.disconnect();
    });

    describe('With flowId and stepId', () => {
        it('should return true', async () => {
            const TOTAL_STEPS = 100
            const steps = [...Array(TOTAL_STEPS + 1).keys()].slice(1);
            let started = []
            let succeeded = []
            const promises = []

            while (steps.length > 0) {
                const newlyStarted = []
                const newlySucceeded = []
                if (steps.length === 1) {
                    newlyStarted.push(steps.pop())
                } else {
                    for (let i = 0; i < getRandomInt(steps.length); i++) {
                        newlyStarted.push(steps.pop())
                    }
                }

                for (let i = 0; i < getRandomInt(started.length); i++) {
                    newlySucceeded.push(started.pop())
                }

                promises.push(flowStateDao.upsert(flowExecId, newlyStarted, newlySucceeded))

                started = started.concat(newlyStarted)
                succeeded = succeeded.concat(newlySucceeded)
            }

            await Promise.all(promises)

            // finsish rest of started
            const { succeededNodes, startedNodes } = await flowStateDao.upsert(flowExecId, [], started)

            expect(succeededNodes.length).to.equal(startedNodes.length);
            expect(succeededNodes.reduce((a,b)=>a+b)).to.equal(startedNodes.reduce((a,b)=>a+b));
        });
    });

    describe('Counted only', () => {
        it('should return true', async () => {
            const TOTAL_STEPS = 100
            const steps = [...Array(TOTAL_STEPS + 1).keys()].slice(1);
            let started = []
            let succeeded = []
            const promises = []

            while (steps.length > 0) {
                const newlyStarted = []
                const newlySucceeded = []
                if (steps.length === 1) {
                    newlyStarted.push(steps.pop())
                } else {
                    for (let i = 0; i < getRandomInt(steps.length); i++) {
                        newlyStarted.push(steps.pop())
                    }
                }

                for (let i = 0; i < getRandomInt(started.length); i++) {
                    newlySucceeded.push(started.pop())
                }

                promises.push(flowStateDao.upsertCount(flowExecId2, newlyStarted.length, newlySucceeded.length))

                started = started.concat(newlyStarted)
                succeeded = succeeded.concat(newlySucceeded)
            }

            await Promise.all(promises)

            // finsish rest of started
            const results = await flowStateDao.upsertCount(flowExecId2, 0, started.length)
            console.log(results)

            expect(results.started).to.equal(results.succeeded);
        });
    });
});

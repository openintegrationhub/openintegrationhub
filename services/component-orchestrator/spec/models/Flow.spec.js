const Flow = require('../../src/models/Flow');
const chai = require('chai');
const { expect } = chai;
const mongoose = require('mongoose');

describe('Flow model', () => {
    before(async () => {
        let mongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost/test';
        await mongoose.connect(mongoUri, {});
    });

    after(async () => {
        await mongoose.disconnect();
    });

    describe('isStarting', () => {
        it('should return true', () => {
            const flow = new Flow({
                status: 'starting',
            });
            expect(flow.isStarting).to.be.true;
        });

        it('should return false', () => {
            const flow = new Flow({
                status: 'started',
            });
            expect(flow.isStarting).to.be.false;
        });
    });

    describe('isStopping', () => {
        it('should return true', () => {
            const flow = new Flow({
                status: 'stopping',
            });
            expect(flow.isStopping).to.be.true;
        });

        it('should return false', () => {
            const flow = new Flow({
                status: 'started',
            });
            expect(flow.isStopping).to.be.false;
        });
    });

    describe('#getNodeById', () => {
        it('should find a node', () => {
            const flow = new Flow({
                graph: {
                    nodes: [{ id: 'step_1' }],
                },
            });

            expect(flow.getNodeById('step_1')).to.deep.equal({ id: 'step_1' });
        });

        it('should return undefined', () => {
            const flow = new Flow({
                graph: {
                    nodes: [{ id: 'step_1' }],
                },
            });

            expect(flow.getNodeById('step_2')).to.be.undefined;
        });
    });

    describe('#getFirstNode', () => {
        it('should return first node', () => {
            const flow = new Flow({
                graph: {
                    nodes: [{ id: 'step_1' }, { id: 'step_2' }, { id: 'step_3' }],
                    edges: [
                        { source: 'step_1', target: 'step_2' },
                        { source: 'step_2', target: 'step_3' },
                    ],
                },
            });

            expect(flow.getFirstNode()).to.deep.equal({ id: 'step_1' });
        });

        it('should return first node if there is only one node', () => {
            const flow = new Flow({
                graph: {
                    nodes: [{ id: 'step_1' }],
                },
            });

            expect(flow.getFirstNode()).to.deep.equal({ id: 'step_1' });
        });

        it('should return null if there are no nodes', () => {
            const flow = new Flow({
                graph: {
                    nodes: [],
                },
            });

            expect(flow.getFirstNode()).to.be.null;
        });

        it('should return null if there are no edges', () => {
            const flow = new Flow({
                graph: {
                    nodes: [{ id: 'step_1' }, { id: 'step_2' }],
                    edges: [],
                },
            });

            expect(flow.getFirstNode()).to.be.null;
        });

        it('should return undefined if edges are wrong', () => {
            const flow = new Flow({
                graph: {
                    nodes: [{ id: 'step_1' }, { id: 'step_2' }],
                    edges: [
                        { source: 'step_1', target: 'step_2' },
                        { source: 'step_2', target: 'step_1' },
                    ],
                },
            });

            expect(flow.getFirstNode()).to.be.undefined;
        });
    });

    describe('#onStarted', () => {
        it('should set status to started', async () => {
            const flow = await Flow.create({});
            await flow.onStarted();
            const foundFlow = await Flow.findById(flow.id);
            expect(foundFlow).not.to.be.null;
            expect(foundFlow.status).to.equal('started');
        });
    });

    describe('#onStopped', () => {
        it('should remove the flow', async () => {
            const flow = await Flow.create({});
            await flow.onStopped();
            const foundFlow = await Flow.findById(flow.id);
            expect(foundFlow).to.be.null;
        });
    });
});

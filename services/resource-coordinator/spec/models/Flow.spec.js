const Flow = require('../../src/models/Flow');
const chai = require('chai');
const { expect } = chai;

describe('Flow model', () => {
    describe('#getNodeById', () => {
        it('should find a node', () => {
            const flow = new Flow({
                graph: {
                    nodes: [
                        {id: 'step_1'}
                    ]
                }
            });

            expect(flow.getNodeById('step_1')).to.deep.equal({id: 'step_1'});
        });

        it('should return undefined', () => {
            const flow = new Flow({
                graph: {
                    nodes: [
                        {id: 'step_1'}
                    ]
                }
            });

            expect(flow.getNodeById('step_2')).to.be.undefined;
        });
    });

    describe('#getFirstNode', () => {
        it('should return first node', () => {
            const flow = new Flow({
                graph: {
                    nodes: [
                        {id: 'step_1', first: true}
                    ]
                }
            });

            expect(flow.getFirstNode()).to.deep.equal({id: 'step_1', first: true});
        });

        it('should return undefined if no first flag', () => {
            const flow = new Flow({
                graph: {
                    nodes: [
                        {id: 'step_1'}
                    ]
                }
            });

            expect(flow.getFirstNode()).to.be.undefined;
        });
    });
});

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
                        {id: 'step_1'},
                        {id: 'step_2'},
                        {id: 'step_3'}
                    ],
                    edges: [
                        {source: 'step_1', target: 'step_2'},
                        {source: 'step_2', target: 'step_3'}
                    ]
                }
            });

            expect(flow.getFirstNode()).to.deep.equal({id: 'step_1'});
        });

        it('should return first node if there is only one node', () => {
            const flow = new Flow({
                graph: {
                    nodes: [
                        {id: 'step_1'}
                    ]
                }
            });

            expect(flow.getFirstNode()).to.deep.equal({id: 'step_1'});
        });

        it('should return null if there are no nodes', () => {
            const flow = new Flow({
                graph: {
                    nodes: []
                }
            });

            expect(flow.getFirstNode()).to.be.null;
        });

        it('should return null if there are no edges', () => {
            const flow = new Flow({
                graph: {
                    nodes: [
                        {id: 'step_1'},
                        {id: 'step_2'}
                    ],
                    edges: []
                }
            });

            expect(flow.getFirstNode()).to.be.null;
        });

        it('should return undefined if edges are wrong', () => {
            const flow = new Flow({
                graph: {
                    nodes: [
                        {id: 'step_1'},
                        {id: 'step_2'}
                    ],
                    edges: [
                        {source: 'step_1', target: 'step_2'},
                        {source: 'step_2', target: 'step_1'}
                    ]
                }
            });

            expect(flow.getFirstNode()).to.be.undefined;
        });
    });
});

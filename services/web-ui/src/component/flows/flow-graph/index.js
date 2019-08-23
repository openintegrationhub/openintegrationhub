
import React from 'react';
import PropTypes from 'prop-types';
import {
    forceSimulation, forceLink, forceManyBody, forceCenter,
} from 'd3-force';

// Ui
import Modal from '@material-ui/core/Modal';

// utils
import { buildTree } from '../../../utils/tree';


/**
 * Create the list of nodes to render.
 * @returns {Array} Array of nodes.
 * @private
 */
function generateSimulation(props) {
    const {
        data, height, width, maxSteps, strength,
    } = props;
    if (!data) {
        return { nodes: [], links: [] };
    }
    // copy the data
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));
    // build the simuatation
    const simulation = forceSimulation(nodes)
        .force('link', forceLink().id(d => d.id))
        .force('link', forceLink().id(d => d.id).distance([150]))
        .force('charge', forceManyBody().strength(strength || -80))
        .force('center', forceCenter(width / 2, height / 2))
        .stop();

    simulation.force('link').links(links);


    const upperBound = Math.ceil(
        Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()),
    );
    for (let i = 0; i < Math.min(maxSteps, upperBound); i += 1) {
        simulation.tick();
    }

    return { nodes, links };
}

class FlowGraph extends React.Component {
    static get defaultProps() {
        return {
            className: '',
            data: { nodes: [], links: [] },
            maxSteps: 50,
        };
    }

    static get propTypes() {
        return {
            className: PropTypes.string,
            data: PropTypes.object.isRequired,
            height: PropTypes.number.isRequired,
            width: PropTypes.number.isRequired,
            steps: PropTypes.number,
        };
    }

    constructor(props) {
        super(props);
        this.state = {
            data: generateSimulation(props),
            openInfo: false,
            modalData: {
                name: '',
                description: '',
                function: '',
            },
        };
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            data: generateSimulation(nextProps),
        });
    }


    render() {
        const {
            className, height, width,
        } = this.props;
        const { data } = this.state;
        const { nodes, links } = data;
        return (
            <div>
                <svg width={width} height={height} className={className}>
                    {links.map(({ source, target }, index) => (
                        <line
                            className='link'
                            key={`link-${index}`}
                            strokeWidth={2}
                            stroke='black'
                            x1={source.x} x2={target.x} y1={source.y} y2={target.y} />
                    ))}
                    {nodes.map((node, index) => {
                        const transform = `translate(${node.x},${node.y})`;
                        return <g
                            className='node'
                            key={`node-${index}`}
                            transform={transform}
                            style={{ cursor: 'pointer' }}
                            onClick={() => { this.setState({ openInfo: !this.state.openInfo, modalData: node }); }} >
                            <circle
                                r={5}/>
                            <text x={25} dy='.35em'>{node.id}</text>
                        </g>;
                    })}

                </svg>
                {/* {
                    buildTree(this.props.data.nodes, this.props.data.links)
                } */}
                <Modal
                    open={this.state.openInfo}
                    onClose={ () => {
                        this.setState({
                            openInfo: false,
                            modalData: {
                                name: '',
                                description: '',
                                function: '',
                            },
                        });
                    }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div style={{
                        backgroundColor: 'white',
                        margin: 'auto',
                        outline: 'none',
                    }}>
                        <div><lable>Name: </lable>{this.state.modalData.name}</div>
                        <div><lable>Description: </lable>{this.state.modalData.description}</div>
                        <div><lable>Function: </lable>{this.state.modalData.function}</div>
                    </div>

                </Modal>
            </div>
        );
    }
}

export default FlowGraph;

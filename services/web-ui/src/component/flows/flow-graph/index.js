import React from 'react';
import {
    tree, hierarchy, select,
} from 'd3';

// Ui
import Modal from '@material-ui/core/Modal';

// utils
import { buildTree } from '../../../utils/tree';

import './styles.css';

class FlowGraph extends React.Component {
    static get defaultProps() {
        return {
            className: '',
            data: { nodes: [], links: [] },
            maxSteps: 50,
        };
    }

    constructor(props) {
        super(props);
        this.state = {
            openInfo: false,
            modalData: {
                name: '',
                description: '',
                function: '',
            },
        };
    }

    componentDidMount() {
        this.getTree(buildTree(this.props.data.nodes, this.props.data.links));
    }

    getTree(treeData) {
        // declares a tree layout and assigns the size
        const margin = {
            top: 20, right: 90, bottom: 30, left: 90,
        };
        const width = 1000 - margin.left - margin.right;
        const height = 240 - margin.top - margin.bottom;

        // declares a tree layout and assigns the size
        const treemap = tree()
            .size([height, width]);

        //  assigns the data to a hierarchy using parent-child relationships
        let nodes = hierarchy(treeData, (d) => d.children);

        // maps the node data to the tree layout
        nodes = treemap(nodes);

        // moves the 'group' element to the top left margin
        const svg = select(`#tree-${this.props.id}`).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);
        const g = svg.append('g')
            .attr('transform',
                `translate(${margin.left},${margin.top})`);

        // adds the links between the nodes
        g.selectAll('.link')
            .data(nodes.descendants().slice(1))
            .enter().append('path')
            .attr('class', 'link')
            .attr('d', (d) => `M${d.y},${d.x
            }C${(d.y + d.parent.y) / 2},${d.x
            } ${(d.y + d.parent.y) / 2},${d.parent.x
            } ${d.parent.y},${d.parent.x}`);

        // adds each node as a group
        const node = g.selectAll('.node')
            .data(nodes.descendants())
            .enter().append('g')
            .attr('class', (d) => `node${
                d.children ? ' node--internal' : ' node--leaf'}`)
            .attr('transform', (d) => `translate(${d.y},${d.x})`)
            .on('click', this.onClickHandle.bind(this));

        // adds the circle to the node
        node.append('circle')
            .attr('r', 10);

        // adds the text to the node
        node.append('text')
            .attr('dy', '.35em')
            .attr('x', (d) => (d.children ? -13 : 13))
            .attr('y', () => (13))
            .style('text-anchor', (d) => (d.children ? 'end' : 'start'))
            .text((d) => d.data.name)
            .on('click', this.onClickHandle.bind(this));
    }

    onClickHandle(d) {
        const data = this.props.data.nodes.find((node) => node.id === d.data.id);
        if (data) {
            this.setState({
                openInfo: true,
                modalData: {
                    name: data.name,
                    description: data.description,
                    function: data.function,
                },
            });
        }
    }

    render() {
        const {
            height, width,
        } = this.props;
        return (
            <div>
                <div id={`tree-${this.props.id}`} width={width} height={height}>

                </div>

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
                    <div
                        className="flow-modal"
                        style={{
                            backgroundColor: 'white',
                            margin: 'auto',
                            outline: 'none',
                        }}>
                        <div className="item">
                            <span>Name: </span>
                            <span>{this.state.modalData.name}</span>
                        </div>
                        <div className="item">
                            <span>Description: </span>
                            <span>{this.state.modalData.description}</span>
                        </div>
                        <div className="item">
                            <span>Function: </span>
                            <span>{this.state.modalData.function}</span>
                        </div>
                    </div>

                </Modal>
            </div>
        );
    }
}

export default FlowGraph;

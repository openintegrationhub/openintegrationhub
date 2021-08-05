

import React from 'react';

import { withRouter } from 'react-router';

import Tree from 'react-d3-tree';
import clone from 'clone';
import axios from 'axios';
import './details.css';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// import { getConfig } from '../../../conf';
import {
    getFlows/* , createFlow, getFlowsPage, switchAddState */,
} from '../../../action/flows';

// const conf = getConfig();
let root;
class FlowDetails extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            flowObject: '',
            data: '',
            selectedNode: '',
            parentOfSelected: '',
            nodeName: '',
            nodeId: '',
            nodeComponentId: '',
            nodeDescription: '',
            nodeFunction: '',
            nodeFields: '',
        };
    }


    async componentDidMount() {
        try {
            const result = await axios({
                method: 'get',
                url: 'http://localhost:3001/flows',
                withCredentials: true,
            });
            this.setState({ flowObject: result.data.data[0], isLoading: false });

            return result;
        } catch (err) {
            console.log(err);
        }
        return null;
    }

    selectNode = (e, unselect) => {
        if (unselect) {
            this.setState({ selectedNode: '' });
            return;
        }
        const nextData = clone(this.state.data);

        const selNode = this.searchTree(nextData, e.data.id);

        this.setState({ selectedNode: selNode });
        this.setState({ parentOfSelected: e.parent });
    };

    searchTree(element, matchingTitle) {
        if (element.id === matchingTitle) {
            return element;
        } if (element.children != null) {
            let i;
            let result = null;
            for (i = 0; result == null && i < element.children.length; i++) {
                console.log('');
                result = this.searchTree(element.children[i], matchingTitle);
            }

            return result;
        }
        return null;
    }

    handleChange(evt) {
        const { value } = evt.target;
        this.setState({
            [evt.target.name]: value,
        });
    }

    addChildNode = () => {
        if (this.state.selectedNode === '') {
            return;
        }
        const nextData = clone(this.state.data);
        const selNode = this.searchTree(nextData, this.state.selectedNode.id);
        if (!Object.prototype.hasOwnProperty.call(selNode, 'children')) {
            selNode.children = [];
            const newTarget = selNode.children;
            newTarget.push({
                name: this.state.nodeName,
                id: this.state.nodeId,
                function: this.state.nodeFunction,
                componentId: this.state.nodeComponentId,
                description: this.state.nodeDescription,
                fields: this.state.nodeFields,
            });
            this.setState({
                data: nextData, nodeName: '', nodeId: '', nodeDescription: '', nodeFunction: '', nodeFields: '', nodeComponentId: '',
            });
            return;
        }
        const target = selNode.children;
        target.push({
            name: this.state.nodeName,
            id: this.state.nodeId,
            function: this.state.nodeFunction,
            componentId: this.state.nodeComponentId,
            description: this.state.nodeDescription,
            fields: this.state.nodeFields,
        });
        this.setState({
            data: nextData, nodeName: '', nodeId: '', nodeDescription: '', nodeFunction: '', nodeFields: '', nodeComponentId: '',
        });
    };

    removeChildNode = () => {
        const nextData = clone(this.state.data);
        const parent = this.searchTree(nextData, this.state.parentOfSelected.data.id);
        parent.children.forEach((id) => {
            const itemIndex = parent.children.findIndex(i => i.id === id);
            parent.children.splice(itemIndex, 1);
        });
        this.setState({ data: nextData });
        this.selectNode('', true);
    };

    dataToDisplay = () => {
        if (!this.state.isLoading) {
            const content = this.state.flowObject.graph.nodes.find(node => node.id === this.state.selectedNode.id);
            return content;
        }
        return null;
    };


    render() {
        const tree = [];
        const flowClone = clone(this.state.flowObject);

        if (flowClone) {
        /* eslint no-unused-vars: */
            const flowObj = flowClone.graph.nodes.forEach((node) => {
                const matchingEdge = flowClone.graph.edges.find(edge => edge.target === node.id);

                tree.push({
                    id: node.id,
                    name: node.name,
                    parent: matchingEdge ? matchingEdge.source : null,
                    componentId: node.componentId,
                    description: node.description,
                    function: node.function,
                });
            });
        }

        const idMapping = tree.reduce((acc, el, i) => {
            acc[el.id] = i;
            return acc;
        }, {});

        tree.forEach((el) => {
            if (el.parent === null) {
                root = el;
                return;
            }
            // Use our mapping to locate the parent element in our data array
            const parentEl = tree[idMapping[el.parent]];
            // Add our current el to its parent's `children` array
            parentEl.children = [...(parentEl.children || []), el];
        });

        const { flowID } = this.props.match.params;
        const displayData = this.dataToDisplay();

        if (!this.state.data) {
            this.setState({ data: root });
        }

        return (
            <div>
                {!this.state.isLoading ? <div>
                    <h3 style={{ textAlign: 'center' }}>Flow id: {flowID}</h3>
                    <div id="treeWrapper" style={{ width: '100vw', height: '60vh', background: 'silver' }}>
                        {this.state.data && <Tree data={this.state.data} onNodeClick={e => this.selectNode(e)} translate={{
                            x: window.innerWidth / 4,
                            y: 250,
                        }} rootNodeClassName="node__root"
                        branchNodeClassName="node__branch"
                        leafNodeClassName="node__leaf"/>}</div>
                    <div style={{ padding: '10px' }}>
                        <p >Selected Node: <span>{this.state.selectedNode.name}</span></p>
                        <div>{displayData ? <div>
                            <p>ID: {displayData.id}</p>
                            <p>Name: {displayData.name}</p>
                            <p>Function: {displayData.function}</p>
                            <p>Description: {displayData.description}</p></div> : null}</div>
                        {this.state.selectedNode && <div>
                            <input name="nodeId" onChange={e => this.handleChange(e)} value={this.state.nodeId} placeholder="Node ID *"/>
                            <input name="nodeName" onChange={e => this.handleChange(e)} value={this.state.nodeName} placeholder="Node Name *"/>
                            <input name="nodeComponentId" onChange={e => this.handleChange(e)} value={this.state.nodeComponentId} placeholder="Node Component ID *"/>
                            <input name="nodeDescription" onChange={e => this.handleChange(e)} value={this.state.nodeDescription} placeholder="Node Description *"/>
                            <input name="nodeFunction" onChange={e => this.handleChange(e)} value={this.state.nodeFunction} placeholder="Node Function *"/>
                            <input name="nodeFields" onChange={e => this.handleChange(e)} value={this.state.nodeFields} placeholder="Node Fields (optional)"/>
                            <button onClick={e => this.addChildNode(e)} style={{ marginLeft: 10, marginRight: 10 }}
                                disabled={!this.state.nodeId || !this.state.nodeName || !this.state.nodeComponentId || !this.state.nodeDescription || !this.state.nodeFunction }>Add Node</button>
                            <button onClick={e => this.removeChildNode(e)}>Remove Node</button><br/>
                            <button style={{ marginTop: '10px' }} onClick={() => this.saveFlow()}>Save</button>
                        </div>}
                    </div>
                </div> : null}

            </div>);
    }
}

const mapStateToProps = state => ({
    flows: state.flows,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getFlows,
    // createFlow,
    // getFlowsPage,
    // switchAddState,
}, dispatch);

export default
flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
)(withRouter(FlowDetails));

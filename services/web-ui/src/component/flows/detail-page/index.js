

import React from 'react';
// import { useTranslation } from 'react-i18next';
// import { withTranslation } from 'react-i18next';
import { Translation } from 'react-i18next';
import _ from 'lodash';
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
const edgeArray = [];
const nodeArray = [];

class FlowDetails extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            treeChanged: false,
            flowObject: '',
            data: '',
            edges: '',
            nodes: '',
            selectedNode: '',
            parentOfSelected: '',
            nodeName: '',
            nodeId: '',
            nodeComponentId: '',
            nodeDescription: '',
            nodeFunction: '',
            nodeFields: '',
            nodeSettings: '',
        };
    }

    async componentDidMount() {
        try {
            const result = await axios({
                method: 'get',
                url: 'http://localhost:3001/flows',
                withCredentials: true,
            });
            console.log('Mountrd');
            this.setState({ flowObject: result.data.data[0], isLoading: false });

            if (!this.state.data) {
                this.setupTree();
            }
            return result;
        } catch (err) {
            console.log(err);
        }
        console.log('Ting');
        return null;
    }

    componentDidUpdate() {
        console.log('Edges', this.state.edges);
        const prepareEdges = this.setupEdges(this.state.data);
        const edges = _.uniqWith(prepareEdges, _.isEqual);
        const prepareNodes = this.setupNodes(this.state.data);
        const nodes = _.uniqWith(prepareNodes, _.isEqual);
        if (this.state.treeChanged) {
            this.handleTreeChanges(edges, nodes);
        }
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
                children: [],
                nodeSettings: this.state.nodeSettings,
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
            nodeSettings: this.state.nodeSettings,
            children: [],
        });
        this.setState({
            data: nextData, nodeName: '', nodeId: '', nodeDescription: '', nodeFunction: '', nodeFields: '', nodeComponentId: '',
        });
        this.setState({ treeChanged: true });
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

    setupTree = () => {
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
                    children: [],
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
        this.setState({ data: root });
    }

    setupEdges = (dataObj) => {
        if (dataObj.children && dataObj.children.length) {
            for (const child of dataObj.children) {
                edgeArray.push({ source: dataObj.id, target: child.id });
                this.setupEdges(child);
            }
        }
        return edgeArray;
    }

    setupNodes = (dataObj) => {
        if (dataObj.children) {
            for (const child of dataObj.children) {
                nodeArray.push({
                    id: dataObj.id, name: dataObj.name, componentId: dataObj.componentId, function: dataObj.function, description: dataObj.description, fields: dataObj.fields, nodeSettings: dataObj.nodeSettings,
                });
                this.setupNodes(child);
            }
        }
        if (dataObj.children && dataObj.children.length === 0) {
            nodeArray.push({
                id: dataObj.id, name: dataObj.name, componentId: dataObj.componentId, function: dataObj.function, description: dataObj.description, fields: dataObj.fields, nodeSettings: dataObj.nodeSettings,
            });
        }

        return nodeArray;
    }


    handleTreeChanges(edges, nodes) {
        this.setState({ edges, nodes, treeChanged: false });
    }

    handleSave = async (edges, nodes) => {
        const { flowID } = this.props.match.params;
        console.log('save flowID', flowID);
        console.log('Input', edges, nodes);
        const saveObj = clone(this.state.flowObject);
        saveObj.graph.edges = this.state.edges;
        saveObj.graph.nodes = this.state.nodes;
        console.log('SaveObj', saveObj);
        try {
            const result = await axios({
                method: 'post',
                url: `http://localhost:3001/flows/${flowID}`,
                withCredentials: true,
            });
        } catch (err) {
            console.log(err);
        }
        return null;
        // const filt = this.state.data.children.
    }


    render() {
        const { flowID } = this.props.match.params;
        const displayData = this.dataToDisplay();

        console.log('flow', this.state.flowObject);
        // if (this.state.data) {
        //     const prepareEdges = this.setupEdges(this.state.data);
        //     const edges = _.uniqWith(prepareEdges, _.isEqual);
        //     const prepareNodes = this.setupNodes(this.state.data);
        //     const nodes = _.uniqWith(prepareNodes, _.isEqual);
        //     this.handleSave(edges, nodes);
        // }
        console.log('data', this.state.data);
        console.log('PROPS', this.props);
        return (
            <div>
                <Translation>
                    {t => (
                        <div className="header">
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
                                    <p >{t('flows.selected.node')}: <span>{this.state.selectedNode.name}</span></p>
                                    <div>{displayData ? <div>
                                        <p>ID: {displayData.id}</p>
                                        <p>Name: {displayData.name}</p>
                                        <p>{t('flows.function')}: {displayData.function}</p>
                                        <p>{t('flows.description')}: {displayData.description}</p></div> : null}</div>
                                    {this.state.selectedNode && <div>
                                        <input name="nodeId" onChange={e => this.handleChange(e)} value={this.state.nodeId} placeholder="Node ID *"/>
                                        <input name="nodeName" onChange={e => this.handleChange(e)} value={this.state.nodeName} placeholder="Node Name *"/>
                                        <input name="nodeComponentId" onChange={e => this.handleChange(e)} value={this.state.nodeComponentId} placeholder="Node Component ID *"/>
                                        <input name="nodeDescription" onChange={e => this.handleChange(e)} value={this.state.nodeDescription} placeholder="Node Description *"/>
                                        <input name="nodeFunction" onChange={e => this.handleChange(e)} value={this.state.nodeFunction} placeholder="Node Function *"/>
                                        <input name="nodeFields" onChange={e => this.handleChange(e)} value={this.state.nodeFields} placeholder="Node Fields (optional)"/>
                                        <input name="nodeSettings" onChange={e => this.handleChange(e)} value={this.state.nodeSettings} placeholder="Node Settings (optional)"/>
                                        <button onClick={e => this.addChildNode(e)} style={{ marginLeft: 10, marginRight: 10 }}
                                            disabled={!this.state.nodeId || !this.state.nodeName || !this.state.nodeComponentId || !this.state.nodeDescription || !this.state.nodeFunction }>{t('flows.add.node')}</button>
                                        <button onClick={e => this.removeChildNode(e)}>{t('flows.remove.node')}</button><br/>
                                        <button style={{ marginTop: '10px' }} onClick={() => this.handleSave()}>{t('flows.save')}</button>
                                    </div>}
                                </div>
                            </div> : null}
                        </div>
                    )}
                </Translation>
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

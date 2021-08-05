import React, { useState } from 'react';


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
/* global some_unused_var */
const orgChart2 = {
    status: 'inactive',
    name: 'Flow Template with 1 exemplary flow node',
    description: 'This is a template for flow creation with an exemplary flow node',
    graph: {
        nodes: [
            {
                id: 'step_1',
                componentId: '434f4d504f4e454e54204944',
                name: 'Flow node name',
                function: 'TRIGGER',
                description: 'Flow node description',
            },
            {
                id: 'step_2',
                componentId: '5cdaba4d6474a5001a8b2588',
                name: 'Code Component',
                function: 'execute',
                description: 'Exemplary flow node',
                fields: {
                    code: 'function* run() {console.log(\'Calling external URL\');yield request.post({uri: \'http://webhook.site/d5d29c09-79ff-4e97-8137-537c6282a668\', body: msg.body, json: true});}',
                },
            },
            {
                id: 'step_3',
                componentId: '434f4d504f4e454e54204944',
                name: 'Flow node name 3',
                function: 'TRIGGER',
                description: 'Flow node description',
            },
        ],
        edges: [
            {
                source: 'step_1',
                target: 'step_2',
            },
            {
                source: 'step_2',
                target: 'step_3',
            },
        ],
    },
    type: 'ordinary',
    cron: '*/2 * * * *',
    owners: [
        {
            id: '60af6d595fdd471f1c3b9846',
            type: 'user',
        },
    ],
    createdAt: '2021-07-14T13:26:56.383Z',
    updatedAt: '2021-07-14T13:26:56.383Z',
    id: '60eee6202615249590397600',
};

const getFlow = async () => {
    try {
        const result = await axios({
            method: 'get',
            url: 'http://localhost:3001/flows',
            withCredentials: true,
        });
        return result;
    } catch (err) {
        console.log(err);
    }
    return null;
};

const FlowDetails = (props) => {
    console.log('PROPS: ', props);
    const [flowObject, setFlowObject] = useState('');
    (async () => {
        const flowResult = await getFlow();
        // setFlowObject(pis);
        if (!flowObject) {
            setFlowObject(flowResult);
        }
    })();
    // console.log(props.flows.all);
    // const tingID = '60eee6202615249590397600';
    // const flowRes = getFlow();
    console.log('flowObject: ', flowObject);

    const filteredFlow = !!flowObject && flowObject.data.data.filter(elem => elem.id === flowObject.data.data[0].id)[0];

    // setupFlowObject();
    console.log('FilteredFlow is', filteredFlow);

    const cloner = clone(filteredFlow);
    console.log('CLONER', cloner);
    const tree = [];
    const flowClone = clone(orgChart2);
    // console.log('Clone', flowClone);

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

    let root;
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
    // console.log('Tree:', tree);
    // console.log('Root', root);

    // console.log('flowObj', flowObj);

    const [data, setData] = useState(root);
    console.log('GROOT is', root);
    const [selectedNode, setSelectedNode] = useState('');
    const [parentNode, setParentNode] = useState('');
    const [nodeName, setNodeName] = useState('');
    const [nodeId, setNodeId] = useState('');
    const [nodeComponentId, setNodeComponentId] = useState('');
    const [nodeDescription, setNodeDescription] = useState('');
    const [nodeFunction, setNodeFunction] = useState('');
    const [nodeFields, setNodeFields] = useState('');

    const getData = () => {
        const content = flowClone.graph.nodes.find(node => node.id === selectedNode.id);
        return content;
    };

    const saveFlow = () => {
        console.log('Test save');
    };

    function searchTree(element, matchingTitle) {
        console.log('Reached element:', element, 'matchingTitle:', matchingTitle);
        if (element.id === matchingTitle) {
            return element;
        } if (element.children != null) {
            let i;
            let result = null;
            for (i = 0; result == null && i < element.children.length; i++) {
                result = searchTree(element.children[i], matchingTitle);
            }
            return result;
        }
        return null;
    }

    const selectNode = (e, unselect) => {
        if (unselect) {
            setSelectedNode('');
            return;
        }
        const nextData = clone(data);
        console.log('NextData', nextData);
        const selNode = searchTree(nextData, e.data.id);
        setSelectedNode(selNode);
        setParentNode(e.parent);
        console.log('selectedNode', selectedNode, 'parent', parentNode);
    };

    const addChildNode = () => {
        if (selectedNode === '') {
            return;
        }
        const nextData = clone(data);
        const selNode = searchTree(nextData, selectedNode.id);
        if (!Object.prototype.hasOwnProperty.call(selNode, 'children')) {
            selNode.children = [];
            const newTarget = selNode.children;
            newTarget.push({
                name: nodeName,
                id: nodeId,
                function: nodeFunction,
                componentId: nodeComponentId,
                description: nodeDescription,
                fields: nodeFields,
            });
            setData(nextData);
            setNodeName('');
            setNodeId('');
            setNodeDescription('');
            setNodeFunction('');
            setNodeComponentId('');
            setNodeFields('');
            return;
        }
        const target = selNode.children;
        // count++;
        target.push({
            name: nodeName,
            id: nodeId,
            function: nodeFunction,
            componentId: nodeComponentId,
            description: nodeDescription,
            fields: nodeFields,
        });
        setData(nextData);
        setNodeName('');
        setNodeId('');
        setNodeDescription('');
        setNodeFunction('');
        setNodeComponentId('');
        setNodeFields('');
    };

    const removeChildNode = () => {
        const nextData = clone(data);
        const parent = searchTree(nextData, parentNode.data.id);
        parent.children.forEach((id) => {
            const itemIndex = parent.children.findIndex(i => i.id === id);
            parent.children.splice(itemIndex, 1);
        });
        setData(nextData);
        selectNode('', true);
    };


    const flowData = getData();
    console.log('DATA IS:', data);
    return <div>
        {!!flowObject && <h3 style={{ textAlign: 'center' }}>Flow id: {flowObject.data.data[0].id}</h3>}
        <div id="treeWrapper" style={{ width: '100vw', height: '60vh', background: 'silver' }} >
            {<Tree data={data} onNodeClick={e => selectNode(e)} translate={{
                x: window.innerWidth / 4,
                y: 250,
            }} rootNodeClassName="node__root"
            branchNodeClassName="node__branch"
            leafNodeClassName="node__leaf"/>}
            <div style={{ padding: '10px' }}>
                <p >Selected Node: <span>{selectedNode.name}</span></p>
                <div>{flowData ? <div>
                    <p>ID: {flowData.id}</p>
                    <p>Name: {flowData.name}</p>
                    <p>Function: {flowData.function}</p>
                    <p>Description: {flowData.description}</p></div> : null}</div>
                {selectedNode && <div>
                    <input onChange={e => setNodeId(e.target.value)} placeholder="Node id" value={nodeId}/>
                    <input onChange={e => setNodeName(e.target.value)} placeholder="Node name" value={nodeName}/>
                    <input onChange={e => setNodeComponentId(e.target.value)} placeholder="Node componentId" value={nodeComponentId}/>
                    <input onChange={e => setNodeFunction(e.target.value)} placeholder="Node function" value={nodeFunction}/>
                    <input onChange={e => setNodeDescription(e.target.value)} placeholder="Node description" value={nodeDescription}/>
                    <input onChange={e => setNodeFields(e.target.value)} placeholder="Node fields (optional)" value={nodeFields}/>
                    <button onClick={e => addChildNode(e)} style={{ marginLeft: 10, marginRight: 10 }}
                        disabled={!nodeId || !nodeName || !nodeComponentId || !nodeDescription || !nodeFunction }>Add Node</button>
                    <button onClick={e => removeChildNode(e)}>Remove Node</button><br/>
                    <button style={{ marginTop: '10px' }} onClick={() => saveFlow()}>Save</button></div>}
            </div>
        </div>
    </div>;
};


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
)(FlowDetails);
// export default FlowDetails;

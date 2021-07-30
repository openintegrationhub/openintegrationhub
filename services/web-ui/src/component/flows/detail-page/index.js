import React, { useState } from 'react';
import Tree from 'react-d3-tree';
import clone from 'clone';
import { useParams } from 'react-router-dom';
import './details.css';

// let count = 0;
const FlowDetails = () => {
    const { flowID } = useParams();

    // const orgChart = { id: 'step_1', name: 'step_1', children: [{ id: 'step_2', name: 'step_2', children: [{ id: 'step_3', name: 'step_3', children: [] }] }] };
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

    const tree = [];
    const flow = clone(orgChart2);
    flow.graph.nodes.forEach((node) => {
        const matchingEdge = flow.graph.edges.find(edge => edge.target === node.id);

        tree.push({
            id: node.id,
            name: node.name,
            parent: matchingEdge ? matchingEdge.source : null,
            componentId: node.componentId,
            description: node.description,
            function: node.function,
        });
    });

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
    console.log('flow', flow);

    const [data, setData] = useState(root);
    const [selectedNode, setSelectedNode] = useState('');
    console.log('data', data);
    const [parentNode, setParentNode] = useState('');
    const [nodeName, setNodeName] = useState('');
    const [nodeId, setNodeId] = useState('');
    const [nodeComponentId, setNodeComponentId] = useState('');
    const [nodeDescription, setNodeDescription] = useState('');
    const [nodeFunction, setNodeFunction] = useState('');
    const [nodeFields, setNodeFields] = useState('');

    const getData = () => {
        const flowData = flow.graph.nodes.find(node => node.id === selectedNode.id);
        return flowData;
    };

    const translate = {
        x: window.innerWidth / 4,
        y: 250,
    };

    function searchTree(element, matchingTitle) {
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

    const selectNode = (e, unselect) => {
        if (unselect) {
            setSelectedNode('');
            return;
        }

        const nextData = clone(data);
        const selNode = searchTree(nextData, e.data.id);
        setSelectedNode(selNode);
        setParentNode(e.parent);
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

    const retransformToJson = (obj) => {
        console.log('Transform', obj);
    };

    const flowData = getData();
    retransformToJson(data);
    return <div>
        <h3 style={{ textAlign: 'center' }}>Flow id: {flowID}</h3>
        <div id="treeWrapper" style={{ width: '100vw', height: '60vh', background: 'silver' }} >
            <Tree data={data} onNodeClick={e => selectNode(e)} translate={translate} rootNodeClassName="node__root"
                branchNodeClassName="node__branch"
                leafNodeClassName="node__leaf"/>
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
                    <button style={{ marginTop: '10px' }}>Save</button></div>}
            </div>
        </div>

    </div>;
};

export default FlowDetails;

import React, { useState } from 'react';
import Tree from 'react-d3-tree';
import clone from 'clone';
import { useParams } from 'react-router-dom';
import './details.css';

let count = 0;
const FlowDetails = () => {
    const { flowID } = useParams();

    // const ting = {
    //     context: {
    //         device: {
    //             localeCountryCode: 'AX',
    //             datetime: '3047-09-29T07:09:52.498Z',
    //         },
    //         currentLocation: {
    //             country: 'KM',
    //             lon: -78789486,
    //         },
    //     },
    // };
    // const transformObject = (obj = {}) => {
    //     if (obj && typeof obj === 'object') {
    //         return Object.keys(obj).map((el) => {
    //             const children = transformObject(obj[el]); return children ? { label: el, children } : {
    //                 label: el,
    //             };
    //         });
    //     }
    //     return null;
    // };
    // console.log(JSON.stringify(ting, undefined, 4));
    // console.log(JSON.stringify(transformObject(ting), undefined, 4));
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
                {
                    id: 'step_4',
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
                {
                    source: 'step_2',
                    target: 'step_4',
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

    // const orgChart2 = { id: 'step_1', name: 'step_1', children: [{ id: 'step_2', name: 'step_2', children: [{ id: 'step_3', name: 'step_3', children: [] }] }] };
    /* eslint-disable no-unused-vars */
    // const transformFlowJson = (obj) => {
    //     // const { edges, nodes } = obj.graph;
    //     const graph = clone(obj.graph);
    //     const edges = clone(obj.graph.edges);
    //     const nodes = clone(obj.graph.nodes);
    //     // const treeRoot = obj.graph.nodes.find(node => obj.graph.edges.filter(edge => edge.target === node.id).length === 0);
    //     // const itsChild = obj.graph.nodes.find(node => obj.graph.edges.filter(edge => edge.target !== node.id).length === 0);
    //     // treeRoot.children = [];
    //     // console.log('treeRoot: ', treeRoot);
    //     // console.log('itsChild', itsChild);

    //     // console.log('edges: ', edges);
    //     // console.log('nodes', nodes);


    //     return null;
    // };

    const tree = [];
    const tree2 = [];
    const flow = clone(orgChart2);
    flow.graph.nodes.forEach((node) => {
        const matchingEdge = flow.graph.edges.find(edge => edge.target === node.id);

        tree.push({
            id: node.id,
            name: node.id,
            parent: matchingEdge ? matchingEdge.source : null,
        });
    });
    // const graph = clone(orgChart2.graph);
    // const edges = clone(obj.graph.edges);
    // const nodes = clone(obj.graph.nodes);

    const idMapping = tree.reduce((acc, el, i) => {
        acc[el.id] = i;
        return acc;
    }, {});

    let root;
    tree.forEach((el) => {
        // Handle the root element
        if (el.parent === null) {
            root = el;
            return;
        }
        // Use our mapping to locate the parent element in our data array
        const parentEl = tree[idMapping[el.parent]];
        // Add our current el to its parent's `children` array
        parentEl.children = [...(parentEl.children || []), el];
    });
    console.log('Tree:', tree);
    console.log('Root', root);

    const cloneChart = clone(orgChart2);
    // const createdTree = createTree(tree.parent);
    // console.log('HERE:', JSON.stringify(transformFlowJson(cloneChart), undefined, 4));
    const [data, setData] = useState(root);
    const [selectedNode, setSelectedNode] = useState('');
    console.log('selectedNode is', selectedNode);
    const [parentNode, setParentNode] = useState('');
    const [nodeName, setNodeName] = useState('Inserted Node');
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
                name: `${nodeName}`,
                id: `inserted-node-${nodeName}-${count}`,
                children: [],
            });
            setData(nextData);
            return;
        }
        const target = selNode.children;
        count++;
        target.push({
            name: `${nodeName}`,
            id: `inserted-node-${nodeName}-${count}`,
            children: [],
        });
        setData(nextData);
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

    return <div>
        <h3 style={{ textAlign: 'center' }}>Flow id: {flowID}</h3>
        <div id="treeWrapper" style={{ width: '100vw', height: '60vh', background: 'silver' }} >
            <Tree data={data} onNodeClick={e => selectNode(e)} translate={translate} /* onNodeMouseOver={e => console.log('Hover', e)} */ rootNodeClassName="node__root"
                branchNodeClassName="node__branch"
                leafNodeClassName="node__leaf"/>
            <div style={{ padding: '10px' }}>
                <p >Selected: <span>{selectedNode.name}</span></p>
                {selectedNode && <div><input onChange={e => setNodeName(e.target.value)} placeholder="Node name"/>
                    <button onClick={e => addChildNode(e)} style={{ marginLeft: 10, marginRight: 10 }}>Add Node</button>
                    <button onClick={e => removeChildNode(e)}>Remove Node</button><br/>
                    <button style={{ marginTop: '10px' }}>Save</button></div>}
                {/* {orgChart.name} */}
            </div>
        </div>

    </div>;
};

export default FlowDetails;

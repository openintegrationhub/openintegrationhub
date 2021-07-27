import React, { useState } from 'react';
import Tree from 'react-d3-tree';
import clone from 'clone';
import { useParams } from 'react-router-dom';
import './details.css';

let count = 0;
const FlowDetails = () => {
    const { flowID } = useParams();

    const orgChart = { id: 'step_1', name: 'step_1', children: [{ id: 'step_2', name: 'step_2', children: [{ id: 'step_3', name: 'step_3', children: [] }] }] };

    const [data, setData] = useState(orgChart);
    const [visible, setVisible] = useState(false);
    const [selectedNode, setSelectedNode] = useState('');
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
        setVisible(!visible);
        const nextData = clone(data);
        const selNode = searchTree(nextData, selectedNode.id);
        const target = selNode.children;
        count++;
        target.push({
            name: `${nodeName}`,
            id: `inserted-node-${nodeName}-${count}`,
            children: [],
        });
        setData(nextData);
    };

    const selectNode = (e) => {
        setVisible(!visible);
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
                    <button onClick={e => removeChildNode(e)}>Remove Node</button></div>}
            </div>
        </div>

    </div>;
};

export default FlowDetails;

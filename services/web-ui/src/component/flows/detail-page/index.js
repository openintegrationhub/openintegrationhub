import React, { useState } from 'react';
import Tree from 'react-d3-tree';
import clone from 'clone';
import { useParams } from 'react-router-dom';


let count = 0;
const FlowDetails = () => {
    const { id } = useParams();
    console.log(id);

    const orgChart = { id: 'step_1', name: 'step_1', children: [{ id: 'step_2', name: 'step_2', children: [{ id: 'step_3', name: 'step_3', children: [] }] }] };
    // const orgChart = {
    //     name: 'CEO',
    //     children: [
    //         {
    //             name: 'Manager',
    //             attributes: {
    //                 department: 'Production',
    //             },
    //             children: [
    //                 {
    //                     name: 'Foreman',
    //                     attributes: {
    //                         department: 'Fabrication',
    //                     },
    //                     children: [
    //                         {
    //                             name: 'Worker',
    //                         },
    //                     ],
    //                 },
    //                 {
    //                     name: 'Foreman',
    //                     attributes: {
    //                         department: 'Assembly',
    //                     },
    //                     children: [
    //                         {
    //                             name: 'Worker',
    //                         },
    //                     ],
    //                 },
    //             ],
    //         },
    //     ],
    // };

    const [data, setData] = useState(orgChart);
    // const [selNode, setSelNode] = useState();
    const [lastAdded, setLastAdded] = useState('');
    const [visible, setVisible] = useState(false);
    // console.log(JSON.stringify(data, null, '\t'));


    function searchTree(element, matchingTitle) {
        // console.log('reached', element, matchingTitle);
        if (element.id === matchingTitle) {
            return element;
        } if (element.children != null) {
            let i;
            let result = null;
            for (i = 0; result == null && i < element.children.length; i++) {
                result = searchTree(element.children[i], matchingTitle);
            }
            // console.log('result is:', result);
            return result;
        }
        return null;
    }


    const addChildNode = (e) => {
        setVisible(!visible);
        const nextData = clone(data);
        const selectedNode = searchTree(nextData, e.data.id);
        const target = selectedNode.children;
        count++;
        target.push({
            name: `Inserted Node ${count}`,
            id: `inserted-node-${count}`,
            children: [],
        });
        setData(nextData);
        setLastAdded(target);
    };


    const removeChildNode = (e) => {
        console.log('Remove E is', e);
        if (count === 0) {
            return;
        }
        const nextData = clone(data);
        // const target = nextData.children;
        lastAdded.pop();
        count--;
        setData(nextData);
    };

    return (<div id="" style={{ width: '100vw', height: '30vh', background: 'silver' }} >
        <Tree data={data} onNodeClick={e => addChildNode(e)} onNodeMouseOver={e => console.log('Hover', e)}/>
        <button onClick={e => removeChildNode(e)}>Test</button>

        <p>Test id: {id}</p>
    </div>);
};

export default FlowDetails;


// import React from 'react';


// // This is a simplified example of an org chart with a depth of 2.
// // Note how deeper levels are defined recursively via the `children` property.
// const orgChart = { id: 'step_1', name: 'step_1', children: [{ id: 'step_2', name: 'step_2', children: [{ id: 'step_3', name: 'step_3', children: [] }] }] };

// export default function OrgChartTree() {
//     return (
//     // `<Tree />` will fill width/height of its container; in this case `#treeWrapper`.
//         <div id="treeWrapper" style={{ width: '100%', height: '20em', background: 'silver' }}>
//             <Tree data={orgChart} />
//         </div>
//     );
// }

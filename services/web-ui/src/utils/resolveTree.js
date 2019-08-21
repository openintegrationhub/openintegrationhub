export const resolveToTree = (arr, parent) => {
    let out = [];
    let i;
    for (i = 0; i < arr.length; i += 1) {
        if (arr[i].source === parent) {
            if (arr.length >= 1) {
                const children = resolveToTree(arr, arr[i].target);

                if (children.length) {
                    // const tempChildren = this.resolveToTree(children, arr[i].source);
                    console.log(children);
                    out.push({
                        name: arr[i].source,
                        children,
                    });
                } else {
                    out.push({
                        name: arr[i].source,
                        children: [
                            {
                                name: arr[i].target,
                                children: [],
                            },
                        ],
                    });
                }
            } else {
                out = {
                    name: arr[i].source,
                    children: [],
                };
            }
        }
    }
    return out;
};

export const generateTree = (nodes, edges) => {
    let i;
    let rootNode = null;
    let temp = null;
    if (edges.length) {
        const list = JSON.parse(JSON.stringify(edges));

        for (i = 0; i < list.length; i += 1) {
            const link = list[i];
            if (!rootNode) {
                rootNode = link.source;
            } else if (link.target === rootNode) {
                rootNode = link.source;
            }
        }

        temp = resolveToTree(list, rootNode);
    } else {
        temp = {
            name: nodes[0].id,
            children: [],
        };
    }
    return temp;


    // treeData = {
    //     name: 'Top Level',
    //     children: [
    //         {
    //             name: 'Level 2: A',
    //             children: [
    //                 { name: 'Son of A' },
    //                 { name: 'Daughter of A' },
    //             ],
    //         },
    //         { name: 'Level 2: B' },
    //     ],
    // };
};

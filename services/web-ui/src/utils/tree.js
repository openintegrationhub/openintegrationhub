function findNode(nodes, id) {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }
        const { children } = node;
        if (Array.isArray(children) && children.length !== 0) {
            const found = findNode(children, id);
            if (found) {
                return found;
            }
        }
    }
    return null;
}
export function buildTree(nodes, edges) {
    const temp = [];
    for (const edge of edges) {
        const sourceId = edge.source;
        const targetId = edge.target;

        let source = findNode(temp, sourceId);
        let target = findNode(temp, targetId);
        if (!source) {
            source = findNode(nodes, sourceId);
            source = {
                id: source.id,
                children: [],
            };

            temp.push(source);
        }

        if (!target) {
            target = findNode(nodes, targetId);
            target = {
                id: target.id,
                children: [],
            };
        }

        source.children.push(target);
        if (temp.length > 1) {
            for (let i = 0; i < temp.length; i++) {
                if (temp[i].id === target.id) {
                    temp.splice(i, 1);
                }
            }
        }
    }
    return {
        ...temp[0],
    };
}

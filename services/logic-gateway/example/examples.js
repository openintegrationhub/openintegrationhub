
const example1 = {
    type: 'CONDITION',
    subtype: 'AND',
    operands: [
        {
            type: 'operation',
            operation: 'EQUALS',
            key: {
                type: 'ref',
                data: 'data.nodes[1].payload.username',
            },
            value: {
                type: 'string',
                data: 'hello@example.com'
            }
        },
        {
            type: 'operation',
            key: {
                type: 'ref',
                data: 'data.nodes[1].payload.firstname',
            },
            operation: 'CONTAINS',
            value: {
                type: 'regex',
                data: /hello/i
            }
        },
    ],
    actions: {
        positive: {
            action: 'EXECUTE_NODE',
            data: {
                nodeIndex: 5,
            },
        },
        negative: {
            action: 'FINISH_FLOW',
            data: {

            },
        }
    }
};

module.exports = {
    example1,
}

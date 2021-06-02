
const commands = {
    ABORT_FLOW: 'ABORT_FLOW',
    FINISH_FLOW: 'FINISH_FLOW',
    START_FLOW: 'START_FLOW',
    EXECUTE_NODE: 'EXECUTE_NODE',
    GOTO_NEXT: 'GOTO_NEXT',
    EXECUTE_NODES: 'EXECUTE_NODES',
}

const branchLogic = {
    SWITCH: 'SWITCH',
    SPLIT: 'SPLIT',
    JOIN_ONE_OF: 'JOIN_ONE_OF',
    JOIN: 'JOIN',
}

const conditionals = {
    AND: 'AND',
    OR: 'OR',
}

const operations = {
    CONTAINS: 'CONTAINS',
    EQUALS: 'EQUALS',
    IS_TRUTHY: 'IS_TRUTHY',
}


const example = [
    {
        type: 'condition',
        subtype: conditionals.AND,
        operands: [
            {
                type: 'operation',
                operation: operations.EQUALS,
                key: 'data.nodes[1].payload.username',
                value: 'hello@example.com'
            },
            {
                type: 'operation',
                key: 'data.nodes[1].payload.firstname',
                operation: operations.CONTAINS,
                value: /hello/
            },
        ],
        actions: {
            positive: {
                action: commands.EXECUTE_NODE,
                data: {
                    nodeIndex: 5,
                },
            },
            negative: {
                action: commands.FINISH_FLOW,
                data: {

                },
            }
        }
    }
];


const exampleExecuteIfBothBranchesFinished = [
    {
        type: 'branchLogic',
        subtype: branchLogic.JOIN,  // branchLogic.JOIN_ONE_OF
        operands: [
            {
                type: 'operation',
                operation: operations.IS_TRUTHY,
                key: 'data.nodes[1].completed',
            },
            {
                type: 'operation',
                operation: operations.IS_TRUTHY,
                key: 'data.nodes[2].completed',
            },
        ],
        action: commands.GOTO_NEXT,
        data: {
            // ...
        }
    }
];

const exampleSwitchBranch = [
    {
        type: 'branchLogic',
        subtype: branchLogic.SWITCH,
        options: [
            {
                type: 'condition',
                subtype: conditionals.OR,
                operands: [
                    {
                        type: 'operation',
                        operation: operations.EQUALS,
                        key: 'data.nodes[1].payload.username',
                        value: 'hello@example.com'
                    },
                    {
                        type: 'operation',
                        operation: operations.CONTAINS,
                        key: 'data.nodes[1].payload.firstname',
                        value: /hello/
                    },
                ],
                action: commands.EXECUTE_NODE,
                data: {
                    nodeIndex: 3,
                }

            },
            {
                type: 'condition',
                subtype: conditionals.AND,
                operands: [
                    {
                        type: 'operation',
                        key: 'data.nodes[1].payload.tenantName',
                        operation: operations.CONTAINS,
                        value: /example/i
                    },
                    {
                        type: 'operation',
                        key: 'data.nodes[1].payload.zip',
                        operation: operations.EQUALS,
                        value: 12345
                    },
                ],
                action: commands.EXECUTE_NODE,
                data: {
                    nodeIndex: 4,
                }
            },
        ],
        default: {
            action: commands.ABORT_FLOW,
            data: {
                //...
            }
        }
    }
];

// describe('bb', () => {
//
//     it('ff', () => {
//
//         expect(1+1).toEqual(2);
//     });
//
// });


// console.log('foo', jest);



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
                data: {
                    value: 'hello',
                    flags: 'i',
                },
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


const example2 = {
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
                data: {
                    value: 'hello',
                    flags: 'i',
                },
            }
        },
        {
            type: 'operation',
            key: {
                type: 'ref',
                data: 'data.nodes[1].payload.firstname',
            },
            operation: 'IS_TRUTHY',
            value: {
                type: 'regex',
                data: {
                    value: 'hello',
                    flags: 'i',
                },
            }
        },
    ],
    actions: {
        positive: {
            action: 'EXECUTE_NODES',
            data: {
                nodes: [5, 7]
            },
        },
        negative: {
            action: 'FINISH_FLOW',
            data: {

            },
        }
    }
};


const exampleRefactoredRule = {
    type: 'CONDITION',
    subtype: 'AND',
    operands: [
        {
            type: 'operation',
            operation: 'EQUALS',
            key: {
                type: 'ref',
                data: {
                    flowId: 123,
                    stepId: 0,
                    field: 'username',
                }
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
                data: {
                    flowId: 123,
                    stepId: 1,
                    field: 'tenant.name',
                }
            },
            operation: 'CONTAINS',
            value: {
                type: 'regex',
                data: {
                    value: 'example',
                    flags: 'i',
                },
            }
        },
    ],
    actions: {
        positive: {
            command: 'run-next-steps',
            parameters: ['flowId123:step_5'],
        },
        negative: {
            command: 'abort',
            parameters: [],
        }
    }
};


const exampleRefactoredRule2 = {
    type: 'BRANCHING',
    subtype: 'SWITCH',
    options: [
        {
            type: 'CONDITION',
            subtype: 'OR',
            operands: [
                {
                    type: 'operation',
                    operation: 'EQUALS',
                    key: {
                        type: 'ref',
                        data: {
                            flowId: 123,
                            stepId: 0,
                            field: 'username',
                        }
                    },
                    value: {
                        type: 'string',
                        data: 'testing123@example.com'
                    }
                },
                {
                    type: 'operation',
                    key: {
                        type: 'ref',
                        data: {
                            flowId: 123,
                            stepId: 1,
                            field: 'tenant.unknownfield',
                        }
                    },
                    operation: 'CONTAINS',
                    value: {
                        type: 'regex',
                        data: {
                            value: 'example',
                            flags: 'i',
                        },
                    }
                },
            ],
            action: {
                command: 'run-next-steps',
                parameters: ['flowId123:step_4'],
            }

        },
        {
            type: 'CONDITION',
            subtype: 'AND',
            operands: [
                {
                    type: 'operation',
                    operation: 'EQUALS',
                    key: {
                        type: 'ref',
                        data: {
                            flowId: 123,
                            stepId: 1,
                            field: 'username',
                        }
                    },
                    value: {
                        type: 'string',
                        data: 'hello@example.com'
                    }
                },
                {
                    type: 'operation',
                    operation: 'EQUALS',
                    key: {
                        type: 'ref',
                        data: {
                            flowId: 123,
                            stepId: 2,
                            field: 'tenant.zip',
                        }
                    },
                    value: {
                        type: 'string',
                        data: 55779,
                    }
                },
            ],
            action: {
                command: 'run-next-step',
                parameters: [],
            }
        },
    ],
    default: {
        action: {
            command: 'abort',
            parameters: [],
        }
    }
};


module.exports = {
    example1,
    exampleRefactoredRule,
    exampleRefactoredRule2,
}

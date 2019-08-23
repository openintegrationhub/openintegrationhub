import { buildTree } from './tree';

const _edges = [
    {
        source: 'step_1',
        target: 'step_2',
    },
    {
        source: 'step_2',
        target: 'step_3',
    },
    {
        source: 'step_3',
        target: 'step_4',
    },
    {
        source: 'step_3',
        target: 'step_5',
    },

];
const _nodes = [
    {
        id: 'step_1',
        componentId: '5d1b665fa422ca001bda5686',
        name: 'snazzy adapter for oih',
        function: 'getPersonsPolling',
        description: 'New description in progress',
        fields: {
            username: 'philipp.hoegner@cloudecosystem.org',
            password: 'testoih123',
        },
    },
    {
        id: 'step_2',
        componentId: '2d1b665fa422ca001bda5686',
        name: '2snazzy adapter for oih',
        function: '2getPersonsPolling',
        description: '2New description in progress',
        fields: {
            username: '2philipp.hoegner@cloudecosystem.org',
            password: '2testoih123',
        },
    },
    {
        id: 'step_3',
        componentId: '3d1b665fa422ca001bda5686',
        name: '3snazzy adapter for oih',
        function: '3getPersonsPolling',
        description: '3New description in progress',
        fields: {
            username: '3philipp.hoegner@cloudecosystem.org',
            password: '3testoih123',
        },
    },
    {
        id: 'step_4',
        componentId: '4d1b665fa422ca001bda5686',
        name: '4snazzy adapter for oih',
        function: '4getPersonsPolling',
        description: '4New description in progress',
        fields: {
            username: '4philipp.hoegner@cloudecosystem.org',
            password: '4testoih123',
        },
    },
    {
        id: 'step_5',
        componentId: '5d1b665fa422ca001bda5686',
        name: '5snazzy adapter for oih',
        function: '5getPersonsPolling',
        description: '5New description in progress',
        fields: {
            username: '5philipp.hoegner@cloudecosystem.org',
            password: 'testoih123',
        },
    },
    {
        id: 'step_6',
        componentId: '5d1b665fa422ca001bda5686',
        name: '5snazzy adapter for oih',
        function: '5getPersonsPolling',
        description: '5New description in progress',
        fields: {
            username: '5philipp.hoegner@cloudecosystem.org',
            password: 'testoih123',
        },
    },
];

const compare = {
    id: 'step_1',
    name: 'step_1',
    children: [
        {
            id: 'step_2',
            name: 'step_2',
            children: [
                {
                    id: 'step_3',
                    name: 'step_3',
                    children: [
                        {
                            id: 'step_4',
                            name: 'step_4',
                            children: [],
                        },
                        {
                            id: 'step_5',
                            name: 'step_5',
                            children: [],
                        },
                    ],
                },
            ],
        },
    ],
};

describe('Check Utils', () => {
    it('converts a graph data to a recursive tree object', async () => {
        expect(JSON.stringify(buildTree(_nodes, _edges))).toEqual(JSON.stringify(compare));
    });
});

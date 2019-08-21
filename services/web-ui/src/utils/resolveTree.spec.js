import { generateTree } from './resolveTree';

const edges = [
    {
        source: 'step1',
        target: 'step2',
    },
    {
        source: 'step2',
        target: 'step3',
    },
    {
        source: 'step3',
        target: 'step4',
    },
    {
        source: 'step3',
        target: 'step5',
    },
];
const nodes = [
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
        id: 'step_1',
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
    name: 'step1',
    children: [
        {
            name: 'step2',
            children: [
                {
                    name: 'step3',
                    children: [
                        {
                            name: 'step4',
                            children: [],
                        },
                        {
                            name: 'step5',
                            children: [],
                        },
                    ],
                },
            ],
        },
    ],
};

describe('Check Utils', () => {
    test('try to generate Tree', async () => {
        const result = generateTree(nodes, edges);
        expect(result).toBe(compare);
    });
});

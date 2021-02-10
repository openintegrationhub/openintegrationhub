
const rp = require('request-promise');

const conf = require('../conf');
const { ERROR_CODES } = require('../constant');

const API = {

    getFlows: async () => await rp.get({
        uri: `${conf.services.flowApi}/flows`,
        json: true,
        headers: {
            'x-auth-type': 'basic',
            authorization: `Bearer ${conf.iam.token}`,
        },
    }),

    startFlow: async flowId => await rp.post({
        uri: `${conf.services.flowApi}/flows/${flowId}/start`,
        json: true,
        headers: {
            'x-auth-type': 'basic',
            authorization: `Bearer ${conf.iam.token}`,
        },
    }),

    stopFlow: async flowId => await rp.post({
        uri: `${conf.services.flowApi}/flows/${flowId}/stop`,
        json: true,
        headers: {
            'x-auth-type': 'basic',
            authorization: `Bearer ${conf.iam.token}`,
        },
    }),

    getFlowById: async flowId => await rp.get({
        uri: `${conf.services.flowApi}/flows/${flowId}`,
        json: true,
        headers: {
            'x-auth-type': 'basic',
            authorization: `Bearer ${conf.iam.token}`,
        },
    }),

    cloneFlows: async (flowDependencies, owner, removeCredentials) => {
        const clonedIds = [];
        for (const flowConfig of flowDependencies) {
            const response = await API.getFlowById(flowConfig.flowId);

            if (!response.owners.find(_owner => _owner.id === owner)) {
                return new Error(ERROR_CODES.FORBIDDEN);
            }

            response.data.owners = [{ id: owner, type: 'USER' }];
            response.data.locked = false;
            delete response.data.id;

            const createResponse = await rp.post({
                uri: `${conf.services.flowApi}/flows`,
                json: true,
                headers: {
                    'x-auth-type': 'basic',
                    authorization: `Bearer ${conf.iam.token}`,
                },
                body: response,
            });
            clonedIds.push({
                old: flowConfig.flowId,
                new: createResponse.id,
            });
        }

        const newFlowDep = [...flowDependencies];
        newFlowDep.forEach((flowEntry) => {
            flowEntry.flowId = clonedIds.find(entry => entry.old === flowEntry.flowId).new;
            flowEntry.dependencies.forEach((dep) => {
                dep._id = clonedIds.find(entry => entry.old === flowEntry.flowId).new;
            });
        });

        return newFlowDep;
    },
};

module.exports = API;

const { BaseDriver } = require('@openintegrationhub/resource-coordinator');
const uuid = require('uuid/v4');
const _ = require('lodash');
const KubernetesRunningNode = require('./KubernetesRunningNode');
const FlowSecret = require('./FlowSecret');

class KubernetesDriver extends BaseDriver {
    constructor(config, logger, k8s) {
        super();
        this._config = config;
        this._logger = logger;
        this._coreClient = k8s.getCoreClient();
        this._batchClient = k8s.getBatchClient();
    }

    async createApp(flow, node, envVars) {
        this._logger.info({flow: flow.id}, 'Going to deploy job to k8s');
        const env = this._prepareEnvVars(flow, node, envVars);
        const nodeSecret = await this._ensureFlowNodeSecret(flow, node, env);
        const descriptor = this._buildDescriptor(flow, node, nodeSecret);
        this._logger.trace(descriptor, 'going to deploy a job to k8s');
        try {
            await this._batchClient.jobs.post({body: descriptor});
        } catch (e) {
            this._logger.error(e, 'Failed to deploy the job');
        }
    }

    async _ensureFlowNodeSecret(flow, node, secretEnvVars) {
        const flowSecret = await this._getFlowNodeSecret(flow, node);
        if (!flowSecret) {
            return this._createFlowNodeSecret(flow, node, secretEnvVars);
        }

        flowSecret.data = secretEnvVars;
        await this._updateFlowNodeSecret(flowSecret);

        return flowSecret;
    }

    async _updateFlowNodeSecret(flowSecret) {
        const secretName = flowSecret.metadata.name;
        this._logger.debug({secretName}, 'About to update the secret');
        await this._coreClient.secrets(secretName).put({
            body: flowSecret.toDescriptor()
        });
        return flowSecret;
    }

    async _getFlowNodeSecret(flow, node) {
        try {
            const secretName = this._getFlowNodeSecretName(flow, node);
            const result = await this._coreClient.secrets(secretName).get();
            return FlowSecret.fromDescriptor(result.body);
        } catch (e) {
            if (e.statusCode === 404) {
                return null;
            }
            throw e;
        }
    }

    _getFlowNodeSecretName(flow, node) {
        return `${flow.id}${node.id}`.toLowerCase().replace(/[^0-9a-z]/g, '');
    }

    async _createFlowNodeSecret(flow, node, data) {
        const secretName = this._getFlowNodeSecretName(flow, node);
        this._logger.debug({secretName}, 'About to create a secret');

        const flowSecret = new FlowSecret({
            metadata: {
                name: secretName,
                namespace: this._config.get('NAMESPACE'),
                ownerReferences: [
                    {
                        apiVersion: 'elastic.io/v1',
                        kind: 'Flow',
                        controller: true,
                        name: flow.id,
                        uid: flow.metadata.uid
                    }
                ]
            },
            data
        });

        await this._coreClient.secrets.post({
            body: flowSecret.toDescriptor()
        });

        this._logger.debug('Secret has been created');

        return flowSecret;
    }

    async destroyApp(appId) {
        //TODO wait until job really will be deleted
        this._logger.info({name: appId}, 'going to undeploy job from k8s');
        try {
            await this._batchClient.jobs.delete({
                name: appId,
                body: {
                    kind: 'DeleteOptions',
                    apiVersion: 'batch/v1',
                    propagationPolicy: 'Foreground'
                }
            });
        } catch (e) {
            if (e.statusCode !== 404) {
                this._logger.error(e, 'failed to undeploy job');
            }
        }
    }

    async getAppList() {
        return ((await this._batchClient.jobs.get()).body.items || []).map(i => new KubernetesRunningNode(i));
    }

    _buildDescriptor(flow, node, nodeSecret) {
        return this._generateAppDefinition(flow, node, nodeSecret);
    }

    _generateAppDefinition(flow, node, nodeSecret) {
        let appId = flow.id +'.'+ node.id;
        appId = appId.toLowerCase().replace(/[^0-9a-z]/g, '');

        return {
            apiVersion: 'batch/v1',
            kind: 'Job',
            metadata: {
                name: appId,
                namespace: this._config.get('NAMESPACE'),
                annotations: {
                    [KubernetesRunningNode.ANNOTATION_KEY]: flow.metadata.resourceVersion,
                    flowId: flow.id,
                    nodeId: node.id
                },
                ownerReferences: [
                    {
                        apiVersion: 'elastic.io/v1',
                        kind: 'Flow',
                        controller: true,
                        name: flow.metadata.name,
                        uid: flow.metadata.uid
                    }
                ]
            },
            spec: {
                template: {
                    metadata: {
                        labels: {}
                    },
                    spec: {
                        restartPolicy: 'Never',
                        containers: [{
                            image: node.image,
                            name: 'apprunner',
                            imagePullPolicy: 'Always',
                            envFrom: [{
                                secretRef: {
                                    name: nodeSecret.metadata.name
                                }
                            }],
                            resources: this._prepareResourcesDefinition(flow, node)
                        }]
                    }
                }
            }
        };
    }

    _prepareResourcesDefinition(flow, node) {
        const lc = 'resources.limits.cpu';
        const lm = 'resources.limits.memory';
        const rc = 'resources.requests.cpu';
        const rm = 'resources.requests.memory';

        const cpuLimit = _.get(node, lc) || _.get(flow, lc) || this._config.get('DEFAULT_CPU_LIMIT');
        const memLimit = _.get(node, lm) || _.get(flow, lm) || this._config.get('DEFAULT_MEM_LIMIT');
        const cpuRequest = _.get(node, rc) || _.get(flow, rc) || this._config.get('DEFAULT_CPU_REQUEST');
        const memRequest = _.get(node, rm) || _.get(flow, rm) || this._config.get('DEFAULT_MEM_REQUEST');

        return {
            limits: {
                cpu: cpuLimit,
                memory: memLimit
            },
            requests: {
                cpu: cpuRequest,
                memory: memRequest
            }
        };
    }

    _prepareEnvVars(flow, node, nodeQueues) {
        let envVars = Object.assign({}, nodeQueues);
        envVars.EXEC_ID = uuid().replace(/-/g, '');
        envVars.STEP_ID = node.id;
        envVars.FLOW_ID = flow.id;
        envVars.USER_ID = 'FIXME hardcode smth here';
        envVars.COMP_ID = 'does not matter';
        envVars.FUNCTION = node.function;
        envVars.API_URI = this._config.get('SELF_API_URI').replace(/\/$/, '');
        envVars.API_USERNAME = 'does not matter';
        envVars.API_KEY = 'does not matter';
        envVars = Object.entries(envVars).reduce((env, [k, v]) => {
            env['ELASTICIO_' + k] = v;
            return env;
        }, {});
        return Object.assign(envVars, node.env);
    }
}

module.exports = KubernetesDriver;

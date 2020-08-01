const { BaseDriver } = require('@openintegrationhub/component-orchestrator');
const uuid = require('uuid/v4');
const _ = require('lodash');
const KubernetesRunningFlowNode = require('./KubernetesRunningFlowNode');
const Secret = require('./Secret');

class KubernetesDriver extends BaseDriver {
    constructor({ config, logger, k8s }) {
        super();
        this._config = config;
        this._logger = logger;
        this._coreClient = k8s.getCoreClient();
        this._appsClient = k8s.getAppsClient()
    }

    async createLocalDeployment(flow, node, envVars, component, deploymentOptions) {
        this._logger.info({ flow: flow.id }, 'Going to apply local deployment to k8s');
        try {
            const env =  this._preparePrivateEnvVars(flow, node, envVars);
            const secret = await this._ensureSecret(`${flow.id}${node.id}`, env);
            await this._createRunningFlowNode(flow, node, secret, component, deploymentOptions);
        } catch (e) {
            this._logger.error(e, 'Failed to apply local deployment');
        }
    }

    async createGlobalDeployment(envVars, component, deploymentOptions) {
        this._logger.info({ component: component._id }, 'Going to apply global deployment to k8s');
        try {
            const env =  this._preparePrivateEnvVars(component, envVars);
            const secret = await this._ensureSecret(`global_${component._id}`, env);
            await this._createRunningFlowNode(flow, node, secret, component, deploymentOptions);
        } catch (e) {
            this._logger.error(e, 'Failed to apply global deployment');
        }
    }

    async _createRunningFlowNode(flow, node, secret, component, deploymentOptions) {
        const descriptor = await this._generateAppDefinition(flow, node, secret, component, deploymentOptions);
        this._logger.trace(descriptor);
        const result = await this._appsClient.deployments.post({ body: descriptor });
        return new KubernetesRunningFlowNode(result.body);
    }

    async _ensureSecret(name, secretEnvVars) {
        const flowSecret = await this._getSecret(name);
        if (!flowSecret) {
            return this._createSecret(name, secretEnvVars);
        }

        flowSecret.data = secretEnvVars;
        return this._updateSecret(flowSecret);
    }

    async _updateSecret(secret) {
        const secretName = secret.name;
        this._logger.debug({ secretName }, 'About to update the secret');
        const response = await this._coreClient.secrets(secretName).put({
            body: secret.toDescriptor()
        });
        return new Secret(response.body);
    }

    async _getSecret(name) {
        try {
            const secretName = this._getSecretName(name);
            const result = await this._coreClient.secrets(secretName).get();
            return Secret.fromDescriptor(result.body);
        } catch (e) {
            if (e.statusCode === 404) {
                return null;
            }
            throw e;
        }
    }

    _getSecretName(name) {
        return name.toLowerCase().replace(/[^0-9a-z]/g, '');
    }

    async _createSecret(name, data) {
        const secretName = this._getSecretName(name);
        this._logger.debug({ secretName }, 'About to create a secret');

        const secret = new Secret({
            metadata: {
                name: secretName,
                namespace: this._config.get('NAMESPACE')
            },
            data
        });

        const response = await this._coreClient.secrets.post({
            body: secret.toDescriptor()
        });
        this._logger.debug('Secret has been created');

        return new Secret(response.body);
    }

    async destroyApp(app) {
        //TODO wait until job really will be deleted
        this._logger.info({ name: app.name }, 'Going to delete deployment from k8s');

        try {
            await this._appsClient.deployments(app.name).delete({
                body: {
                    kind: 'DeleteOptions',
                    apiVersion: 'apps/v1',
                    propagationPolicy: 'Foreground'
                }
            });
        } catch (e) {
            if (e.statusCode !== 404) {
                this._logger.error(e, 'Failed to delete deployment');
            }
        }

        await this._deleteFlowNodeSecret(app.flowId, app.nodeId);
    }

    async _deleteFlowNodeSecret(flowId, nodeId) {
        try {
            const secretName = this._getFlowNodeSecretName({ id: flowId }, { id: nodeId });
            this._logger.trace({ secretName }, 'Deleting flow secret');
            await this._coreClient.secrets(secretName).delete();
        } catch (e) {
            if (e.statusCode !== 404) {
                this._logger.error(e, 'failed to delete secret');
            }
        }
    }

    async getAppList() {
        return ((await this._appsClient.deployments.get()).body.items || []).map(i => new KubernetesRunningFlowNode(i));
    }

    async _generateDefinition(flow, node, nodeSecret, component, {
        imagePullPolicy = 'Always',
        replicas = 1
    }) {
        let appId = flow.id + '.' + node.id;
        appId = appId.toLowerCase().replace(/[^0-9a-z]/g, '');
        const image = _.get(component, 'distribution.image');

        return {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name: appId,
                namespace: this._config.get('NAMESPACE'),
                annotations: {
                    flowId: flow.id,
                    stepId: node.id,
                    nodeId: node.id,
                }
            },
            spec: {
                replicas,
                selector: {
                    matchLabels: {
                        flowId: flow.id,
                        stepId: node.id,
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            flowId: flow.id,
                            stepId: node.id,
                        },
                        annotations: {
                            flowId: flow.id,
                            stepId: node.id,
                        }
                    },
                    spec: {
                        containers: [{
                            image,
                            name: 'apprunner',
                            imagePullPolicy,
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

    _prepareEnvVars(vars) {
        let envVars = Object.assign({}, vars);

        // if running from host use cluster internal references instead
        if (this._config.get('RUNNING_ON_HOST') === 'true') {
            envVars.SNAPSHOTS_SERVICE_BASE_URL = 'http://snapshots-service.oih-dev-ns.svc.cluster.local:1234';
        }
        // envVars.SNAPSHOTS_SERVICE_BASE_URL = this._config.get('SNAPSHOTS_SERVICE_BASE_URL').replace(/\/$/, '');
        envVars.BACK_CHANNEL = envVars.AMQP_URI
        envVars.EXEC_ID = uuid().replace(/-/g, '');

        envVars.API_URI = this._config.get('SELF_API_URI').replace(/\/$/, '');
        envVars.API_USERNAME = 'iam_token';
        envVars.API_KEY = envVars.IAM_TOKEN;
        envVars.CONTAINER_ID = 'does not matter';
        envVars.WORKSPACE_ID = 'does not matter';
        envVars = Object.entries(envVars).reduce((env, [k, v]) => {
            env['ELASTICIO_' + k] = v;
            return env;
        }, {});
        envVars.LOG_LEVEL = 'trace'
        return envVars
    }

    _prepareLocalEnvVars(flow, node, vars) {
        let envVars = this._prepareEnvVars(vars);
        envVars.STEP_ID = node.id;
        envVars.FLOW_ID = flow.id;
        envVars.USER_ID = flow.startedBy;
        envVars.COMP_ID = node.componentId;
        envVars.FUNCTION = node.function;
        return Object.assign(envVars, node.env);
    }

    _prepareGlobalEnvVars(component, startedBy, vars) {
        let envVars = this._prepareEnvVars(vars);
        envVars.USER_ID = startedBy;
        envVars.COMP_ID = component._id;
        envVars.FUNCTION = component.function;
        return Object.assign(envVars, component.env);
    }
}

module.exports = KubernetesDriver;

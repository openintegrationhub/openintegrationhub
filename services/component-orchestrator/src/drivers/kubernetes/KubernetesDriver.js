const {
    BaseDriver,
} = require('@openintegrationhub/component-orchestrator');
const _ = require('lodash');
const KubernetesRunningComponent = require('./KubernetesRunningComponent');
const Secret = require('./Secret');
const ENV_PREFIX = 'ELASTICIO_';

const GLOBAL = 'global';
const GLOBAL_PREFIX = `${GLOBAL}-`;
const LOCAL = 'local';
const LOCAL_PREFIX = `${LOCAL}-`;

const KUBERNETES_NAME_CONVENTION = /[^0-9a-z\-\.]/gi; // eslint-disable-line no-useless-escape

function enableComponentRestAPI(component) {
    if (component.descriptor && component.descriptor.restAPI) {
        return true
    }
    return false
}

class KubernetesDriver extends BaseDriver {
    constructor({ config, logger, k8s }) {
        super();
        this._config = config;
        this._logger = logger;
        this._coreClient = k8s.getCoreClient();
        this._appsClient = k8s.getAppsClient();
    }

    async createApp({ flow, node, envVars, component, options }) {
        if (component.isGlobal) {
            this._logger.info(
                { component: component.id },
                'Going to apply global deployment to k8s'
            );
            try {
                const env = this._prepareEnvVars(envVars, component);
                const secret = await this._ensureSecret(
                    `${GLOBAL_PREFIX}${component.id}`,
                    env
                );
                await this._createRunningComponent({ secret, component, options });
            } catch (e) {
                this._logger.error(e, 'Failed to apply global deployment');
            }
        } else {
            this._logger.info(
                { flow: flow.id },
                'Going to apply local deployment to k8s'
            );
            try {
                const env = this._prepareEnvVars(envVars, component);
                const secret = await this._ensureSecret(
                    `${LOCAL_PREFIX}${flow.id}${node.id}`,
                    env
                );
                await this._createRunningComponent({
                    flow,
                    node,
                    secret,
                    component,
                    options,
                });
            } catch (e) {
                this._logger.error(e, 'Failed to apply local deployment');
            }
        }
    }

    async _createRunningComponent({ flow, node, secret, component, options }) {
        const deployment = await this._generateDeploymentDefinition({
            flow,
            node,
            secret,
            component,
            options,
        });

        this._logger.trace(deployment);

        const { body } = await this._appsClient.deployments.post({
            body: deployment,
        });

        // create service definition only if component has "restAPI" in descriptor
        if (enableComponentRestAPI(component)) {
            const service = await this._generateServiceDefinition({
                flow,
                node,
                component,
            });

            this._logger.trace(service);

            await this._coreClient.services.post({
                body: service,
            });
        }

        return new KubernetesRunningComponent(body);
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
            body: secret.toDescriptor(),
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
        return name.toLowerCase().replace(KUBERNETES_NAME_CONVENTION, '');
    }

    async _createSecret(name, data) {
        const secretName = this._getSecretName(name);
        this._logger.debug({ secretName }, 'About to create a secret');

        const secret = new Secret({
            metadata: {
                name: secretName,
                namespace: this._config.get('NAMESPACE'),
            },
            data,
        });

        const response = await this._coreClient.secrets.post({
            body: secret.toDescriptor(),
        });
        this._logger.debug('Secret has been created');

        return new Secret(response.body);
    }

    async destroyApp(app) {
        //TODO wait until job really will be deleted
        this._logger.info(
            { name: app.name },
            'Going to delete Deployment from k8s'
        );

        try {
            await this._appsClient.deployments(app.name).delete({
                body: {
                    kind: 'DeleteOptions',
                    apiVersion: 'apps/v1',
                    propagationPolicy: 'Foreground',
                },
            });
        } catch (e) {
            if (e.statusCode !== 404) {
                this._logger.error(e, 'Failed to delete Deployment');
            }
        }


        this._logger.info(
            { name: app.name },
            'Going to delete Service from k8s'
        );

        try {
            const serviceId = this._generateKubernetesServiceId(app.name)
            await this._coreClient.services(serviceId).delete({
                body: {
                    kind: 'DeleteOptions',
                    apiVersion: 'v1',
                    propagationPolicy: 'Foreground',
                },
            });
        } catch (e) {
            if (e.statusCode !== 404) {
                this._logger.error(e, 'Failed to delete Service');
            }
        }

        if (app.type === GLOBAL) {
            await this._deleteSecret(`${GLOBAL_PREFIX}${app.componentId}`);
        } else {
            await this._deleteSecret(`${LOCAL_PREFIX}${app.flowId}${app.nodeId}`);
        }
    }

    async _deleteSecret(name) {
        try {
            const secretName = this._getSecretName(name);
            this._logger.trace({ secretName }, 'Deleting flow secret');
            await this._coreClient.secrets(secretName).delete();
        } catch (e) {
            if (e.statusCode !== 404) {
                this._logger.error(e, 'failed to delete secret');
            }
        }
    }

    async getAppList() {
        return ((await this._appsClient.deployments.get()).body.items || []).map(
            (i) => new KubernetesRunningComponent(i)
        );
    }

    _generateVolumes() {
        if (this._config.get('KUBERNETES_VOLUME_HOSTPATH_ENABLED') === 'true' && this._config.get('KUBERNETES_VOLUME_HOSTPATH_PATH')) {
            return [{
                name: 'pv-hostpath',
                hostPath: {
                    path: this._config.get('KUBERNETES_VOLUME_HOSTPATH_PATH'),
                    type: 'Directory'
                }
            }]
        }
        return []
    }

    _generateVolumeMounts() {
        if (this._config.get('KUBERNETES_VOLUME_HOSTPATH_ENABLED') === 'true' && this._config.get('KUBERNETES_VOLUME_HOSTPATH_MOUNTPATH')) {
            return [{
                name: 'pv-hostpath',
                mountPath: this._config.get('KUBERNETES_VOLUME_HOSTPATH_MOUNTPATH')
            }]

        }
        return []
    }

    _generateKubernetesAppId(flow, node, component) {
        let appId = ''
        if (component.isGlobal) {
            appId = `${GLOBAL_PREFIX}${component.id}`;
        } else {
            appId = `${LOCAL_PREFIX}${flow.id}.${node.id}`;
        }
        return appId.toLowerCase().replace(KUBERNETES_NAME_CONVENTION, '');
    }

    _generateKubernetesServiceId(appId) {
        return `${appId.replace('.', '-')}-service`
    }

    _generateDeploymentDefinition({ flow, node, secret, component, options = {} }) {
        // default options
        let { replicas = 1, imagePullPolicy = 'Always' } = options;

        // overwrite with value stored in component
        if (component.descriptor) {
            if (component.descriptor.replicas) replicas = component.descriptor.replicas;
            if (component.descriptor.imagePullPolicy) imagePullPolicy = component.descriptor.imagePullPolicy;
        }

        const appId = this._generateKubernetesAppId(flow, node, component)

        let matchLabels, labels, annotations;

        if (component.isGlobal) {
            labels = {
                componentId: component.id,
            };

            matchLabels = {
                componentId: component.id,
            };

            annotations = {
                componentId: component.id,
                type: GLOBAL,
            };
        } else {
            labels = {
                flowId: flow.id,
                stepId: node.id,
            };

            matchLabels = {
                flowId: flow.id,
                stepId: node.id,
            };

            annotations = {
                flowId: flow.id,
                stepId: node.id,
                nodeId: node.id,
                type: LOCAL,
            };
        }

        const image = _.get(component, 'distribution.image');

        return {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name: appId,
                namespace: this._config.get('NAMESPACE'),
                annotations,
            },
            spec: {
                replicas,
                selector: {
                    matchLabels,
                },
                template: {
                    metadata: {
                        labels,
                        annotations,
                    },
                    spec: {
                        volumes: this._generateVolumes(),
                        containers: [
                            {
                                image,
                                name: 'apprunner',
                                imagePullPolicy,
                                envFrom: [
                                    {
                                        secretRef: {
                                            name: secret.metadata.name,
                                        },
                                    },
                                ],
                                resources: this._prepareResourcesDefinition({
                                    flow,
                                    node,
                                    component,
                                }),
                                volumeMounts: this._generateVolumeMounts()
                            },
                        ],
                    },
                },
            },
        };
    }

    _generateServiceDefinition({ flow, node, component }) {

        const appId = this._generateKubernetesAppId(flow, node, component)
        const serviceId = this._generateKubernetesServiceId(appId)

        let selector;

        if (component.isGlobal) {

            selector = {
                componentId: component.id,
            };
        } else {
            selector = {
                flowId: flow.id,
                stepId: node.id,
            };
        }

        return {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: serviceId,
                namespace: this._config.get('NAMESPACE'),
                labels: {
                    app: serviceId
                }
            },
            spec: {
                type: 'ClusterIP',
                selector,
                ports: [
                    {
                        name: '3001',
                        protocol: 'TCP',
                        port: 3001,
                        targetPort: 3001
                    }
                ]
            },
        };
    }

    _prepareResourcesDefinition({ flow, node, component }) {
        const lc = 'resources.limits.cpu';
        const lm = 'resources.limits.memory';
        const rc = 'resources.requests.cpu';
        const rm = 'resources.requests.memory';

        const cpuLimit =
            _.get(component, lc) ||
            _.get(node, lc) ||
            _.get(flow, lc) ||
            this._config.get('DEFAULT_CPU_LIMIT');
        const memLimit =
            _.get(component, lm) ||
            _.get(node, lm) ||
            _.get(flow, lm) ||
            this._config.get('DEFAULT_MEM_LIMIT');
        const cpuRequest =
            _.get(component, rc) ||
            _.get(node, rc) ||
            _.get(flow, rc) ||
            this._config.get('DEFAULT_CPU_REQUEST');
        const memRequest =
            _.get(component, rm) ||
            _.get(node, rm) ||
            _.get(flow, rm) ||
            this._config.get('DEFAULT_MEM_REQUEST');

        return {
            limits: {
                cpu: cpuLimit,
                memory: memLimit,
            },
            requests: {
                cpu: cpuRequest,
                memory: memRequest,
            },
        };
    }

    _prepareEnvVars(vars, component) {
        let envVars = Object.assign({}, vars);

        // Will be removed from ferryman so we set some dummy data
        envVars.COMP_ID = component.id;
        envVars.USER_ID = 'remove me';

        envVars.SNAPSHOTS_SERVICE_BASE_URL = this._config
            .get('SNAPSHOTS_SERVICE_BASE_URL')
            .replace(/\/$/, '');
        envVars.SECRET_SERVICE_BASE_URL = this._config
            .get('SECRET_SERVICE_BASE_URL')
            .replace(/\/$/, '');
        envVars.ATTACHMENT_STORAGE_SERVICE_BASE_URL = this._config
            .get('ATTACHMENT_STORAGE_SERVICE_BASE_URL')
            .replace(/\/$/, '');
        envVars.API_URI = this._config.get('SELF_API_URI').replace(/\/$/, '');

        envVars.DATAHUB_BASE_URL = this._config
            .get('DATAHUB_BASE_URL')
            .replace(/\/$/, '');

        if (enableComponentRestAPI(component)) {
            envVars.ENABLE_REST_API = 'true';
        }

        envVars.RABBITMQ_PREFETCH_SAILOR = this._config.get('COMPONENT_PREFETCH_COUNT');

        envVars = Object.entries(envVars).reduce((env, [k, v]) => {
            env[`${ENV_PREFIX}${k}`] = v;
            return env;
        }, {});

        // provide following vars without prefix

        envVars.LOG_LEVEL = this._config
            .get('COMPONENT_LOG_LEVEL')
            .replace(/\/$/, '');

        return envVars;
    }
}

module.exports = KubernetesDriver;

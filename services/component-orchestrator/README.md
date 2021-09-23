![alpha](https://img.shields.io/badge/Status-Alpha-yellowgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Component Orchestrator

This service orchestrates the flow's lifecycle. It creates queues in RabbitMQ and deploys Docker containers for each flow node on flow creation and cleans up deployments and secrets on flow deletion.

## Local Components vs global components

In addition to **_local components_**, that will be distinctly deployed for each step in a flow now we have a second type: A component, that holds the property

```json
{ "isGlobal": true }
```

is considered as **_global component_**. This leads to different characteristics. A global component

- needs to be started / stopped manually
- will be deployed just once
- could be connected to any flow

Compared to the "old fashioned way" of spawning **_local components_** one could share resources inside a cluster more efficiently or reduce costs of maintenance.

## How it works

The application works in a loop. During each loop iteration it makes sure, that all nodes for each flow have been deployed and asserts RabbitMQ queues and RabbitMQ user for each node.

If a flow has been deleted, the application removes the corresponding containers and RabbitMQ queues and RabbitMQ user. **_Global components_** will not be affected.

### Handling flow updates

If a container is running an outdated version of node, it will be redeployed.

## Prerequisites

- Kubernetes cluster with enabled RBAC
- RabbitMQ with enabled [Management plugin](https://www.rabbitmq.com/management.html)
- MongoDB

## Service Account

This service requires a service account with the following permissions:

- `components.any.read`
- `iam.token.create`
- `iam.token.delete`

## How to build

```docker
docker build -t openintegrationhub/component-orchestrator:latest -f Dockerfile ../../
```

or

```npm
VERSION=latest npm run build:docker
```

## How to deploy

Kubernetes descriptors can be found in the [k8s](./k8s) directory.

```console
cd platform

kubectl apply -f ./k8s
```

**Note:** the env vars in the descriptors have to be changed according to the given environment.

## Environment variables

### General

| Name                                | Description                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| ORCHESTRATOR_TOKEN_SECRET           | Will be used to sign orchestrator tokens.                                                   |
| COMPONENT_REPOSITORY_BASE_URL       | Base URL of the Component Repository.                                                       |
| LISTEN_PORT                         | Port for HTTP interface.                                                                    |
| LOG_LEVEL                           | Log level for logger.                                                                       |
| MONGODB_URI                         | MongoDB connection string.                                                                  |
| RABBITMQ_URI                        | RabbitMQ connection URI for the Resource Coordinator application.                           |
| RABBITMQ_MANAGEMENT_URI             | URI of the http interface of the RabbitMQ management plugin.                                |
| RABBITMQ_URI_FLOWS                  | RabbitMQ connection URI for node containers.                                                |
| SECRET_SERVICE_BASE_URL             | Base URL of the Secrets service.                                                            |
| SELF_API_URI                        | URI to the current application. This API is called then from the inside of node containers. |
| ATTACHMENT_STORAGE_SERVICE_BASE_URL | Base URL of the Attachment Storage.                                                         |
| SNAPSHOTS_SERVICE_BASE_URL          | Base URL of the Snapshots service.                                                          |
| TICK_INTERVAL                       | Main loop interval.                                                                         |

### Kubernetes driver specific

| Name                         | Description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| DEFAULT_CPU_LIMIT            | Default cpu limit for a flow's node container.             |
| DEFAULT_MEM_LIMIT            | Default memory limit for a flow's node container.          |
| DEFAULT_CPU_REQUEST          | Default cpu request for a flow's node container.           |
| DEFAULT_MEM_REQUEST          | Default memory request for a flow's node container.        |
| NAMESPACE                    | Kubernetes namespace, where flow's nodes will be deployed. |
| KUBERNETES_IMAGE_PULL_POLICY | Kubernetes pull policy for all deployment images.          |

### Caching

| Name                    | Description                                     |
| ----------------------- | ----------------------------------------------- |
| CACHE_COMPONENT_SIZE    | Size of components cache. Default 50            |
| CACHE_COMPONENT_MAX_AGE | TTL for Cache in ms. Default 300000 (5 minutes) |
| CACHE_COMPONENT_IGNORE  | Disable cache. Default "false"                  |

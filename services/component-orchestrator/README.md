![alpha](https://img.shields.io/badge/Status-Alpha-yellowgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Component Orchestrator

Orchestrates the flow's lifecycle. It creates queues in RabbitMQ and deploys Docker containers for each flow node on flow creation and cleans up on flow deletion.

## How it works

The application works in a loop. During each loop iteration it makes sure, that all nodes for each flow have been deployed and asserts RabbitMQ queues and RabbitMQ user for each node.
If a flow has been deleted, the application removes the corresponding containers and RabbitMQ queues and RabbitMQ user.

### Handling flow updates

If a container is running an outdated version of node, it will be redeployed.

## Prerequisites

- Kubernetes cluster with enabled RBAC.
- RabbitMQ with enabled [Management plugin](https://www.rabbitmq.com/management.html).
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

Kubernetes descriptors for Resource Coordinator along with the other core platform microservices can be found in the [k8s](./k8s) directory.

``` console
cd platform
kubectl apply -f ./k8s
```

**Note:** the env vars in the descriptors have to be changed according to the given environment.

## Environment variables

### General

| Name | Description |
| --- | --- |
| COMPONENT_REPOSITORY_BASE_URL | Base URL of the Component Repository. |
| LISTEN_PORT | Port for HTTP interface. |
| LOG_LEVEL | Log level for logger. |
| MONGODB_URI | MongoDB connection string. |
| RABBITMQ_URI | RabbitMQ connection URI for the Resource Coordinator application. |
| RABBITMQ_MANAGEMENT_URI | URI of the http interface of the RabbitMQ management plugin. |
| RABBITMQ_URI_FLOWS | RabbitMQ connection URI for node containers. |
| SELF_API_URI | URI to the current application. This API is called then from the inside of node containers. |
| TICK_INTERVAL | Main loop interval. |

### Kubernetes driver specific

| Name | Description |
| --- | --- |
| DEFAULT_CPU_LIMIT | Default cpu limit for a flow's node container. |
| DEFAULT_MEM_LIMIT | Default memory limit for a flow's node container. |
| DEFAULT_CPU_REQUEST | Default cpu request for a flow's node container. |
| DEFAULT_MEM_REQUEST | Default memory request for a flow's node container. |
| NAMESPACE | Kubernetes namespace, where flow's nodes will be deployed. |

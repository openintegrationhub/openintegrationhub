# Resource Coordinator
Orchestrates the flow's lifecycle. It creates queues in RabbitMQ and deploys Docker containers for each flow node on flow creation and cleans up on flow deletion.

## Prerequisites
- Kubernetes cluster with enabled RBAC.
- RabbitMQ with enabled [Management plugin](https://www.rabbitmq.com/management.html).

## How to build
```
docker build -t openintegrationhub/resource-coordinator:latest -f Dockerfile ../../
```
or
```
VERSION=latest npm run build:docker
```

## How to deploy
Kubernetes descriptors for Resource Coordinator along with the other core platform microservices can be found in the [platform](../platform) directory.

```
cd platform
kubectl apply -f ./platform.yml
```

**Note:** the env vars in the descriptors have to be changed according to the given environment.

## Environment variables

#### General
| Name | Description |
| --- | --- |
| LISTEN_PORT | Port for HTTP interface. |
| LOG_LEVEL | Log level for logger. |
| RABBITMQ_URI | RabbitMQ connection URI for the Resource Coordinator application. |
| RABBITMQ_MANAGEMENT_URI | URI of the http interface of the RabbitMQ management plugin. |
| RABBITMQ_URI_FLOWS | RabbitMQ connection URI for node containers. |
| SELF_API_URI | URI to the current application. This API is called then from the inside of node containers. |
| NAMESPACE | Kubernetes namespace, where flows are stored as CRD. |

#### Kubernetes driver specific
| Name | Description |
| --- | --- |
| DEFAULT_CPU_LIMIT | Default cpu limit for a flow's node container. |
| DEFAULT_MEM_LIMIT | Default memory limit for a flow's node container. |
| DEFAULT_CPU_REQUEST | Default cpu request for a flow's node container. |
| DEFAULT_MEM_REQUEST | Default memory request for a flow's node container. |
| NAMESPACE | Kubernetes namespace, where flow's nodes will be deployed. |

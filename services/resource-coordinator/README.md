# Resource Coordinator
Prepares queues (RabbitMQ) for flows and orchestrates flow's nodes in Kubernetes.

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

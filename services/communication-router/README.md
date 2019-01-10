# Communication Router
Receives http calls and passes messages to execution. Based on [@openintegrationhub/webhooks](../../lib/webhooks).

## Environment variables

#### General
| Name | Description |
| --- | --- |
| LISTEN_PORT | Port for HTTP interface. |
| LOG_LEVEL | Log level for logger. |
| NAMESPACE | Kubernetes namespace, where flows are stored as CRD. |
| PAYLOAD_SIZE_LIMIT | Maximum request's payload size that could be handled. |
| RABBITMQ_URI | RabbitMQ connection URI for the Resource Coordinator application. |

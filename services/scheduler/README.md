# Scheduler
Schedules flows for execution. Based on [@openintegrationhub/scheduler](../../lib/scheduler).

## Environment variables

#### General
| Name | Description |
| --- | --- |
| LISTEN_PORT | Port for HTTP interface. |
| LOG_LEVEL | Log level for logger. |
| NAMESPACE | Kubernetes namespace, where flows are stored as CRD. |
| POLLING_INTERVAL | Time interval of the scheduler's "tick". |
| RABBITMQ_URI | RabbitMQ connection URI for the Resource Coordinator application. |

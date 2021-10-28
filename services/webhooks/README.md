![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Webhooks

Receives http calls and passes messages to execution. Based on [@openintegrationhub/webhooks](../../lib/webhooks).

## How it works

It listens for incoming HTTP connections, serializes incoming data and puts it to the queue of the first node of the flow. The message is being consumed and processed by the component.

### Available endpoints

- `HEAD /hook/{flowId}` - returns `200` if a flow is found and ready for receiving messages, otherwise `404`. This endpoint doesn't process any incoming data.
- `GET /hook/{flowId}` - this endpoint processes incoming data. It's possible to pass message arguments as query params and headers.
- `POST /hook/{flowId}` - this endpoint processes incoming data. It allows to pass data in request body, headers or query params.

## Security and Authorization

In order to ensure flows are triggered only by permitted clients, the Webhooks service supports requiring authorization on incoming hooks. This can be enabled by activating a flag on the `flowSettings` of a flow. 

```
flowSettings: {
  webhooks: {
    requireWebhookAuth: true
  }
}
```
When this is active, one of three methods to authorize the call must be provided:

- **HMAC**: Systems which support [HMAC](https://en.wikipedia.org/wiki/HMAC) will pass an HMAC header which encrypts the message with a shared private key. In the OIH system, the secret service will generate its own HMAC value and compare with that sent in the request. If they match, the flow will continue. 
- **Token-based**: An OIH account token must be generated and saved in the remote system. It is recommended that a persistent token is generated for a new User, which has only the WEBHOOK_EXECUTE_PERMISSION (default: 'webhooks.execute'). For information on creating a service account and generating persistent tokens, see: https://openintegrationhub.github.io/docs/3%20-%20GettingStarted/GCPInstallationGuide.html#create-a-service-account
- **Basic Authorization**:  When a webhook is called with a Basic authorization (username/password) header, the webhooks service will attempt to verify the user and check their permission to execute webhooks. 

The following configuration may be declared in the `flowSettings.webhooks` parameter of a Flow:
- HMAC
  - `hmacHeaderKey`: Declares the name of the key which contains the HMAC value (default: `x-hmac`)
  - `hmacAuthSecret`: The ID of an API_KEY type Secret which is stored in the OIH Secret Service. Other types are not currently supported
  - `hmacAlgorithm`: (default: `sha265`)
- Token and Basic Authorization
  - `allTenantUsers`: Whether any user who in the same tenant as the Flow object can execute a webhook. Defaults to `false`, which restricts execution to the Flow owner, Tenant Admins, and System Admins

## Prerequisites

- RabbitMQ
- MongoDB

## How to build

```docker
docker build -t openintegrationhub/communication-router:latest -f Dockerfile ../../
```

or

```npm
VERSION=latest npm run build:docker
```

## How to deploy

Kubernetes descriptors can be found in the [k8s](./k8s) directory.

## Environment variables

### General

| Name               | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| LISTEN_PORT        | Port for HTTP interface.                                          |
| LOG_LEVEL          | Log level for logger.                                             |
| MONGODB_URI        | MongoDB connection string.                                        |
| PAYLOAD_SIZE_LIMIT | Maximum request's payload size that could be handled.             |
| RABBITMQ_URI       | RabbitMQ connection URI for the Resource Coordinator application. |

### Webhooks Authentication

| Name                       | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| DEFAULT_HMAC_HEADER_KEY    | System standard for HMAC Headers, default: 'x-hmac'       |
| DEFAULT_HMAC_ALGORITHM     | Encryption Algorithm for HMAC hashes default: 'sha265'    |
| WEBHOOK_EXECUTE_PERMISSION | Permission to execute webhooks, if user auth is on        |

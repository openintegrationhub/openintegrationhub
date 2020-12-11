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

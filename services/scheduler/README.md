![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Scheduler

Schedules flows for execution. Based on [@openintegrationhub/scheduler](../../lib/scheduler).

## How it works

It's looking for polling flows ready for the next execution cycle and triggers a flow execution by sending a message to the queue of the first node in the flow.

## Prerequisites

- RabbitMQ
- MongoDB

## How to build

```docker
docker build -t openintegrationhub/scheduler:latest -f Dockerfile ../../
```

or

```npm
VERSION=latest npm run build:docker
```

## How to deploy

Kubernetes descriptors can be found in the [k8s](./k8s) directory.

## Environment variables

### General

| Name             | Description                                                       |
| ---------------- | ----------------------------------------------------------------- |
| LISTEN_PORT      | Port for HTTP interface.                                          |
| LOG_LEVEL        | Log level for logger.                                             |
| MONGODB_URI      | MongoDB connection string.                                        |
| POLLING_INTERVAL | Time interval of the scheduler's "tick".                          |
| RABBITMQ_URI     | RabbitMQ connection URI for the Resource Coordinator application. |

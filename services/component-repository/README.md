![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Component Repository

Stores information about integration components. Based on [@openintegrationhub/component-repository](../../lib/component-repository).

## API docs

[http://component-repository.openintegrationhub.com/api-docs/](http://component-repository.openintegrationhub.com/api-docs/).

## Prerequisites

- MongoDB

## Service Account

This service requires a service account with the following permissions:

- `iam.token.introspect`

## How to build

```docker
docker build -t openintegrationhub/component-repository:latest -f Dockerfile ../../
```

or

```npm
VERSION=latest npm run build:docker
```

## How to deploy

Kubernetes descriptors can be found in the [k8s](./k8s) directory.

## Environment variables

### General

| Name                      | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| CORS_ORIGIN_WHITELIST     | Comma separated list of allowed CORS origins.            |
| IAM_TOKEN                 | Token of the service account.                            |
| LOG_LEVEL                 | Log level for logger.                                    |
| MONGODB_URI               | MongoDB connection string.                               |
| PORT                      | Port for HTTP interface.                                 |
| RABBITMQ_URI              | RabbitMQ connection string.                              |
| INTROSPECT_ENDPOINT_BASIC | URL of the introspection endpoint of the IAM deployment. |

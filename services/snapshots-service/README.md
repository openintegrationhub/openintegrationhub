![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Snapshots service

Stores flow snapshots.

## API docs

The service has an API, which is accessible only inside the cluster.

## Prerequisites

- MongoDB
- RabbitMQ

## Service Account

This service requires a service account with the following permissions:

- `iam.token.introspect`

## How to build

```docker
docker build -t openintegrationhub/snapshots-service-:latest -f Dockerfile ../../
```

or

```npm
VERSION=latest npm run build:docker
```

## How to deploy

Kubernetes descriptors can be found in the [k8s](./k8s) directory.

## Environment variables

### General

| Name         | Description                   |
| ------------ | ----------------------------- |
| IAM_TOKEN    | Token of the service account. |
| LOG_LEVEL    | Log level for logger.         |
| MONGODB_URI  | MongoDB connection string.    |
| RABBITMQ_URI | RabbitMQ connection string.   |
| PORT         | Port for HTTP interface.      |

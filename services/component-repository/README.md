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
```
docker build -t openintegrationhub/component-repository:latest -f Dockerfile ../../
```
or
```
VERSION=latest npm run build:docker
```

## How to deploy
Kubernetes descriptors for Component Repository along with the other core platform microservices can be found in the [k8s](./k8s) directory.

## Environment variables

#### General
| Name | Description |
| --- | --- |
| IAM_TOKEN | Token of the service account. |
| LOG_LEVEL | Log level for logger. |
| MONGODB_URI | MongoDB connection string. |
| PORT | Port for HTTP interface. |

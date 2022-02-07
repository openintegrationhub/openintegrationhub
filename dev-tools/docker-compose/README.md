# Docker Compose (Linux)

Every service will be configured via NodeJS, managed by docker-compose, and finally runs inside a docker container. In addition, a Kubernetes cluster is created to host all deployments of flow nodes.

**Simpleproxy** proxies tcp traffic from docker host to the kubernetes cluster, so a connection **_cluster server -> docker-host -> component orchestrator_** will be ensured.

## 1. Preparations

Following software needs to be installed

1. Docker
2. Docker Compose
3. Minikube
4. NodeJS >= 16
5. [MongoDB Shell](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/#install-the-mongodb-packages)
6. [Simpleproxy](https://github.com/vzaliva/simpleproxy)

Clone main repository

```bash
git clone https://github.com/openintegrationhub/openintegrationhub.git
```

**The following commands should all be run from ***src/*** directory**

```bash
cd dev-tools/docker-compose/src
```

Install the required packages. (Keep in mind, that those packages will be installed in the scope of a docker container and the underlying operating system)

```bash
node packages/install
```

**Make sure, your firewall allows tcp traffic from docker networks to host for following ports**
- 3000+ (services port range)
- 5672 (rabbitMQ)
- 9090 (proxy to kubernetes cluster)

## 2. Start development

Start with initial state

```bash
node setup/minikube && node setup/kubernetes && node setup/reset-rabbit && node setup/reset-mongo && node setup/iam && node setup/flows && node setup/build-test-component.js && node start
```

If everything started up successfully you can visit the frontend with

http://localhost:3000/

and log in as default admin user
"admin@openintegrationhub.com"/"somestring"
## 3. Monitoring

In addition to the frontend, there are other monitoring tools available.

### Minikube dashboard

Run

```bash
minikube dashboard
```

to open Minikube Kubernetes Dashboard. Here you will find all details about deployments within the "flows" namespace.


### RabbitMQ Web Interface

Just navigate to http://localhost:15672/ and log in with "guest"/"guest" to get details about the underlying message queue.


## 4. Testing

Run tests for all libs/services

```bash
node test
```

Run tests for specific libs/services

```bash
node test services/component-orchestrator
```

```bash
node test lib/iam-utils
```

## 5. Stop development

Hit **ctrl+c** to exit process and run

```bash
node stop
```
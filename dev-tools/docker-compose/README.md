# Docker Compose (Linux)

In theory, this approach could also be used on macOS.

Every service will be configured via NodeJS, managed by docker-compose, and finally runs inside a docker container. In addition, a Kubernetes cluster is created to host all deployments of flow nodes.

**Simpleproxy** proxies tcp traffic from docker host to the kubernetes cluster, so a connection **_cluster server -> docker-host -> component orchestrator_** will be ensured.

## 1. Preparations

Following software needs to be installed

1. Docker
2. Docker Compose
3. Minikube
4. NodeJS > 12
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

<mark>Make sure, your firewall allows tcp traffic for </mark>
- 3000+ (services port range)
- 5672 (rabbitMQ)
- 9090 (proxy to kubernetes cluster)

```bash
node packages/install
```

## 2. Start development

Setup initial state

```bash
node setup/minikube && node setup/kubernetes && node setup/iam && node setup/flows
```

Start services

```bash
node start
```

Now if everything is started up successfully you can visit the frontend with

http://localhost:3000/

and log in as user
<mark>admin@openintegrationhub.com</mark> with password <mark>somestring</mark>

## 3. Testing

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


## 3. Stop development

Hit **ctrl+c** to exit process and run

```bash
node stop
```
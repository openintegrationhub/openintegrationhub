<p align="center">
  <img src="https://github.com/openintegrationhub/Microservices/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation.

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Introduction

The purpose of the Open Integration Hub is to enhance business by simplifying integration. Traditional integration means development and maintenance of multiple connections. 
Open Integration Hub requires only a single connection to the framework.

- [Introduction](#introduction)
  - [OIH microservices](#oih-microservices)
    - [Installation](#installation)
    - [Webhooks](#webhooks)
    - [IAM](#iam)
    - [Flow Resporitory](#flow-resporitory)
    - [Component Orchestrator](#component-orchestrator)
    - [Scheduler](#scheduler)
    - [Secrets-Service](#secrets-service)
  - [Service Collaboration](#service-collaboration)
  - [Docs](#docs)
  - [Contribution](#contribution)
    - [Code of Conduct](#code-of-conduct)

## OIH microservices

Standalone platform that is based on a microservice architecure. In the following a short description of the service is provided. 

### Installation

As the Open Integration Hub is still in development it can not be run as a whole right now.
For further information on how to install and/or run a specific service please have a look at the service folders.

### Webhooks

The `Webhooks` service receives http calls and passes messages to execution. For further information see: [webhooks](services/communication-router).

### IAM

The `IAM` (Identity and Access Management) provides basic (JWT only) and advanced (OpenId-Connect compatible) Authentication, Authorization and User management as a service.
For further information see: [IAM](services/iam).

### Flow Resporitory

The `flow repository` is responsible for storing, retrieving and updating the integration flows of the Open Integration Hub. For further information see: [flow repository](services/integration-content-repository).

### Component Orchestrator

The component orchestrator rchestrates the flow's lifecycle. It creates queues in RabbitMQ and deploys Docker containers for each flow node on flow creation and cleans up on flow deletion.
For further information see: [component orchestrator](services/resource-coordinator).

### Scheduler

The `scheduler` services schedules integration flows for execution. For further information see: [scheduler](services/scheduler).

### Secrets-Service

This `secrets-service`  is used to store and access securely client secrets/credentials. For further information see: [secrets-service](services/secret-service).

## Service Collaboration

The service collaboration ist based on the [event collaboration](https://martinfowler.com/eaaDev/EventCollaboration.html) concept. We use rabbitMQ as our broker which supports [several protocols](https://www.rabbitmq.com/protocols.html).
A published event has to be received by several interested services. There can be running several instances of a service at the same time but the event must only be sent to one instance of each service that is interested. A queue will be created for each kind of service. 

Currently the collaboration concepts covers 4 services, namely: flow-repository, scheduler, webhooks and component orchestrator. The figure below shows how these services collaborate.

![EventCollaboration](Assets/EventCollaborationStartFlow.png)

## Docs

To find additional high level information about the architecture of the Open Integration Hub and functionalities of the microservices please visit the [documentation](docs).

- Service documentation: [service folder](docs/services)
- General architectural documentation: [architectural folder](docs/architecture)

## Contribution

Before you contribute please have a look at our [contribution guidelines](CONTRIBUTING.md).

### Code of Conduct

To see how members of the community are expected to behave, please read the [code of conduct](CODE_OF_CONDUCT.md). We apply the code of conduct defined by the Contributor Covenant, which is used across many open source projects, such as [NodeJS](https://github.com/nodejs/node), [Atom](https://github.com/atom/atom) and [Kubernetes](https://github.com/kubernetes/kubernetes).
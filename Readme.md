<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation.

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Introduction

[![CircleCI](https://circleci.com/gh/openintegrationhub/openintegrationhub/tree/master.svg?style=svg)](https://circleci.com/gh/openintegrationhub/openintegrationhub/tree/master)
[![License](https://img.shields.io/badge/License-Apache%202.0-yellow.svg)](LICENSE)

The purpose of the Open Integration Hub is to enhance businesses by simplifying integration. Traditional integration means development and maintenance of multiple connections.
Open Integration Hub requires only a single connection to the framework.

- [Introduction](#introduction)
  - [OIH Microservices](#oih-microservices)
    - [Installation](#installation)
    - [Audit Log](#audit-log)
    - [Component Orchestrator](#component-orchestrator)
    - [Flow Respository](#flow-respository)
    - [IAM](#iam)
    - [Meta Data Repository](#meta-data-repository)
    - [Scheduler](#scheduler)
    - [Secret Service](#secret-service)
    - [Webhooks](#webhooks)
  - [Service Collaboration](#service-collaboration)
  - [Docs](#docs)
  - [Contribution](#contribution)
    - [Code of Conduct](#code-of-conduct)

# OIH Plattform
Standalone platform that is based on a microservice architecure. For a reference implentation please visit the [services folder](services). There is also the possibility to self implement the plattform and use different technologies. If you want to do so please visit the [lib folder](lib). There you will find `"daos"` that can be used to add your own functionality (e.g. [queues manager](https://github.com/openintegrationhub/openintegrationhub/blob/master/lib/component-orchestrator/src/QueuesManager.js#L2)). In the following a short description of the services is provided. 

## Usage

### Postman

A demo postman environment and collection can be found within the [docs folder](docs). This collection provides possibilities to easily explore the functionalities of the Open Integration Hub. It interacts with a central testing plattform provided by Cloud Ecosystem that is hosted on GCP.

For further information on how to use the collection (e.g. autorization, needed parameters etc.) please see the [OIH Postman Guide](docs/oihPostmanGuide.md).

### Local Installation

As the Open Integration Hub is still in development it can not be run as a whole right now.
For further information on how to install and/or run a specific service please have a look at the service folders.

## Services

## Audit Log

The OIH `audit-Log` serves to receive, store, and return logging information about important user actions and system events. Other OIH Microservices can generate audit messages and pass them on to the Audit Log via the message and event bus or a simple HTTP POST request. For further information see: [audit-log service](services/audit-log), [audit-log docs](docs/services/AuditLog) and [API Documentation](http://auditlog.openintegrationhub.com/api-docs/).

## Component Orchestrator

The `component-orchestrator` orchestrates flow lifecycle. It creates queues in RabbitMQ and manages Docker containers (deploy/stop/remove) for each flow node whenever a flow is created, stopped or removed.
For further information see: [component orchestrator service](services/component-orchestrator).

## Component Repository

The `component-repository` stores information about integration components.  For further information see: [component-repository service](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/component-repository) and [API Documentation](http://component-repository.openintegrationhub.com/api-docs/).

## Flow Respository

The `flow-repository` is responsible for storing, retrieving and updating the OIH integration flows. 
For further information see: [flow-repository](services/integration-content-repository), [flow-repository docs](docs/services/FlowRepository.md) and [API Documentation](http://flow-repository.openintegrationhub.com/api-docs/).

## IAM

The `iam` (Identity and Access Management) provides token or OpenID-Connect based Authentication, Authorization and User management as a service.
For further information see: [iam service](services/iam), [iam docs](docs/services/IAM) and [API Documentation](http://iam.openintegrationhub.com/api-docs/).

## Meta Data Repository

The `meta-data-repository` is responsible for storing domains and their master data models. The models stored within this service are consulted for different tasks such as data validation. The meta models are also used by the transformer to map the incoming data onto the Open Integration Hub standard. For further information see: [meta-data-repository service](services/meta-data-repository), [meta-data-repository docs](docs/services/MetaDataRepository.md) and [API Documentation](http://metadata.openintegrationhub.com/api-docs/).

## Scheduler

The `scheduler` service schedules integration flows for execution. For further information see: [scheduler](services/scheduler).

## Secret Service

This `secret-service` is used to store and access securely client/user credentials. For further information see: [secret-service](services/secret-service) and [API Documentation](http://skm.openintegrationhub.com/api-docs/).

## Webhooks

The `webhooks` service receives http calls and passes messages to execution. For further information see: [webhooks](services/communication-router).

## Service Collaboration

The service collaboration is based on the [event collaboration](https://martinfowler.com/eaaDev/EventCollaboration.html) concept. We use RabbitMQ as our broker which supports [several protocols](https://www.rabbitmq.com/protocols.html).
A published event is received by several interested services. There may exist several running instances of a service at the same time but the event must only be sent to one instance of each service that is interested. A queue will be created for each kind of service.

For further information on service collabortion in OIH and further examples please see: [service collaboration overview](docs/ServiceCollaborationOverview.md).

## Docs

To find additional high level information about the architecture of the Open Integration Hub and functionalities of the microservices please visit the [documentation](docs).

## Contribution

Before you contribute please have a look at our [contribution guidelines](CONTRIBUTING.md).

### Code of Conduct

To see how members of the community are expected to behave, please read the [code of conduct](CODE_OF_CONDUCT.md). We apply the code of conduct defined by the Contributor Covenant, which is used across many open source projects, such as [NodeJS](https://github.com/nodejs/node), [Atom](https://github.com/atom/atom) and [Kubernetes](https://github.com/kubernetes/kubernetes).

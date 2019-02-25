# OIH Infrastructure


OIH uses a modern infrastructure approach allowing it to run with little effort on a kubernetes cluster. This document lists the technologies used in the OIH and the motivation behind them.


## Infrastructure
* [Docker](https://www.docker.com/) for container virtualization
* [Kubernetes](https://kubernetes.io/) as container orchestrator
* [RabbitMQ](https://www.rabbitmq.com/) as a message queue



### Docker

We presume that the reader is aware of the advantages of using container virtualization.

In short – Docker has the biggest community of all alternatives and is supported by nearly every Operating System (Windows, Unix, Linux). Docker allows to focus on development and provides stability on all stages of development. It can provide a production ready environment on you local machine to help fix the problems as fast as possible. It is lightweight, encapsules nearly every process within the container and provides means for resource capping. An application crash will have no impact on the underlying operating system.

### Container orchestration

There are currently 3 main competitors for container orchestration:
* Kubernetes
* [Docker Swarm](https://docs.docker.com/engine/swarm/)
* [Marathon with DCOS/Mesos](https://mesosphere.github.io/marathon/)

Although kubernetes received public attention only recently, but it is based on its predecessor named Borg has been in production use and constant development by Google for nearly a decade. Today Kubernetes has a very large and fast growing community. It is shipped with many features, which are essential for a challenging setup (e.g. Ingress, Secrets, Namespaces, Jobs, Service Discovery etc).

Kubernetes also allows to setup and get started on all three major public cloud providers (AWS, GCP, Azure) within minutes, which is a major advantage especially for small organizations and teams, who wish to focus on development and less on the infrastructure.

OIH is not limited to Kubernetes, it is possible to setup the services on Marathon (DCOS/Mesos) or Docker Swarm as well. This will require a migration of Kubernetes configs to match with the system of choice. OIH is currently focused only on Kubernetes as the advantages overweigh.


### Database and storage
#### MongoDB
The schema-less approach is advantageous if the data is heterogeneous, i.e. the items in the collection don’t all have the same structure, for example because:
* there are many different types of objects, and it is not practical to put each type of object in its own table
* the structure of the data is determined by external systems, over which you have no control, and which may change at any time
MongoDB also has a great scalability allowing very large datasets or very high read/write throughputs.

The future release of MongoDB 4.0 should also provide ACID guarantees through multi-document transaction support.


### Messagin Queue
#### RabbitMQ

* TODO

## Runtime environment
* [Node.js](https://nodejs.org)

The Microservices in OIH are developed primarily using Node.js, as this fits well into a heavy IO and API based architecture. Node.js has an event-driven architecture capable of asynchronous I/O. These design choices aim to optimize throughput and scalability in web applications with many input/output operations. Additionally, the core of OIH, which in turn is based on the know-how and technology used by elastic.io, is based on Node.js as well and has proven to be well suited and scalable for an integration platform scenario.



---

**Creator:** Igor (drobiazko), Elastic.io <br>
**Last revised by:** Philipp (philecs), Cloud Ecosystem <br>
**Last update:** 04-06-2018

---

# Introduction

The component repository is needed to store integration components such as adapters & transformer.

# Description

The documents shorty describes integration components and how they are stored, retreived and managed.

# Service Implementation

**Framework Part:** [component repository lib](https://github.com/openintegrationhub/openintegrationhub/tree/master/lib/component-repository)

**Reference Implementation:** [component orchestrator service](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/component-repository)

## Reasoning

- Docker Registry: Stateless, highly scalable storage for Docker images

# Conceptional Elaborations

The integration components are lightweight and stand-alone Docker images that include everything needed to run the
component, including the component's code, a runtime, libraries and dependencies. Each component is based on an Open Integration Hub
[parent image](https://docs.docker.com/engine/userguide/eng-image/baseimages/) which provides the component runtime.
For example, for Java component the parent images provides the JDK and for Node.js component the parent image provides
[NPM](https://www.npmjs.com/) and [Node.js](https://nodejs.org).

The component images are stored in a [Docker Registry](https://docs.docker.com/registry/). A Docker Registry is a
stateless, highly scalable storage for Docker images. Any open source integration component can be store and
distributed in/from [Docker Cloud](https://cloud.docker.com) so that they would be available to any OIH installations
(cloud or on-prem) out of the box. For `private` components private Docker Registry can be maintained locally so that
no components are exposed to the cloud. Each on prem installation could decide whether to use private repos on Docker
Cloud or installing a private Docker Registry on prem for their private components.

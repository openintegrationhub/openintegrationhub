# Service Operations

This document should help to get an overview of what is needed to **build**, **run** and **monitor** a microservice.

## Why are Operation guidelines necessary?

The aim of this document is to establish a common understanding how OIH services should be build and operated.

## Tools

* CI/CD Service (Travis, Jenkins, CircleCI, ...)
* DockerHub account for OIH
* Hosted Kubernetes to run all services for OIH
* If required, a NPM repository for nodejs modules used by OIH microservices

## Docker Build

All OIH microservices should be build as Docker images. Each microservice must have a Dockerfile.
*Note:* you exclude files from a docker image by defining them in `.dockerignore` file, similar to `.gitignore`

* Only 1 Dockerfile per service
* Never use `root` as user in a Dockerfile
* Use an official image as base to receive CVE (common vulnerabilities and exposures) updates
* Try to keep the Dockerfile short to avoid too many layers in filesystem that could invalidate Docker build cache
* Try to use small sized images. Many base images on DockerHub have small sized versions (miniLinux, Alpine, etc.)
* Tag all builds of your pipeline with  `... -t  openintegrationhub/"""Servicename""":"""VersionNumber"""`

One of the big advantages of DockerImages in open source is that you do not need an artifact store like artifactory or Nexus, because the image is uploaded directly to DockerHub and has a tag which can be used for versioning.

## Build Pipelines

Depending on which CI/CD service is used to build, each project should have it's own pipeline definition (Jenkinsfile, travis.yml ....). A monorepo usually has one big pipeline for all of it's services/packages.

* The pipeline definition file is located in the root of the project or in monorepo root (also depends on CI/CD Service)
* Define stages and give them meaningful names ("Install Dependencies", "Build", "Test", "Deploy")

## Kubernetes Service Definitions

To have a microservice running on Kubernetes there is a need to have it's Kubernetes definitions (deployment and service yaml files) within the project folder.

Proposal:

* Kubernetes definitions should always be in a folder named `k8s` whithin the project folder
* Use a consistent naming pattern: `deployment.yaml` and `service.yaml` for the definitions
* Ingress configuration should be placed in a different repository (e.g. OIH-Infrastructure)
* every Microservice need to have a checkable endpoint to have a liveliness and readiness check for the K8s

### Why infrastructure repository

Having a separate repository does provide advantages, for example – it could contain sidecar infrastructure like Wordpress or Jenkins and also scripts to do maintenance work or setup a new cluster.  
The Ingress configuration should be placed here as well, because it is an abstraction of the load balancer configuration, which is related to the platform and not to a single service.  

**-->**In case of a monorepo, all the mentioned things could be placed in a own section within the monorepo.**<--**

## Monitoring

is the most underrated part of operating a scaled platform. It could help finding sssues (peaks, errors, stack traces) as well as causing trouble (fill up diskspace caused by loops, resource consumption while analysing).

* Metrics
* Logs
* TCP/Http checks

__For Metrics__:

* The owner of the Microservice needs to define which metrics are necessary to keep and make some analytics on it

__For Logs__:

* Should be done in JSON format to help log parser for analytics (Splunk, Logstash, Stackdriver). Log should be used for warning and errors so please watch the log level (debug only for local usage)

__For TCP/HTTP__:

* That type of checks are used to check healthyness of the service

## Scaling

There are different types for scaling a service. Using a cluster (horizontally and vertically) the approach is to have small services (microservices) which could be scaled out in starting more instances of the service. When deciding to go for huge service which needs a lot of resource the scaling method is vertical.

For OHI we decided to use small services or microservices (there is a bunch of interpretation here).

Some rules to take care of:

* The service should be stateless so it could be moved any time from the cluster scheduler
* if there is an error thrown which could not be catched somewhere the service needs to be restarted by K8S
* keep an eye on the resources. Services with high RAM or CPU usage are not easy to spread in a cluster ENV.
* The service should be able to run multiple times on a single node (if for a good reason that is not possible the cluster should care of the affinity)

## Reliability

In Production Environments the service should be scaled at a min of 3. That will improve the availability and reliability in case of Errors or Deployments.

In Case of Statefull Sets please be aware to implement a Failover mechanism to keep Service Stable.

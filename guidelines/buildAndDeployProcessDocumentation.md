
---

**Creator:** Dennis (@dennisCes), Cloud Ecosystem e.V. <br>
**Last Modified:** 17.01.2018 <br>
**Last Modifier:** Dennis Steiniger, CES <br>
**Version:** 0.7  <br>

---

- [Introduction](#introduction)
- [Requirements for a successful build and deploy process](#requirements-for-a-successful-build-and-deploy-process)
  - [Pipeline set up](#pipeline-set-up)
  - [Pipeline tasks](#pipeline-tasks)
  - [Requirements for services:](#requirements-for-services)
  - [Initial Deployment for services](#initial-deployment-for-services)
- [CI/CD process with integrated backlog](#cicd-process-with-integrated-backlog)
- [Update: Pipeline stages specification](#update-pipeline-stages-specification)
- [Update 10.04.2019](#update-10042019)

### Introduction

To make sure all commits are seamlessly and independent from each other onto Github, we need a general-accepted build and deploy process. At the end of this file a BPMN model describing the whole process can be found.
For further information regarding different docker builds, pipelines, kubernetes service defintions, monitoring or scaling, please have a look at our [devOps guidelines](https://github.com/openintegrationhub/openintegrationhub/blob/DevOps-Guideline/Guidelines/serviceOperations.md).   

### Requirements for a successful build and deploy process

In order to be able to test, build and deploy each service independently from each other, the following requirements need to be fulfilled:

#### Pipeline set up

We are using:

- Yarn as secure dependency management with lerna for managing packages 
- CircleCi for continuous integration / testing, includes the "config.yml" file in the mono-repositorys root folder/.circleci/config
- Dockerhub.com for building our services &
- Google Cloud Platform / Kubernetes integrated for deploying services

As an example, you can check out our ["Identity and Access Management"-microservice](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/iam) which is our most advanced repository, exemplifying our clean repo-structure

#### Pipeline tasks

- checks for changes in each service folder
- installs all dependencies for the complete monorepo on each run (yarn-call)
- depending on detected changes(true): 
  - calls the respective yarn test from that changed service subfolder
  - calls the build script - if existing, tags it with the circle build number and current package.json
- deploys the service with the "deploy.sh"-script on k8 cluster (currently commented out, will be back in code after succesfull deposited secrets of the services)

#### Requirements for services:

The following scripts are necessary and will be called in the package.json:

- a test script
- a build script
- kubernetes integration needs a folder "k8s" in the service subfolder, including these 2 files:
  - deployment.yml
  - service.yml

#### Initial Deployment for services

After successful build and upload to docker hub, the very first deploy of a service needs to be done "manually".
The Service Definition and the Deployment Definition needs to be imported to the Cluster.

Commandline Example

```cmd
kubectl apply -f @@PATHTOYAML@@
```

Some Services needs Kubernetes Secrets defind before the inital upload of Service/Deployment Definitions. Please find the HowTo guideline in the Kubernetes Documentation.

### CI/CD process with integrated backlog

The continuous integration- and deployment process starts with the commit from each of the developers, selecting current issues to fix, followed by the local unit testing on those. After successful local tests and as declared in the requirements for committing, a new branch is always necessary for committing in the openintegrationhub repository. 
CircleCi will be triggered automatically by active changes in those services subfolders. It will start the scripts from the yaml-file, installing the dependencies and packages for all stages: test-, build-, deploy- and integration. Whenever a stage fails the error log will be created automatically and the CES team adds, assignes and prioritizes those logs as new issues in the backlog for the developers. Therefore, the continuous integration and deploy process/circle is complete.

![BuildProcess](https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/BuildProcess.png)

### Update: Pipeline stages specification

We agreed on using a centralized pipeline, which means that every dev partner will provide their own ENV for their own test stage but build- and deploy stage will be used commonly by all

### Update 10.04.2019

We will continue using our existing cluster and add another namespace to differentiate our test and production versions of the single services while testing them with our integrationtests. Integrationtests will be using jest and supertest. Postman is only there to ensure that the integration tests themselves work without any problems.

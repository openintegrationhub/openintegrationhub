
---

**Creator:** Dennis (@dennisCes), Cloud Ecosystem e.V. <br>
**Last Modified:** - <br>
**Last Modifier:** - <br>
**Version:** 0.5  <br>

---

- [Introduction](#introduction)
- [Requirements for Build and Deploy process](#requirements-for-a-successful-build-and-deploy-process)
- [Requirements for Services](#requirements-for-services)
- [Build process model](#cicd-process-with-integrated-backlog)



### Introduction

To make sure all commits are seamlessly and independent from each other onto Github, we need a general-accepted build and deploy process. At the end of this file a BPMN model describing the whole process can be found. <br>
For further information regarding different docker builds, pipelines, kubernetes service defintions, monitoring or scaling, please have a look at our [devOps guidelines](https://github.com/openintegrationhub/openintegrationhub/blob/DevOps-Guideline/Guidelines/serviceOperations.md).   


### Requirements for a successful build and deploy process

In order to be able to test, build and deploy each service independently from each other, the following requirements need to be fulfilled:

#### Pipeline set up
* We are using:
  - Yarn as secure dependency management with lerna for managing packages 
  - TravisCI for continiouos integration / testing, includes the "travis.yml" file in the mono-repositorys root folder
  - Google Cloud Platform / Kubernetes integrated for deploying services

As an example, you can check out our ["Identity and Access Management"-microservice](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/iam) which is our most advanced repository, exemplifying our clean repo-structure

#### Pipeline tasks:
* checks for changes in each service folder
* installs all dependencies for the complete monorepo on each run (yarn-call)
* depending on detected changes(true): 
  - calls the respective yarn test from that changed service subfolder
  - calls the build script - if existing, tags it with the travis build number and current package.json
* deploys the service with the "deploy.sh"-script on k8 cluster (currently commented out, will be back in code after succesfull deposited secrets of the services)


#### Requirements for services:  
The following scripts are necessary and will be called in the package.json:
* a test script 
* a build script 
* kubernetes integration needs a folder "k8s" in the service subfolder, including these 2 files:
  - deployment.yml
  - service.yml

#### Next step
After successful build and upload to docker hub, the very first deploy of a service needs to be done "manually" since there are secrets necessary in order to run the service on the cluster. These secrets commonly provide a bunch of keyvalue pairs to give some inital environmental variables for the setup

### CI/CD process with integrated backlog

The continuous integration- and deployment process starts with the commit from each of the developers, selecting current issues to fix, followed by the local unit testing on those. After successful local tests and as declared in the requirements for committing, a new branch is always necessary for committing in the openintegrationhub repository. 
TravisCI will be triggered automatically by active changes in those services subfolders. It will start the scripts from the yaml-file, installing the dependencies and packages for all stages: test-, build-, deploy- and integration. Whenever a stage fails the error log will be created automatically and the CES team adds, assignes and prioritizes those logs as new issues in the backlog for the developers. Therefore, the continiouos integration and deploy process/circle is complete.


![BuildProcess](https://github.com/openintegrationhub/openintegrationhub/blob/DennisCES-Documentation-Build-Process/CI/CD/Assets/BuildProcess.png)


